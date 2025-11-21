import { OllamaService } from './OllamaService';
import { AgentService } from './AgentService';
import { SettingsService } from './SettingsService';
import { logger } from '../utils/logger';
import { analytics } from '../utils/analytics';
import type { ChatMessage, AgentConfig } from '../types';

const CHAT_HISTORY_KEY = 'context-assistant-chat-history';
const MAX_MESSAGES = 10;

export class ChatService {
  private ollamaService: OllamaService;
  private agentService: AgentService;
  private settingsService: SettingsService;
  private messages: ChatMessage[] = [];
  private currentAbortController: AbortController | null = null;

  constructor() {
    this.settingsService = new SettingsService();
    this.ollamaService = new OllamaService(this.settingsService.getOllamaEndpoint());
    this.agentService = new AgentService();
    this.loadHistory();
  }

  /**
   * Send a message and get response
   */
  async sendMessage(
    content: string,
    agentId?: string,
    onChunk?: (chunk: string) => void,
    mentionedObjects?: Array<{ name: string; type: string; properties?: Record<string, unknown> }>
  ): Promise<void> {
    // Get agent
    const agent = agentId
      ? this.agentService.getAgent(agentId)
      : this.agentService.getDefaultAgent();

    if (!agent) {
      throw new Error('No agent selected. Please create and select an agent in Settings.');
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.addMessage(userMessage);

    // Create assistant message for streaming
    const assistantMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
      agentAvatar: agent.avatar,
    };
    this.addMessage(assistantMessage);

    // Build system prompt with personality
    const systemPrompt = this.buildSystemPrompt(agent);

    // Enhance content with mentioned object details
    let enhancedContent = content;
    if (mentionedObjects && mentionedObjects.length > 0) {
      const objectDetails = mentionedObjects.map(obj => {
        const props = obj.properties ? `\nProperties: ${JSON.stringify(obj.properties, null, 2)}` : '';
        return `@${obj.name} (${obj.type})${props}`;
      }).join('\n\n');
      
      enhancedContent = `${content}\n\n[Mentioned Scene Objects:\n${objectDetails}]`;
    }

    // Update the user message content with enhanced version
    userMessage.content = enhancedContent;

    // Track send-prompt event
    analytics.trackEvent('send-prompt', {
      agent_id: agent.id,
      agent_name: agent.name,
      model: agent.model,
      has_mentioned_objects: mentionedObjects && mentionedObjects.length > 0,
      mentioned_objects_count: mentionedObjects?.length || 0,
      message_length: content.length,
    });

    // Prepare messages for Ollama (use enhanced content)
    const recentMessages = this.getRecentMessages();
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: enhancedContent }, // Use enhanced content for current message
    ];

    // Abort previous request if any
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      // Get streaming response with abort signal
      const stream = await this.ollamaService.chat(
        agent.model,
        ollamaMessages,
        {
          temperature: agent.temperature,
          top_k: agent.topK,
          top_p: agent.topP,
          context_window: agent.contextWindow,
          max_tokens: agent.maxTokens,
          mirostat: agent.mirostat ? 1 : undefined,
          mirostat_tau: agent.mirostatTau,
          mirostat_eta: agent.mirostatEta,
        },
        this.currentAbortController.signal
      );

      if (!stream) {
        throw new Error('No response stream received');
      }

      // Read stream
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let done = false;

      try {
        while (!done) {
          // Check if aborted
          if (this.currentAbortController?.signal.aborted) {
            reader.cancel();
            break;
          }
          
          const result = await reader.read();
          done = result.done;
          if (done) break;
          
          const { value } = result;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  fullContent += json.message.content;
                  assistantMessage.content = fullContent;
                  this.updateMessage(assistantMessage);
                  if (onChunk) {
                    onChunk(json.message.content);
                  }
                }
                if (json.done) {
                  // Track prompt-stats event with token statistics
                  const stats: Record<string, unknown> = {
                    agent_id: agent.id,
                    agent_name: agent.name,
                    model: agent.model,
                  };
                  
                  // Add token statistics if available
                  if (json.prompt_eval_count !== undefined) {
                    stats.prompt_eval_count = json.prompt_eval_count;
                  }
                  if (json.eval_count !== undefined) {
                    stats.eval_count = json.eval_count;
                  }
                  if (json.total_duration !== undefined) {
                    stats.total_duration = json.total_duration;
                  }
                  if (json.load_duration !== undefined) {
                    stats.load_duration = json.load_duration;
                  }
                  if (json.prompt_eval_duration !== undefined) {
                    stats.prompt_eval_duration = json.prompt_eval_duration;
                  }
                  if (json.eval_duration !== undefined) {
                    stats.eval_duration = json.eval_duration;
                  }
                  if (json.eval_count !== undefined && json.prompt_eval_count !== undefined) {
                    stats.total_tokens = (json.eval_count as number) + (json.prompt_eval_count as number);
                  }
                  
                  analytics.trackEvent('prompt-stats', stats);
                  break;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'AbortError' || this.currentAbortController?.signal.aborted) {
        assistantMessage.content = assistantMessage.content || '[Request cancelled]';
      } else {
        assistantMessage.content = `Error: ${err.message || 'Unknown error'}`;
      }
      this.updateMessage(assistantMessage);
      // Only throw if not aborted
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name?: string }).name !== 'AbortError' &&
        !this.currentAbortController?.signal.aborted
      ) {
        throw error;
      }
    } finally {
      this.currentAbortController = null;
      this.saveHistory();
    }
  }

  /**
   * Build system prompt with agent personality
   */
  private buildSystemPrompt(agent: AgentConfig): string {
    let prompt = `You are ${agent.name}, an AI assistant helping users with three.js development.\n\n`;

    // Add personality traits
    const traits = agent.personalityTraits;
    const traitDescriptions: string[] = [];

    if (traits.curious !== undefined && traits.curious !== 50) {
      if (traits.curious > 50) {
        traitDescriptions.push(`You are curious and like to explore new ideas (${traits.curious}% curious).`);
      } else {
        traitDescriptions.push(`You are cautious and prefer proven solutions (${100 - traits.curious}% cautious).`);
      }
    }

    if (traits.organized !== undefined && traits.organized !== 50) {
      if (traits.organized > 50) {
        traitDescriptions.push(`You are organized and methodical (${traits.organized}% organized).`);
      } else {
        traitDescriptions.push(`You are flexible and adaptable (${100 - traits.organized}% flexible).`);
      }
    }

    if (traits.friendly !== undefined && traits.friendly !== 50) {
      if (traits.friendly > 50) {
        traitDescriptions.push(`You are friendly and supportive (${traits.friendly}% friendly).`);
      } else {
        traitDescriptions.push(`You are challenging and push for better solutions (${100 - traits.friendly}% challenging).`);
      }
    }

    if (traits.zany !== undefined && traits.zany !== 50) {
      if (traits.zany > 50) {
        traitDescriptions.push(`You have a zany, creative personality (${traits.zany}% zany).`);
      } else {
        traitDescriptions.push(`You are sober and professional (${100 - traits.zany}% sober).`);
      }
    }

    if (traits.sarcastic !== undefined && traits.sarcastic !== 50) {
      if (traits.sarcastic > 50) {
        traitDescriptions.push(`You have a sarcastic sense of humor (${traits.sarcastic}% sarcastic).`);
      } else {
        traitDescriptions.push(`You are serious and straightforward (${100 - traits.sarcastic}% serious).`);
      }
    }

    if (traitDescriptions.length > 0) {
      prompt += 'Personality traits:\n' + traitDescriptions.join('\n') + '\n\n';
    }

    prompt += `You help users understand three.js concepts, debug code, and build 3D applications. 
Provide clear, helpful explanations and code examples when relevant.`;

    return prompt;
  }

  /**
   * Get recent messages (last N messages)
   */
  private getRecentMessages(): ChatMessage[] {
    // Keep last MAX_MESSAGES messages
    return this.messages.slice(-MAX_MESSAGES);
  }

  /**
   * Add a message
   */
  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.saveHistory();
  }

  /**
   * Update a message
   */
  updateMessage(message: ChatMessage): void {
    const index = this.messages.findIndex(m => m.id === message.id);
    if (index >= 0) {
      this.messages[index] = message;
      this.saveHistory();
    }
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.messages = [];
    this.saveHistory();
  }

  /**
   * Abort current request
   */
  abort(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Save chat history to sessionStorage
   */
  private saveHistory(): void {
    if (!this.settingsService.shouldPersistChatHistory()) {
      return;
    }

    try {
      // Only save last MAX_MESSAGES
      const recentMessages = this.getRecentMessages();
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(recentMessages));
    } catch (error) {
      logger.error('Failed to save chat history:', error);
    }
  }

  /**
   * Load chat history from sessionStorage
   */
  private loadHistory(): void {
    if (!this.settingsService.shouldPersistChatHistory()) {
      return;
    }

    try {
      const stored = sessionStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        this.messages = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load chat history:', error);
      this.messages = [];
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}


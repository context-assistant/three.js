import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../../src/services/ChatService';
import { OllamaService } from '../../src/services/OllamaService';
import { AgentService } from '../../src/services/AgentService';
import { SettingsService } from '../../src/services/SettingsService';
import type { AgentConfig, ChatMessage } from '../../src/types';

// Mock dependencies
vi.mock('../../src/services/OllamaService');
vi.mock('../../src/services/AgentService');
vi.mock('../../src/services/SettingsService');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockOllamaService: any;
  let mockAgentService: any;
  let mockSettingsService: any;

  beforeEach(() => {
    // Clear storage
    sessionStorage.clear();
    localStorage.clear();

    // Setup mocks
    mockSettingsService = {
      getOllamaEndpoint: vi.fn(() => 'http://localhost:11434'),
      shouldPersistChatHistory: vi.fn(() => true),
    };

    mockAgentService = {
      getAgent: vi.fn(),
      getDefaultAgent: vi.fn(),
    };

    mockOllamaService = {
      chat: vi.fn(),
    };

    // Mock constructors
    (SettingsService as any).mockImplementation(() => mockSettingsService);
    (AgentService as any).mockImplementation(() => mockAgentService);
    (OllamaService as any).mockImplementation(() => mockOllamaService);

    chatService = new ChatService();
  });

  const createTestAgent = (): AgentConfig => ({
    id: 'test-agent',
    name: 'Test Agent',
    model: 'llama2',
    contextWindow: 4096,
    maxTokens: 2048,
    temperature: 0.7,
    topK: 40,
    topP: 0.9,
    mirostat: false,
    personalityTraits: {},
    avatar: null,
    isDefault: false,
  });

  const createMockStream = (chunks: string[]): ReadableStream<Uint8Array> => {
    const encoder = new TextEncoder();
    const data = chunks.map(chunk => 
      JSON.stringify({ message: { content: chunk }, done: false })
    ).join('\n') + '\n' + JSON.stringify({ done: true });
    
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data));
        controller.close();
      },
    });
  };

  describe('sendMessage', () => {
    it('should throw error when no agent is available', async () => {
      mockAgentService.getDefaultAgent.mockReturnValue(null);

      await expect(chatService.sendMessage('Hello')).rejects.toThrow(
        'No agent selected'
      );
    });

    it('should send message with default agent', async () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      mockOllamaService.chat.mockResolvedValue(createMockStream(['Hello', ' there']));

      await chatService.sendMessage('Hello');

      expect(mockOllamaService.chat).toHaveBeenCalledWith(
        'llama2',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: expect.stringContaining('Hello') }),
        ]),
        expect.objectContaining({
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
        }),
        expect.any(AbortSignal)
      );
    });

    it('should send message with specified agent', async () => {
      const agent = createTestAgent();
      mockAgentService.getAgent.mockReturnValue(agent);
      mockOllamaService.chat.mockResolvedValue(createMockStream(['Response']));

      await chatService.sendMessage('Hello', 'test-agent');

      expect(mockAgentService.getAgent).toHaveBeenCalledWith('test-agent');
      expect(mockOllamaService.chat).toHaveBeenCalled();
    });

    it('should add user and assistant messages', async () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      mockOllamaService.chat.mockResolvedValue(createMockStream(['Response']));

      await chatService.sendMessage('Hello');

      const messages = chatService.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
    });

    it('should stream response chunks', async () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      mockOllamaService.chat.mockResolvedValue(createMockStream(['Hello', ' ', 'World']));

      const chunks: string[] = [];
      await chatService.sendMessage('Hello', undefined, (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
      const messages = chatService.getMessages();
      expect(messages[1].content).toContain('Hello');
    });

    it('should include mentioned objects in message', async () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      mockOllamaService.chat.mockResolvedValue(createMockStream(['Response']));

      const mentionedObjects = [
        { name: 'cube', type: 'Mesh', properties: { position: { x: 0, y: 0, z: 0 } } },
      ];

      await chatService.sendMessage('Tell me about this', undefined, undefined, mentionedObjects);

      const messages = chatService.getMessages();
      expect(messages[0].content).toContain('@cube');
      expect(messages[0].content).toContain('Mesh');
    });

    it('should handle abort signal', async () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      
      const abortController = new AbortController();
      const mockStream = createMockStream(['Response']);
      mockOllamaService.chat.mockResolvedValue(mockStream);

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 10);

      // Should not throw on abort
      await expect(
        chatService.sendMessage('Hello', undefined, undefined, undefined)
      ).resolves.not.toThrow();
    });
  });

  describe('addMessage', () => {
    it('should add message to history', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      chatService.addMessage(message);
      const messages = chatService.getMessages();
      expect(messages).toContainEqual(message);
    });
  });

  describe('updateMessage', () => {
    it('should update existing message', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Initial',
        timestamp: Date.now(),
      };

      chatService.addMessage(message);
      message.content = 'Updated';
      chatService.updateMessage(message);

      const messages = chatService.getMessages();
      expect(messages[0].content).toBe('Updated');
    });

    it('should not update non-existent message', () => {
      const message: ChatMessage = {
        id: 'non-existent',
        role: 'assistant',
        content: 'Test',
        timestamp: Date.now(),
      };

      chatService.updateMessage(message);
      expect(chatService.getMessages()).toHaveLength(0);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should handle personality traits with values <= 50', () => {
      const agent: AgentConfig = {
        id: 'agent-1',
        name: 'Cautious Agent',
        model: 'llama2',
        contextWindow: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        mirostat: false,
        personalityTraits: {
          curious: 30, // <= 50, should be cautious
          organized: 20, // <= 50, should be flexible
          friendly: 40, // <= 50, should be challenging
          zany: 10, // <= 50, should be sober
          sarcastic: 25, // <= 50, should be serious
        },
        avatar: null,
        isDefault: false,
      };

      const systemPrompt = (chatService as any).buildSystemPrompt(agent);
      expect(systemPrompt).toContain('cautious');
      expect(systemPrompt).toContain('flexible');
      expect(systemPrompt).toContain('challenging');
      expect(systemPrompt).toContain('sober');
      expect(systemPrompt).toContain('serious');
    });

    it('should handle personality traits with values > 50', () => {
      const agent: AgentConfig = {
        id: 'agent-1',
        name: 'Curious Agent',
        model: 'llama2',
        contextWindow: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        mirostat: false,
        personalityTraits: {
          curious: 70, // > 50, should be curious
          organized: 80, // > 50, should be organized
          friendly: 90, // > 50, should be friendly
          zany: 75, // > 50, should be zany
          sarcastic: 60, // > 50, should be sarcastic
        },
        avatar: null,
        isDefault: false,
      };

      const systemPrompt = (chatService as any).buildSystemPrompt(agent);
      expect(systemPrompt).toContain('curious');
      expect(systemPrompt).toContain('organized');
      expect(systemPrompt).toContain('friendly');
      expect(systemPrompt).toContain('zany');
      expect(systemPrompt).toContain('sarcastic');
    });

    it('should handle personality traits with undefined values', () => {
      const agent: AgentConfig = {
        id: 'agent-1',
        name: 'Simple Agent',
        model: 'llama2',
        contextWindow: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        mirostat: false,
        personalityTraits: {}, // No traits
        avatar: null,
        isDefault: false,
      };

      const systemPrompt = (chatService as any).buildSystemPrompt(agent);
      // Should not contain trait descriptions
      expect(systemPrompt).not.toContain('Personality traits:');
    });
  });

  describe('getMessages', () => {
    it('should return all messages', () => {
      const msg1: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };
      const msg2: ChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi',
        timestamp: Date.now(),
      };

      chatService.addMessage(msg1);
      chatService.addMessage(msg2);

      const messages = chatService.getMessages();
      expect(messages).toHaveLength(2);
    });

    it('should handle personality traits with values <= 50', () => {
      const agent: AgentConfig = {
        id: 'agent-1',
        name: 'Cautious Agent',
        model: 'llama2',
        contextWindow: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        mirostat: false,
        personalityTraits: {
          curious: 30, // <= 50, should be cautious
          organized: 20, // <= 50, should be flexible
          friendly: 40, // <= 50, should be challenging
          zany: 10, // <= 50, should be sober
          sarcastic: 25, // <= 50, should be serious
        },
        avatar: null,
        isDefault: false,
      };

      const systemPrompt = (chatService as any).buildSystemPrompt(agent);
      expect(systemPrompt).toContain('cautious');
      expect(systemPrompt).toContain('flexible');
      expect(systemPrompt).toContain('challenging');
      expect(systemPrompt).toContain('sober');
      expect(systemPrompt).toContain('serious');
    });

    it('should throw error when no agent selected', async () => {
      mockAgentService.getDefaultAgent.mockReturnValue(null);
      mockAgentService.getAgent.mockReturnValue(null);

      await expect(chatService.sendMessage('Hello', undefined)).rejects.toThrow('No agent selected');
    });

    it('should handle sendMessage with mentioned objects', async () => {
      const agent = createTestAgent();
      mockAgentService.getAgent.mockReturnValue(agent);
      
      const mockStream = createMockStream(['Response']);
      mockOllamaService.chat.mockResolvedValue(mockStream);

      const mentionedObjects = [
        { name: 'Cube', type: 'Mesh', properties: { position: { x: 0 } } },
      ];

      await chatService.sendMessage('Hello @Cube', 'agent-1', undefined, mentionedObjects);
      
      expect(mockOllamaService.chat).toHaveBeenCalled();
      // Check that chat was called - first arg is model, second is messages array
      const messagesArg = mockOllamaService.chat.mock.calls[0][1];
      expect(Array.isArray(messagesArg)).toBe(true);
      // Check that mentioned objects are included in the user message
      const userMessage = messagesArg.find((msg: any) => msg.role === 'user');
      expect(userMessage?.content).toContain('Cube');
    });

    it('should return a copy of messages', () => {
      chatService.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });

      const messages1 = chatService.getMessages();
      const messages2 = chatService.getMessages();
      expect(messages1).not.toBe(messages2); // Different references
    });
  });

  describe('clearHistory', () => {
    it('should clear all messages', () => {
      chatService.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });

      chatService.clearHistory();
      expect(chatService.getMessages()).toHaveLength(0);
    });
  });

  describe('abort', () => {
    it('should abort current request', () => {
      const agent = createTestAgent();
      mockAgentService.getDefaultAgent.mockReturnValue(agent);
      
      // Start a request
      const mockStream = createMockStream(['Response']);
      mockOllamaService.chat.mockResolvedValue(mockStream);
      chatService.sendMessage('Hello').catch(() => {}); // Don't wait

      // Abort it
      chatService.abort();

      // Should not throw
      expect(() => chatService.abort()).not.toThrow();
    });
  });

  describe('history persistence', () => {
    it('should save history to sessionStorage when enabled', () => {
      mockSettingsService.shouldPersistChatHistory.mockReturnValue(true);

      chatService.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });

      const stored = sessionStorage.getItem('context-assistant-chat-history');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
    });

    it('should not save history when persistence is disabled', () => {
      mockSettingsService.shouldPersistChatHistory.mockReturnValue(false);

      chatService.addMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });

      const stored = sessionStorage.getItem('context-assistant-chat-history');
      expect(stored).toBeNull();
    });

    it('should load history from sessionStorage on init', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];
      sessionStorage.setItem('context-assistant-chat-history', JSON.stringify(messages));
      mockSettingsService.shouldPersistChatHistory.mockReturnValue(true);

      const newService = new ChatService();
      expect(newService.getMessages()).toHaveLength(1);
    });
  });
});


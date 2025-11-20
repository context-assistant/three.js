import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../../src/services/ChatService';
import { AgentService } from '../../src/services/AgentService';
import type { AgentConfig } from '../../src/types';

// Mock fetch for Ollama
global.fetch = vi.fn();

describe('Chat Flow Integration', () => {
  let chatService: ChatService;
  let agentService: AgentService;
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    
    agentService = new AgentService();
    chatService = new ChatService();
    
    vi.clearAllMocks();
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
    personalityTraits: { friendly: 80 },
    avatar: null,
    isDefault: true,
  });

  const createMockStream = (text: string): ReadableStream<Uint8Array> => {
    const encoder = new TextEncoder();
    const chunks = text.split('').map(char => 
      JSON.stringify({ message: { content: char }, done: false })
    );
    chunks.push(JSON.stringify({ done: true }));
    
    return new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => {
          controller.enqueue(encoder.encode(chunk + '\n'));
        });
        controller.close();
      },
    });
  };

  it('should complete full chat flow: create agent -> send message -> receive response', async () => {
    // 1. Create and save agent
    const agent = createTestAgent();
    agentService.saveAgent(agent);
    agentService.setDefaultAgent(agent.id);

    // 2. Mock Ollama response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream('Hello! How can I help?'),
    } as Response);

    // 3. Send message
    const chunks: string[] = [];
    await chatService.sendMessage(
      'Hello',
      undefined,
      (chunk) => chunks.push(chunk)
    );

    // 4. Verify messages were saved
    const messages = chatService.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('Hello');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toContain('Hello!');
  });

  it('should persist chat history across service instances', async () => {
    const agent = createTestAgent();
    agentService.saveAgent(agent);
    agentService.setDefaultAgent(agent.id);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream('Response'),
    } as Response);

    await chatService.sendMessage('Test message');

    // Create new service instance
    const newChatService = new ChatService();
    const messages = newChatService.getMessages();
    
    // Should have loaded history
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should handle @mention in chat flow', async () => {
    const agent = createTestAgent();
    agentService.saveAgent(agent);
    agentService.setDefaultAgent(agent.id);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: createMockStream('Response'),
    } as Response);

    const mentionedObjects = [
      { name: 'cube', type: 'Mesh', properties: { position: { x: 0 } } },
    ];

    await chatService.sendMessage(
      'Tell me about this',
      undefined,
      undefined,
      mentionedObjects
    );

    const messages = chatService.getMessages();
    expect(messages[0].content).toContain('@cube');
    expect(messages[0].content).toContain('Mesh');
  });
});


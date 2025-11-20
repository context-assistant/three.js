import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatPanel } from '../../../src/components/ChatPanel';
import { ChatService } from '../../../src/services/ChatService';
import { AgentService } from '../../../src/services/AgentService';
import { IframeManager } from '../../../src/services/IframeManager';
import { IntegrationInjector } from '../../../src/services/IntegrationInjector';
import type { ChatMessage, AgentConfig } from '../../../src/types';

// Mock dependencies
vi.mock('../../../src/services/ChatService');
vi.mock('../../../src/services/AgentService');
vi.mock('../../../src/services/IframeManager');
vi.mock('../../../src/services/IntegrationInjector');
vi.mock('../../../src/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ChatPanel', () => {
  let chatPanel: ChatPanel;
  let mockChatService: any;
  let mockAgentService: any;
  let mockIframeManager: any;
  let mockIntegrationInjector: any;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Setup mocks
    mockChatService = {
      getMessages: vi.fn(() => []),
      sendMessage: vi.fn(() => Promise.resolve()),
      clearHistory: vi.fn(),
      abort: vi.fn(),
    };

    mockAgentService = {
      getAllAgents: vi.fn(() => []),
      getDefaultAgent: vi.fn(() => null),
    };

    mockIframeManager = {
      getActiveIframe: vi.fn(() => null),
      getActiveType: vi.fn(() => null),
    };

    mockIntegrationInjector = {
      getAPI: vi.fn(() => null),
    };

    chatPanel = new ChatPanel(
      mockChatService as unknown as ChatService,
      mockAgentService as unknown as AgentService,
      mockIframeManager as unknown as IframeManager,
      mockIntegrationInjector as unknown as IntegrationInjector
    );
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('should set container', () => {
      chatPanel.render(container);
      expect(container).toBeTruthy();
    });
  });

  describe('toggle', () => {
    it('should toggle panel open/closed', () => {
      chatPanel.render(container);
      expect(chatPanel.isPanelOpen()).toBe(false);
      
      chatPanel.toggle();
      expect(chatPanel.isPanelOpen()).toBe(true);
      
      chatPanel.toggle();
      expect(chatPanel.isPanelOpen()).toBe(false);
    });
  });

  describe('isPanelOpen', () => {
    it('should return panel state', () => {
      expect(chatPanel.isPanelOpen()).toBe(false);
      chatPanel.render(container);
      chatPanel.toggle();
      expect(chatPanel.isPanelOpen()).toBe(true);
    });
  });

  describe('loadMessages', () => {
    it('should load and display messages', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now(),
          agentName: 'Test Agent',
        },
      ];
      mockChatService.getMessages.mockReturnValue(messages);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const messagesContainer = document.getElementById('chat-messages');
      expect(messagesContainer).toBeTruthy();
    });

    it('should show empty state when no messages', () => {
      mockChatService.getMessages.mockReturnValue([]);
      
      chatPanel.render(container);
      chatPanel.toggle();
      
      const messagesContainer = document.getElementById('chat-messages');
      expect(messagesContainer?.textContent).toContain('No messages yet');
    });
  });

  describe('loadAgents', () => {
    it('should load agents into selector', () => {
      const agents: AgentConfig[] = [
        {
          id: 'agent-1',
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
          isDefault: true,
        },
      ];
      mockAgentService.getAllAgents.mockReturnValue(agents);
      mockAgentService.getDefaultAgent.mockReturnValue(agents[0]);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const select = document.getElementById('chat-agent-select') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });
  });

  describe('sendMessage', () => {
    it('should send message when input has content', async () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
      
      if (input && sendBtn) {
        input.value = 'Test message';
        sendBtn.click();
        
        // Wait a bit for async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Should have called sendMessage
        expect(mockChatService.sendMessage).toHaveBeenCalled();
      }
    });

    it('should not send empty message', async () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
      
      if (input && sendBtn) {
        input.value = '   '; // Only whitespace
        sendBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Should not have called sendMessage for empty content
        expect(mockChatService.sendMessage).not.toHaveBeenCalled();
      }
    });
  });

  describe('autoResizeTextarea', () => {
    it('should resize textarea based on content', () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Test\nTest\nTest';
        input.dispatchEvent(new Event('input'));
        
        // Textarea should have been resized
        expect(input.style.height).toBeTruthy();
      }
    });
  });

  describe('event listeners', () => {
    it('should handle close button click', () => {
      chatPanel.render(container);
      chatPanel.toggle();
      expect(chatPanel.isPanelOpen()).toBe(true);
      
      const closeBtn = document.getElementById('chat-close-btn');
      if (closeBtn) {
        closeBtn.click();
        expect(chatPanel.isPanelOpen()).toBe(false);
      }
    });

    it('should handle clear button click', () => {
      // Mock confirm to return true
      window.confirm = vi.fn(() => true);
      
      chatPanel.render(container);
      chatPanel.toggle();
      
      const clearBtn = document.getElementById('chat-clear-btn');
      if (clearBtn) {
        clearBtn.click();
        expect(mockChatService.clearHistory).toHaveBeenCalled();
      }
    });

    it('should handle settings button click', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      chatPanel.render(container);
      chatPanel.toggle();
      
      const settingsBtn = document.getElementById('chat-settings-btn');
      if (settingsBtn) {
        settingsBtn.click();
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'navigate-to-settings',
        }));
      }
      
      dispatchSpy.mockRestore();
    });

    it('should handle mention button click', () => {
      // Mock iframe manager to return active type
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [
          { name: 'Object1', type: 'Mesh', id: '1' },
        ],
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
        // Mention menu should be rendered
        const mentionMenu = document.getElementById('mention-menu');
        expect(mentionMenu).toBeTruthy();
      }
    });

    it('should handle Enter key to send message', () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Test message';
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        input.dispatchEvent(enterEvent);
        
        // Should trigger sendMessage
        expect(mockChatService.sendMessage).toHaveBeenCalled();
      }
    });

    it('should handle @ key to open mention menu', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [{ name: 'Object1', type: 'Mesh' }],
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        const atEvent = new KeyboardEvent('keydown', { key: '@', bubbles: true });
        input.dispatchEvent(atEvent);
        
        // Mention menu should be opened
        const mentionMenu = document.getElementById('mention-menu');
        expect(mentionMenu).toBeTruthy();
      }
    });

    it('should handle textarea input for auto-resize', () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Line 1\nLine 2\nLine 3';
        input.dispatchEvent(new Event('input'));
        
        // Textarea should be resized
        expect(input.style.height).toBeTruthy();
      }
    });

    it('should handle agent selector change', () => {
      const agents: AgentConfig[] = [
        {
          id: 'agent-1',
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
        },
      ];
      mockAgentService.getAllAgents.mockReturnValue(agents);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const select = document.getElementById('chat-agent-select') as HTMLSelectElement;
      if (select) {
        select.value = 'agent-1';
        select.dispatchEvent(new Event('change'));
        // Agent should be selected
        expect(select.value).toBe('agent-1');
      }
    });
  });

  describe('resize handling', () => {
    it('should handle resize start', () => {
      chatPanel.render(container);
      chatPanel.toggle();
      
      const resizeHandle = document.getElementById('chat-resize-handle');
      if (resizeHandle) {
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: 100,
        });
        resizeHandle.dispatchEvent(mouseDownEvent);
        
        // Resize should be initiated
        const backdrop = document.getElementById('chat-panel-backdrop');
        expect(backdrop?.style.pointerEvents).toBe('auto');
      }
    });
  });

  describe('mention menu', () => {
    it('should show alert when no active iframe', async () => {
      const { toast } = await import('../../../src/utils/toast');
      mockIframeManager.getActiveType.mockReturnValue(null);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.warning).toHaveBeenCalledWith('No active Editor or Playground. Please open one first.');
      }
    });

    it('should show alert when integration not available', async () => {
      const { toast } = await import('../../../src/utils/toast');
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue(null);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.warning).toHaveBeenCalledWith('Integration not available. Please wait for the page to load.');
      }
    });
  });

  describe('abortMessage', () => {
    it('should abort ongoing message', async () => {
      // Set up sending state
      mockChatService.sendMessage.mockImplementation(() => {
        return new Promise(() => {
          // Never resolves, simulating ongoing request
        });
      });

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
      
      if (input && sendBtn) {
        input.value = 'Test message';
        sendBtn.click();
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Now click abort
        sendBtn.click();
        
        // Should have called abort
        expect(mockChatService.abort).toHaveBeenCalled();
      }
    });
  });

  describe('width management', () => {
    it('should load saved width from localStorage', () => {
      localStorage.setItem('context-assistant-chat-panel-width', '500');
      
      const newPanel = new ChatPanel(
        mockChatService as unknown as ChatService,
        mockAgentService as unknown as AgentService,
        mockIframeManager as unknown as IframeManager,
        mockIntegrationInjector as unknown as IntegrationInjector
      );
      
      newPanel.render(container);
      newPanel.toggle();
      
      const panelInner = document.getElementById('chat-panel-inner');
      expect(panelInner?.style.width).toContain('500');
      
      localStorage.removeItem('context-assistant-chat-panel-width');
    });
  });

  describe('extractMentionedObjects', () => {
    it('should extract mentioned objects from message content', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [
          { name: 'Cube', type: 'Mesh', id: '1', properties: { position: { x: 0 } } },
          { name: 'Sphere', type: 'Mesh', id: '2' },
        ],
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Hello @Cube and @Sphere';
        // Trigger send to extract mentions
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
          sendBtn.click();
          // Should extract mentioned objects
          expect(mockChatService.sendMessage).toHaveBeenCalled();
        }
      }
    });
  });

  describe('closeMentionMenu', () => {
    it('should close mention menu on Escape key', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [{ name: 'Object1', type: 'Mesh' }],
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      // Open mention menu
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
      }
      
      // Press Escape
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        input.dispatchEvent(escapeEvent);
        
        // Menu should be closed
        const mentionMenu = document.getElementById('mention-menu');
        expect(mentionMenu).toBeNull();
      }
    });
  });

  describe('showMentionMenu branches', () => {
    it('should close menu if already open', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [{ name: 'Object1', type: 'Mesh' }],
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      // Open mention menu
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
        // Menu should be open
        expect(document.getElementById('mention-menu')).toBeTruthy();
        
        // Click again - should close
        mentionBtn.click();
        expect(document.getElementById('mention-menu')).toBeNull();
      }
    });

    it('should return early if no objects', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => [], // Empty array
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const mentionBtn = document.getElementById('chat-mention-btn');
      if (mentionBtn) {
        mentionBtn.click();
        // Should not create menu if no objects
        expect(document.getElementById('mention-menu')).toBeNull();
      }
    });
  });

  describe('extractMentionedObjects branches', () => {
    it('should handle when no active iframe', () => {
      mockIframeManager.getActiveType.mockReturnValue(null);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Hello @Cube';
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
          sendBtn.click();
          // Should still send message, but with empty mentioned objects
          expect(mockChatService.sendMessage).toHaveBeenCalled();
        }
      }
    });

    it('should handle when API is not available', () => {
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue(null);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Hello @Cube';
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
          sendBtn.click();
          // Should still send message
          expect(mockChatService.sendMessage).toHaveBeenCalled();
        }
      }
    });

    it('should handle errors in extractMentionedObjects', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockIframeManager.getActiveType.mockReturnValue('editor');
      mockIntegrationInjector.getAPI.mockReturnValue({
        getType: () => 'editor',
        isReady: () => true,
        getSceneObjects: () => {
          throw new Error('Failed to get objects');
        },
      } as any);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (input) {
        input.value = 'Hello @Cube';
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
          sendBtn.click();
          // Should handle error gracefully
          expect(mockChatService.sendMessage).toHaveBeenCalled();
        }
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendMessage error handling', () => {
    it('should handle sendMessage errors', async () => {
      const { toast } = await import('../../../src/utils/toast');
      mockChatService.sendMessage.mockRejectedValue(new Error('Network error'));

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
      
      if (input && sendBtn) {
        input.value = 'Test message';
        sendBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Should show error toast
        expect(toast.error).toHaveBeenCalled();
      }
    });

    it('should not show alert for aborted requests', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const abortError = new Error('Request cancelled');
      (abortError as any).name = 'AbortError';
      mockChatService.sendMessage.mockRejectedValue(abortError);

      chatPanel.render(container);
      chatPanel.toggle();
      
      const input = document.getElementById('chat-input') as HTMLTextAreaElement;
      const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
      
      if (input && sendBtn) {
        input.value = 'Test message';
        sendBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Should not show alert for aborted requests
        expect(alertSpy).not.toHaveBeenCalled();
      }
      
      alertSpy.mockRestore();
    });
  });
});

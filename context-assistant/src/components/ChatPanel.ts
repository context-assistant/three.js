import { ChatService } from '../services/ChatService';
import { AgentService } from './../services/AgentService';
import { IframeManager } from '../services/IframeManager';
import { IntegrationInjector } from '../services/IntegrationInjector';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import type { ChatMessage } from '../types';

const PANEL_WIDTH_KEY = 'context-assistant-chat-panel-width';
const DEFAULT_PANEL_WIDTH = 400;
const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;

export class ChatPanel {
  private chatService: ChatService;
  private agentService: AgentService;
  private iframeManager: IframeManager;
  private integrationInjector: IntegrationInjector;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  private isResizing: boolean = false;
  private currentWidth: number = DEFAULT_PANEL_WIDTH;
  private currentAgentId: string | null = null;
  private isSending: boolean = false;
  private mentionMenuOpen: boolean = false;

  constructor(
    chatService: ChatService,
    agentService: AgentService,
    iframeManager: IframeManager,
    integrationInjector: IntegrationInjector
  ) {
    this.chatService = chatService;
    this.agentService = agentService;
    this.iframeManager = iframeManager;
    this.integrationInjector = integrationInjector;
    this.loadWidth();
  }

  render(container: HTMLElement): void {
    this.container = container;
    // Don't call updatePanel here - let toggle handle it
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.container) {
      this.updatePanel();
    }
  }

  isPanelOpen(): boolean {
    return this.isOpen;
  }

  private updatePanel(): void {
    if (!this.container) return;

    if (this.isOpen) {
      this.container.innerHTML = this.getPanelHTML();
      this.attachEventListeners();
      this.loadMessages();
      this.loadAgents();
      this.setupBackdrop();
    } else {
      this.container.innerHTML = '';
    }
  }

  private setupBackdrop(): void {
    const backdrop = document.getElementById('chat-panel-backdrop');
    if (backdrop) {
      // Always enable pointer events to block mouse events from reaching iframe
      backdrop.style.pointerEvents = 'auto';
      
      // Close chat on backdrop click (but not during resize)
      backdrop.addEventListener('click', () => {
        if (!this.isResizing) {
          this.toggle();
        }
      });
      
      // Block mousemove from reaching iframe, but allow mouseup to bubble for resize end
      backdrop.addEventListener('mousemove', (e) => {
        if (this.isResizing) {
          e.stopPropagation(); // Prevent iframe from receiving mousemove
        }
      });
      
      // Don't stop mouseup propagation - let it reach document listener to end resize
      // The backdrop just blocks it from reaching the iframe, but document listeners still work
    }
  }

  private getPanelHTML(): string {
    return `
      <!-- Backdrop overlay to block mouse events and close on click -->
      <div id="chat-panel-backdrop" class="fixed inset-0 bg-black bg-opacity-0 z-40" style="pointer-events: none;"></div>
      
      <div class="fixed right-0 top-0 h-full bg-gray-800 border-l border-gray-700 z-50 flex flex-col" 
           style="width: ${this.currentWidth}px;" id="chat-panel-inner">
        <!-- Header -->
        <div class="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 class="text-xl font-bold">AI Assistant</h2>
          <button id="chat-close-btn" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Resize Handle -->
        <div id="chat-resize-handle" 
             class="absolute left-0 top-0 bottom-0 w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors"
             style="z-index: 10;"></div>

        <!-- Messages Container -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Messages will be rendered here -->
        </div>

        <!-- Input Area -->
        <div class="border-t border-gray-700 bg-gray-900 p-4">
          <!-- Agent Selector -->
          <div class="mb-2">
            <select id="chat-agent-select" 
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select agent...</option>
              <!-- Agents will be populated -->
            </select>
          </div>

          <!-- Textarea Container -->
          <div class="relative">
            <textarea
              id="chat-input"
              rows="4"
              class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            ></textarea>
            
            <!-- Bottom Row Overlay -->
            <div class="absolute bottom-2 right-2 flex items-center gap-2">
              <button id="chat-mention-btn" 
                      class="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Mention scene object (@)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button id="chat-settings-btn" 
                      class="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Settings">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button id="chat-clear-btn" 
                      class="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Clear chat">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button id="chat-send-btn" 
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send message">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggle());
    }

    // Resize handle
    const resizeHandle = document.getElementById('chat-resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
    }

    // Send/Abort button
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (this.isSending) {
          this.abortMessage();
        } else {
          this.sendMessage();
        }
      });
    }

    // Input textarea
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (input) {
      // Auto-resize textarea
      input.addEventListener('input', () => this.autoResizeTextarea(input));
      
      // Send on Enter (but not Shift+Enter) - only if not already sending
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !this.isSending) {
          e.preventDefault();
          this.sendMessage();
        } else if (e.key === '@') {
          // Open mention menu when @ is typed
          e.preventDefault();
          this.showMentionMenu();
        } else if (e.key === 'Escape' && this.mentionMenuOpen) {
          // Close mention menu on Escape
          this.closeMentionMenu();
        }
      });

      // Track cursor position for mention insertion
      input.addEventListener('click', () => {
        this.updateCursorPosition(input);
      });
      input.addEventListener('keyup', () => {
        this.updateCursorPosition(input);
      });
    }

    // Agent selector
    const agentSelect = document.getElementById('chat-agent-select') as HTMLSelectElement;
    if (agentSelect) {
      agentSelect.addEventListener('change', () => {
        this.currentAgentId = agentSelect.value || null;
      });
    }

    // Clear button
    const clearBtn = document.getElementById('chat-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all chat messages?')) {
          this.chatService.clearHistory();
          this.loadMessages();
        }
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('chat-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        // Navigate to settings - this will be handled by App
        window.dispatchEvent(new CustomEvent('navigate-to-settings'));
      });
    }

    // Mention button
    const mentionBtn = document.getElementById('chat-mention-btn');
    if (mentionBtn) {
      mentionBtn.addEventListener('click', () => this.showMentionMenu());
    }
  }

  private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    // Reset height to calculate scroll height
    textarea.style.height = 'auto';
    
    // Calculate new height (min 4 rows, max 11 rows)
    const lineHeight = 24; // Approximate line height in pixels
    const minRows = 4;
    const maxRows = 11;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }

  private startResize(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple simultaneous resize operations
    if (this.isResizing) {
      return;
    }
    
    this.isResizing = true;
    const startX = e.clientX;
    const startWidth = this.currentWidth;

    // Ensure backdrop is blocking events
    const backdrop = document.getElementById('chat-panel-backdrop');
    if (backdrop) {
      backdrop.style.pointerEvents = 'auto';
    }

    const doResize = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const diff = startX - e.clientX; // Inverted because we're resizing from right
      let newWidth = startWidth + diff;
      newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
      this.currentWidth = newWidth;
      this.updatePanelWidth(newWidth);
    };

    const stopResize = () => {
      // Clean up resize state
      this.isResizing = false;
      document.removeEventListener('mousemove', doResize, { capture: true });
      document.removeEventListener('mouseup', stopResize, { capture: true });
      window.removeEventListener('mouseup', stopResize, { capture: true }); // Also remove window listener as fallback
      this.saveWidth();
    };

    // Use capture phase to catch events before they reach iframe
    // Also attach to window as fallback in case document doesn't catch it
    document.addEventListener('mousemove', doResize, { capture: true, passive: false });
    document.addEventListener('mouseup', stopResize, { capture: true, passive: false });
    window.addEventListener('mouseup', stopResize, { capture: true, passive: false }); // Fallback
  }

  private updatePanelWidth(width: number): void {
    const panelInner = document.getElementById('chat-panel-inner');
    if (panelInner) {
      panelInner.style.width = `${width}px`;
    }
  }

  private saveWidth(): void {
    localStorage.setItem(PANEL_WIDTH_KEY, this.currentWidth.toString());
  }

  private loadWidth(): void {
    const saved = localStorage.getItem(PANEL_WIDTH_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        this.currentWidth = width;
      }
    }
  }

  private async sendMessage(): Promise<void> {
    // Prevent multiple simultaneous sends
    if (this.isSending) {
      return;
    }

    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
    
    if (!input || !sendBtn) return;

    const content = input.value.trim();
    if (!content) return;

    // Extract mentioned objects from content before clearing input
    const mentionedObjects = this.extractMentionedObjects(content);

    // Set sending state
    this.isSending = true;

    // Clear input and disable it
    input.value = '';
    input.disabled = true;
    this.autoResizeTextarea(input);

    // Change button to abort button
    sendBtn.disabled = false; // Keep enabled so it can be clicked to abort
    sendBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    sendBtn.title = 'Abort request';
    sendBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    sendBtn.classList.add('bg-red-600', 'hover:bg-red-700');

    try {
      await this.chatService.sendMessage(
        content,
        this.currentAgentId || undefined,
        () => {
          this.loadMessages(); // Reload to show streaming updates
        },
        mentionedObjects
      );
    } catch (error: unknown) {
      // Don't show error toast for aborted requests
      const err = error as { name?: string; message?: string };
      if (err?.name !== 'AbortError' && err?.message !== 'Request cancelled') {
        logger.error('Failed to send message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to send message: ${errorMessage}`);
      }
    } finally {
      // Reset UI state
      this.isSending = false;
      input.disabled = false;
      input.focus();
      
      // Reset button to send button
      sendBtn.disabled = false;
      sendBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      `;
      sendBtn.title = 'Send message';
      sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      sendBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      
      this.loadMessages();
    }
  }

  private abortMessage(): void {
    if (!this.isSending) {
      return;
    }

    // Abort the current request
    this.chatService.abort();
    
    // Update UI immediately
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
    
    if (input) {
      input.disabled = false;
      input.focus();
    }
    
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      `;
      sendBtn.title = 'Send message';
      sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      sendBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }
    
    this.isSending = false;
    this.loadMessages();
  }

  private loadMessages(): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messages = this.chatService.getMessages();

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p>No messages yet. Start a conversation!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private renderMessage(message: ChatMessage): string {
    const isUser = message.role === 'user';
    const timestamp = new Date(message.timestamp).toLocaleTimeString();

    if (isUser) {
      return `
        <div class="flex justify-end">
          <div class="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
            <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
            <p class="text-xs text-blue-200 mt-1">${timestamp}</p>
          </div>
        </div>
      `;
    } else {
      const avatar = message.agentAvatar 
        ? `<img src="${this.escapeHtml(message.agentAvatar)}" alt="${this.escapeHtml(message.agentName || 'Assistant')}" class="w-8 h-8 rounded-full object-cover" />`
        : `<div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">${(message.agentName || 'AI')[0].toUpperCase()}</div>`;

      return `
        <div class="flex gap-3">
          ${avatar}
          <div class="flex-1">
            <div class="bg-gray-700 text-white rounded-lg px-4 py-2">
              <p class="text-xs text-gray-400 mb-1">${this.escapeHtml(message.agentName || 'Assistant')}</p>
              <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
              <p class="text-xs text-gray-400 mt-1">${timestamp}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  private loadAgents(): void {
    const agents = this.agentService.getAllAgents();
    const select = document.getElementById('chat-agent-select') as HTMLSelectElement;
    if (!select) return;

    // Clear existing options except first
    while (select.options.length > 1) {
      select.remove(1);
    }

    agents.forEach(agent => {
      const option = document.createElement('option');
      option.value = agent.id;
      option.textContent = agent.name + (agent.isDefault ? ' (Default)' : '');
      select.appendChild(option);
    });

    // Set default agent
    const defaultAgent = this.agentService.getDefaultAgent();
    if (defaultAgent) {
      select.value = defaultAgent.id;
      this.currentAgentId = defaultAgent.id;
    }
  }

  private cursorPosition: number = 0;

  private updateCursorPosition(input: HTMLTextAreaElement): void {
    this.cursorPosition = input.selectionStart || 0;
  }

  private async showMentionMenu(): Promise<void> {
    if (this.mentionMenuOpen) {
      this.closeMentionMenu();
      return;
    }

    // Get active iframe type
    const activeType = this.iframeManager.getActiveType();
    if (!activeType || (activeType !== 'editor' && activeType !== 'playground')) {
      toast.warning('No active Editor or Playground. Please open one first.');
      return;
    }

    // Get integration API
    const api = this.integrationInjector.getAPI(activeType);
    if (!api || !api.getSceneObjects) {
      toast.warning('Integration not available. Please wait for the page to load.');
      return;
    }

    try {
      const objects = api.getSceneObjects();
      if (!objects || objects.length === 0) {
        return;
      }

      this.mentionMenuOpen = true;
      this.renderMentionMenu(objects);
    } catch (error) {
      logger.error('Failed to get scene objects:', error);
      toast.error('Failed to get scene objects. Make sure the Editor/Playground is loaded.');
    }
  }

  private renderMentionMenu(objects: Array<{ name: string; type: string; id?: string; uuid?: string; children?: unknown[] }>): void {
    const inputContainer = document.querySelector('#chat-input')?.parentElement;
    if (!inputContainer) return;

    // Remove existing menu if any
    const existingMenu = document.getElementById('mention-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create menu
    const menu = document.createElement('div');
    menu.id = 'mention-menu';
    menu.className = 'absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto overflow-x-hidden z-50';
    menu.innerHTML = `
      <div class="p-2">
        <input
          type="text"
          id="mention-search"
          placeholder="Search objects..."
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          autofocus
        />
        <div id="mention-list" class="space-y-1">
          ${this.renderObjectList(objects)}
        </div>
      </div>
    `;

    inputContainer.style.position = 'relative';
    inputContainer.appendChild(menu);

    // Setup search
    const searchInput = document.getElementById('mention-search') as HTMLInputElement;
    const listContainer = document.getElementById('mention-list');
    
    if (searchInput && listContainer) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        const filtered = this.filterObjects(objects, query);
        listContainer.innerHTML = this.renderObjectList(filtered);
        this.attachMentionItemListeners();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeMentionMenu();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.focusNextMentionItem(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.focusNextMentionItem(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const focused = document.querySelector('#mention-list .mention-item.focused');
          if (focused) {
            (focused as HTMLElement).click();
          }
        }
      });
    }

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleMentionOutsideClick, true);
    }, 100);

    this.attachMentionItemListeners();
  }

  private handleMentionOutsideClick = (e: MouseEvent): void => {
    const menu = document.getElementById('mention-menu');
    const target = e.target as HTMLElement;
    
    if (menu && !menu.contains(target) && target.id !== 'chat-mention-btn') {
      this.closeMentionMenu();
    }
  };

  private attachMentionItemListeners(): void {
    document.querySelectorAll('.mention-item').forEach((item) => {
      item.addEventListener('click', () => {
        const objectName = item.getAttribute('data-object-name');
        if (objectName) {
          this.insertMention(objectName);
        }
      });

      item.addEventListener('mouseenter', () => {
        document.querySelectorAll('.mention-item').forEach(i => i.classList.remove('focused'));
        item.classList.add('focused');
      });
    });
  }

  private focusNextMentionItem(direction: number): void {
    const items = Array.from(document.querySelectorAll('.mention-item'));
    const currentIndex = items.findIndex(item => item.classList.contains('focused'));
    let nextIndex = currentIndex + direction;
    
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;
    
    items.forEach(item => item.classList.remove('focused'));
    if (items[nextIndex]) {
      items[nextIndex].classList.add('focused');
      items[nextIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private flattenObjects(objects: Array<{ name: string; type: string; id?: string; uuid?: string; children?: unknown[] }>, level: number = 0): Array<{ name: string; type: string; id?: string; uuid?: string; level: number }> {
    const flattened: Array<{ name: string; type: string; id?: string; uuid?: string; level: number }> = [];
    
    objects.forEach(obj => {
      const flatObj = { ...obj, level };
      delete flatObj.children; // Remove children from flat object
      flattened.push(flatObj);
      
      // Add children recursively
      if (obj.children && obj.children.length > 0) {
        flattened.push(...this.flattenObjects(obj.children, level + 1));
      }
    });
    
    return flattened;
  }

  private renderObjectList(objects: Array<{ name: string; type: string; id?: string; uuid?: string; level?: number }>): string {
    if (objects.length === 0) {
      return '<div class="px-3 py-2 text-gray-400 text-sm">No objects found</div>';
    }

    // Flatten nested structure for display
    const flattened = this.flattenObjects(objects);

    return flattened.map((obj, index) => {
      const displayName = obj.name || `Unnamed ${obj.type}`;
      const indent = obj.level || 0;
      return `
        <div
          class="mention-item px-3 py-2 hover:bg-gray-700 cursor-pointer rounded flex items-center gap-2 ${index === 0 ? 'focused' : ''}"
          data-object-name="${this.escapeHtml(displayName)}"
          data-object-type="${this.escapeHtml(obj.type)}"
          style="padding-left: ${(indent * 16) + 12}px;"
        >
          <span class="text-blue-400 font-semibold">${this.escapeHtml(displayName)}</span>
          <span class="text-gray-500 text-xs">${this.escapeHtml(obj.type)}</span>
        </div>
      `;
    }).join('');
  }

  private filterObjects(objects: Array<{ name: string; type: string; children?: unknown[] }>, query: string): Array<{ name: string; type: string; children?: unknown[] }> {
    if (!query) return objects;
    
    const searchInObject = (obj: { name?: string; type?: string; children?: unknown[] }): boolean => {
      const nameMatch = (obj.name || '').toLowerCase().includes(query);
      const typeMatch = (obj.type || '').toLowerCase().includes(query);
      
      if (nameMatch || typeMatch) {
        return true;
      }
      
      // Check children recursively
      if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
        return obj.children.some((child) => searchInObject(child as { name?: string; type?: string; children?: unknown[] }));
      }
      
      return false;
    };

    const filterRecursive = (objList: Array<{ name: string; type: string; children?: unknown[] }>): Array<{ name: string; type: string; children?: unknown[] }> => {
      const result: Array<{ name: string; type: string; children?: unknown[] }> = [];
      
      objList.forEach(obj => {
        const matches = searchInObject(obj);
        if (matches) {
          // Include object and filter its children
          const filteredObj = { ...obj };
          if (obj.children && obj.children.length > 0) {
            filteredObj.children = filterRecursive(obj.children);
          }
          result.push(filteredObj);
        } else if (obj.children && obj.children.length > 0) {
          // Object doesn't match but might have matching children
          const filteredChildren = filterRecursive(obj.children);
          if (filteredChildren.length > 0) {
            result.push({ ...obj, children: filteredChildren });
          }
        }
      });
      
      return result;
    };

    return filterRecursive(objects);
  }

  private insertMention(objectName: string): void {
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (!input) return;

    const mention = `@${objectName} `;
    const start = this.cursorPosition;
    const end = input.selectionEnd || start;
    const textBefore = input.value.substring(0, start);
    const textAfter = input.value.substring(end);
    
    input.value = textBefore + mention + textAfter;
    const newPosition = start + mention.length;
    input.selectionStart = input.selectionEnd = newPosition;
    this.cursorPosition = newPosition;
    input.focus();
    
    this.autoResizeTextarea(input);
    this.closeMentionMenu();
  }

  private extractMentionedObjects(content: string): Array<{ name: string; type: string; properties?: Record<string, unknown> }> {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    const mentionedNames = Array.from(matches, m => m[1]);
    
    if (mentionedNames.length === 0) {
      return [];
    }

    // Get active iframe and fetch object details
    const activeType = this.iframeManager.getActiveType();
    if (!activeType || (activeType !== 'editor' && activeType !== 'playground')) {
      return [];
    }

    const api = this.integrationInjector.getAPI(activeType);
    if (!api || !api.getSceneObjects) {
      return [];
    }

    try {
      const allObjects = api.getSceneObjects();
      const flattened = this.flattenObjects(allObjects);
      
      return mentionedNames.map(name => {
        const obj = flattened.find(o => o.name === name);
        if (obj) {
          return {
            name: obj.name,
            type: obj.type,
            properties: obj.properties,
          };
        }
        return { name, type: 'Unknown' };
      }).filter(obj => obj.type !== 'Unknown' || mentionedNames.includes(obj.name));
    } catch (error) {
      console.error('Failed to extract mentioned objects:', error);
      return mentionedNames.map(name => ({ name, type: 'Unknown' }));
    }
  }

  private closeMentionMenu(): void {
    const menu = document.getElementById('mention-menu');
    if (menu) {
      menu.remove();
    }
    this.mentionMenuOpen = false;
    document.removeEventListener('click', this.handleMentionOutsideClick, true);
    
    // Return focus to input
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}



import './style.css';
import { IframeManager } from './services/IframeManager';
import { IntegrationInjector } from './services/IntegrationInjector';
import { SettingsView } from './components/SettingsView';
import { ChatPanel } from './components/ChatPanel';
import { ChatService } from './services/ChatService';
import { AgentService } from './services/AgentService';
import { logger } from './utils/logger';
import { analytics } from './utils/analytics';
import type { IframeType } from './types';

export class App {
  private currentView: string = 'home';
  private iframeManager: IframeManager = new IframeManager();
  private integrationInjector: IntegrationInjector = new IntegrationInjector();
  private settingsView: SettingsView = new SettingsView();
  private chatService: ChatService = new ChatService();
  private agentService: AgentService = new AgentService();
  private chatPanel: ChatPanel;

  constructor() {
    this.chatPanel = new ChatPanel(
      this.chatService,
      this.agentService,
      this.iframeManager,
      this.integrationInjector
    );
  }

  init(): void {
    this.render();
    this.setupEventListeners();
    this.setupRouting();
    this.setupChatClickOutside();
    
    // Track initial page view
    const initialView = this.getViewFromUrl();
    const pageTitle = initialView.charAt(0).toUpperCase() + initialView.slice(1);
    analytics.trackPageView(`/${initialView}`, pageTitle);
    
    // Load initial view from URL
    this.loadViewFromUrl();
  }

  private setupRouting(): void {
    // Handle hash changes (browser back/forward, direct navigation)
    window.addEventListener('hashchange', () => {
      const view = this.getViewFromUrl();
      if (view) {
        this.navigateToView(view, false); // Don't update URL, we're responding to hash change
      }
    });
  }

  private getViewFromUrl(): string {
    const hash = window.location.hash.substring(1); // Remove leading #
    if (!hash || hash === '') {
      return 'home';
    }
    return ['home', 'editor', 'playground', 'manual', 'docs', 'settings'].includes(hash) ? hash : 'home';
  }

  private loadViewFromUrl(): void {
    const view = this.getViewFromUrl();
    this.navigateToView(view, false); // Don't update URL, we're loading from it
  }

  private setupChatClickOutside(): void {
    // Close chat when clicking outside - handled by backdrop in ChatPanel
    // This method is kept for potential future use but the backdrop handles it now
  }

  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex flex-col">
        <!-- Navbar -->
        <nav class="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <a href="#" class="text-xl font-bold text-white hover:text-gray-300" data-view="home">
                Context Assistant
              </a>
              <div class="flex space-x-4">
                <a href="#" class="text-gray-300 hover:text-white transition-colors" data-view="editor">Editor</a>
                <a href="#" class="text-gray-300 hover:text-white transition-colors" data-view="playground">Playground</a>
                <a href="#" class="text-gray-300 hover:text-white transition-colors" data-view="manual">Manual</a>
                <a href="#" class="text-gray-300 hover:text-white transition-colors" data-view="docs">Documentation</a>
                <a href="#" class="text-gray-300 hover:text-white transition-colors" data-view="settings">Settings</a>
              </div>
            </div>
            <button 
              id="chat-toggle" 
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              aria-label="Toggle AI Assistant"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>
        </nav>

        <!-- Main Content Area -->
        <main id="main-content" class="flex-1 overflow-y-auto">
          ${this.renderView()}
        </main>

        <!-- Chat Panel -->
        <div id="chat-panel"></div>
      </div>
    `;
  }

  private renderView(): string {
    const basePath = this.getBasePath();
    switch (this.currentView) {
      case 'editor':
        return this.renderIframeView('editor', `${basePath}/editor/index.html`);
      case 'playground':
        return this.renderIframeView('playground', `${basePath}/playground/index.html`);
      case 'manual':
        return this.renderIframeView('manual', `${basePath}/manual/index.html`);
      case 'docs':
        return this.renderIframeView('docs', `${basePath}/docs/index.html`);
      case 'settings':
        return this.renderSettingsView();
      default:
        return this.renderHomeView();
    }
  }

  private renderIframeView(type: string, _url: string): string {
    return `
      <div id="iframe-container-${type}" class="h-full w-full">
        <!-- Iframe will be injected here -->
      </div>
    `;
  }

  private renderHomeView(): string {
    return `
      <div class="container mx-auto px-8 py-12 max-w-4xl">
        <h1 class="text-4xl font-bold mb-6">three.js - Enhanced with Local AI Assistant</h1>
        
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <p class="text-lg text-gray-300 mb-4">
            This is a fork of the original <a href="https://github.com/mrdoob/three.js" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">three.js</a> project by <a href="https://github.com/mrdoob" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">mrdoob</a> and the three.js community, enhanced with <strong>local AI support</strong> that enables an intelligent learning assistant.
          </p>
          <p class="text-lg text-gray-300">
            The assistant helps you learn three.js with full context of the entire three.js documentation, manuals, and your scene. All processing happens locally on your machine using Ollama - no data is sent to external servers.
          </p>
        </div>

        <div class="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-8">
          <h2 class="text-2xl font-bold mb-3 flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Getting Started with AI Features
          </h2>
          <p class="text-gray-300 mb-3">
            To use the AI assistant features, you'll need to:
          </p>
          <ol class="list-decimal list-inside space-y-2 text-gray-300 ml-2">
            <li><strong>Install Ollama:</strong> Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">ollama.ai</a> and install it for your operating system</li>
            <li><strong>Download a Model:</strong> Pull a compatible LLM model. Recommended options:
              <ul class="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-400">
                <li><code class="bg-gray-900 px-2 py-1 rounded">ollama pull llama3.2:7b</code> - Balanced (recommended)</li>
                <li><code class="bg-gray-900 px-2 py-1 rounded">ollama pull deepseek-coder:6.7b</code> - Code-specialized</li>
                <li><code class="bg-gray-900 px-2 py-1 rounded">ollama pull qwen2.5-coder:7b</code> - Excellent for coding</li>
              </ul>
            </li>
            <li><strong>Configure in Settings:</strong> Open Settings (gear icon) and configure your Ollama endpoint (default: <code class="bg-gray-900 px-2 py-1 rounded">http://localhost:11434</code>)</li>
          </ol>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <a href="#" data-view="editor" class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
            <h2 class="text-2xl font-bold mb-2">Editor</h2>
            <p class="text-gray-400">Create and edit 3D scenes with the three.js editor</p>
          </a>
          
          <a href="#" data-view="playground" class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
            <h2 class="text-2xl font-bold mb-2">Playground</h2>
            <p class="text-gray-400">Experiment with node-based shader editing</p>
          </a>
          
          <a href="#" data-view="manual" class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
            <h2 class="text-2xl font-bold mb-2">Manual</h2>
            <p class="text-gray-400">Learn three.js with comprehensive guides and tutorials</p>
          </a>
          
          <a href="#" data-view="docs" class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
            <h2 class="text-2xl font-bold mb-2">Documentation</h2>
            <p class="text-gray-400">Browse the complete three.js API reference</p>
          </a>
        </div>

        <div class="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-6">
          <h2 class="text-2xl font-bold mb-3">AI Assistant Features</h2>
          <ul class="list-disc list-inside space-y-2 text-gray-300">
            <li>Context-aware AI assistance powered by local Ollama - keeps your code private</li>
            <li>Full access to three.js documentation, manuals, and API reference</li>
            <li>Scene understanding - works directly with your three.js Editor and Playground scenes</li>
            <li>Customizable AI agents with different personalities and configurations</li>
            <li>Scene object @mentioning for precise, context-specific help</li>
            <li>No backend required - everything runs locally on your machine</li>
          </ul>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 class="text-xl font-bold mb-3">Acknowledgments</h2>
          <p class="text-gray-300">
            Special thanks to <a href="https://github.com/mrdoob" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">mrdoob</a> and all the <a href="https://github.com/mrdoob/three.js" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">three.js</a> contributors for creating this amazing 3D library. 
            The AI assistant enhancement is built on top of their excellent work.
          </p>
        </div>
      </div>
    `;
  }

  private renderSettingsView(): string {
    return `
      <div id="settings-container" class="h-full overflow-y-auto">
        <!-- Settings will be rendered here -->
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Navigation - use event delegation to avoid duplicate listeners
    const navbar = document.querySelector('nav');
    if (navbar) {
      // Remove old listener if exists
      navbar.removeEventListener('click', this.handleNavClick);
      navbar.addEventListener('click', this.handleNavClick);
    }

    // Chat toggle - attach once to navbar (persists across navigation)
    const chatToggle = document.getElementById('chat-toggle');
    if (chatToggle) {
      // Remove old listener if exists
      chatToggle.removeEventListener('click', this.handleChatToggle);
      chatToggle.addEventListener('click', this.handleChatToggle);
    }

    // Listen for settings navigation
    window.removeEventListener('navigate-to-settings', this.handleNavigateToSettings);
    window.addEventListener('navigate-to-settings', this.handleNavigateToSettings);
  }

  private handleNavClick = (e: MouseEvent): void => {
    const target = (e.target as HTMLElement).closest('[data-view]');
    if (target) {
      e.preventDefault();
      const view = target.getAttribute('data-view');
      if (view) {
        this.navigateToView(view);
      }
    }
  };

  private handleChatToggle = (): void => {
    this.toggleChatPanel();
  };

  private handleNavigateToSettings = (): void => {
    this.navigateToView('settings');
    this.toggleChatPanel(); // Close chat when opening settings
  };

  private navigateToView(view: string, updateUrl: boolean = true): void {
    this.currentView = view;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = this.renderView();
      // Re-attach event listeners for new content (but chat toggle persists)
      this.setupEventListeners();
      
      // Update URL using hash-based routing
      if (updateUrl) {
        const hash = view === 'home' ? '' : `#${view}`;
        window.location.hash = hash;
      }
      
      // Track page view
      const pageTitle = view.charAt(0).toUpperCase() + view.slice(1);
      analytics.trackPageView(`/${view}`, pageTitle);
      
      // Load iframe if needed
      if (['editor', 'playground', 'manual', 'docs'].includes(view)) {
        this.loadIframe(view as IframeType['type']);
      } else if (view === 'settings') {
        // Render settings view
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) {
          this.settingsView.render(settingsContainer);
        }
      }
    }
  }

  private getBasePath(): string {
    // Detect base path from current location
    // In production on GitHub Pages, it will be /three.js/ or /three.js
    // Locally, it will be /
    const pathname = window.location.pathname;
    if (pathname.startsWith('/three.js/') || pathname === '/three.js') {
      return '/three.js';
    }
    return '';
  }

  private async loadIframe(type: IframeType['type']): Promise<void> {
    const basePath = this.getBasePath();
    const urls: Record<IframeType['type'], string> = {
      editor: `${basePath}/editor/index.html`,
      playground: `${basePath}/playground/index.html`,
      manual: `${basePath}/manual/index.html`,
      docs: `${basePath}/docs/index.html`,
    };

    const url = urls[type];
    const container = document.getElementById(`iframe-container-${type}`);
    
    if (!container) return;

    try {
      // Check if iframe already exists
      if (this.iframeManager.isIframeLoaded(type)) {
        this.iframeManager.switchTo(type);
        const existingIframe = this.iframeManager.getActiveIframe();
        if (existingIframe && container) {
          container.innerHTML = '';
          container.appendChild(existingIframe);
        }
        return;
      }

      // Show loading state
      container.innerHTML = `
        <div id="iframe-loading" class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p class="text-gray-400">Loading ${type}...</p>
          </div>
        </div>
      `;
      
      // Create new iframe - must append to DOM first for it to load
      const iframe = document.createElement('iframe');
      iframe.id = `iframe-${type}`;
      iframe.src = url;
      iframe.className = 'w-full h-full border-0';
      iframe.style.display = 'none'; // Hide until loaded

      const navHeight = document.querySelector('nav')?.clientHeight || 0;
      
      window.addEventListener('resize', () => {
        iframe.style.height = `${window.innerHeight - (navHeight + 1)}px`;
      });

      // Emit a window resize event to trigger resizing logic
      window.dispatchEvent(new Event('resize'));
      
      container.appendChild(iframe);
      
      // Wait for iframe to load, then register it
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Check if iframe actually loaded even if event didn't fire
          try {
            if (iframe.contentWindow && iframe.contentDocument) {
              // Iframe seems to have loaded, proceed anyway
              clearTimeout(timeout);
              const loadingEl = document.getElementById('iframe-loading');
              if (loadingEl) {
                loadingEl.remove();
              }
              iframe.style.display = 'block';
              this.iframeManager.registerIframe(type, iframe);
              logger.warn(`Iframe ${type} loaded but load event didn't fire - proceeding anyway`);
              resolve();
            } else {
              reject(new Error('Iframe load timeout after 60 seconds'));
            }
          } catch (e) {
            // Cross-origin or other error checking contentWindow
            reject(new Error('Iframe load timeout after 60 seconds'));
          }
        }, 60000); // Increased to 60 seconds
        
        const handleLoad = () => {
          clearTimeout(timeout);
          // Remove loading indicator
          const loadingEl = document.getElementById('iframe-loading');
          if (loadingEl) {
            loadingEl.remove();
          }
          // Show iframe
          iframe.style.display = 'block';
          // Register with iframe manager
          this.iframeManager.registerIframe(type, iframe);
          resolve();
        };
        
        iframe.addEventListener('load', handleLoad, { once: true });
        
        // Also check if already loaded (in case event fired before listener attached)
        if (iframe.contentWindow && iframe.contentDocument?.readyState === 'complete') {
          handleLoad();
          return;
        }
        
        iframe.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load iframe: ${url}. Check console for details.`));
        }, { once: true });
      });
      
      // Inject integration script after iframe loads
      try {
        await this.integrationInjector.injectIntegration(iframe, type);
        console.log(`Integration injected for ${type}`);
      } catch (integrationError) {
        console.warn(`Failed to inject integration for ${type}:`, integrationError);
        // Continue even if integration fails
      }
    } catch (error) {
      console.error(`Failed to load ${type} iframe:`, error);
      if (container) {
        container.innerHTML = `
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <p class="text-red-400 mb-2">Failed to load ${type}</p>
              <p class="text-gray-500 text-sm">${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          </div>
        `;
      }
    }
  }

  private toggleChatPanel(): void {
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
      this.chatPanel.render(chatPanel);
      this.chatPanel.toggle();
    }
  }
}


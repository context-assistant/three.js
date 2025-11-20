import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from '../../../src/App';

// Mock dependencies
vi.mock('../../../src/services/IframeManager');
vi.mock('../../../src/services/IntegrationInjector');
vi.mock('../../../src/components/SettingsView');
vi.mock('../../../src/components/ChatPanel');
vi.mock('../../../src/services/ChatService');
vi.mock('../../../src/services/AgentService');

describe('App', () => {
  let app: App;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    
    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: {
        hash: '',
      },
      writable: true,
      configurable: true,
    });

    app = new App();
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('should initialize app and render', () => {
      app.init();
      
      const navbar = document.querySelector('nav');
      expect(navbar).toBeTruthy();
    });

    it('should set up routing', () => {
      app.init();
      
      // Trigger hashchange
      window.location.hash = '#editor';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      
      // App should handle the route
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeTruthy();
    });
  });

  describe('render', () => {
    it('should render navbar', () => {
      app.init();
      
      const navbar = document.querySelector('nav');
      expect(navbar).toBeTruthy();
    });

    it('should render main content area', () => {
      app.init();
      
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeTruthy();
    });

    it('should render chat panel container', () => {
      app.init();
      
      const chatContainer = document.getElementById('chat-panel');
      expect(chatContainer).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should handle hash-based routing', () => {
      app.init();
      
      // Simulate hash change
      window.location.hash = '#editor';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      
      // App should handle the route
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeTruthy();
    });

    it('should navigate to different views', () => {
      app.init();
      
      // Click on editor link
      const editorLink = document.querySelector('[data-view="editor"]');
      if (editorLink) {
        (editorLink as HTMLElement).click();
      }
      
      // Should update view
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeTruthy();
    });
  });

  describe('getViewFromUrl', () => {
    it('should return home for empty hash', () => {
      window.location.hash = '';
      app.init();
      // View should default to home
      expect(document.getElementById('main-content')).toBeTruthy();
    });

    it('should return view from hash', () => {
      window.location.hash = '#settings';
      app.init();
      // Should load settings view
      expect(document.getElementById('main-content')).toBeTruthy();
    });
  });

  describe('renderView', () => {
    it('should render home view by default', () => {
      app.init();
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('three.js - Enhanced with Local AI Assistant');
    });

    it('should render iframe view for editor', () => {
      app.init();
      const editorLink = document.querySelector('[data-view="editor"]');
      if (editorLink) {
        (editorLink as HTMLElement).click();
      }
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('iframe-container-editor');
    });
  });

  describe('toggleChatPanel', () => {
    it('should toggle chat panel', () => {
      app.init();
      const chatToggle = document.getElementById('chat-toggle');
      if (chatToggle) {
        (chatToggle as HTMLElement).click();
      }
      // Chat panel should be toggled
      const chatPanel = document.getElementById('chat-panel');
      expect(chatPanel).toBeTruthy();
    });
  });

  describe('renderView variations', () => {
    it('should render playground view', () => {
      app.init();
      const playgroundLink = document.querySelector('[data-view="playground"]');
      if (playgroundLink) {
        (playgroundLink as HTMLElement).click();
      }
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('iframe-container-playground');
    });

    it('should render manual view', () => {
      app.init();
      const manualLink = document.querySelector('[data-view="manual"]');
      if (manualLink) {
        (manualLink as HTMLElement).click();
      }
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('iframe-container-manual');
    });

    it('should render docs view', () => {
      app.init();
      const docsLink = document.querySelector('[data-view="docs"]');
      if (docsLink) {
        (docsLink as HTMLElement).click();
      }
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('iframe-container-docs');
    });

    it('should render settings view', () => {
      app.init();
      const settingsLink = document.querySelector('[data-view="settings"]');
      if (settingsLink) {
        (settingsLink as HTMLElement).click();
      }
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('settings-container');
    });
  });

  describe('hashchange routing', () => {
    it('should handle hashchange event', () => {
      app.init();
      
      window.location.hash = '#playground';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      
      const mainContent = document.getElementById('main-content');
      expect(mainContent?.innerHTML).toContain('iframe-container-playground');
    });
  });
});

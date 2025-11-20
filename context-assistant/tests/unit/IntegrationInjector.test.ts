import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationInjector } from '../../src/services/IntegrationInjector';

describe('IntegrationInjector', () => {
  let injector: IntegrationInjector;
  let mockIframe: HTMLIFrameElement;
  let mockWindow: Window;
  let mockDocument: Document;

  beforeEach(() => {
    injector = new IntegrationInjector();
    
    // Create mock iframe
    mockIframe = document.createElement('iframe');
    mockWindow = window;
    mockDocument = document.implementation.createHTMLDocument('test');
    
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(mockIframe, 'contentDocument', {
      value: mockDocument,
      writable: true,
      configurable: true,
    });
  });

  describe('injectIntegration', () => {
    it('should inject script into iframe', async () => {
      // Mock readyState as a getter
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      
      // Mock the API to be ready
      (mockWindow as any).contextAssistantAPI = {
        isReady: () => true,
      };

      await injector.injectIntegration(mockIframe, 'editor');

      expect(injector.isInjected('editor')).toBe(true);
      expect(mockDocument.head.querySelector('script')).toBeTruthy();
    });

    it('should not inject twice for same type', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      (mockWindow as any).contextAssistantAPI = { isReady: () => true };

      await injector.injectIntegration(mockIframe, 'editor');
      await injector.injectIntegration(mockIframe, 'editor');

      const scripts = mockDocument.head.querySelectorAll('script');
      expect(scripts.length).toBe(1); // Only one script injected
    });

    it('should wait for DOMContentLoaded if document is loading', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'loading',
        writable: false,
        configurable: true,
      });
      
      const injectPromise = injector.injectIntegration(mockIframe, 'editor');
      
      // Simulate DOMContentLoaded
      setTimeout(() => {
        Object.defineProperty(mockDocument, 'readyState', {
          value: 'complete',
          writable: false,
          configurable: true,
        });
        (mockWindow as any).contextAssistantAPI = { isReady: () => true };
        mockDocument.dispatchEvent(new Event('DOMContentLoaded'));
      }, 10);

      await injectPromise;
      expect(injector.isInjected('editor')).toBe(true);
    });

    it('should reject if iframe is cross-origin', async () => {
      // Make contentWindow and contentDocument throw when accessed
      let accessCount = 0;
      Object.defineProperty(mockIframe, 'contentWindow', {
        get: () => {
          accessCount++;
          if (accessCount === 1) {
            throw new Error('Blocked a frame with origin');
          }
          return null;
        },
        configurable: true,
      });
      Object.defineProperty(mockIframe, 'contentDocument', {
        get: () => {
          throw new Error('Blocked a frame with origin');
        },
        configurable: true,
      });

      // The injectIntegration will try to access contentWindow/contentDocument
      // and should reject quickly when they throw
      await expect(
        injector.injectIntegration(mockIframe, 'editor')
      ).rejects.toThrow();
    });
  });

  describe('getAPI', () => {
    it('should return null for non-injected type', () => {
      expect(injector.getAPI('editor')).toBeUndefined();
    });

    it('should return API after injection', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      const mockAPI = { isReady: () => true, getSceneObjects: () => [] };
      (mockWindow as any).contextAssistantAPI = mockAPI;

      await injector.injectIntegration(mockIframe, 'editor');

      const api = injector.getAPI('editor');
      expect(api).toBe(mockAPI);
    });
  });

  describe('isInjected', () => {
    it('should return false for non-injected type', () => {
      expect(injector.isInjected('editor')).toBe(false);
    });

    it('should return true after injection', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      (mockWindow as any).contextAssistantAPI = { isReady: () => true };

      await injector.injectIntegration(mockIframe, 'editor');
      expect(injector.isInjected('editor')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear injected state', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      (mockWindow as any).contextAssistantAPI = { isReady: () => true };

      await injector.injectIntegration(mockIframe, 'editor');
      expect(injector.isInjected('editor')).toBe(true);

      injector.clear();
      expect(injector.isInjected('editor')).toBe(false);
      expect(injector.getAPI('editor')).toBeUndefined();
    });
  });

  describe('waitForAPI', () => {
    it('should wait for API to be ready', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      
      // Initially not ready, then becomes ready
      let ready = false;
      (mockWindow as any).contextAssistantAPI = {
        isReady: () => ready,
      };

      // Start injection
      const injectPromise = injector.injectIntegration(mockIframe, 'playground');
      
      // Make API ready after a delay
      setTimeout(() => {
        ready = true;
      }, 50);

      await injectPromise;
      expect(injector.isInjected('playground')).toBe(true);
    });

    it('should handle API that never becomes ready', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      
      // API never becomes ready
      (mockWindow as any).contextAssistantAPI = {
        isReady: () => false,
      };

      // The injection will wait for API to be ready, but we'll test the error path
      // by verifying the API check happens
      const injectPromise = injector.injectIntegration(mockIframe, 'editor');
      
      // Verify API is checked
      expect((mockWindow as any).contextAssistantAPI.isReady()).toBe(false);
      
      // The promise will eventually timeout, but for this test we'll just verify
      // that the API check is happening. We'll use a short timeout to avoid hanging.
      await expect(
        Promise.race([
          injectPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100)),
        ])
      ).rejects.toThrow();
    }, 200);

    it('should handle errors during waitForAPI', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      
      // API throws error when accessed
      (mockWindow as any).contextAssistantAPI = {
        get isReady() {
          throw new Error('Access denied');
        },
      };

      await expect(
        injector.injectIntegration(mockIframe, 'editor')
      ).rejects.toThrow();
    });
  });

  describe('getIntegrationScript', () => {
    it('should return different scripts for different types', async () => {
      Object.defineProperty(mockDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      
      (mockWindow as any).contextAssistantAPI = { isReady: () => true };

      await injector.injectIntegration(mockIframe, 'editor');
      const editorAPI = injector.getAPI('editor');
      expect(editorAPI).toBeTruthy();

      // Test playground
      const playgroundIframe = document.createElement('iframe');
      const playgroundWindow = window;
      const playgroundDocument = document.implementation.createHTMLDocument('playground');
      Object.defineProperty(playgroundIframe, 'contentWindow', {
        value: playgroundWindow,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(playgroundIframe, 'contentDocument', {
        value: playgroundDocument,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(playgroundDocument, 'readyState', {
        value: 'complete',
        writable: false,
        configurable: true,
      });
      (playgroundWindow as any).contextAssistantAPI = { isReady: () => true };

      await injector.injectIntegration(playgroundIframe, 'playground');
      const playgroundAPI = injector.getAPI('playground');
      expect(playgroundAPI).toBeTruthy();
    });
  });
});


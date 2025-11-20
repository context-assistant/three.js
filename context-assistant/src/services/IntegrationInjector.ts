import type { IframeType } from '../types';

/**
 * IntegrationInjector handles injecting integration scripts into iframes
 * and provides access to the integration API exposed by those scripts
 */
type IntegrationAPI = {
  isReady: () => boolean;
  getSceneObjects?: () => unknown[];
  getEditorState?: () => unknown;
  getCurrentPage?: () => unknown;
  [key: string]: unknown;
};

export class IntegrationInjector {
  private injectedTypes: Set<IframeType['type']> = new Set();
  private integrationAPIs: Map<IframeType['type'], IntegrationAPI> = new Map();

  /**
   * Inject integration script into an iframe
   */
  async injectIntegration(
    iframe: HTMLIFrameElement,
    type: IframeType['type']
  ): Promise<void> {
    if (this.injectedTypes.has(type)) {
      return; // Already injected
    }

    return new Promise((resolve, reject) => {
      // Wait for iframe to be fully loaded
      const checkReady = () => {
        try {
          const iframeWindow = iframe.contentWindow;
          const iframeDocument = iframe.contentDocument;

          if (!iframeWindow || !iframeDocument) {
            setTimeout(checkReady, 100);
            return;
          }

          // Check if document is ready
          if (iframeDocument.readyState === 'loading') {
            iframeDocument.addEventListener('DOMContentLoaded', () => {
              this.injectScript(iframeWindow, iframeDocument, type)
                .then(resolve)
                .catch(reject);
            });
          } else {
            this.injectScript(iframeWindow, iframeDocument, type)
              .then(resolve)
              .catch(reject);
          }
        } catch (error) {
          reject(new Error(`Cannot access iframe (cross-origin?): ${error}`));
        }
      };

      if (iframe.contentWindow && iframe.contentDocument) {
        checkReady();
      } else {
        iframe.addEventListener('load', checkReady, { once: true });
      }
    });
  }

  /**
   * Inject the actual integration script
   */
  private async injectScript(
    iframeWindow: Window,
    iframeDocument: Document,
    type: IframeType['type']
  ): Promise<void> {
    // Load the appropriate integration script
    const scriptContent = await this.getIntegrationScript(type);

    // Create script element
    const script = iframeDocument.createElement('script');
    script.textContent = scriptContent;
    
    // Inject into iframe
    iframeDocument.head.appendChild(script);

    // Wait for API to be available
    await this.waitForAPI(iframeWindow, type);

    this.injectedTypes.add(type);
  }

  /**
   * Get integration script content based on type
   */
  private async getIntegrationScript(type: IframeType['type']): Promise<string> {
    // For now, return a base integration script
    // In production, these will be built separately and loaded
    const baseScript = `
      (function() {
        'use strict';
        
        // Initialize integration API
        if (!window.contextAssistantAPI) {
          window.contextAssistantAPI = {};
        }
        
        // Base API methods
        window.contextAssistantAPI.getType = function() {
          return '${type}';
        };
        
        window.contextAssistantAPI.isReady = function() {
          return true;
        };
      })();
    `;

    // Type-specific scripts will be added here
    switch (type) {
      case 'editor':
        return baseScript + this.getEditorIntegrationScript();
      case 'playground':
        return baseScript + this.getPlaygroundIntegrationScript();
      case 'manual':
      case 'docs':
        return baseScript + this.getDocsIntegrationScript();
      default:
        return baseScript;
    }
  }

  /**
   * Editor-specific integration script
   */
  private getEditorIntegrationScript(): string {
    return `
      // Editor integration
      window.contextAssistantAPI.getSceneObjects = function() {
        try {
          // Access editor instance (will need to be adapted based on actual editor structure)
          if (window.editor && window.editor.scene) {
            return this.traverseScene(window.editor.scene);
          }
          return [];
        } catch (e) {
          console.error('Error getting scene objects:', e);
          return [];
        }
      };
      
      window.contextAssistantAPI.getEditorState = function() {
        try {
          if (window.editor) {
            return {
              selected: window.editor.selected ? window.editor.selected.uuid : null,
              camera: window.editor.camera ? {
                position: window.editor.camera.position,
                rotation: window.editor.camera.rotation,
              } : null,
            };
          }
          return null;
        } catch (e) {
          console.error('Error getting editor state:', e);
          return null;
        }
      };
      
      window.contextAssistantAPI.traverseScene = function(object, result = []) {
        if (!object) return result;
        
        const objInfo = {
          id: object.uuid || Math.random().toString(36).substr(2, 9),
          name: object.name || object.type || 'Unnamed',
          type: object.type || 'Unknown',
          uuid: object.uuid,
          children: [],
        };
        
        if (object.children && object.children.length > 0) {
          object.children.forEach(child => {
            const childInfo = this.traverseScene(child, []);
            objInfo.children.push(...childInfo);
          });
        }
        
        result.push(objInfo);
        return result;
      };
    `;
  }

  /**
   * Playground-specific integration script
   */
  private getPlaygroundIntegrationScript(): string {
    return `
      // Playground integration
      window.contextAssistantAPI.getSceneObjects = function() {
        // Similar to editor, but access playground-specific objects
        return [];
      };
    `;
  }

  /**
   * Documentation-specific integration script
   */
  private getDocsIntegrationScript(): string {
    return `
      // Documentation integration
      window.contextAssistantAPI.getCurrentPage = function() {
        return {
          url: window.location.href,
          title: document.title,
          path: window.location.pathname,
        };
      };
    `;
  }

  /**
   * Wait for the integration API to be available
   */
  private async waitForAPI(
    iframeWindow: Window,
    type: IframeType['type'],
    maxWait = 5000
  ): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          if (
            iframeWindow.contextAssistantAPI &&
            iframeWindow.contextAssistantAPI.isReady &&
            iframeWindow.contextAssistantAPI.isReady()
          ) {
            this.integrationAPIs.set(type, iframeWindow.contextAssistantAPI);
            resolve();
          } else if (Date.now() - startTime > maxWait) {
            reject(new Error(`Integration API not available after ${maxWait}ms`));
          } else {
            setTimeout(check, 100);
          }
        } catch (error) {
          reject(error);
        }
      };
      check();
    });
  }

  /**
   * Get the integration API for a specific iframe type
   */
  getAPI(type: IframeType['type']): IntegrationAPI | undefined {
    return this.integrationAPIs.get(type);
  }

  /**
   * Check if integration is injected for a type
   */
  isInjected(type: IframeType['type']): boolean {
    return this.injectedTypes.has(type);
  }

  /**
   * Clear injected state (for testing or reset)
   */
  clear(): void {
    this.injectedTypes.clear();
    this.integrationAPIs.clear();
  }
}


import type { IframeType } from '../types';

export class IframeManager {
  private activeIframe: HTMLIFrameElement | null = null;
  private activeType: IframeType['type'] | null = null;
  private iframeMap: Map<IframeType['type'], HTMLIFrameElement> = new Map();

  /**
   * Create or get an iframe for the specified type
   */
  createIframe(type: IframeType['type'], url: string): Promise<HTMLIFrameElement> {
    return new Promise((resolve, reject) => {
      // Return existing iframe if it exists
      if (this.iframeMap.has(type)) {
        const existing = this.iframeMap.get(type);
        if (existing) {
          this.activeIframe = existing;
          this.activeType = type;
          resolve(existing);
          return;
        }
      }

      // Create new iframe
      const iframe = document.createElement('iframe');
      iframe.id = `iframe-${type}`;
      iframe.src = url;
      iframe.className = 'w-full h-full border-0';
      // iframe.setAttribute('sandbox', 'allow-same-origin');
      iframe.style.display = 'none';

      // Wait for iframe to load
      iframe.addEventListener('load', () => {
        this.iframeMap.set(type, iframe);
        this.activeIframe = iframe;
        this.activeType = type;
        iframe.style.display = 'block';
        resolve(iframe);
      });

      iframe.addEventListener('error', () => {
        reject(new Error(`Failed to load iframe: ${url}`));
      });

      // Append to container (will be handled by caller)
    });
  }

  /**
   * Get the active iframe
   */
  getActiveIframe(): HTMLIFrameElement | null {
    return this.activeIframe;
  }

  /**
   * Get the active iframe type
   */
  getActiveType(): IframeType['type'] | null {
    return this.activeType;
  }

  /**
   * Switch to a different iframe type
   */
  switchTo(type: IframeType['type']): void {
    // Hide all iframes
    this.iframeMap.forEach((iframe) => {
      iframe.style.display = 'none';
    });

    // Show the requested iframe
    const iframe = this.iframeMap.get(type);
    if (iframe) {
      iframe.style.display = 'block';
      this.activeIframe = iframe;
      this.activeType = type;
    }
  }

  /**
   * Remove an iframe
   */
  removeIframe(type: IframeType['type']): void {
    const iframe = this.iframeMap.get(type);
    if (iframe) {
      iframe.remove();
      this.iframeMap.delete(type);
      if (this.activeType === type) {
        this.activeIframe = null;
        this.activeType = null;
      }
    }
  }

  /**
   * Get iframe's window object (same-origin access)
   */
  getIframeWindow(type: IframeType['type']): Window | null {
    const iframe = this.iframeMap.get(type);
    if (!iframe || !iframe.contentWindow) {
      return null;
    }
    try {
      // Same-origin check - this will throw if cross-origin
      return iframe.contentWindow;
    } catch (e) {
      console.error('Cannot access iframe window (cross-origin):', e);
      return null;
    }
  }

  /**
   * Get iframe's document object (same-origin access)
   */
  getIframeDocument(type: IframeType['type']): Document | null {
    const iframe = this.iframeMap.get(type);
    if (!iframe || !iframe.contentDocument) {
      return null;
    }
    try {
      // Same-origin check - this will throw if cross-origin
      return iframe.contentDocument;
    } catch (e) {
      console.error('Cannot access iframe document (cross-origin):', e);
      return null;
    }
  }

  /**
   * Check if iframe is loaded
   */
  isIframeLoaded(type: IframeType['type']): boolean {
    return this.iframeMap.has(type);
  }

  /**
   * Register an iframe (internal use, but exposed for App.ts)
   */
  registerIframe(type: IframeType['type'], iframe: HTMLIFrameElement): void {
    this.iframeMap.set(type, iframe);
    this.activeIframe = iframe;
    this.activeType = type;
  }

  /**
   * Clear all iframes
   */
  clear(): void {
    this.iframeMap.forEach((iframe) => {
      iframe.remove();
    });
    this.iframeMap.clear();
    this.activeIframe = null;
    this.activeType = null;
  }
}


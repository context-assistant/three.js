/**
 * Google Analytics integration
 * 
 * To enable, add your Google Analytics measurement ID to the environment
 * or configure it in settings.
 * 
 * Usage:
 *   import { analytics } from '@/utils/analytics';
 *   analytics.trackEvent('button_click', { button_name: 'submit' });
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

class Analytics {
  private measurementId: string | null = null;
  private enabled: boolean = false;

  /**
   * Initialize Google Analytics
   * @param measurementId - Google Analytics measurement ID (e.g., 'G-XXXXXXXXXX')
   */
  init(measurementId: string): void {
    if (this.enabled) {
      return;
    }

    this.measurementId = measurementId;
    this.enabled = true;

    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: unknown[]) {
      window.dataLayer!.push(args);
    };

    // Configure gtag
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
  }

  /**
   * Track a page view
   * @param path - Page path
   * @param title - Page title
   */
  trackPageView(path: string, title?: string): void {
    if (!this.enabled || !window.gtag) {
      return;
    }

    window.gtag('config', this.measurementId!, {
      page_path: path,
      page_title: title,
    });
  }

  /**
   * Track an event
   * @param eventName - Event name
   * @param eventParams - Event parameters
   */
  trackEvent(eventName: string, eventParams?: Record<string, unknown>): void {
    if (!this.enabled || !window.gtag) {
      return;
    }

    window.gtag('event', eventName, eventParams);
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const analytics = new Analytics();


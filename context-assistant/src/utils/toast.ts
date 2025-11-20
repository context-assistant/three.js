/**
 * Toast notification system
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number; // Duration in milliseconds, 0 = persistent
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const DEFAULT_DURATION = 5000; // 5 seconds
const DEFAULT_POSITION: ToastOptions['position'] = 'top-right';

class ToastManager {
  private container: HTMLDivElement | null = null;
  private toasts: Map<string, HTMLDivElement> = new Map();

  private initContainer(position: ToastOptions['position']): void {
    if (this.container) {
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = `fixed z-50 flex flex-col gap-2 ${this.getPositionClasses(position || DEFAULT_POSITION)}`;
    document.body.appendChild(this.container);
  }

  private getPositionClasses(position: ToastOptions['position']): string {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  }

  private getToastStyles(type: ToastType): { bg: string; border: string; icon: string; iconColor: string } {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-900',
          border: 'border-green-700',
          icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
          iconColor: 'text-green-400',
        };
      case 'error':
        return {
          bg: 'bg-red-900',
          border: 'border-red-700',
          icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
          iconColor: 'text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900',
          border: 'border-yellow-700',
          icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
          iconColor: 'text-yellow-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-900',
          border: 'border-blue-700',
          icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          iconColor: 'text-blue-400',
        };
    }
  }

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options.duration ?? DEFAULT_DURATION;
    const position = options.position ?? DEFAULT_POSITION;

    this.initContainer(position);

    const styles = this.getToastStyles(type);
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `flex items-center gap-3 p-4 rounded-lg border ${styles.bg} ${styles.border} text-white shadow-lg min-w-[300px] max-w-[500px] toast-enter`;

    toast.innerHTML = `
      <svg class="w-5 h-5 ${styles.iconColor} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${styles.icon}" />
      </svg>
      <p class="flex-1 text-sm">${this.escapeHtml(message)}</p>
      <button class="text-gray-400 hover:text-white transition-colors" aria-label="Close">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;

    // Close button handler
    const closeBtn = toast.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.remove(id);
      });
    }

    this.container!.appendChild(toast);
    this.toasts.set(id, toast);

    // Auto-remove after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  private remove(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 200);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  success(message: string, options?: ToastOptions): void {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions): void {
    this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions): void {
    this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions): void {
    this.show(message, 'info', options);
  }
}

export const toast = new ToastManager();


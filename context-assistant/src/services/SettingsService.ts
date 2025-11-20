const SETTINGS_KEY = 'context-assistant-settings';

export interface AppSettings {
  ollamaEndpoint: string;
  persistChatHistory: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  ollamaEndpoint: 'http://localhost:11434',
  persistChatHistory: true,
};

export class SettingsService {
  /**
   * Get all settings
   */
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings
   */
  saveSettings(settings: Partial<AppSettings>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Get Ollama endpoint
   */
  getOllamaEndpoint(): string {
    return this.getSettings().ollamaEndpoint;
  }

  /**
   * Set Ollama endpoint
   */
  setOllamaEndpoint(endpoint: string): void {
    this.saveSettings({ ollamaEndpoint: endpoint });
  }

  /**
   * Get chat history persistence setting
   */
  shouldPersistChatHistory(): boolean {
    return this.getSettings().persistChatHistory;
  }

  /**
   * Set chat history persistence
   */
  setPersistChatHistory(persist: boolean): void {
    this.saveSettings({ persistChatHistory: persist });
  }
}


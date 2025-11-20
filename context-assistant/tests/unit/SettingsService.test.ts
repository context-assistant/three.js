import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from '../../src/services/SettingsService';

describe('SettingsService', () => {
  let service: SettingsService;
  const storageKey = 'context-assistant-settings';

  beforeEach(() => {
    service = new SettingsService();
    localStorage.clear();
  });

  describe('getSettings', () => {
    it('should return default settings when no settings are stored', () => {
      const settings = service.getSettings();
      expect(settings.ollamaEndpoint).toBe('http://localhost:11434');
      expect(settings.persistChatHistory).toBe(true);
    });

    it('should return stored settings when available', () => {
      const storedSettings = {
        ollamaEndpoint: 'http://custom:11434',
        persistChatHistory: false,
      };
      localStorage.setItem(storageKey, JSON.stringify(storedSettings));

      const settings = service.getSettings();
      expect(settings.ollamaEndpoint).toBe('http://custom:11434');
      expect(settings.persistChatHistory).toBe(false);
    });

    it('should merge stored settings with defaults', () => {
      const storedSettings = { ollamaEndpoint: 'http://custom:11434' };
      localStorage.setItem(storageKey, JSON.stringify(storedSettings));

      const settings = service.getSettings();
      expect(settings.ollamaEndpoint).toBe('http://custom:11434');
      expect(settings.persistChatHistory).toBe(true); // Default value
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(storageKey, 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const settings = service.getSettings();
      expect(settings.ollamaEndpoint).toBe('http://localhost:11434');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      service.saveSettings({ ollamaEndpoint: 'http://test:11434' });
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      expect(stored.ollamaEndpoint).toBe('http://test:11434');
    });

    it('should merge with existing settings', () => {
      localStorage.setItem(storageKey, JSON.stringify({ persistChatHistory: false }));
      service.saveSettings({ ollamaEndpoint: 'http://test:11434' });

      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      expect(stored.ollamaEndpoint).toBe('http://test:11434');
      expect(stored.persistChatHistory).toBe(false);
    });

    it('should throw error when localStorage fails', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        service.saveSettings({ ollamaEndpoint: 'http://test:11434' });
      }).toThrow();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('getOllamaEndpoint', () => {
    it('should return default endpoint when not set', () => {
      expect(service.getOllamaEndpoint()).toBe('http://localhost:11434');
    });

    it('should return stored endpoint', () => {
      service.setOllamaEndpoint('http://custom:11434');
      expect(service.getOllamaEndpoint()).toBe('http://custom:11434');
    });
  });

  describe('setOllamaEndpoint', () => {
    it('should save endpoint to settings', () => {
      service.setOllamaEndpoint('http://custom:11434');
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      expect(stored.ollamaEndpoint).toBe('http://custom:11434');
    });
  });

  describe('shouldPersistChatHistory', () => {
    it('should return default value (true)', () => {
      expect(service.shouldPersistChatHistory()).toBe(true);
    });

    it('should return stored value', () => {
      service.setPersistChatHistory(false);
      expect(service.shouldPersistChatHistory()).toBe(false);
    });
  });

  describe('setPersistChatHistory', () => {
    it('should save persistence setting', () => {
      service.setPersistChatHistory(false);
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      expect(stored.persistChatHistory).toBe(false);
    });
  });
});


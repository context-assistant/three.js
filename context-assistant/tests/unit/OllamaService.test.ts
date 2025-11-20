import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaService } from '../../src/services/OllamaService';

// Mock fetch globally
global.fetch = vi.fn();

describe('OllamaService', () => {
  let service: OllamaService;
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    service = new OllamaService();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default endpoint when none provided', () => {
      const defaultService = new OllamaService();
      expect(defaultService.getEndpoint()).toBe('http://localhost:11434');
    });

    it('should remove trailing slash from endpoint', () => {
      const serviceWithSlash = new OllamaService('http://localhost:11434/');
      expect(serviceWithSlash.getEndpoint()).toBe('http://localhost:11434');
    });
  });

  describe('setEndpoint', () => {
    it('should update endpoint', () => {
      service.setEndpoint('http://custom:11434');
      expect(service.getEndpoint()).toBe('http://custom:11434');
    });

    it('should remove trailing slash', () => {
      service.setEndpoint('http://custom:11434/');
      expect(service.getEndpoint()).toBe('http://custom:11434');
    });
  });

  describe('getEndpoint', () => {
    it('should return current endpoint', () => {
      expect(service.getEndpoint()).toBe('http://localhost:11434');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await service.testConnection();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await service.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.testConnection();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('listModels', () => {
    it('should return list of models', async () => {
      const mockModels = [
        { name: 'llama2', size: 1000000 },
        { name: 'mistral', size: 2000000 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: mockModels }),
      } as Response);

      const models = await service.listModels();
      expect(models).toEqual(mockModels);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error when request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(service.listModels()).rejects.toThrow('Failed to fetch models: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.listModels()).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', async () => {
      const mockInfo = { name: 'llama2', size: 1000000, parameters: {} };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      } as Response);

      const info = await service.getModelInfo('llama2');
      expect(info).toEqual(mockInfo);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/show',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'llama2' }),
        })
      );
    });

    it('should throw error when request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(service.getModelInfo('invalid')).rejects.toThrow('Failed to get model info: Not Found');
    });
  });

  describe('chat', () => {
    it('should send chat request and return stream', async () => {
      const mockStream = new ReadableStream();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const stream = await service.chat(
        'llama2',
        [{ role: 'user', content: 'Hello' }],
        { temperature: 0.7 }
      );

      expect(stream).toBe(mockStream);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'llama2',
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
            options: {
              temperature: 0.7,
              top_k: undefined,
              top_p: undefined,
              num_ctx: undefined,
              num_predict: undefined,
              mirostat: undefined,
              mirostat_tau: undefined,
              mirostat_eta: undefined,
            },
          }),
        })
      );
    });

    it('should include all options in request', async () => {
      const mockStream = new ReadableStream();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      await service.chat(
        'llama2',
        [{ role: 'user', content: 'Hello' }],
        {
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          context_window: 4096,
          max_tokens: 2048,
          mirostat: 1,
          mirostat_tau: 5.0,
          mirostat_eta: 0.1,
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.7'),
        })
      );
    });

    it('should pass abort signal to fetch', async () => {
      const mockStream = new ReadableStream();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const abortController = new AbortController();
      await service.chat('llama2', [{ role: 'user', content: 'Hello' }], {}, abortController.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('should throw error when request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        service.chat('llama2', [{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Chat request failed: Bad Request');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        service.chat('llama2', [{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});


import { logger } from '../utils/logger';
import type { OllamaModel } from '../types';

export interface OllamaConfig {
  endpoint: string;
}

const DEFAULT_ENDPOINT = 'http://localhost:11434';

export class OllamaService {
  private config: OllamaConfig;

  constructor(endpoint: string = DEFAULT_ENDPOINT) {
    this.config = { endpoint: endpoint.replace(/\/$/, '') }; // Remove trailing slash
  }

  /**
   * Update the Ollama endpoint
   */
  setEndpoint(endpoint: string): void {
    this.config.endpoint = endpoint.replace(/\/$/, '');
  }

  /**
   * Get the current endpoint
   */
  getEndpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      logger.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Failed to list Ollama models:', error);
      throw error;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Failed to get model info for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Send a chat message to Ollama
   */
  async chat(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      top_k?: number;
      top_p?: number;
      context_window?: number;
      max_tokens?: number;
      mirostat?: number;
      mirostat_tau?: number;
      mirostat_eta?: number;
    } = {},
    signal?: AbortSignal
  ): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options.temperature,
            top_k: options.top_k,
            top_p: options.top_p,
            num_ctx: options.context_window,
            num_predict: options.max_tokens,
            mirostat: options.mirostat,
            mirostat_tau: options.mirostat_tau,
            mirostat_eta: options.mirostat_eta,
          },
        }),
        signal, // Pass abort signal to fetch
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      return response.body;
    } catch (error) {
      logger.error('Failed to send chat message:', error);
      throw error;
    }
  }
}


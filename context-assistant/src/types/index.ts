// Global type definitions

export interface AgentConfig {
  id: string;
  name: string;
  avatar?: string; // base64 image
  model: string;
  contextWindow: number;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  mirostat: boolean;
  mirostatTau?: number;
  mirostatEta?: number;
  personalityTraits: PersonalityTraits;
  isDefault?: boolean;
}

export interface PersonalityTraits {
  curious?: number; // 0-100, >50 = curious, <50 = cautious
  organized?: number; // 0-100, >50 = organized, <50 = careless
  friendly?: number; // 0-100, >50 = friendly, <50 = challenging
  zany?: number; // 0-100, >50 = zany, <50 = sober
  sarcastic?: number; // 0-100, >50 = sarcastic, <50 = serious
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agentId?: string;
  agentName?: string;
  agentAvatar?: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface IframeType {
  type: 'editor' | 'playground' | 'manual' | 'docs';
  url: string;
}

export interface SceneObject {
  id: string;
  name: string;
  type: string;
  uuid: string;
  children?: SceneObject[];
  properties?: Record<string, unknown>;
}


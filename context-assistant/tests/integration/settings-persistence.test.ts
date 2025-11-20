import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsService } from '../../src/services/SettingsService';
import { AgentService } from '../../src/services/AgentService';
import type { AgentConfig } from '../../src/types';

describe('Settings Persistence Integration', () => {
  let settingsService: SettingsService;
  let agentService: AgentService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    settingsService = new SettingsService();
    agentService = new AgentService();
  });

  it('should persist settings across service instances', () => {
    settingsService.setOllamaEndpoint('http://custom:11434');
    settingsService.setPersistChatHistory(false);

    const newService = new SettingsService();
    expect(newService.getOllamaEndpoint()).toBe('http://custom:11434');
    expect(newService.shouldPersistChatHistory()).toBe(false);
  });

  it('should persist agents across service instances', () => {
    const agent: AgentConfig = {
      id: agentService.generateAgentId(),
      name: 'Persistent Agent',
      model: 'llama2',
      contextWindow: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      mirostat: false,
      personalityTraits: {},
      avatar: null,
      isDefault: false,
    };

    agentService.saveAgent(agent);

    const newService = new AgentService();
    const retrieved = newService.getAgent(agent.id);
    expect(retrieved?.name).toBe('Persistent Agent');
  });

  it('should persist default agent selection', () => {
    const agent: AgentConfig = {
      id: agentService.generateAgentId(),
      name: 'Default Agent',
      model: 'llama2',
      contextWindow: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      mirostat: false,
      personalityTraits: {},
      avatar: null,
      isDefault: true,
    };

    agentService.saveAgent(agent);
    agentService.setDefaultAgent(agent.id);

    const newService = new AgentService();
    const defaultAgent = newService.getDefaultAgent();
    expect(defaultAgent?.id).toBe(agent.id);
  });
});


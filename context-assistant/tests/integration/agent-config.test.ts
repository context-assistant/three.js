import { describe, it, expect, beforeEach } from 'vitest';
import { AgentService } from '../../src/services/AgentService';
import type { AgentConfig } from '../../src/types';

describe('Agent Configuration Integration', () => {
  let agentService: AgentService;

  beforeEach(() => {
    localStorage.clear();
    agentService = new AgentService();
  });

  it('should create, update, and delete agent', () => {
    // Create
    const agent: AgentConfig = {
      id: agentService.generateAgentId(),
      name: 'Test Agent',
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
    expect(agentService.getAllAgents()).toHaveLength(1);

    // Update
    agent.name = 'Updated Agent';
    agentService.saveAgent(agent);
    const updated = agentService.getAgent(agent.id);
    expect(updated?.name).toBe('Updated Agent');

    // Delete
    agentService.deleteAgent(agent.id);
    expect(agentService.getAllAgents()).toHaveLength(0);
  });

  it('should handle default agent switching', () => {
    const agent1: AgentConfig = {
      id: agentService.generateAgentId(),
      name: 'Agent 1',
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

    const agent2: AgentConfig = {
      id: agentService.generateAgentId(),
      name: 'Agent 2',
      model: 'mistral',
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

    agentService.saveAgent(agent1);
    agentService.saveAgent(agent2);

    // Set agent2 as default
    agentService.setDefaultAgent(agent2.id);

    const defaultAgent = agentService.getDefaultAgent();
    expect(defaultAgent?.id).toBe(agent2.id);
    expect(defaultAgent?.isDefault).toBe(true);

    // Agent1 should no longer be default
    const updatedAgent1 = agentService.getAgent(agent1.id);
    expect(updatedAgent1?.isDefault).toBe(false);
  });

  it('should validate agent configuration', () => {
    const invalidAgent: Partial<AgentConfig> = {
      name: '', // Invalid: empty name
      model: '', // Invalid: empty model
      temperature: 3, // Invalid: > 2
    };

    const result = agentService.validateAgent(invalidAgent);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Agent name is required');
    expect(result.errors).toContain('Model is required');
    expect(result.errors).toContain('Temperature must be between 0 and 2');
  });

  it('should calculate personality traits from slider values', () => {
    const traits = agentService.calculatePersonalityTraits({
      curious: 75,
      organized: 30,
      friendly: 50,
      zany: 80,
      sarcastic: 25,
    });

    expect(traits.curious).toBe(75);
    expect(traits.organized).toBe(30);
    expect(traits.friendly).toBe(50);
    expect(traits.zany).toBe(80);
    expect(traits.sarcastic).toBe(25);
  });
});


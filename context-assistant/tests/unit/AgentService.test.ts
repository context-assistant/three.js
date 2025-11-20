import { describe, it, expect, beforeEach } from 'vitest';
import { AgentService } from '../../src/services/AgentService';
import type { AgentConfig } from '../../src/types';

describe('AgentService', () => {
  let service: AgentService;
  const storageKey = 'context-assistant-agents';

  beforeEach(() => {
    service = new AgentService();
    localStorage.clear();
  });

  const createTestAgent = (overrides?: Partial<AgentConfig>): AgentConfig => ({
    id: 'test-agent-1',
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
    ...overrides,
  });

  describe('saveAgent', () => {
    it('should save a new agent', () => {
      const agent = createTestAgent();
      service.saveAgent(agent);

      const agents = service.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test-agent-1');
    });

    it('should update an existing agent', () => {
      const agent = createTestAgent();
      service.saveAgent(agent);

      const updated = createTestAgent({ name: 'Updated Agent' });
      service.saveAgent(updated);

      const agents = service.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('Updated Agent');
    });

    it('should set default agent when isDefault is true', () => {
      const agent = createTestAgent({ isDefault: true });
      service.saveAgent(agent);

      expect(service.getDefaultAgentId()).toBe('test-agent-1');
      const defaultAgent = service.getDefaultAgent();
      expect(defaultAgent?.id).toBe('test-agent-1');
    });

    it('should not update default when skipDefaultUpdate is true', () => {
      const agent = createTestAgent({ isDefault: true });
      service.saveAgent(agent, true);

      // Should still set default, but won't trigger recursive update
      expect(service.getDefaultAgentId()).toBe('test-agent-1');
    });
  });

  describe('getAgent', () => {
    it('should return null for non-existent agent', () => {
      expect(service.getAgent('non-existent')).toBeNull();
    });

    it('should return agent by ID', () => {
      const agent = createTestAgent();
      service.saveAgent(agent);

      const retrieved = service.getAgent('test-agent-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Agent');
    });
  });

  describe('getAllAgents', () => {
    it('should return empty array when no agents exist', () => {
      expect(service.getAllAgents()).toEqual([]);
    });

    it('should return all saved agents', () => {
      const agent1 = createTestAgent({ id: 'agent-1' });
      const agent2 = createTestAgent({ id: 'agent-2' });
      service.saveAgent(agent1);
      service.saveAgent(agent2);

      const agents = service.getAllAgents();
      expect(agents).toHaveLength(2);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(storageKey, 'invalid json');
      expect(service.getAllAgents()).toEqual([]);
    });
  });

  describe('deleteAgent', () => {
    it('should return false when agent does not exist', () => {
      expect(service.deleteAgent('non-existent')).toBe(false);
    });

    it('should delete agent and return true', () => {
      const agent = createTestAgent();
      service.saveAgent(agent);

      const deleted = service.deleteAgent('test-agent-1');
      expect(deleted).toBe(true);
      expect(service.getAllAgents()).toHaveLength(0);
    });

    it('should clear default when deleting default agent', () => {
      const agent = createTestAgent({ isDefault: true });
      service.saveAgent(agent);

      service.deleteAgent('test-agent-1');
      expect(service.getDefaultAgentId()).toBeNull();
    });
  });

  describe('setDefaultAgent', () => {
    it('should set default agent ID', () => {
      const agent1 = createTestAgent({ id: 'agent-1' });
      const agent2 = createTestAgent({ id: 'agent-2' });
      service.saveAgent(agent1);
      service.saveAgent(agent2);

      service.setDefaultAgent('agent-1');
      expect(service.getDefaultAgentId()).toBe('agent-1');
    });

    it('should update isDefault flag on all agents', () => {
      const agent1 = createTestAgent({ id: 'agent-1' });
      const agent2 = createTestAgent({ id: 'agent-2', isDefault: true });
      service.saveAgent(agent1);
      service.saveAgent(agent2);

      service.setDefaultAgent('agent-1');

      const agents = service.getAllAgents();
      expect(agents.find(a => a.id === 'agent-1')?.isDefault).toBe(true);
      expect(agents.find(a => a.id === 'agent-2')?.isDefault).toBe(false);
    });
  });

  describe('getDefaultAgent', () => {
    it('should return null when no default is set', () => {
      expect(service.getDefaultAgent()).toBeNull();
    });

    it('should return default agent', () => {
      const agent = createTestAgent({ isDefault: true });
      service.saveAgent(agent);

      const defaultAgent = service.getDefaultAgent();
      expect(defaultAgent?.id).toBe('test-agent-1');
    });
  });

  describe('validateAgent', () => {
    it('should validate a complete agent', () => {
      const agent = createTestAgent();
      const result = service.validateAgent(agent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject agent without name', () => {
      const result = service.validateAgent({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Agent name is required');
    });

    it('should reject agent without model', () => {
      const result = service.validateAgent({ name: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model is required');
    });

    it('should reject invalid context window', () => {
      const result = service.validateAgent({
        name: 'Test',
        model: 'llama2',
        contextWindow: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Context window must be at least 1');
    });

    it('should reject invalid temperature', () => {
      const result = service.validateAgent({
        name: 'Test',
        model: 'llama2',
        temperature: 3,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Temperature must be between 0 and 2');
    });

    it('should reject invalid topP', () => {
      const result = service.validateAgent({
        name: 'Test',
        model: 'llama2',
        topP: 1.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Top P must be between 0 and 1');
    });

    it('should validate mirostat parameters when enabled', () => {
      const result = service.validateAgent({
        name: 'Test',
        model: 'llama2',
        mirostat: true,
        mirostatTau: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mirostat tau must be non-negative');
    });
  });

  describe('calculatePersonalityTraits', () => {
    it('should calculate traits from slider values', () => {
      const traits = service.calculatePersonalityTraits({
        curious: 75,
        organized: 30,
        friendly: 50,
      });

      expect(traits.curious).toBe(75);
      expect(traits.organized).toBe(30);
      expect(traits.friendly).toBe(50);
    });

    it('should handle undefined values', () => {
      const traits = service.calculatePersonalityTraits({});
      expect(Object.keys(traits)).toHaveLength(0);
    });
  });

  describe('generateAgentId', () => {
    it('should generate unique IDs', () => {
      const id1 = service.generateAgentId();
      const id2 = service.generateAgentId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', () => {
      const id = service.generateAgentId();
      expect(id).toMatch(/^agent-\d+-[a-z0-9]+$/);
    });
  });
});


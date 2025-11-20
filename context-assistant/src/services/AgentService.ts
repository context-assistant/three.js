import type { AgentConfig, PersonalityTraits } from '../types';

const STORAGE_KEY = 'context-assistant-agents';
const DEFAULT_AGENT_KEY = 'context-assistant-default-agent';

export class AgentService {
  /**
   * Save an agent configuration
   */
  saveAgent(agent: AgentConfig, skipDefaultUpdate: boolean = false): void {
    const agents = this.getAllAgents();
    const index = agents.findIndex(a => a.id === agent.id);
    
    if (index >= 0) {
      agents[index] = agent;
    } else {
      agents.push(agent);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    
    // Update default agent ID if this agent is marked as default
    // Only skip the recursive update of all agents' isDefault flags if skipDefaultUpdate is true
    if (agent.isDefault) {
      localStorage.setItem(DEFAULT_AGENT_KEY, agent.id);
      if (!skipDefaultUpdate) {
        // Update all agents' isDefault flags (this will call saveAgent recursively, but with skipDefaultUpdate=true)
        this.setDefaultAgent(agent.id);
      }
    }
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): AgentConfig | null {
    const agents = this.getAllAgents();
    return agents.find(a => a.id === id) || null;
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load agents:', error);
      return [];
    }
  }

  /**
   * Delete an agent
   */
  deleteAgent(id: string): boolean {
    const agents = this.getAllAgents();
    const filtered = agents.filter(a => a.id !== id);
    
    if (filtered.length === agents.length) {
      return false; // Agent not found
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // If deleted agent was default, clear default
    const defaultId = this.getDefaultAgentId();
    if (defaultId === id) {
      localStorage.removeItem(DEFAULT_AGENT_KEY);
    }
    
    return true;
  }

  /**
   * Set default agent
   */
  setDefaultAgent(id: string): void {
    localStorage.setItem(DEFAULT_AGENT_KEY, id);
    
    // Update all agents to remove default flag except the new default
    // Use skipDefaultUpdate to prevent infinite recursion
    const agents = this.getAllAgents();
    agents.forEach(agent => {
      agent.isDefault = agent.id === id;
      this.saveAgent(agent, true); // Skip default update to prevent recursion
    });
  }

  /**
   * Get default agent ID
   */
  getDefaultAgentId(): string | null {
    return localStorage.getItem(DEFAULT_AGENT_KEY);
  }

  /**
   * Get default agent
   */
  getDefaultAgent(): AgentConfig | null {
    const defaultId = this.getDefaultAgentId();
    if (!defaultId) return null;
    return this.getAgent(defaultId);
  }

  /**
   * Validate agent configuration
   */
  validateAgent(agent: Partial<AgentConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!agent.name || agent.name.trim().length === 0) {
      errors.push('Agent name is required');
    }

    if (!agent.model || agent.model.trim().length === 0) {
      errors.push('Model is required');
    }

    if (agent.contextWindow !== undefined && agent.contextWindow < 1) {
      errors.push('Context window must be at least 1');
    }

    if (agent.maxTokens !== undefined && agent.maxTokens < 1) {
      errors.push('Max tokens must be at least 1');
    }

    if (agent.temperature !== undefined && (agent.temperature < 0 || agent.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (agent.topK !== undefined && agent.topK < 1) {
      errors.push('Top K must be at least 1');
    }

    if (agent.topP !== undefined && (agent.topP < 0 || agent.topP > 1)) {
      errors.push('Top P must be between 0 and 1');
    }

    if (agent.mirostat) {
      if (agent.mirostatTau !== undefined && agent.mirostatTau < 0) {
        errors.push('Mirostat tau must be non-negative');
      }
      if (agent.mirostatEta !== undefined && agent.mirostatEta < 0) {
        errors.push('Mirostat eta must be non-negative');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate personality traits from slider values
   */
  calculatePersonalityTraits(sliderValues: {
    curious?: number;
    organized?: number;
    friendly?: number;
    zany?: number;
    sarcastic?: number;
  }): PersonalityTraits {
    const traits: PersonalityTraits = {};

    // Process each trait pair
    // Values > 50 favor the right trait, < 50 favor the left trait, = 50 is neutral but still set
    if (sliderValues.curious !== undefined) {
      traits.curious = sliderValues.curious; // Will be interpreted based on value
    }

    if (sliderValues.organized !== undefined) {
      traits.organized = sliderValues.organized; // Will be interpreted based on value
    }

    if (sliderValues.friendly !== undefined) {
      traits.friendly = sliderValues.friendly; // Will be interpreted based on value
    }

    if (sliderValues.zany !== undefined) {
      traits.zany = sliderValues.zany; // Will be interpreted based on value
    }

    if (sliderValues.sarcastic !== undefined) {
      traits.sarcastic = sliderValues.sarcastic; // Will be interpreted based on value
    }

    return traits;
  }

  /**
   * Generate a unique agent ID
   */
  generateAgentId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}


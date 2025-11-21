import { SettingsService } from '../services/SettingsService';
import { OllamaService } from '../services/OllamaService';
import { AgentService } from '../services/AgentService';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';
import type { AgentConfig, PersonalityTraits } from '../types';

export class SettingsView {
  private settingsService: SettingsService;
  private ollamaService: OllamaService;
  private agentService: AgentService;
  private formListenersAttached: boolean = false;
  private savingAgent: boolean = false;

  constructor() {
    this.settingsService = new SettingsService();
    this.ollamaService = new OllamaService(this.settingsService.getOllamaEndpoint());
    this.agentService = new AgentService();
  }

  render(container: HTMLElement): void {
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.loadAgents();
  }

  private getHTML(): string {
    const settings = this.settingsService.getSettings();
    
    return `
      <div class="container mx-auto px-8 py-12 max-w-6xl">
        <h1 class="text-4xl font-bold mb-8">Settings</h1>
        
        <!-- LLM Settings -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 class="text-2xl font-bold mb-4">LLM Settings</h2>
          
          <div class="mb-4">
            <label for="ollama-endpoint" class="block text-sm font-medium mb-2">
              Ollama Endpoint
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                id="ollama-endpoint"
                value="${settings.ollamaEndpoint}"
                class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="http://localhost:11434"
              />
              <button
                id="test-connection"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Test Connection
              </button>
            </div>
            <p id="connection-status" class="mt-2 text-sm text-gray-400"></p>
          </div>
        </div>

        <!-- Chat History Settings -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 class="text-2xl font-bold mb-4">Chat History</h2>
          
          <div class="flex items-center justify-between">
            <div>
              <label for="persist-chat" class="block text-sm font-medium mb-1">
                Persist Chat History
              </label>
              <p class="text-sm text-gray-400">
                Save chat history in sessionStorage for the current session
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="persist-chat"
                ${settings.persistChatHistory ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <!-- Agent Builder -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold">Agent Builder</h2>
            <button
              id="new-agent-btn"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              + New Agent
            </button>
          </div>

          <!-- Agent List -->
          <div id="agent-list" class="space-y-4 mb-6">
            <!-- Agents will be rendered here -->
          </div>

          <!-- Agent Form (hidden by default) -->
          <div id="agent-form-container" class="hidden">
            ${this.getAgentFormHTML()}
          </div>
        </div>
      </div>
    `;
  }

  private getAgentFormHTML(agent?: AgentConfig): string {
    const isEdit = !!agent;
    const agentData: AgentConfig | { name: string; model: string; contextWindow: number; maxTokens: number; temperature: number; topK: number; topP: number; mirostat: false; mirostatTau: number; mirostatEta: number; personalityTraits: PersonalityTraits; avatar?: string } = agent || {
      name: '',
      model: '',
      contextWindow: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
      mirostat: false,
      mirostatTau: 5.0,
      mirostatEta: 0.1,
      personalityTraits: {},
      avatar: undefined,
    };

    return `
      <div class="bg-gray-900 rounded-lg p-6 border border-gray-600">
        <h3 class="text-xl font-bold mb-4">${isEdit ? 'Edit' : 'Create'} Agent</h3>
        
        <form id="agent-form" class="space-y-6">
          <input type="hidden" id="agent-id" value="${agent?.id || ''}" />
          
          <!-- Basic Info -->
          <div>
            <label for="agent-name" class="block text-sm font-medium mb-2">Agent Name</label>
            <input
              type="text"
              id="agent-name"
              value="${agentData.name}"
              required
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Avatar Upload -->
          <div>
            <label for="agent-avatar" class="block text-sm font-medium mb-2">Avatar</label>
            <div class="flex items-center gap-4">
              <div id="avatar-preview" class="w-16 h-16 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center overflow-hidden">
                ${(agentData as AgentConfig).avatar ? `<img src="${(agentData as AgentConfig).avatar}" alt="Avatar" class="w-full h-full object-cover" />` : '<span class="text-gray-400">No image</span>'}
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  id="agent-avatar"
                  accept="image/png,image/jpeg,image/webp"
                  class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <p class="text-xs text-gray-500 mt-1">PNG, JPG, or WebP. Max 2MB.</p>
              </div>
            </div>
          </div>

          <!-- Model Selection -->
          <div>
            <label for="agent-model" class="block text-sm font-medium mb-2">Model</label>
            <select
              id="agent-model"
              required
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a model...</option>
              <!-- Models will be populated dynamically -->
            </select>
          </div>

          <!-- LLM Parameters -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="agent-context-window" class="block text-sm font-medium mb-2">Context Window</label>
              <input
                type="number"
                id="agent-context-window"
                value="${agentData.contextWindow}"
                min="1"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="agent-max-tokens" class="block text-sm font-medium mb-2">Max Tokens</label>
              <input
                type="number"
                id="agent-max-tokens"
                value="${agentData.maxTokens}"
                min="1"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label for="agent-temperature" class="block text-sm font-medium mb-2">
              Temperature: <span id="temp-value">${agentData.temperature}</span>
            </label>
            <input
              type="range"
              id="agent-temperature"
              min="0"
              max="2"
              step="0.1"
              value="${agentData.temperature}"
              class="w-full"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="agent-top-k" class="block text-sm font-medium mb-2">Top K</label>
              <input
                type="number"
                id="agent-top-k"
                value="${agentData.topK}"
                min="1"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="agent-top-p" class="block text-sm font-medium mb-2">Top P</label>
              <input
                type="number"
                id="agent-top-p"
                value="${agentData.topP}"
                min="0"
                max="1"
                step="0.01"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Mirostat -->
          <div class="relative">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="agent-mirostat"
                ${agentData.mirostat ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span class="ml-3 text-sm font-medium">Enable Mirostat</span>
            </label>
            <div id="mirostat-params" class="mt-4 grid grid-cols-2 gap-4 ${agentData.mirostat ? '' : 'hidden'}">
              <div>
                <label for="agent-mirostat-tau" class="block text-sm font-medium mb-2">Mirostat Tau</label>
                <input
                  type="number"
                  id="agent-mirostat-tau"
                  value="${agentData.mirostatTau || 5.0}"
                  min="0"
                  step="0.1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="agent-mirostat-eta" class="block text-sm font-medium mb-2">Mirostat Eta</label>
                <input
                  type="number"
                  id="agent-mirostat-eta"
                  value="${agentData.mirostatEta || 0.1}"
                  min="0"
                  step="0.01"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Personality Traits -->
          <div>
            <h4 class="text-lg font-semibold mb-4">Personality Traits</h4>
            ${this.getTraitSlidersHTML(agentData.personalityTraits as Record<string, number>)}
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              id="cancel-agent-btn"
              class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ${isEdit ? 'Update' : 'Create'} Agent
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private getTraitSlidersHTML(traits: Record<string, number>): string {
    const traitPairs = [
      { key: 'curious', left: 'Cautious', right: 'Curious' },
      { key: 'organized', left: 'Careless', right: 'Organized' },
      { key: 'friendly', left: 'Challenging', right: 'Friendly' },
      { key: 'zany', left: 'Sober', right: 'Zany' },
      { key: 'sarcastic', left: 'Serious', right: 'Sarcastic' },
    ];

    return traitPairs.map(({ key, left, right }) => {
      const value = traits[key] !== undefined ? traits[key] : 50;
      return `
        <div class="mb-4">
          <div class="flex justify-between mb-2">
            <span class="text-sm ${value < 50 ? 'font-semibold text-white' : 'text-gray-400'}">${left}</span>
            <span class="text-sm ${value > 50 ? 'font-semibold text-white' : 'text-gray-400'}">${right}</span>
          </div>
          <input
            type="range"
            id="trait-${key}"
            min="0"
            max="100"
            value="${value}"
            class="w-full"
          />
        </div>
      `;
    }).join('');
  }

  private attachEventListeners(): void {
    // Ollama endpoint
    const endpointInput = document.getElementById('ollama-endpoint') as HTMLInputElement;
    if (endpointInput) {
      endpointInput.addEventListener('change', () => {
        this.settingsService.setOllamaEndpoint(endpointInput.value);
        this.ollamaService.setEndpoint(endpointInput.value);
      });
    }

    // Test connection
    const testBtn = document.getElementById('test-connection');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testConnection());
    }

    // Persist chat toggle
    const persistChat = document.getElementById('persist-chat') as HTMLInputElement;
    if (persistChat) {
      persistChat.addEventListener('change', () => {
        this.settingsService.setPersistChatHistory(persistChat.checked);
      });
    }

    // New agent button
    const newAgentBtn = document.getElementById('new-agent-btn');
    if (newAgentBtn) {
      newAgentBtn.addEventListener('click', () => this.showAgentForm());
    }

    // Cancel agent form
    const cancelBtn = document.getElementById('cancel-agent-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideAgentForm());
    }

    // Agent form submit
    const agentForm = document.getElementById('agent-form');
    if (agentForm) {
      agentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAgent();
      });
    }

    // Mirostat toggle
    const mirostatCheckbox = document.getElementById('agent-mirostat') as HTMLInputElement;
    if (mirostatCheckbox) {
      mirostatCheckbox.addEventListener('change', () => {
        const params = document.getElementById('mirostat-params');
        if (params) {
          params.classList.toggle('hidden', !mirostatCheckbox.checked);
        }
      });
    }

    // Temperature slider
    const tempSlider = document.getElementById('agent-temperature') as HTMLInputElement;
    const tempValue = document.getElementById('temp-value');
    if (tempSlider && tempValue) {
      tempSlider.addEventListener('input', () => {
        tempValue.textContent = tempSlider.value;
      });
    }

    // Avatar upload
    const avatarInput = document.getElementById('agent-avatar') as HTMLInputElement;
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.handleAvatarUpload(file);
        }
      });
    }
  }

  private async testConnection(): Promise<void> {
    const statusEl = document.getElementById('connection-status');
    const testBtn = document.getElementById('test-connection') as HTMLButtonElement;
    
    if (!statusEl || !testBtn) return;

    testBtn.disabled = true;
    statusEl.textContent = 'Testing connection...';
    statusEl.className = 'mt-2 text-sm text-yellow-400';

    try {
      const connected = await this.ollamaService.testConnection();
      if (connected) {
        statusEl.textContent = '✓ Connected successfully';
        statusEl.className = 'mt-2 text-sm text-green-400';
        await this.loadModels();
      } else {
        statusEl.textContent = '✗ Connection failed';
        statusEl.className = 'mt-2 text-sm text-red-400';
      }
    } catch (error) {
      statusEl.textContent = `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      statusEl.className = 'mt-2 text-sm text-red-400';
    } finally {
      testBtn.disabled = false;
    }
  }

  private async loadModels(selectedModel?: string): Promise<void> {
    try {
      const models = await this.ollamaService.listModels();
      const modelSelect = document.getElementById('agent-model') as HTMLSelectElement;
      if (modelSelect) {
        // Clear existing options except the first one
        while (modelSelect.options.length > 1) {
          modelSelect.remove(1);
        }
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.name;
          if (selectedModel && model.name === selectedModel) {
            option.selected = true;
          }
          modelSelect.appendChild(option);
        });
        
        // Set selected value if provided and not already set
        if (selectedModel && modelSelect.value !== selectedModel) {
          modelSelect.value = selectedModel;
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  private loadAgents(): void {
    const agents = this.agentService.getAllAgents();
    const listContainer = document.getElementById('agent-list');
    if (!listContainer) return;

    if (agents.length === 0) {
      listContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No agents created yet. Click "New Agent" to create one.</p>';
      return;
    }

    listContainer.innerHTML = agents.map(agent => `
      <div class="bg-gray-900 rounded-lg p-4 border border-gray-600 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gray-700 border border-gray-600 overflow-hidden flex items-center justify-center">
            ${agent.avatar ? `<img src="${agent.avatar}" alt="${agent.name}" class="w-full h-full object-cover" />` : '<span class="text-gray-400 text-xs">No img</span>'}
          </div>
          <div>
            <h4 class="font-semibold">${agent.name} ${agent.isDefault ? '<span class="text-xs bg-blue-600 px-2 py-1 rounded">Default</span>' : ''}</h4>
            <p class="text-sm text-gray-400">${agent.model}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors edit-agent-btn"
            data-agent-id="${agent.id}"
          >
            Edit
          </button>
          ${!agent.isDefault ? `
            <button
              class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors set-default-btn"
              data-agent-id="${agent.id}"
            >
              Set Default
            </button>
          ` : ''}
          <button
            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors delete-agent-btn"
            data-agent-id="${agent.id}"
          >
            Delete
          </button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    listContainer.querySelectorAll('.edit-agent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const agentId = (e.target as HTMLElement).getAttribute('data-agent-id');
        if (agentId) {
          const agent = this.agentService.getAgent(agentId);
          if (agent) this.showAgentForm(agent);
        }
      });
    });

    listContainer.querySelectorAll('.set-default-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const agentId = (e.target as HTMLElement).getAttribute('data-agent-id');
        if (agentId) {
          this.agentService.setDefaultAgent(agentId);
          this.loadAgents();
        }
      });
    });

    listContainer.querySelectorAll('.delete-agent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const agentId = (e.target as HTMLElement).getAttribute('data-agent-id');
        if (agentId && confirm('Are you sure you want to delete this agent?')) {
          this.agentService.deleteAgent(agentId);
          this.loadAgents();
        }
      });
    });
  }

  private showAgentForm(agent?: AgentConfig): void {
    const formContainer = document.getElementById('agent-form-container');
    if (!formContainer) return;

    // Reset the flag when showing new form
    this.formListenersAttached = false;
    
    formContainer.innerHTML = this.getAgentFormHTML(agent);
    formContainer.classList.remove('hidden');
    this.attachAgentFormListeners();
    // Load models and set selected model if editing
    this.loadModels(agent?.model);
  }

  private hideAgentForm(): void {
    const formContainer = document.getElementById('agent-form-container');
    if (formContainer) {
      formContainer.classList.add('hidden');
    }
  }

  private attachAgentFormListeners(): void {
    // Use event delegation to avoid duplicate listeners
    const formContainer = document.getElementById('agent-form-container');
    if (!formContainer) return;

    // Only attach listeners once - use a flag to prevent duplicates
    if (this.formListenersAttached) {
      return;
    }

    // Create bound handlers
    const handleSubmit = (e: Event) => {
      const form = (e.target as HTMLElement).closest('form');
      if (form && form.id === 'agent-form') {
        e.preventDefault();
        e.stopPropagation();
        this.saveAgent();
      }
    };

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.id === 'cancel-agent-btn') {
        e.preventDefault();
        e.stopPropagation();
        this.hideAgentForm();
      }
    };

    const handleChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.id === 'agent-mirostat') {
        const checkbox = target as HTMLInputElement;
        const params = document.getElementById('mirostat-params');
        if (params) {
          params.classList.toggle('hidden', !checkbox.checked);
        }
      } else if (target.id === 'agent-temperature') {
        const slider = target as HTMLInputElement;
        const tempValue = document.getElementById('temp-value');
        if (tempValue) {
          tempValue.textContent = slider.value;
        }
      } else if (target.id === 'agent-avatar') {
        const input = target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
          this.handleAvatarUpload(file);
        }
      }
    };

    formContainer.addEventListener('submit', handleSubmit, true);
    formContainer.addEventListener('click', handleClick, true);
    formContainer.addEventListener('change', handleChange, true);

    this.formListenersAttached = true;
  }

  private handleAvatarUpload(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const preview = document.getElementById('avatar-preview');
      if (preview && result) {
        preview.innerHTML = `<img src="${result}" alt="Avatar" class="w-full h-full object-cover" />`;
        // Store in a data attribute for later retrieval
        preview.setAttribute('data-avatar', result);
      }
    };
    reader.readAsDataURL(file);
  }

  private saveAgent(): void {
    // Prevent multiple simultaneous saves
    if (this.savingAgent) {
      return;
    }
    this.savingAgent = true;

    try {
      const form = document.getElementById('agent-form') as HTMLFormElement;
      if (!form) {
        this.savingAgent = false;
        return;
      }

      const agentId = (document.getElementById('agent-id') as HTMLInputElement)?.value || this.agentService.generateAgentId();
      
      // Get avatar from preview data attribute or existing agent
      const preview = document.getElementById('avatar-preview');
      let avatar = preview?.getAttribute('data-avatar') || '';
      if (!avatar) {
        // Check if editing and keep existing avatar
        const existingAgent = this.agentService.getAgent(agentId);
        avatar = existingAgent?.avatar || '';
      }

      // Get trait values
      const traits = {
        curious: parseInt((document.getElementById('trait-curious') as HTMLInputElement)?.value || '50'),
        organized: parseInt((document.getElementById('trait-organized') as HTMLInputElement)?.value || '50'),
        friendly: parseInt((document.getElementById('trait-friendly') as HTMLInputElement)?.value || '50'),
        zany: parseInt((document.getElementById('trait-zany') as HTMLInputElement)?.value || '50'),
        sarcastic: parseInt((document.getElementById('trait-sarcastic') as HTMLInputElement)?.value || '50'),
      };

      const agent: AgentConfig = {
        id: agentId,
        name: (document.getElementById('agent-name') as HTMLInputElement)?.value || '',
        avatar: avatar,
        model: (document.getElementById('agent-model') as HTMLSelectElement)?.value || '',
        contextWindow: parseInt((document.getElementById('agent-context-window') as HTMLInputElement)?.value || '4096'),
        maxTokens: parseInt((document.getElementById('agent-max-tokens') as HTMLInputElement)?.value || '2048'),
        temperature: parseFloat((document.getElementById('agent-temperature') as HTMLInputElement)?.value || '0.7'),
        topK: parseInt((document.getElementById('agent-top-k') as HTMLInputElement)?.value || '40'),
        topP: parseFloat((document.getElementById('agent-top-p') as HTMLInputElement)?.value || '0.9'),
        mirostat: (document.getElementById('agent-mirostat') as HTMLInputElement)?.checked || false,
        mirostatTau: parseFloat((document.getElementById('agent-mirostat-tau') as HTMLInputElement)?.value || '5.0'),
        mirostatEta: parseFloat((document.getElementById('agent-mirostat-eta') as HTMLInputElement)?.value || '0.1'),
        personalityTraits: this.agentService.calculatePersonalityTraits(traits),
        isDefault: this.agentService.getDefaultAgentId() === agentId,
      };

      const validation = this.agentService.validateAgent(agent);
      if (!validation.valid) {
        toast.error('Validation errors: ' + validation.errors.join(', '));
        this.savingAgent = false;
        return;
      }

      this.agentService.saveAgent(agent);
      this.hideAgentForm();
      // Reset flag and reload after a delay
      setTimeout(() => {
        this.savingAgent = false;
        this.loadAgents();
      }, 200);
    } catch (error) {
      logger.error('Error saving agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save agent: ${errorMessage}`);
      this.savingAgent = false;
    }
  }
}


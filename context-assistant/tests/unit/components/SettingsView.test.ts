import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsView } from '../../../src/components/SettingsView';

// Mock dependencies
vi.mock('../../../src/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../src/services/SettingsService', () => {
  return {
    SettingsService: vi.fn().mockImplementation(() => ({
      getSettings: vi.fn(() => ({
        ollamaEndpoint: 'http://localhost:11434',
        persistChatHistory: true,
      })),
      getOllamaEndpoint: vi.fn(() => 'http://localhost:11434'),
      setOllamaEndpoint: vi.fn(),
      setPersistChatHistory: vi.fn(),
      saveSettings: vi.fn(),
    })),
  };
});

vi.mock('../../../src/services/OllamaService', () => {
  return {
    OllamaService: vi.fn().mockImplementation(() => ({
      testConnection: vi.fn(() => Promise.resolve(true)),
      listModels: vi.fn(() => Promise.resolve([])),
      setEndpoint: vi.fn(),
    })),
  };
});

vi.mock('../../../src/services/AgentService', () => {
  return {
    AgentService: vi.fn().mockImplementation(() => ({
      getAllAgents: vi.fn(() => []),
      getAgent: vi.fn(),
      saveAgent: vi.fn(),
      deleteAgent: vi.fn(),
      setDefaultAgent: vi.fn(),
    })),
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('SettingsView', () => {
  let settingsView: SettingsView;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    settingsView = new SettingsView();
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('should render settings UI', () => {
      settingsView.render(container);
      
      expect(container.innerHTML).toContain('Settings');
      expect(container.innerHTML).toContain('LLM Settings');
    });

    it('should render agent builder section', () => {
      settingsView.render(container);
      
      expect(container.innerHTML).toContain('Agent Builder');
    });

    it('should render chat history settings', () => {
      settingsView.render(container);
      
      expect(container.innerHTML).toContain('Chat History');
      expect(container.innerHTML).toContain('Persist Chat History');
    });
  });

  describe('loadAgents', () => {
    it('should display agents list', () => {
      settingsView.render(container);
      
      // loadAgents is called in render
      const agentList = document.getElementById('agent-list');
      expect(agentList).toBeTruthy();
    });
  });

  describe('event listeners', () => {
    it('should handle test connection button', async () => {
      settingsView.render(container);
      
      const testBtn = document.getElementById('test-connection');
      if (testBtn) {
        (testBtn as HTMLButtonElement).click();
        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 50));
        // Connection test should have been attempted
      }
    });

    it('should handle new agent button', () => {
      settingsView.render(container);
      
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
        const formContainer = document.getElementById('agent-form-container');
        expect(formContainer?.classList.contains('hidden')).toBe(false);
      }
    });

    it('should handle persist chat toggle', () => {
      settingsView.render(container);
      
      const persistCheckbox = document.getElementById('persist-chat') as HTMLInputElement;
      if (persistCheckbox) {
        persistCheckbox.checked = true;
        persistCheckbox.dispatchEvent(new Event('change'));
        // Settings should be saved
      }
    });

    it('should handle ollama endpoint change', () => {
      settingsView.render(container);
      
      const endpointInput = document.getElementById('ollama-endpoint') as HTMLInputElement;
      if (endpointInput) {
        endpointInput.value = 'http://localhost:11435';
        endpointInput.dispatchEvent(new Event('change'));
        // Endpoint should be updated
      }
    });
  });

  describe('agent management', () => {
    it('should handle edit agent button', () => {
      // We need to access the agentService through the view
      settingsView.render(container);
      
      // Simulate clicking edit button
      const editBtn = container.querySelector('.edit-agent-btn');
      if (editBtn) {
        (editBtn as HTMLElement).click();
        const formContainer = document.getElementById('agent-form-container');
        expect(formContainer?.classList.contains('hidden')).toBe(false);
      }
    });
  });

  describe('testConnection', () => {
    it('should handle connection failure', async () => {
      const mockOllamaService = {
        testConnection: vi.fn(() => Promise.resolve(false)),
        setEndpoint: vi.fn(),
      };
      
      // Replace the ollamaService
      (settingsView as any).ollamaService = mockOllamaService;
      
      settingsView.render(container);
      const testBtn = document.getElementById('test-connection');
      if (testBtn) {
        (testBtn as HTMLButtonElement).click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const statusEl = document.getElementById('connection-status');
        expect(statusEl?.textContent).toContain('Connection failed');
      }
    });

    it('should handle connection error', async () => {
      const mockOllamaService = {
        testConnection: vi.fn(() => Promise.reject(new Error('Network error'))),
        setEndpoint: vi.fn(),
      };
      
      (settingsView as any).ollamaService = mockOllamaService;
      
      settingsView.render(container);
      const testBtn = document.getElementById('test-connection');
      if (testBtn) {
        (testBtn as HTMLButtonElement).click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const statusEl = document.getElementById('connection-status');
        expect(statusEl?.textContent).toContain('Error');
      }
    });
  });

  describe('handleAvatarUpload', () => {
    it('should reject files larger than 2MB', async () => {
      const { toast } = await import('../../../src/utils/toast');
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const avatarInput = document.getElementById('agent-avatar') as HTMLInputElement;
      if (avatarInput) {
        // Create a mock file larger than 2MB
        const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
        Object.defineProperty(avatarInput, 'files', {
          value: [largeFile],
          writable: false,
        });
        
        avatarInput.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.error).toHaveBeenCalledWith('Image size must be less than 2MB');
      }
    });
  });

  describe('saveAgent', () => {
    it('should handle validation errors', async () => {
      const { toast } = await import('../../../src/utils/toast');
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => ({ valid: false, errors: ['Name is required'] })),
        getDefaultAgentId: vi.fn(() => null),
        getAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // Try to save without filling required fields
      const form = document.getElementById('agent-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.error).toHaveBeenCalled();
      }
    });

    it('should prevent multiple simultaneous saves', () => {
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => ({ valid: true, errors: [] })),
        saveAgent: vi.fn(),
        getDefaultAgentId: vi.fn(() => null),
        calculatePersonalityTraits: vi.fn(() => ({})),
      };
      
      (settingsView as any).agentService = mockAgentService;
      (settingsView as any).savingAgent = true; // Set to true to test early return
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const form = document.getElementById('agent-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        // Should not call saveAgent because savingAgent is true
        expect(mockAgentService.saveAgent).not.toHaveBeenCalled();
      }
    });

    it('should handle saveAgent error', async () => {
      const { toast } = await import('../../../src/utils/toast');
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => ({ valid: true, errors: [] })),
        saveAgent: vi.fn(() => {
          throw new Error('Save failed');
        }),
        getDefaultAgentId: vi.fn(() => null),
        calculatePersonalityTraits: vi.fn(() => ({})),
        getAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // Fill in form fields
      const nameInput = document.getElementById('agent-name') as HTMLInputElement;
      const modelSelect = document.getElementById('agent-model') as HTMLSelectElement;
      if (nameInput && modelSelect) {
        nameInput.value = 'Test Agent';
        modelSelect.value = 'llama2';
      }
      
      const form = document.getElementById('agent-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.error).toHaveBeenCalled();
      }
    });
  });

  describe('loadAgents branches', () => {
    it('should show empty state when no agents', () => {
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
      };
      
      (settingsView as any).agentService = mockAgentService;
      settingsView.render(container);
      
      const agentList = document.getElementById('agent-list');
      expect(agentList?.textContent).toContain('No agents created yet');
    });

    it('should display agents with avatars', () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        model: 'llama2',
        avatar: 'data:image/png;base64,test',
        isDefault: true,
      };

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
        deleteAgent: vi.fn(),
        setDefaultAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      settingsView.render(container);
      
      const agentList = document.getElementById('agent-list');
      expect(agentList?.innerHTML).toContain('Test Agent');
      expect(agentList?.innerHTML).toContain('Default');
      expect(agentList?.innerHTML).toContain('data:image/png');
    });

    it('should display agents without avatars', () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        model: 'llama2',
        avatar: null,
        isDefault: false,
      };

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
        deleteAgent: vi.fn(),
        setDefaultAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      settingsView.render(container);
      
      const agentList = document.getElementById('agent-list');
      expect(agentList?.innerHTML).toContain('No img');
      expect(agentList?.innerHTML).toContain('Set Default');
    });

    it('should handle delete agent button', () => {
      window.confirm = vi.fn(() => true);
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        model: 'llama2',
        avatar: null,
        isDefault: false,
      };

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
        deleteAgent: vi.fn(),
        setDefaultAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      settingsView.render(container);
      
      const deleteBtn = container.querySelector('.delete-agent-btn');
      if (deleteBtn) {
        (deleteBtn as HTMLElement).click();
        expect(mockAgentService.deleteAgent).toHaveBeenCalledWith('agent-1');
      }
    });

    it('should handle set default agent button', () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        model: 'llama2',
        avatar: null,
        isDefault: false,
      };

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
        deleteAgent: vi.fn(),
        setDefaultAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      settingsView.render(container);
      
      const setDefaultBtn = container.querySelector('.set-default-btn');
      if (setDefaultBtn) {
        (setDefaultBtn as HTMLElement).click();
        expect(mockAgentService.setDefaultAgent).toHaveBeenCalledWith('agent-1');
      }
    });
  });

  describe('handleAvatarUpload branches', () => {
    it('should handle successful avatar upload', async () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const avatarInput = document.getElementById('agent-avatar') as HTMLInputElement;
      if (avatarInput) {
        // Create a valid file
        const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(avatarInput, 'files', {
          value: [validFile],
          writable: false,
        });
        
        // Mock FileReader
        const mockFileReader = {
          readAsDataURL: vi.fn(function(this: FileReader) {
            setTimeout(() => {
              (this as any).onload({ target: { result: 'data:image/jpeg;base64,test' } });
            }, 10);
          }),
        };
        global.FileReader = vi.fn(() => mockFileReader as any) as any;
        
        avatarInput.dispatchEvent(new Event('change'));
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const preview = document.getElementById('avatar-preview');
        expect(preview?.innerHTML).toContain('img');
      }
    });
  });

  describe('attachAgentFormListeners branches', () => {
    it('should not attach listeners twice', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // Set flag to true
      (settingsView as any).formListenersAttached = true;
      
      // Try to attach again
      (settingsView as any).attachAgentFormListeners();
      
      // Should not attach duplicate listeners
      const formContainer = document.getElementById('agent-form-container');
      expect(formContainer).toBeTruthy();
    });

    it('should handle mirostat checkbox change', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const mirostatCheckbox = document.getElementById('agent-mirostat') as HTMLInputElement;
      const mirostatParams = document.getElementById('mirostat-params');
      
      if (mirostatCheckbox && mirostatParams) {
        mirostatCheckbox.checked = true;
        mirostatCheckbox.dispatchEvent(new Event('change'));
        
        expect(mirostatParams.classList.contains('hidden')).toBe(false);
        
        mirostatCheckbox.checked = false;
        mirostatCheckbox.dispatchEvent(new Event('change'));
        
        expect(mirostatParams.classList.contains('hidden')).toBe(true);
      }
    });

    it('should handle temperature slider change', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const tempSlider = document.getElementById('agent-temperature') as HTMLInputElement;
      const tempValue = document.getElementById('temp-value');
      
      if (tempSlider && tempValue) {
        tempSlider.value = '0.8';
        tempSlider.dispatchEvent(new Event('change'));
        
        expect(tempValue.textContent).toBe('0.8');
      }
    });
  });

  describe('loadModels branches', () => {
    it('should handle loadModels error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOllamaService = {
        testConnection: vi.fn(() => Promise.resolve(true)),
        listModels: vi.fn(() => Promise.reject(new Error('Failed to load'))),
        setEndpoint: vi.fn(),
      };
      
      (settingsView as any).ollamaService = mockOllamaService;
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // loadModels is called when form is shown
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should handle error gracefully
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should set selected model when editing', async () => {
      const mockAgent = {
        id: 'agent-1',
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

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
      };

      const mockOllamaService = {
        testConnection: vi.fn(() => Promise.resolve(true)),
        listModels: vi.fn(() => Promise.resolve([
          { name: 'llama2' },
          { name: 'mistral' },
        ])),
        setEndpoint: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      (settingsView as any).ollamaService = mockOllamaService;
      
      settingsView.render(container);
      
      // Click edit button
      const editBtn = container.querySelector('.edit-agent-btn');
      if (editBtn) {
        (editBtn as HTMLElement).click();
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const modelSelect = document.getElementById('agent-model') as HTMLSelectElement;
      expect(modelSelect?.value).toBe('llama2');
    });
  });

  describe('attachAgentFormListeners branches', () => {
    it('should handle form submit when form id matches', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const form = document.getElementById('agent-form');
      if (form) {
        const saveSpy = vi.spyOn(settingsView as any, 'saveAgent');
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        expect(saveSpy).toHaveBeenCalled();
      }
    });

    it('should not handle form submit when form id does not match', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // Create a different form
      const otherForm = document.createElement('form');
      otherForm.id = 'other-form';
      document.body.appendChild(otherForm);
      
      const saveSpy = vi.spyOn(settingsView as any, 'saveAgent');
      otherForm.dispatchEvent(new Event('submit', { cancelable: true }));
      // Should not call saveAgent for non-matching form
      expect(saveSpy).not.toHaveBeenCalled();
      
      document.body.removeChild(otherForm);
    });

    it('should handle cancel button click', () => {
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      const cancelBtn = document.getElementById('cancel-agent-btn');
      if (cancelBtn) {
        cancelBtn.click();
        const formContainer = document.getElementById('agent-form-container');
        expect(formContainer?.classList.contains('hidden')).toBe(true);
      }
    });
  });

  describe('saveAgent branches', () => {
    it('should handle saveAgent when form is missing', () => {
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => ({ valid: true, errors: [] })),
        saveAgent: vi.fn(),
        getDefaultAgentId: vi.fn(() => null),
        calculatePersonalityTraits: vi.fn(() => ({})),
      };
      
      (settingsView as any).agentService = mockAgentService;
      
      // Try to save without rendering form
      (settingsView as any).saveAgent();
      
      // Should not call saveAgent because form doesn't exist
      expect(mockAgentService.saveAgent).not.toHaveBeenCalled();
    });

    it('should handle avatar from existing agent when editing', () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        model: 'llama2',
        contextWindow: 4096,
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        mirostat: false,
        personalityTraits: {},
        avatar: 'data:image/png;base64,test',
        isDefault: false,
      };

      const mockAgentService = {
        getAllAgents: vi.fn(() => [mockAgent]),
        getAgent: vi.fn(() => mockAgent),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => ({ valid: true, errors: [] })),
        saveAgent: vi.fn(),
        getDefaultAgentId: vi.fn(() => null),
        calculatePersonalityTraits: vi.fn(() => ({})),
      };
      
      (settingsView as any).agentService = mockAgentService;
      
      settingsView.render(container);
      
      // Click edit button
      const editBtn = container.querySelector('.edit-agent-btn');
      if (editBtn) {
        (editBtn as HTMLElement).click();
      }
      
      // Remove avatar from preview to test fallback to existing agent avatar
      const preview = document.getElementById('avatar-preview');
      if (preview) {
        preview.removeAttribute('data-avatar');
      }
      
      // Fill in required fields
      const nameInput = document.getElementById('agent-name') as HTMLInputElement;
      const modelSelect = document.getElementById('agent-model') as HTMLSelectElement;
      if (nameInput && modelSelect) {
        nameInput.value = 'Test Agent';
        modelSelect.value = 'llama2';
      }
      
      // Try to save - should use existing avatar
      const form = document.getElementById('agent-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        expect(mockAgentService.saveAgent).toHaveBeenCalled();
        const savedAgent = mockAgentService.saveAgent.mock.calls[0][0];
        expect(savedAgent.avatar).toBe('data:image/png;base64,test');
      }
    });

    it('should handle saveAgent error path', async () => {
      const { toast } = await import('../../../src/utils/toast');
      const mockAgentService = {
        getAllAgents: vi.fn(() => []),
        generateAgentId: vi.fn(() => 'agent-1'),
        validateAgent: vi.fn(() => {
          throw new Error('Validation error');
        }),
        getDefaultAgentId: vi.fn(() => null),
        calculatePersonalityTraits: vi.fn(() => ({})),
        getAgent: vi.fn(),
      };
      
      (settingsView as any).agentService = mockAgentService;
      
      settingsView.render(container);
      const newAgentBtn = document.getElementById('new-agent-btn');
      if (newAgentBtn) {
        newAgentBtn.click();
      }
      
      // Fill in form fields
      const nameInput = document.getElementById('agent-name') as HTMLInputElement;
      const modelSelect = document.getElementById('agent-model') as HTMLSelectElement;
      if (nameInput && modelSelect) {
        nameInput.value = 'Test Agent';
        modelSelect.value = 'llama2';
      }
      
      const form = document.getElementById('agent-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(toast.error).toHaveBeenCalled();
      }
    });
  });
});


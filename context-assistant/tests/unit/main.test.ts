import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock App before importing main
const mockInit = vi.fn();
const mockApp = vi.fn().mockImplementation(() => ({
  init: mockInit,
}));

vi.mock('../../src/App', () => ({
  App: mockApp,
}));

describe('main.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize app on DOMContentLoaded', async () => {
    // Import main to trigger the event listener registration
    await import('../../src/main');
    
    // Simulate DOMContentLoaded
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    // App should be instantiated and init called
    expect(mockApp).toHaveBeenCalled();
    expect(mockInit).toHaveBeenCalled();
  });
});

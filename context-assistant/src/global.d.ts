// Global type declarations

interface Window {
  contextAssistantAPI?: {
    isReady: () => boolean;
    getSceneObjects?: () => Array<{
      name: string;
      type: string;
      id?: string;
      uuid?: string;
      children?: Array<unknown>;
      properties?: Record<string, unknown>;
    }>;
    getEditorState?: () => unknown;
    getCurrentPage?: () => unknown;
    traverseScene?: (object: unknown, result?: unknown[]) => unknown[];
    [key: string]: unknown;
  };
  editor?: {
    scene?: unknown;
    selected?: { uuid?: string };
    camera?: {
      position?: unknown;
      rotation?: unknown;
    };
  };
}


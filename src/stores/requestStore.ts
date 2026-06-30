import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { RequestTab } from '../types/request';
import { useEnvironmentStore } from './environmentStore';
import { sendRequest } from '../services/curlService';
import { useCollectionStore } from './collectionStore';
import { collectionService } from '../services/collectionService';
import { useUIStore } from './uiStore';
import { storageService } from '../services/storageService';

interface RequestState {
  tabs: RequestTab[];
  activeTabId: string | null;
  /** Maps tab ID to sending state */
  isSending: Record<string, boolean>;

  // Actions
  addTab: (tab?: Partial<RequestTab>) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<RequestTab>) => void;
  setActiveTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  sendActiveRequest: () => Promise<void>;
  saveActiveRequest: () => Promise<void>;
  openCollectionRequest: (req: any, collectionId: string, folderId?: string) => void;
  markClean: (id: string) => void;
  loadSession: () => Promise<void>;
}

export const createDefaultTab = (): RequestTab => ({
  id: uuidv4(),
  name: 'New Request',
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  body: { type: 'none' },
  auth: { type: 'none' },
  script: '',
  followRedirects: true,
  isDirty: false,
});

export const useRequestStore = create<RequestState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  isSending: {},

  addTab: (tabPatch) => {
    const newTab: RequestTab = { ...createDefaultTab(), ...tabPatch };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  closeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      // If closing the active tab, pick the next available one
      if (newActiveId === id) {
        const closedIndex = state.tabs.findIndex((t) => t.id === id);
        if (newTabs.length > 0) {
          const nextIndex = Math.min(closedIndex, newTabs.length - 1);
          newActiveId = newTabs[nextIndex].id;
        } else {
          newActiveId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  },

  updateTab: (id, patch) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...patch, isDirty: true } : t)),
    }));
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    });
  },

  sendActiveRequest: async () => {
    const { activeTabId, tabs, isSending } = get();
    if (!activeTabId || isSending[activeTabId]) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    // Set sending state
    set((state) => ({ isSending: { ...state.isSending, [activeTabId]: true } }));

    // Dynamically import responseStore and scriptService to avoid circular deps or init order issues
    const { useResponseStore } = await import('./responseStore');
    const { runScript } = await import('../services/scriptService');
    
    useResponseStore.getState().setLoading(activeTabId, true);

    try {
      // Resolve variables
      const collectionVars = activeTab.collectionId
        ? useCollectionStore.getState().getCollectionVariables(activeTab.collectionId)
        : {};
      const resolvedVars = useEnvironmentStore.getState().resolveVariables(collectionVars);
      
      // Send request
      const response = await sendRequest(activeTab, resolvedVars);
      
      // Store in responseStore
      useResponseStore.getState().setResponse(activeTabId, response);
      
      // Save to history
      const { useHistoryStore } = await import('./historyStore');
      const { v4: uuidv4 } = await import('uuid');
      const { interpolate } = await import('../utils/variableInterpolation');
      useHistoryStore.getState().addEntry({
        id: uuidv4(),
        timestamp: Date.now(),
        method: activeTab.method,
        url: interpolate(activeTab.url, collectionVars, useEnvironmentStore.getState().resolveVariables({}), {}),
        status: response.status,
        time: response.time,
        request: collectionService.requestToCollectionRequest(activeTab)
      });
      
      // Run post-request script
      if (activeTab.script && activeTab.script.trim() !== '') {
        const { logs, envUpdates, error } = await runScript(activeTab.script, {
          response: {
            ...response,
            headers: Object.fromEntries(response.headers.map(h => [h.key, h.value]))
          },
          env: {
            get: (key) => useEnvironmentStore.getState().resolveVariables()[key],
            set: (key, val) => {
              const activeEnvName = useEnvironmentStore.getState().activeEnvName || 'globals';
              useEnvironmentStore.getState().setVariable(activeEnvName, key, val);
            }
          }
        });
        
        if (logs.length > 0) {
          useResponseStore.getState().addConsoleLogs(activeTabId, logs);
        }
        if (error) {
          useResponseStore.getState().addConsoleLogs(activeTabId, [`Error: ${error}`]);
        }
        // Apply envUpdates directly if any were batched in the runner
        for (const [key, val] of Object.entries(envUpdates)) {
            const activeEnvName = useEnvironmentStore.getState().activeEnvName || 'globals';
            await useEnvironmentStore.getState().setVariable(activeEnvName, key, val);
        }
      }
    } catch (error: any) {
      console.error('Request failed:', error);
      useResponseStore.getState().setError(activeTabId, error.message || String(error));
    } finally {
      // Clear sending state
      set((state) => ({ isSending: { ...state.isSending, [activeTabId]: false } }));
      useResponseStore.getState().setLoading(activeTabId, false);
    }
  },

  saveActiveRequest: async () => {
    const { activeTabId, tabs } = get();
    if (!activeTabId) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    if (activeTab.collectionId) {
      // Update existing request
      const req = collectionService.requestToCollectionRequest(activeTab);
      await useCollectionStore.getState().updateRequest(activeTab.collectionId, req.id, req);
      get().markClean(activeTabId);
    } else {
      // Open Save-to-Collection modal
      useUIStore.getState().setActiveModal('saveToCollection');
    }
  },

  openCollectionRequest: (req, collectionId, folderId) => {
    const newTab = collectionService.collectionRequestToTab(req, collectionId, folderId);
    
    set((state) => {
      // Check if it's already open
      const existing = state.tabs.find(t => t.id === newTab.id);
      if (existing) {
        return { activeTabId: existing.id };
      }
      
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
    });
  },

  markClean: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, isDirty: false } : t)),
    }));
  },

  loadSession: async () => {
    try {
      const content = await storageService.load('session.json');
      if (content) {
        const data = JSON.parse(content);
        set({ tabs: data.tabs || [], activeTabId: data.activeTabId || null });
      }
    } catch (e) {
      // Ignore, session might not exist yet
    }
  },
}));

// Save session on change
useRequestStore.subscribe((state, prevState) => {
  if (state.tabs !== prevState.tabs || state.activeTabId !== prevState.activeTabId) {
    const data = {
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    };
    storageService.save('session.json', JSON.stringify(data, null, 2)).catch((e) => {
      console.error('Failed to save session:', e);
    });
  }
});


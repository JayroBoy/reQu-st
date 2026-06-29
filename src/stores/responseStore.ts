import { create } from 'zustand';
import type { RequestResponse } from '../types/response';

interface TabResponseState {
  response?: RequestResponse;
  isLoading: boolean;
  error?: string;
  consoleLogs: string[];
}

interface ResponseStore {
  tabData: Record<string, TabResponseState>;
  
  // Actions
  setLoading: (tabId: string, isLoading: boolean) => void;
  setResponse: (tabId: string, response: RequestResponse) => void;
  setError: (tabId: string, error: string) => void;
  clearResponse: (tabId: string) => void;
  addConsoleLogs: (tabId: string, logs: string[]) => void;
}

export const useResponseStore = create<ResponseStore>((set) => ({
  tabData: {},

  setLoading: (tabId, isLoading) =>
    set((state) => ({
      tabData: {
        ...state.tabData,
        [tabId]: {
          ...state.tabData[tabId],
          isLoading,
          error: undefined,
          consoleLogs: isLoading ? [] : state.tabData[tabId]?.consoleLogs || [],
        },
      },
    })),

  setResponse: (tabId, response) =>
    set((state) => ({
      tabData: {
        ...state.tabData,
        [tabId]: {
          ...state.tabData[tabId],
          isLoading: false,
          response,
          error: undefined,
        },
      },
    })),

  setError: (tabId, error) =>
    set((state) => ({
      tabData: {
        ...state.tabData,
        [tabId]: {
          ...state.tabData[tabId],
          isLoading: false,
          error,
        },
      },
    })),

  clearResponse: (tabId) =>
    set((state) => {
      const newData = { ...state.tabData };
      delete newData[tabId];
      return { tabData: newData };
    }),

  addConsoleLogs: (tabId, logs) =>
    set((state) => ({
      tabData: {
        ...state.tabData,
        [tabId]: {
          ...state.tabData[tabId],
          consoleLogs: [...(state.tabData[tabId]?.consoleLogs || []), ...logs],
        },
      },
    })),
}));

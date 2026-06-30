import { create } from 'zustand';
import type { HistoryEntry } from '../types/history';

interface HistoryState {
  entries: HistoryEntry[];
  limit: number;
  addEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  setHistory: (entries: HistoryEntry[]) => void;
  setLimit: (limit: number) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  limit: 50,
  
  addEntry: (entry) => set((state) => {
    const newEntries = [entry, ...state.entries];
    if (newEntries.length > state.limit) {
      newEntries.splice(state.limit);
    }
    return { entries: newEntries };
  }),
  
  clearHistory: () => set({ entries: [] }),
  
  setHistory: (entries) => set((state) => {
    if (entries.length > state.limit) {
      return { entries: entries.slice(0, state.limit) };
    }
    return { entries };
  }),
  
  setLimit: (limit) => set((state) => {
    let newEntries = [...state.entries];
    if (newEntries.length > limit) {
      newEntries = newEntries.slice(0, limit);
    }
    return { limit, entries: newEntries };
  }),
}));

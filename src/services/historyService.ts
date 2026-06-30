import { storageService } from './storageService';
import { useHistoryStore } from '../stores/historyStore';
import type { HistoryEntry } from '../types/history';

const HISTORY_FILE = 'history.json';

export const historyService = {
  /** Load history from disk and initialize the store. */
  async init(): Promise<void> {
    try {
      const content = await storageService.load(HISTORY_FILE);
      const entries: HistoryEntry[] = JSON.parse(content);
      if (Array.isArray(entries)) {
        useHistoryStore.getState().setHistory(entries);
      }
    } catch (error) {
      console.warn(`Could not load history: ${error}`);
    }

    // Subscribe to the store to automatically save changes
    useHistoryStore.subscribe((state, prevState) => {
      // Only save if the entries array actually changed reference
      if (state.entries !== prevState.entries) {
        historyService.save(state.entries);
      }
    });
  },

  /** Save the current history entries to disk. */
  async save(entries: HistoryEntry[]): Promise<void> {
    try {
      await storageService.save(HISTORY_FILE, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.error(`Failed to save history: ${error}`);
    }
  },

  /** Clear all history. */
  async clear(): Promise<void> {
    useHistoryStore.getState().clearHistory();
    // The store subscription will automatically flush the empty array to disk.
  }
};

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Collection, CollectionFolder, CollectionRequest, CollectionItem } from '../types/collection';
import { collectionService } from '../services/collectionService';

interface CollectionState {
  collections: Collection[];
  expandedFolders: Set<string>;
  isLoaded: boolean;

  loadCollections: () => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  renameCollection: (id: string, newName: string) => Promise<void>;
  
  addFolder: (collectionId: string, parentId: string | null, name: string) => Promise<void>;
  addRequest: (collectionId: string, parentId: string | null, request: CollectionRequest) => Promise<void>;
  updateRequest: (collectionId: string, requestId: string, request: CollectionRequest) => Promise<void>;
  removeItem: (collectionId: string, itemId: string) => Promise<void>;
  duplicateItem: (collectionId: string, itemId: string) => Promise<void>;
  renameItem: (collectionId: string, itemId: string, newName: string) => Promise<void>;
  
  toggleFolder: (folderId: string) => void;
  
  setCollectionVariables: (collectionId: string, variables: Record<string, string>) => Promise<void>;
  getCollectionVariables: (collectionId: string) => Record<string, string>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  expandedFolders: new Set(),
  isLoaded: false,

  loadCollections: async () => {
    const collections = await collectionService.loadAll();
    // Sort collections alphabetically by name
    collections.sort((a, b) => a.name.localeCompare(b.name));
    set({ collections, isLoaded: true });
  },

  createCollection: async (name: string) => {
    const newCollection: Collection = {
      id: uuidv4(),
      name,
      variables: {},
      items: [],
    };
    await collectionService.save(newCollection);
    set((state) => {
      const newCollections = [...state.collections, newCollection];
      newCollections.sort((a, b) => a.name.localeCompare(b.name));
      return { collections: newCollections };
    });
  },

  deleteCollection: async (id: string) => {
    await collectionService.remove(id);
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
  },

  renameCollection: async (id: string, newName: string) => {
    const collection = get().collections.find((c) => c.id === id);
    if (!collection) return;
    
    const updated = { ...collection, name: newName };
    await collectionService.save(updated);
    
    set((state) => {
      const newCollections = state.collections.map((c) => c.id === id ? updated : c);
      newCollections.sort((a, b) => a.name.localeCompare(b.name));
      return { collections: newCollections };
    });
  },

  addFolder: async (collectionId, parentId, name) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const newFolder: CollectionFolder = {
      type: 'folder',
      id: uuidv4(),
      name,
      items: [],
    };

    const updatedItems = collectionService.addItem(collection.items, parentId, newFolder);
    const updatedCollection = { ...collection, items: updatedItems };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
      expandedFolders: parentId ? new Set(state.expandedFolders).add(parentId) : state.expandedFolders,
    }));
  },

  addRequest: async (collectionId, parentId, request) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updatedItems = collectionService.addItem(collection.items, parentId, request);
    const updatedCollection = { ...collection, items: updatedItems };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
      expandedFolders: parentId ? new Set(state.expandedFolders).add(parentId) : state.expandedFolders,
    }));
  },

  updateRequest: async (collectionId, requestId, request) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updatedItems = collectionService.updateItem(collection.items, requestId, request);
    const updatedCollection = { ...collection, items: updatedItems };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
    }));
  },

  removeItem: async (collectionId, itemId) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updatedItems = collectionService.removeItem(collection.items, itemId);
    const updatedCollection = { ...collection, items: updatedItems };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
    }));
  },

  duplicateItem: async (collectionId, itemId) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const found = collectionService.findItemById(collection.items, itemId);
    if (!found) return;

    const newId = uuidv4();
    const newName = `${found.item.name} (Copy)`;
    
    const updatedItems = collectionService.duplicateItem(collection.items, itemId, newId, newName);
    const updatedCollection = { ...collection, items: updatedItems };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
    }));
  },

  renameItem: async (collectionId, itemId, newName) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const found = collectionService.findItemById(collection.items, itemId);
    if (!found) return;

    const updatedItem = { ...found.item, name: newName };
    const updatedItems = collectionService.updateItem(collection.items, itemId, updatedItem);
    const updatedCollection = { ...collection, items: updatedItems };
    
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
    }));
  },

  toggleFolder: (folderId: string) => {
    set((state) => {
      const next = new Set(state.expandedFolders);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return { expandedFolders: next };
    });
  },

  setCollectionVariables: async (collectionId, variables) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const updatedCollection = { ...collection, variables };
    await collectionService.save(updatedCollection);

    set((state) => ({
      collections: state.collections.map((c) => c.id === collectionId ? updatedCollection : c),
    }));
  },

  getCollectionVariables: (collectionId) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    return collection?.variables ?? {};
  },
}));

import type { Collection, CollectionItem, CollectionRequest, CollectionFolder } from '../types/collection';
import type { RequestTab } from '../types/request';
import { storageService } from './storageService';

const COLLECTION_DIR = 'collections';

export const collectionService = {
  async loadAll(): Promise<Collection[]> {
    try {
      await storageService.ensureDirectory(COLLECTION_DIR);
      const files = await storageService.listDirectory(COLLECTION_DIR);
      const collectionFiles = files.filter((f) => f.endsWith('.json'));

      const collections: Collection[] = [];
      for (const file of collectionFiles) {
        try {
          const content = await storageService.loadFile(`${COLLECTION_DIR}/${file}`);
          const collection = JSON.parse(content) as Collection;
          collections.push(collection);
        } catch (e) {
          console.error(`Failed to load collection ${file}:`, e);
        }
      }
      return collections;
    } catch (error) {
      console.error('Failed to load collections:', error);
      return [];
    }
  },

  async save(collection: Collection): Promise<void> {
    await storageService.ensureDirectory(COLLECTION_DIR);
    const content = JSON.stringify(collection, null, 2);
    await storageService.saveFile(`${COLLECTION_DIR}/${collection.id}.json`, content);
  },

  async remove(id: string): Promise<void> {
    try {
      await storageService.deleteFile(`${COLLECTION_DIR}/${id}.json`);
    } catch (e) {
      console.error(`Failed to delete collection ${id}:`, e);
    }
  },

  // Tree helpers
  findItemById(items: CollectionItem[], id: string): { item: CollectionItem; parentItems: CollectionItem[] } | null {
    for (const item of items) {
      if (item.id === id) {
        return { item, parentItems: items };
      }
      if (item.type === 'folder') {
        const found = this.findItemById(item.items, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  },

  addItem(items: CollectionItem[], parentId: string | null, newItem: CollectionItem): CollectionItem[] {
    if (!parentId) {
      return [...items, newItem];
    }
    return items.map((item) => {
      if (item.id === parentId && item.type === 'folder') {
        return { ...item, items: [...item.items, newItem] };
      } else if (item.type === 'folder') {
        return { ...item, items: this.addItem(item.items, parentId, newItem) };
      }
      return item;
    });
  },

  removeItem(items: CollectionItem[], targetId: string): CollectionItem[] {
    return items
      .filter((item) => item.id !== targetId)
      .map((item) => {
        if (item.type === 'folder') {
          return { ...item, items: this.removeItem(item.items, targetId) };
        }
        return item;
      });
  },

  updateItem(items: CollectionItem[], targetId: string, updatedItem: CollectionItem): CollectionItem[] {
    return items.map((item) => {
      if (item.id === targetId) {
        return updatedItem;
      }
      if (item.type === 'folder') {
        return { ...item, items: this.updateItem(item.items, targetId, updatedItem) };
      }
      return item;
    });
  },

  duplicateItem(items: CollectionItem[], targetId: string, newId: string, newName: string): CollectionItem[] {
    const result: CollectionItem[] = [];
    for (const item of items) {
      result.push(item);
      if (item.id === targetId) {
        const duplicate = structuredClone(item) as CollectionItem;
        duplicate.id = newId;
        duplicate.name = newName;
        // Also need to regenerate IDs for all nested children to prevent collisions
        if (duplicate.type === 'folder') {
          this.regenerateIds(duplicate);
        }
        result.push(duplicate);
      } else if (item.type === 'folder') {
        // Must update the item reference in place with the mapped children
        const updatedFolder: CollectionFolder = {
          ...item,
          items: this.duplicateItem(item.items, targetId, newId, newName)
        };
        result[result.length - 1] = updatedFolder;
      }
    }
    return result;
  },

  regenerateIds(folder: CollectionFolder) {
    for (const item of folder.items) {
      item.id = crypto.randomUUID();
      if (item.type === 'folder') {
        this.regenerateIds(item);
      }
    }
  },

  requestToCollectionRequest(tab: RequestTab): CollectionRequest {
    return {
      type: 'request',
      id: tab.id, // Using same ID when creating new or updating, allows matching
      name: tab.name,
      method: tab.method,
      url: tab.url,
      headers: structuredClone(tab.headers),
      params: structuredClone(tab.params),
      body: structuredClone(tab.body),
      auth: structuredClone(tab.auth),
      script: tab.script,
      followRedirects: tab.followRedirects,
    };
  },

  collectionRequestToTab(req: CollectionRequest, collectionId: string, folderId?: string): RequestTab {
    return {
      id: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: structuredClone(req.headers),
      params: structuredClone(req.params),
      body: structuredClone(req.body),
      auth: structuredClone(req.auth),
      script: req.script,
      followRedirects: req.followRedirects,
      collectionId,
      folderId,
      isDirty: false,
    };
  },
};

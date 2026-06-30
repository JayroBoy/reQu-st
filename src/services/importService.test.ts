import { describe, it, expect, vi } from 'vitest';
import { importService } from './importService';

vi.mock('../stores/collectionStore', () => ({
  useCollectionStore: {
    getState: () => ({
      createCollection: vi.fn(),
      collections: [{ name: 'Test Collection', id: '123' }],
      loadCollections: vi.fn()
    })
  }
}));

vi.mock('./collectionService', () => ({
  collectionService: {
    save: vi.fn().mockResolvedValue(true)
  }
}));

describe('importService', () => {
  it('should reject invalid formats', async () => {
    const result = await importService.importFile(JSON.stringify({ some: 'data' }));
    expect(result.success).toBe(false);
    expect(result.warnings[0]).toContain('Unsupported format');
  });

  it('should parse basic Postman v2.1 collection', async () => {
    const postmanJson = {
      info: { name: 'Test Collection', schema: 'https://schema.postman.com/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Request 1',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com' }
          }
        }
      ]
    };

    const result = await importService.importFile(JSON.stringify(postmanJson));
    if (!result.success) {
       console.log("TEST 2 ERROR:", result.warnings);
    }
    expect(result.success).toBe(true);
    expect(result.collectionName).toBe('Test Collection');
  });
});

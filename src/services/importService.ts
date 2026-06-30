import { v4 as uuidv4 } from 'uuid';
import type { Collection, CollectionFolder, CollectionRequest } from '../types/collection';
import { useCollectionStore } from '../stores/collectionStore';
import { collectionService } from './collectionService';
import type { RequestBody, KeyValuePair, AuthConfig } from '../types/request';

export interface ImportResult {
  success: boolean;
  warnings: string[];
  collectionName?: string;
}

export const importService = {
  async importFile(fileContent: string): Promise<ImportResult> {
    const warnings: string[] = [];
    try {
      const data = JSON.parse(fileContent);

      if (data.info && data.info.schema && data.info.schema.includes('postman.com/collection/v2.1.0')) {
        return this.importPostmanV2(data, warnings);
      } else if (data.__export_format === 4) {
        return this.importInsomniaV4(data, warnings);
      } else {
        throw new Error("Unsupported format. Please provide a Postman Collection v2.1 or Insomnia v4 export JSON.");
      }
    } catch (e: any) {
      return { success: false, warnings: [e.message] };
    }
  },

  async importPostmanV2(data: any, warnings: string[]): Promise<ImportResult> {
    const collection: Collection = {
      id: uuidv4(),
      name: data.info.name || 'Imported Postman Collection',
      variables: {},
      items: []
    };

    if (data.variable && Array.isArray(data.variable)) {
      data.variable.forEach((v: any) => {
        if (v.key) {
          collection.variables[v.key] = v.value || '';
        }
      });
    }

    const parsePostmanItems = (items: any[]): any[] => {
      return items.map((item) => {
        if (item.item) {
          // Folder
          return {
            type: 'folder',
            id: uuidv4(),
            name: item.name,
            items: parsePostmanItems(item.item)
          } as CollectionFolder;
        } else {
          // Request
          const req = item.request;
          if (!req) return null;
          
          if (item.event && item.event.some((e: any) => e.listen === 'test' || e.listen === 'prerequest')) {
             warnings.push(`Scripts in request "${item.name}" were skipped. Postman scripts are not fully supported.`);
          }

          let url = typeof req.url === 'string' ? req.url : (req.url?.raw || '');
          const headers: KeyValuePair[] = (req.header || []).map((h: any) => ({ id: uuidv4(), key: h.key, value: h.value, enabled: !h.disabled }));
          
          let body: RequestBody = { type: 'none' };
          if (req.body && req.body.mode) {
            if (req.body.mode === 'raw') {
              body = { type: 'raw', raw: { content: req.body.raw, format: 'text' } };
            } else if (req.body.mode === 'formdata') {
              body = { type: 'form-data', formData: req.body.formdata.map((f: any) => ({ id: uuidv4(), key: f.key, value: f.value || '', enabled: !f.disabled })) };
            } else if (req.body.mode === 'urlencoded') {
              body = { type: 'x-www-form-urlencoded', urlencoded: req.body.urlencoded.map((f: any) => ({ id: uuidv4(), key: f.key, value: f.value || '', enabled: !f.disabled })) };
            } else {
              warnings.push(`Unsupported body type "${req.body.mode}" in request "${item.name}"`);
            }
          }

          let auth: AuthConfig = { type: 'none' };
          if (req.auth) {
            if (req.auth.type === 'bearer') {
              const token = req.auth.bearer?.find((a: any) => a.key === 'token')?.value || '';
              auth = { type: 'bearer', bearer: { token } };
            } else if (req.auth.type === 'basic') {
              const username = req.auth.basic?.find((a: any) => a.key === 'username')?.value || '';
              const password = req.auth.basic?.find((a: any) => a.key === 'password')?.value || '';
              auth = { type: 'basic', basic: { username, password } };
            } else {
               warnings.push(`Unsupported auth type "${req.auth.type}" in request "${item.name}"`);
            }
          }

          return {
            type: 'request',
            id: uuidv4(),
            name: item.name,
            method: req.method || 'GET',
            url,
            headers,
            params: [], // Postman puts query params in URL, we can leave our params array empty or parse them. Leaving empty for now.
            body,
            auth,
            script: '',
            followRedirects: true
          } as CollectionRequest;
        }
      }).filter(Boolean);
    };

    collection.items = parsePostmanItems(data.item || []);
    
    // Save the collection
    const stores = useCollectionStore.getState();
    await stores.createCollection(collection.name);
    const newCollection = useCollectionStore.getState().collections.find(c => c.name === collection.name);
    if (newCollection) {
       collection.id = newCollection.id;
       await collectionService.save(collection);
       await stores.loadCollections();
    }

    return { success: true, warnings, collectionName: collection.name };
  },

  async importInsomniaV4(data: any, warnings: string[]): Promise<ImportResult> {
     // Resources is a flat array in Insomnia
     const resources = data.resources || [];
     const workspace = resources.find((r: any) => r._type === 'workspace');
     
     if (!workspace) {
       return { success: false, warnings: ['No workspace found in Insomnia export'] };
     }

     const collection: Collection = {
      id: uuidv4(),
      name: workspace.name || 'Imported Insomnia Workspace',
      variables: {},
      items: []
     };

     const folders = resources.filter((r: any) => r._type === 'request_group');
     const requests = resources.filter((r: any) => r._type === 'request');
     const environments = resources.filter((r: any) => r._type === 'environment');

     // Merge environment variables into collection variables
     environments.forEach((env: any) => {
       if (env.data) {
         Object.keys(env.data).forEach(k => {
           collection.variables[k] = String(env.data[k]);
         });
       }
     });

     const buildTree = (parentId: string): any[] => {
       const items: any[] = [];
       
       // Add child folders
       folders.filter((f: any) => f.parentId === parentId).forEach((f: any) => {
         items.push({
           type: 'folder',
           id: uuidv4(),
           name: f.name,
           items: buildTree(f._id)
         });
       });

       // Add child requests
       requests.filter((r: any) => r.parentId === parentId).forEach((req: any) => {
          let body: RequestBody = { type: 'none' };
          if (req.body && req.body.mimeType) {
             if (req.body.mimeType === 'application/json' || req.body.mimeType === 'application/xml' || req.body.mimeType === 'text/plain') {
                body = { type: 'raw', raw: { content: req.body.text, format: req.body.mimeType.includes('json') ? 'json' : 'text' } };
             } else if (req.body.mimeType === 'multipart/form-data') {
                body = { type: 'form-data', formData: (req.body.params || []).map((p: any) => ({ id: uuidv4(), key: p.name, value: p.value || '', enabled: !p.disabled })) };
             } else if (req.body.mimeType === 'application/x-www-form-urlencoded') {
                body = { type: 'x-www-form-urlencoded', urlencoded: (req.body.params || []).map((p: any) => ({ id: uuidv4(), key: p.name, value: p.value || '', enabled: !p.disabled })) };
             } else {
               warnings.push(`Unsupported body mimeType "${req.body.mimeType}" in request "${req.name}"`);
             }
          }

          let auth: AuthConfig = { type: 'none' };
          if (req.authentication && req.authentication.type) {
             if (req.authentication.type === 'bearer') {
                auth = { type: 'bearer', bearer: { token: req.authentication.token } };
             } else if (req.authentication.type === 'basic') {
                auth = { type: 'basic', basic: { username: req.authentication.username, password: req.authentication.password } };
             } else {
               warnings.push(`Unsupported auth type "${req.authentication.type}" in request "${req.name}"`);
             }
          }

          items.push({
            type: 'request',
            id: uuidv4(),
            name: req.name,
            method: req.method || 'GET',
            url: req.url,
            headers: (req.headers || []).map((h: any) => ({ id: uuidv4(), key: h.name, value: h.value, enabled: !h.disabled })),
            params: (req.parameters || []).map((p: any) => ({ id: uuidv4(), key: p.name, value: p.value, enabled: !p.disabled })),
            body,
            auth,
            script: '',
            followRedirects: req.settingFollowRedirects !== false
          });
       });

       return items;
     };

     collection.items = buildTree(workspace._id);

     // Save the collection
    const stores = useCollectionStore.getState();
    await stores.createCollection(collection.name);
    const newCollection = useCollectionStore.getState().collections.find(c => c.name === collection.name);
    if (newCollection) {
       collection.id = newCollection.id;
       await collectionService.save(collection);
       await stores.loadCollections();
    }

    return { success: true, warnings, collectionName: collection.name };
  }
};

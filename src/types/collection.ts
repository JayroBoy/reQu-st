import type { HttpMethod, KeyValuePair, RequestBody, AuthConfig } from './request';

export interface Collection {
  id: string;
  name: string;
  variables: Record<string, string>;
  items: CollectionItem[];
}

export type CollectionItem = CollectionFolder | CollectionRequest;

export interface CollectionFolder {
  type: 'folder';
  id: string;
  name: string;
  items: CollectionItem[];
}

export interface CollectionRequest {
  type: 'request';
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  script: string;
  followRedirects: boolean;
}

/**
 * TypeScript types for HTTP requests.
 * Mirrors the Rust CurlRequest model and is used throughout the frontend.
 */

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'QUERY';

/** A single key-value pair used for headers, query params, form fields, etc. */
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  /** When false the pair is excluded from the request. */
  enabled: boolean;
}

/** Request body — union of the supported body types. */
export interface RequestBody {
  type: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded';
  raw?: {
    content: string;
    format: 'json' | 'xml' | 'text';
  };
  formData?: KeyValuePair[];
  urlencoded?: KeyValuePair[];
}

/** Auth configuration for a request. */
export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic';
  bearer?: { token: string };
  basic?: { username: string; password: string };
}

/**
 * Full state of a single open request tab.
 * Persisted to the collection when saved.
 */
export interface RequestTab {
  id: string;
  /** Display name shown in the tab bar. */
  name: string;
  method: HttpMethod;
  /** Raw URL, may contain {{variable}} placeholders. */
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  /** Post-request JavaScript executed after every response. */
  script: string;
  /** Whether curl should follow 3xx redirects (maps to -L flag). */
  followRedirects: boolean;
  /** Set when this request is saved inside a collection. */
  collectionId?: string;
  /** Set when this request is inside a collection folder. */
  folderId?: string;
  /** True when there are unsaved changes relative to the persisted version. */
  isDirty: boolean;
}

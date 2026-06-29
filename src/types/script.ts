import type { RequestResponse } from './response';

export interface ScriptContext {
  response: Omit<RequestResponse, 'headers'> & { headers: Record<string, string> };
  env: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
  };
}

export interface ScriptResult {
  logs: string[];
  envUpdates: Record<string, string>;
  error?: string;
}

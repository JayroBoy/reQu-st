import type { HttpMethod } from './request';
import type { CollectionRequest } from './collection';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string; // Interpolated URL (resolved variables)
  status: number;
  time: number;
  request: CollectionRequest; // Full snapshot for re-loading
}

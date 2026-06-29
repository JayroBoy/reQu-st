import type { KeyValuePair } from './request';

/**
 * Parsed HTTP response returned from the Rust execute_curl command.
 * Mirrors the Rust CurlResponse struct.
 */
export interface RequestResponse {
  /** HTTP status code, e.g. 200, 404. */
  status: number;
  /** Human-readable reason phrase, e.g. "OK", "Not Found". */
  statusText: string;
  /** Response headers as key-value pairs. */
  headers: KeyValuePair[];
  /** Response body as a UTF-8 string. */
  body: string;
  /** Total request duration in milliseconds. */
  time: number;
  /** Downloaded body size in bytes. */
  size: number;
}

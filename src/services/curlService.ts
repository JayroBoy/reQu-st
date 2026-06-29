import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import { interpolate } from '../utils/variableInterpolation';
import type { AuthConfig, HttpMethod, KeyValuePair, RequestBody, RequestTab } from '../types/request';
import type { RequestResponse } from '../types/response';

// ─────────────────────────────────────────────────────────────────────────────
// IPC payload types — match the Rust CurlRequest / CurlBody serde shapes
// ─────────────────────────────────────────────────────────────────────────────

type IpcBodyRaw = {
  type: 'Raw';
  content: string;
  contentType: string;
};

type IpcBodyFormData = {
  type: 'form-data';
  fields: [string, string][];
};

type IpcBodyUrlEncoded = {
  type: 'x-www-form-urlencoded';
  fields: [string, string][];
};

type IpcBody = IpcBodyRaw | IpcBodyFormData | IpcBodyUrlEncoded;

interface IpcCurlRequest {
  method: string;
  url: string;
  headers: [string, string][];
  body: IpcBody | null;
  followRedirects: boolean;
  timeoutMs: number | null;
}

interface IpcCurlResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  timeMs: number;
  sizeBytes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content-type map for raw body format → MIME type
// ─────────────────────────────────────────────────────────────────────────────

const RAW_FORMAT_CONTENT_TYPE: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  text: 'text/plain',
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appends enabled key-value pairs as query-string parameters to a URL.
 * Handles both URLs that already have a `?` and those that don't.
 */
function appendQueryParams(url: string, params: KeyValuePair[]): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim() !== '');
  if (enabled.length === 0) return url;

  const parts = enabled.map(
    (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
  );
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + parts.join('&');
}

/**
 * Derives additional headers from the AuthConfig and merges them with the
 * caller-supplied headers. The auth header is appended only when no
 * `Authorization` header already exists.
 */
function applyAuth(
  headers: [string, string][],
  auth: AuthConfig,
): [string, string][] {
  const hasAuthHeader = headers.some(
    ([k]) => k.toLowerCase() === 'authorization',
  );
  if (hasAuthHeader) return headers;

  switch (auth.type) {
    case 'bearer':
      if (auth.bearer?.token) {
        return [...headers, ['Authorization', `Bearer ${auth.bearer.token}`]];
      }
      break;
    case 'basic':
      if (auth.basic?.username !== undefined) {
        const encoded = btoa(`${auth.basic.username}:${auth.basic.password ?? ''}`);
        return [...headers, ['Authorization', `Basic ${encoded}`]];
      }
      break;
    default:
      break;
  }

  return headers;
}

/**
 * Converts a `RequestBody` (frontend model) into an `IpcBody` payload
 * (Rust serde shape) or `null` for body-less requests.
 */
function buildIpcBody(body: RequestBody): IpcBody | null {
  switch (body.type) {
    case 'none':
      return null;

    case 'raw': {
      const raw = body.raw;
      if (!raw || raw.content.trim() === '') return null;
      return {
        type: 'Raw',
        content: raw.content,
        contentType: RAW_FORMAT_CONTENT_TYPE[raw.format] ?? 'text/plain',
      };
    }

    case 'form-data': {
      const fields: [string, string][] = (body.formData ?? [])
        .filter((p) => p.enabled && p.key.trim() !== '')
        .map((p) => [p.key, p.value]);
      return fields.length > 0 ? { type: 'form-data', fields } : null;
    }

    case 'x-www-form-urlencoded': {
      const fields: [string, string][] = (body.urlencoded ?? [])
        .filter((p) => p.enabled && p.key.trim() !== '')
        .map((p) => [p.key, p.value]);
      return fields.length > 0 ? { type: 'x-www-form-urlencoded', fields } : null;
    }

    default:
      return null;
  }
}

/**
 * Converts an IpcCurlResponse (Rust output) into a RequestResponse
 * (frontend model), mapping the flat [string, string][] headers to
 * the KeyValuePair[] shape expected by the UI.
 */
function mapResponse(ipc: IpcCurlResponse): RequestResponse {
  return {
    status: ipc.status,
    statusText: ipc.statusText,
    headers: ipc.headers.map(([key, value]) => ({
      id: uuidv4(),
      key,
      value,
      enabled: true,
    })),
    body: ipc.body,
    time: ipc.timeMs,
    size: ipc.sizeBytes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if curl is available on the system PATH.
 *
 * Returns the curl version string (e.g. "curl 8.4.0 (Windows) ...")
 * on success. Throws a descriptive string if curl is not found.
 *
 * Called once on app startup. If it throws, the AppShell renders a
 * blocking error dialog.
 */
export async function checkCurl(): Promise<string> {
  return invoke<string>('check_curl');
}

/**
 * Sends an HTTP request and returns a parsed response.
 *
 * Pipeline:
 *   1. Interpolate all `{{variable}}` placeholders in URL, header values,
 *      and body content using the merged variable map.
 *   2. Append enabled query-string params to the URL.
 *   3. Apply auth → may inject an `Authorization` header.
 *   4. Convert frontend headers (KeyValuePair[]) → IPC [string, string][].
 *   5. Build the IpcBody payload.
 *   6. `invoke('execute_curl')` → Rust engine → system curl.
 *   7. Map the IPC response to a `RequestResponse`.
 *
 * @param tab          The request tab to send.
 * @param resolvedVars Merged variable map (globals → env → collection).
 *                     Obtain via `environmentStore.getState().resolveVariables()`.
 */
export async function sendRequest(
  tab: RequestTab,
  resolvedVars: Record<string, string> = {},
): Promise<RequestResponse> {
  // ── 1. Interpolate URL ────────────────────────────────────────────────────
  let url = interpolate(tab.url, {}, resolvedVars, {});

  // ── 2. Append query params (interpolate values first) ────────────────────
  const interpolatedParams: KeyValuePair[] = tab.params.map((p) => ({
    ...p,
    key: interpolate(p.key, {}, resolvedVars, {}),
    value: interpolate(p.value, {}, resolvedVars, {}),
  }));
  url = appendQueryParams(url, interpolatedParams);

  // ── 3. Interpolate headers + convert to [key, value][] ───────────────────
  let ipcHeaders: [string, string][] = tab.headers
    .filter((h) => h.enabled && h.key.trim() !== '')
    .map((h) => [
      interpolate(h.key, {}, resolvedVars, {}),
      interpolate(h.value, {}, resolvedVars, {}),
    ]);

  // ── 4. Apply auth (may inject Authorization header) ──────────────────────
  ipcHeaders = applyAuth(ipcHeaders, tab.auth);

  // ── 5. Build body ─────────────────────────────────────────────────────────
  // Interpolate raw body content if applicable.
  let bodyForIpc = tab.body;
  if (bodyForIpc.type === 'raw' && bodyForIpc.raw) {
    bodyForIpc = {
      ...bodyForIpc,
      raw: {
        ...bodyForIpc.raw,
        content: interpolate(bodyForIpc.raw.content, {}, resolvedVars, {}),
      },
    };
  }
  const ipcBody = buildIpcBody(bodyForIpc);

  // ── 6. Build IPC payload and invoke Rust command ──────────────────────────
  const payload: IpcCurlRequest = {
    method: tab.method as HttpMethod,
    url,
    headers: ipcHeaders,
    body: ipcBody,
    followRedirects: tab.followRedirects,
    timeoutMs: null, // Per-request timeout not exposed in UI yet (Phase 4+)
  };

  const ipcResponse = await invoke<IpcCurlResponse>('execute_curl', {
    request: payload,
  });

  // ── 7. Map to frontend model ──────────────────────────────────────────────
  return mapResponse(ipcResponse);
}

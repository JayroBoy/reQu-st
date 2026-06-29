# Phase 3 — Complete ✅

## What Was Built

### Rust Backend

#### `src-tauri/src/models/` — IPC Structs

| File | Contents |
|------|---------|
| `models/mod.rs` | Module declaration |
| `models/curl_request.rs` | `CurlRequest { method, url, headers, body, follow_redirects, timeout_ms }` + `CurlBody` enum (`Raw`, `FormData`, `UrlEncoded`) — serde `Deserialize` |
| `models/curl_response.rs` | `CurlResponse { status, status_text, headers, body, time_ms, size_bytes }` — serde `Serialize` |

#### `src-tauri/src/engine/` — Execution Engine

| File | Responsibility |
|------|---------------|
| `engine/mod.rs` | Module declaration |
| `engine/curl_builder.rs` | `build_args(req) → Vec<String>` — converts `CurlRequest` to curl CLI args. Handles: silent mode, write-out sentinel, header dump (`-D -`), body capture (`-o -`), HTTP method, headers, body (raw/form-data/urlencoded), follow-redirects (`-L`), timeout (`--max-time`). **12 inline unit tests.** |
| `engine/response_parser.rs` | `parse(stdout, stderr) → Result<CurlResponse, String>` — splits stdout at the `__REQUAEST_META__` sentinel, extracts headers+body from the last HTTP block (redirect-aware), parses timing/size from the metadata block. **8 inline unit tests.** |

#### `src-tauri/src/commands/curl.rs` — Tauri Commands

| Command | Behavior |
|---------|---------|
| `check_curl` | Runs `curl --version` → returns version string or descriptive error |
| `execute_curl` | Spawns `tokio::process::Command::new("curl")` with `build_args()` output, collects stdout/stderr, calls `response_parser::parse()`, returns `CurlResponse` |

#### Modified Rust files
- `src-tauri/src/commands/mod.rs` — added `pub mod curl;`
- `src-tauri/src/lib.rs` — added `mod models; mod engine;` + registered `check_curl` and `execute_curl`

---

### TypeScript

| File | Contents |
|------|---------|
| `src/types/request.ts` | `HttpMethod`, `KeyValuePair`, `RequestBody`, `AuthConfig`, `RequestTab` |
| `src/types/response.ts` | `RequestResponse` (mirrors `CurlResponse`) |
| `src/services/curlService.ts` | `checkCurl()` + `sendRequest(tab, resolvedVars)` — full pipeline: interpolate → append params → apply auth → build IPC payload → `invoke('execute_curl')` → map to `RequestResponse` |

#### `src/components/layout/AppShell.tsx` — Updated
Startup curl check on mount. Three render states:
- **Checking** — three-dot loading animation
- **Error** — full-screen card with instructions + expandable technical detail
- **OK** — normal app shell (environments load after curl is confirmed)

---

## Test Results

### `cargo test` — 20/20 passed

```
test engine::curl_builder::tests::test_custom_header_injected ... ok
test engine::curl_builder::tests::test_follow_redirects_adds_l_flag ... ok
test engine::curl_builder::tests::test_form_data_fields_use_f_flag ... ok
test engine::curl_builder::tests::test_no_follow_redirects_omits_l_flag ... ok
test engine::curl_builder::tests::test_raw_body_injects_content_type_when_missing ... ok
test engine::curl_builder::tests::test_raw_body_skips_content_type_when_caller_provides_it ... ok
test engine::curl_builder::tests::test_simple_get_has_header_dump_flags ... ok
test engine::curl_builder::tests::test_simple_get_has_silent_flag ... ok
test engine::curl_builder::tests::test_simple_get_url_is_last ... ok
test engine::curl_builder::tests::test_timeout_ms_converted_to_seconds ... ok
test engine::curl_builder::tests::test_urlencoded_fields_use_data_urlencode_flag ... ok
test engine::curl_builder::tests::test_write_out_contains_sentinel ... ok
test engine::response_parser::tests::test_parse_200_ok ... ok
test engine::response_parser::tests::test_parse_201_created ... ok
test engine::response_parser::tests::test_parse_204_no_content_empty_body ... ok
test engine::response_parser::tests::test_parse_404_not_found ... ok
test engine::response_parser::tests::test_parse_follows_redirects_uses_last_header_block ... ok
test engine::response_parser::tests::test_parse_returns_curl_stderr_in_error ... ok
test engine::response_parser::tests::test_parse_returns_error_when_no_sentinel ... ok
test engine::response_parser::tests::test_time_ms_rounding ... ok

test result: ok. 20 passed; 0 failed; 0 ignored
```

### `tsc --noEmit` — zero TypeScript errors ✅

---

## Gotchas for Phase 4

1. **`resolvedVars` wiring** — `curlService.sendRequest()` takes the merged variable map as a second argument. In Phase 4, `requestStore` will call `environmentStore.resolveVariables(collectionVars)` at send-time and pass it through.

2. **IPC body tag values** — Rust `CurlBody` uses `#[serde(tag = "type")]`. Frontend sends `"type": "Raw"` (capital R), `"form-data"`, `"x-www-form-urlencoded"`.

3. **PS exit code 1 from `cargo` stderr** — `Compiling app ...` always goes to stderr in PowerShell. Actual success is in the `test result:` line. The build succeeded.

4. **`follow_redirects: true` default** — the `RequestTab` factory in Phase 4's `requestStore` should default this to `true`.

5. **`timeoutMs: null`** — per-request timeout is not wired to UI yet. Phase 4+ can expose it per tab.

## Next: Phase 4 — Request Builder UI

Key work: `requestStore.ts`, `RequestTabs`, `RequestBuilder`, `KeyValueEditor`, `ParamsEditor`, `HeadersEditor`, `BodyEditor`, `AuthEditor`, curl import, and wiring the Send button to `curlService.sendRequest()`.

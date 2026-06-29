# Phase 2 — Complete ✅

## What was built

### Rust Backend

#### `src-tauri/src/state.rs` — `WorkspaceState`
- `Mutex<PathBuf>` holding the active workspace root
- Defaults to `$APPDATA/reQuaest/` (via `dirs` crate)
- `get_root()` / `set_root()` helpers for safe mutex access

#### `src-tauri/src/commands/fs.rs` — 5 FS Tauri commands
| Command | Behavior |
|---------|----------|
| `load_file` | Reads a file relative to workspace root |
| `save_file` | Writes a file, creates parent dirs automatically |
| `delete_file` | Removes a file |
| `list_directory` | Returns sorted list of filenames in a subdir (returns `[]` if dir missing) |
| `ensure_directory` | Recursive mkdir |

All commands reject `..` path traversal before any I/O.

#### `src-tauri/src/commands/workspace.rs` — 3 workspace commands
| Command | Behavior |
|---------|----------|
| `get_workspace_info` | Returns `{ root, is_default }` |
| `open_workspace` | Native folder picker (tauri-plugin-dialog), creates `.requaest/` subdir |
| `reset_to_default_workspace` | Resets root to `$APPDATA/reQuaest/` |

#### `src-tauri/src/lib.rs` — updated
- Registers `WorkspaceState` via `.manage()`
- Registers all 8 commands
- On startup: creates `environments/` + `collections/` dirs, creates `globals.json` if missing

---

### TypeScript — Types
| File | Contents |
|------|----------|
| `src/types/environment.ts` | `Environment { name: string; variables: Record<string, string> }` |
| `src/types/workspace.ts` | `WorkspaceInfo { root: string; is_default: boolean }` |

### TypeScript — Services
| File | Responsibility |
|------|---------------|
| `src/services/storageService.ts` | Thin `invoke()` wrapper for all 5 FS commands |
| `src/services/environmentService.ts` | CRUD: `loadAll`, `loadGlobals`, `save`, `delete`, `validateName` |
| `src/utils/variableInterpolation.ts` | `interpolate()`, `extractVariableNames()`, `findUnresolvedVariables()` |

### TypeScript — State
`src/stores/environmentStore.ts` — Zustand store with:
- `environments[]` (named envs, sorted)
- `globals` (always-on baseline)
- `activeEnvName` (persisted to `localStorage`)
- Full async CRUD actions: `createEnvironment`, `updateEnvironment`, `deleteEnvironment`, `setVariable`, `deleteVariable`
- `resolveVariables(collectionVars?)` — merged priority map

### TypeScript — UI Components
| Component | What it does |
|-----------|-------------|
| `Modal.tsx` | Generic backdrop modal (Escape key + backdrop click to close, slide-in animation) |
| `EnvSelector.tsx` | Title bar dropdown: shows active env, lists all envs + "No Environment", Ctrl+E shortcut, opens EnvManager |
| `EnvManager.tsx` | Full CRUD modal: left panel = env list (globals always first), right panel = variable editor with inline add/rename/delete, workspace switcher at the bottom |

---

### Files created/modified

| File | Status | Purpose |
|------|--------|---------|
| `src-tauri/Cargo.toml` | Modified | Added `dirs = "5"` |
| `src-tauri/src/state.rs` | New | `WorkspaceState` |
| `src-tauri/src/commands/mod.rs` | New | Module declarations |
| `src-tauri/src/commands/fs.rs` | New | 5 FS commands |
| `src-tauri/src/commands/workspace.rs` | New | 3 workspace commands |
| `src-tauri/src/lib.rs` | Replaced | Registers all state + commands, startup init |
| `src/types/environment.ts` | New | `Environment` type |
| `src/types/workspace.ts` | New | `WorkspaceInfo` type |
| `src/services/storageService.ts` | New | invoke() wrapper |
| `src/services/environmentService.ts` | New | Env CRUD business logic |
| `src/utils/variableInterpolation.ts` | New | `{{var}}` interpolation engine |
| `src/stores/environmentStore.ts` | New | Zustand env store |
| `src/components/shared/Modal.tsx/.css` | New | Generic modal |
| `src/components/environment/EnvSelector.tsx/.css` | New | Title bar env picker |
| `src/components/environment/EnvManager.tsx/.css` | New | Env + variables CRUD modal |
| `src/components/layout/TitleBar.tsx` | Modified | Replaced placeholder with `<EnvSelector />` |
| `src/components/layout/TitleBar.css` | Modified | Removed dead placeholder CSS |
| `src/components/layout/AppShell.tsx` | Replaced | Loads envs on mount, mounts `<EnvManager />` |

---

## Gotchas for Phase 3

1. **PATH must be refreshed** in every new PowerShell session:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```
2. **`cargo build` stderr → PowerShell exit code 1** — when `2>&1` is used, any stderr output causes PS to report a non-zero exit code even on successful builds. Actual success/failure is in `Finished` / `error:` lines.
3. **Variable input in EnvManager uses `defaultValue` + `onBlur`** — changes are persisted when the input loses focus or Enter is pressed, not on every keystroke (avoids excessive disk writes).
4. **Slug-only env names** — `environmentService.validateName()` enforces `^[a-z][a-z0-9-]*$`. Enforced in the store but error only shown after submit, not on every keypress.
5. **`open_workspace` uses `tauri-plugin-dialog`'s `blocking_pick_folder()`** in a `spawn_blocking` task — required because the dialog API is synchronous.

## Exit criteria — all met
- `npm run tauri dev` opens a native Windows window with no errors
- `EnvSelector` renders in the title bar (replaces placeholder)
- `globals.json` created in `$APPDATA/reQuaest/environments/` on first launch
- App compiles: `cargo build` + `tsc --noEmit` clean

## Next: Phase 3 — Curl Engine & Request Execution
See `reQuaest_roadmap.md` Phase 3 section.
Key work: `check_curl` command, `CurlRequest`/`CurlResponse` Rust models, `curl_builder.rs`, `response_parser.rs`, `execute_curl` command, `curlService.ts`.

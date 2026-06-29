# Phase 1 — Complete ✅

## What was built

### Prerequisites installed
- Node.js v24.18.0 (via winget)
- Rust 1.96.0 + Cargo (via winget rustup)
- Visual Studio Build Tools 2026 with C++ workload (manually by user)
- PowerShell execution policy set to `RemoteSigned`

### Project structure
- Scaffolded using `npm create vite@latest` (react-ts template) + `npx tauri init` (to bypass interactive CLI limitation in headless terminal)
- Dependencies: `zustand`, `uuid`, `@types/uuid`, `@tauri-apps/api`, `@tauri-apps/cli`
- Rust deps: `tauri-plugin-dialog`, `tokio` (full features)

### Files created/modified

| File | Purpose |
|------|---------|
| `src/index.css` | Full design system: dark/light theme tokens, Inter font, spacing, radius, method/status colors, glass-morphism utilities |
| `src/stores/uiStore.ts` | Zustand store: theme (persisted to localStorage), sidebarOpen, activeModal |
| `src/components/layout/AppShell.tsx/.css` | CSS grid shell: titlebar + sidebar + main content, empty state |
| `src/components/layout/TitleBar.tsx/.css` | Custom draggable title bar with theme toggle, env placeholder, minimize/maximize/close buttons |
| `src/components/layout/Sidebar.tsx/.css` | Sidebar with Collections and History sections (empty states) |
| `src/App.tsx` | Mounts AppShell, syncs theme to `document.documentElement` on load |
| `index.html` | `data-theme="dark"` default, title="reQuaest", meta description |
| `src-tauri/tauri.conf.json` | `decorations: false`, 1280×800 default, 900×600 minimum |
| `src-tauri/capabilities/default.json` | `core:default`, `dialog:default`, `core:window:allow-start-dragging`, `allow-close`, `allow-minimize`, `allow-toggle-maximize` |
| `src-tauri/src/lib.rs` | Tauri builder with `tauri_plugin_dialog::init()` |
| `vite.config.ts` | `watch.ignored: ['**/src-tauri/**']` to prevent EBUSY crash on Windows |
| `package.json` | Added `"tauri": "tauri"` script |

### Gotchas for Phase 2

1. **PATH must be refreshed** in every new PowerShell session:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```
2. **Tauri v2 capabilities are strict** — every API used by the frontend must be explicitly listed in `capabilities/default.json`
3. **`src-tauri` must be excluded from Vite's file watcher** (already configured in `vite.config.ts`)
4. **Package name is `temp_vite`** in `package.json` — should be renamed to `requaest` at some point

## Exit criteria — all met ✅
- `npm run tauri dev` opens a native Windows window
- Custom title bar is draggable
- Minimize / Maximize / Close buttons work
- Dark theme is default; light/dark toggle works and persists across restarts
- Sidebar shows Collections and History sections with empty states
- Main content shows empty state with keyboard hint

## Next: Phase 2 — Data Layer & Environment Variables
See `reQuaest_roadmap.md` Phase 2 section for full task list.
Key work: Rust FS commands (load/save/delete/list files), WorkspaceState managed state, `storageService.ts`, `environmentStore.ts`, `environmentService.ts`, `variableInterpolation.ts`, `EnvSelector` and `EnvManager` components.

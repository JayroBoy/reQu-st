# reQuaest — Product Specification

A simplified Postman clone: a curl wrapper with environment variables and post-request scripting.

---

## 1. Vision & Scope

**What it is:** A lightweight, local-first HTTP client that lets you compose requests visually, manage environment variables, and run post-request scripts to automate variable extraction from responses (e.g., saving a token from a login response for subsequent requests).

**What it is NOT:** A full Postman replacement. No team collaboration, no cloud sync, no mock servers, no API documentation generation.

**Distribution:** Must be a single clickable application that can be shared internally within an organization. No console commands to run, no separate backend process.

---

## 2. Platform & Tech Stack

> [!NOTE]
> Platform and tech stack decisions are **deferred** — to be hashed out after product requirements are finalized. Key constraint: the final deliverable must be a **single application** (not a frontend + backend split), and it must be **clickable** (no terminal commands to launch).

**Curl dependency:** The application wraps real `curl`. The installation process should bundle or install `curl` as part of setup.

---

## 3. Core Features

### 3.1 Request Builder

The main interface for composing HTTP requests.

| Field | Details |
|-------|---------|
| **Method** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `QUERY` |
| **URL** | Text input with environment variable interpolation (`{{base_url}}/api/users`) |
| **Headers** | Key-value editor (add/remove rows). Common headers auto-suggested |
| **Query Params** | Key-value editor, auto-appended to URL |
| **Body** | Tabs: `none`, `raw` (JSON/XML/text), `form-data`, `x-www-form-urlencoded` |
| **Auth** | Helper tabs: `None`, `Bearer Token`, `Basic Auth` — these populate headers automatically |
| **Follow Redirects** | Toggle (default: on). When enabled, auto-follows 3xx redirects (curl `-L`). When off, returns the redirect response directly. Configurable per-request. |

> [!NOTE]
> `QUERY` behaves identically to `POST` in the editor (same body tabs) but uses the `QUERY` verb. It is **idempotent** — useful for complex query payloads without side effects.

**Curl Import:** Users can paste a raw curl command into an **empty tab** to auto-populate the request builder fields.

---

### 3.2 Response Viewer

| Element | Details |
|---------|---------|
| **Status** | HTTP status code + status text, color-coded (2xx green, 3xx yellow, 4xx orange, 5xx red) |
| **Time** | Request duration in ms |
| **Size** | Response body size |
| **Headers** | Collapsible key-value table |
| **Body** | Tabs: `Pretty` (formatted JSON/XML), `Raw`, `Preview` (for HTML) |

---

### 3.3 Environment Variables

The core differentiator feature for workflow automation.

- **Environments** are named sets of key-value pairs (e.g., `dev`, `staging`, `prod`)
- Variables are referenced in requests using `{{variable_name}}` syntax
- A **global** environment is always active, individual environments override globals
- **Collections** can define their own **collection-level variables**, which override environment variables for requests within that collection
- UI: sidebar or modal to manage environments and their variables
- **Storage:** Saved as JSON files on disk

**Variable resolution priority** (highest wins):

```
Collection variables  →  Active environment  →  Globals
      (highest)              (middle)           (lowest)
```

Example environment:
```json
{
  "name": "dev",
  "variables": {
    "base_url": "http://localhost:3000",
    "api_key": "dev-key-123",
    "auth_token": ""
  }
}
```

---

### 3.4 Post-Request Scripts

Run after every response to automate variable updates.

**Scripting approach:**

```javascript
// Script has access to:
// - `response` object: { status, headers, body, time }
// - `env.set(key, value)` — sets a variable in the active environment
// - `env.get(key)` — gets a variable value

// Example: extract token from login response
const data = JSON.parse(response.body);
env.set("auth_token", data.token);
```

> [!IMPORTANT]
> **Security consideration:** Scripts will run in a sandboxed context (not raw `eval`). We can use `new Function()` with a controlled scope, or a lightweight JS sandbox library.

- Scripts are defined **per request**
- A script editor with syntax highlighting (using CodeMirror or Monaco)
- Script console output visible in a "Console" tab in the response area

---

### 3.5 Collections

Organize requests into logical groups.

- **Collections** are the **top-level** organizational entities
- Inside a collection, requests can be organized into **nested folders** (unlimited depth)
- Each request stores: name, method, URL, headers, params, body, auth config, and post-request script
- Tree-view sidebar for navigation
- **Storage:** Single JSON file per collection on disk

```
collections/
  └── auth-api.json        # Contains folders + requests
       ├── 📁 Login Flow/
       │    ├── POST Login
       │    └── POST Refresh Token
       ├── 📁 User Management/
       │    ├── GET List Users
       │    └── POST Create User
       └── GET Health Check
```

---

### 3.6 Request History

- Auto-save last N requests (configurable, default 50)
- Searchable by URL, method, or status code
- Click to re-load a historical request into a new tab

---

## 4. UI Layout (Proposed)

```
┌──────────────────────────────────────────────────────────┐
│  reQuaest                    [☀/🌙] [Env: dev ▼] [⚙]    │
├──────────┬──── Tab 1: Login ─── Tab 2: Users ── [+] ────┤
│          │  [POST ▼] [{{base_url}}/api/login     ] [Send]│
│ Collections │────────────────────────────────────────────│
│          │  Params │ Headers │ Body │ Auth │ Script      │
│ ▼ Auth API  │                                            │
│   📁 Login  │  Key        │ Value                       │
│     POST Login│ Content-Type│ application/json           │
│     POST Refresh│                                        │
│   📁 Users  │                                            │
│     GET List │─────────────────────────────────────────── │
│     POST Create│ Response  200 OK  345ms  1.2KB          │
│          │  Pretty │ Raw │ Headers │ Console             │
│──────────│  {                                            │
│ History    │    "token": "eyJhb...",                     │
│  GET /users │    "user": { ... }                         │
│  POST /login│  }                                         │
└──────────┴───────────────────────────────────────────────┘
```

**Theme:** Default dark mode, with a light/dark toggle in the header.

**Tabs:** Multiple request tabs open simultaneously, similar to browser tabs.

---

## 5. Data Storage

All data persisted as JSON files in a local `.requaest/` directory:

```
.requaest/
├── environments/
│   ├── globals.json
│   ├── dev.json
│   └── prod.json
├── collections/
│   ├── auth-api.json
│   └── user-api.json
└── history.json
```

> [!NOTE]
> This makes it easy to version-control your API workspace by committing the `.requaest/` folder.

---

### 3.7 Import from Postman / Insomnia

- Import Postman Collection v2.1 JSON files
- Import Insomnia export JSON/YAML files
- Map imported requests, folders, and environments to reQuaest's data model
- **Unsupported features** (pre-request scripts, test assertions, etc.) are **skipped with a warning report** shown to the user after import, detailing what was not imported and why

---

### 3.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send current request |
| `Ctrl+N` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+S` | Save current request to collection |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+E` | Quick-switch environment |

---

## 6. Out of Scope (v1)

These are explicitly **not** in the first version:

- ❌ WebSocket / GraphQL / gRPC support
- ❌ Team collaboration / cloud sync
- ❌ Pre-request scripts (only post-request)
- ❌ Test assertions / test runner
- ❌ API documentation generation
- ❌ Cookie management UI
- ❌ Proxy configuration
- ❌ Certificate / mTLS configuration

---

## 7. Decisions Log

All product questions have been resolved:

| Decision | Resolution |
|----------|------------|
| Pre-request scripts | Out of v1 |
| QUERY method body | Same editor as POST |
| Collection-level variables | Yes — override environment vars within collection scope |
| Postman/Insomnia import handling | Skip unsupported features with warning report |
| Redirect behavior | Configurable per-request (toggle, default: follow) |
| Keyboard shortcuts | Full set including undo/redo |
| Platform / tech stack | **Deferred** — to be discussed next |

> [!IMPORTANT]
> **Product requirements are finalized.** Next step: decide on platform and tech stack.

---

## Verification Plan

### Automated Tests
- Unit tests for environment variable interpolation engine (including override priority)
- Unit tests for curl command generation
- Unit tests for post-request script sandboxing
- Unit tests for Postman/Insomnia import parsing
- Integration tests for curl execution

### Manual Verification
- End-to-end flow: create environment → compose request with variables → send → run post-request script → verify variable updated
- Import a real Postman collection and verify mapping + warning report
- Test against a public API (e.g., JSONPlaceholder)
- Verify all keyboard shortcuts
- Test redirect toggle behavior
- Verify collection-level variable override precedence

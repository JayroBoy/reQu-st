# Phase 6 Walkthrough: Collections & Sidebar Navigation

Phase 6 has been successfully implemented! reQuaest now supports full collection management, allowing you to organize your requests into nested folders and override variables per-collection. This phase also introduced numerous UX refinements and bug fixes to ensure a smooth workflow.

## What Was Accomplished

### 1. Collections & Data Model
- **`collection.ts`**: Introduced the TypeScript definitions for collections, nested folders, and saved requests.
- **`collectionService.ts`**: Implemented a service that handles serialization and interacts with the Rust backend via `storageService` to persist data directly to the filesystem.
- **`collectionStore.ts`**: Created a Zustand store to hold the state of all collections, track expanded folders in the tree UI, and provide all necessary CRUD actions.

### 2. Sidebar Navigation (Collection Tree)
- Overhauled the `Sidebar` to render the newly created `CollectionTree`.
- **`CollectionTree.tsx`**: Renders all collections and supports context-menu actions (Add Folder, Edit Variables, Rename, Delete).
- **`FolderNode.tsx`**: Recursively renders nested folders with a collapsible chevron. Context menu allows adding sub-folders, adding requests, renaming, or deleting.
- **`RequestNode.tsx`**: Renders leaf nodes representing saved requests, displaying their HTTP method badge. Clicking a request opens it in a new tab.

### 3. Save to Collection & UX Polish
- **Save Button & `Ctrl+S`**: Added a dedicated "Save" button to the Request Builder next to the "Send" button. It shares the same logic as the globally-wired `Ctrl+S` shortcut. Pressing it on an unsaved tab pops open the Save Dialog, while pressing it on an already-saved tab silently commits updates.
- **`SaveToCollectionDialog`**: A robust modal that allows you to name the request, select a collection, and pick a nested folder to save it into.
- **Double-Click to Rename Tabs**: You can seamlessly double-click any request tab's title text to spawn a prompt and quickly rename it.
- **Custom Prompts**: All native browser `prompt()` popups have been completely eliminated. The application now uses a highly customized, aesthetically pleasing `<PromptModal />` driven by `uiStore.ts`.

### 4. Collection-Level Variables
- **`CollectionVariablesModal`**: Reused the `KeyValueEditor` to provide a dedicated modal for editing variables on a per-collection basis.
- Variable resolution priority now respects the hierarchy: `Collection Variables` > `Environment Variables` > `Global Variables`.
- The `sendActiveRequest` action in `requestStore` has been updated to automatically resolve variables using the current tab's collection context.

### 5. Session Persistence & Layout Layout
- **Session Persistence**: Unattached requests (those not saved into a collection) are no longer lost on restart! The `requestStore` uses a listener to serialize open tabs and the active tab ID to `session.json`, automatically restoring your exact workspace on boot.
- **Vertical Layout**: The Request and Response panels are now permanently stacked vertically (Request on top, Response on the bottom), joined by a draggable resizer.

## Verification
- ✅ All TypeScript code compiles successfully.
- ✅ Store subscriptions correctly intercept state changes to flush session JSON to disk.
- ✅ The custom prompt modals, save dialogs, and environment managers all operate asynchronously and dismiss cleanly.
- ✅ No new Rust backend changes were required; the existing filesystem commands natively supported the `collections/` directory.

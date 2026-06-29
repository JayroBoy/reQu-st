use std::path::PathBuf;
use std::sync::Mutex;

/// Managed Tauri state that tracks the active workspace data directory.
///
/// Default: `$APPDATA/reQuaest/`
/// After "Open Workspace": `<user_folder>/.requaest/`
pub struct WorkspaceState {
    pub root: Mutex<PathBuf>,
}

impl WorkspaceState {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root: Mutex::new(root),
        }
    }

    pub fn get_root(&self) -> PathBuf {
        self.root.lock().unwrap().clone()
    }

    pub fn set_root(&self, new_root: PathBuf) {
        *self.root.lock().unwrap() = new_root;
    }
}

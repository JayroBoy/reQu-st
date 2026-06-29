use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::state::WorkspaceState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceInfo {
    pub root: String,
    pub is_default: bool,
}

/// Returns the current workspace root and whether it's the default ($APPDATA) workspace.
#[tauri::command]
pub async fn get_workspace_info(
    state: State<'_, WorkspaceState>,
) -> Result<WorkspaceInfo, String> {
    let root = state.get_root();
    let default_root = default_workspace_path()?;
    let is_default = root == default_root;
    Ok(WorkspaceInfo {
        root: root.to_string_lossy().to_string(),
        is_default,
    })
}

/// Opens a native folder picker. Switches the active workspace to `<picked>/.requaest/`.
/// Creates the `.requaest/` directory if it doesn't exist.
#[tauri::command]
pub async fn open_workspace(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
) -> Result<WorkspaceInfo, String> {
    // Show native folder picker (blocking call wrapped in spawn_blocking)
    let picked = tokio::task::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder()
    })
    .await
    .map_err(|e| format!("Dialog task failed: {}", e))?;

    let folder = match picked {
        Some(f) => f,
        None => {
            // User cancelled — return current info unchanged
            let root = state.get_root();
            let default_root = default_workspace_path()?;
            let is_default = root == default_root;
            return Ok(WorkspaceInfo {
                root: root.to_string_lossy().to_string(),
                is_default,
            });
        }
    };

    let new_root = folder.as_path()
        .ok_or_else(|| "Invalid folder path".to_string())?
        .join(".requaest");

    // Create .requaest/ and its required subdirectories
    tokio::fs::create_dir_all(new_root.join("environments"))
        .await
        .map_err(|e| format!("Failed to create workspace directories: {}", e))?;
    tokio::fs::create_dir_all(new_root.join("collections"))
        .await
        .map_err(|e| format!("Failed to create workspace directories: {}", e))?;

    state.set_root(new_root.clone());

    Ok(WorkspaceInfo {
        root: new_root.to_string_lossy().to_string(),
        is_default: false,
    })
}

/// Resets back to the default $APPDATA/reQuaest/ workspace.
#[tauri::command]
pub async fn reset_to_default_workspace(
    state: State<'_, WorkspaceState>,
) -> Result<WorkspaceInfo, String> {
    let default_root = default_workspace_path()?;

    // Ensure directories exist
    tokio::fs::create_dir_all(default_root.join("environments"))
        .await
        .map_err(|e| format!("Failed to create default workspace directories: {}", e))?;
    tokio::fs::create_dir_all(default_root.join("collections"))
        .await
        .map_err(|e| format!("Failed to create default workspace directories: {}", e))?;

    state.set_root(default_root.clone());

    Ok(WorkspaceInfo {
        root: default_root.to_string_lossy().to_string(),
        is_default: true,
    })
}

/// Resolves the default workspace path: `$APPDATA/reQuaest/`
pub fn default_workspace_path() -> Result<std::path::PathBuf, String> {
    dirs::data_dir()
        .map(|d| d.join("reQuaest"))
        .ok_or_else(|| "Could not resolve APPDATA directory".to_string())
}

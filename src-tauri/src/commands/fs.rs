use tauri::State;

use crate::state::WorkspaceState;

/// Rejects any path containing `..` to prevent directory traversal attacks.
fn validate_relative_path(relative_path: &str) -> Result<(), String> {
    if relative_path.contains("..") {
        return Err("Path traversal is not allowed".to_string());
    }
    Ok(())
}

/// Resolves a relative path against the active workspace root.
fn resolve_path(state: &WorkspaceState, relative_path: &str) -> Result<std::path::PathBuf, String> {
    validate_relative_path(relative_path)?;
    let root = state.get_root();
    Ok(root.join(relative_path))
}

/// Read a JSON file from the active workspace data directory.
#[tauri::command]
pub async fn load_file(
    state: State<'_, WorkspaceState>,
    relative_path: String,
) -> Result<String, String> {
    let path = resolve_path(&state, &relative_path)?;
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read '{}': {}", relative_path, e))
}

/// Write a string to a file in the active workspace data directory.
/// Creates parent directories if they don't exist.
#[tauri::command]
pub async fn save_file(
    state: State<'_, WorkspaceState>,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let path = resolve_path(&state, &relative_path)?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directories for '{}': {}", relative_path, e))?;
    }
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write '{}': {}", relative_path, e))
}

/// Delete a file from the active workspace data directory.
#[tauri::command]
pub async fn delete_file(
    state: State<'_, WorkspaceState>,
    relative_path: String,
) -> Result<(), String> {
    let path = resolve_path(&state, &relative_path)?;
    tokio::fs::remove_file(&path)
        .await
        .map_err(|e| format!("Failed to delete '{}': {}", relative_path, e))
}

/// List file names (not full paths) in a subdirectory of the active workspace.
/// Returns only files, not subdirectories.
#[tauri::command]
pub async fn list_directory(
    state: State<'_, WorkspaceState>,
    relative_path: String,
) -> Result<Vec<String>, String> {
    let path = resolve_path(&state, &relative_path)?;

    if !path.exists() {
        return Ok(vec![]);
    }

    let mut entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("Failed to list '{}': {}", relative_path, e))?;

    let mut files = Vec::new();
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read directory entry: {}", e))?
    {
        let entry_type = entry
            .file_type()
            .await
            .map_err(|e| format!("Failed to get file type: {}", e))?;

        if entry_type.is_file() {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_string());
            }
        }
    }

    files.sort();
    Ok(files)
}

/// Ensure a directory exists, creating it and all parents recursively.
#[tauri::command]
pub async fn ensure_directory(
    state: State<'_, WorkspaceState>,
    relative_path: String,
) -> Result<(), String> {
    let path = resolve_path(&state, &relative_path)?;
    tokio::fs::create_dir_all(&path)
        .await
        .map_err(|e| format!("Failed to create directory '{}': {}", relative_path, e))
}

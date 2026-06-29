mod state;
mod commands;
mod models;
mod engine;

use tauri::Manager;
use state::WorkspaceState;
use commands::workspace::default_workspace_path;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Resolve default workspace root ($APPDATA/reQuaest/)
    let default_root = default_workspace_path()
        .expect("Failed to resolve APPDATA directory — cannot start reQuaest");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceState::new(default_root))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Ensure required workspace directories exist on every startup
            let state = app.state::<WorkspaceState>();
            let root = state.get_root();
            std::fs::create_dir_all(root.join("environments"))
                .expect("Failed to create environments directory");
            std::fs::create_dir_all(root.join("collections"))
                .expect("Failed to create collections directory");

            // Ensure globals.json exists
            let globals_path = root.join("environments").join("globals.json");
            if !globals_path.exists() {
                let default_globals = serde_json::json!({
                    "name": "globals",
                    "variables": {}
                });
                std::fs::write(
                    &globals_path,
                    serde_json::to_string_pretty(&default_globals).unwrap(),
                )
                .expect("Failed to create globals.json");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Curl commands
            commands::curl::check_curl,
            commands::curl::execute_curl,
            // FS commands
            commands::fs::load_file,
            commands::fs::save_file,
            commands::fs::delete_file,
            commands::fs::list_directory,
            commands::fs::ensure_directory,
            // Workspace commands
            commands::workspace::get_workspace_info,
            commands::workspace::open_workspace,
            commands::workspace::reset_to_default_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use crate::engine::{curl_builder, response_parser};
use crate::models::curl_request::CurlRequest;
use crate::models::curl_response::CurlResponse;

/// Checks if curl is available on the system PATH by running `curl --version`.
///
/// Returns the version string on success (e.g. "curl 8.4.0 (Windows) ...").
/// Returns an error string if curl is not found or fails to run.
#[tauri::command]
pub async fn check_curl() -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("curl");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd
        .arg("--version")
        .output()
        .await
        .map_err(|e| {
            format!(
                "curl is not available on this system. \
                 Windows 10 (build 17063+) and Windows 11 include curl at \
                 C:\\Windows\\System32\\curl.exe. \
                 Technical detail: {}",
                e
            )
        })?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Sends an HTTP request by spawning system curl and parsing the response.
///
/// Flow:
///   1. Build curl CLI args from the structured `CurlRequest` payload
///   2. Spawn `curl` via `tokio::process::Command` (no sidecar, no plugin)
///   3. Collect stdout + stderr
///   4. Parse the combined output into a `CurlResponse`
///   5. Return the structured response (or a descriptive error string)
#[tauri::command]
pub async fn execute_curl(request: CurlRequest) -> Result<CurlResponse, String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_micros();
    let temp_file = std::env::temp_dir().join(format!("requaest_headers_{}.txt", ts));
    let headers_path = temp_file.to_string_lossy().to_string();

    let args = curl_builder::build_args(&request, &headers_path);

    let mut cmd = tokio::process::Command::new("curl");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd
        .args(&args)
        .output()
        .await
        .map_err(|e| {
            format!(
                "Failed to spawn curl. Ensure curl is available at \
                 C:\\Windows\\System32\\curl.exe. Error: {}",
                e
            )
        })?;

    let headers_bytes = std::fs::read(&temp_file).unwrap_or_default();
    let _ = std::fs::remove_file(&temp_file);

    response_parser::parse(&headers_bytes, &output.stdout, &output.stderr)
}

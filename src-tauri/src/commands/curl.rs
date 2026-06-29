use crate::engine::{curl_builder, response_parser};
use crate::models::curl_request::CurlRequest;
use crate::models::curl_response::CurlResponse;

/// Checks if curl is available on the system PATH by running `curl --version`.
///
/// Returns the version string on success (e.g. "curl 8.4.0 (Windows) ...").
/// Returns an error string if curl is not found or fails to run.
#[tauri::command]
pub async fn check_curl() -> Result<String, String> {
    let output = tokio::process::Command::new("curl")
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
    let args = curl_builder::build_args(&request);

    let output = tokio::process::Command::new("curl")
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

    response_parser::parse(&output.stdout, &output.stderr)
}

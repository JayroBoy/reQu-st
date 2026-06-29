use serde::Serialize;

/// Parsed HTTP response returned to the frontend via IPC.
/// Matches the TypeScript `RequestResponse` interface.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurlResponse {
    /// HTTP status code, e.g. 200, 404.
    pub status: u16,
    /// Human-readable status text, e.g. "OK", "Not Found".
    pub status_text: String,
    /// Response headers as [key, value] pairs.
    pub headers: Vec<[String; 2]>,
    /// Response body as a UTF-8 string (lossy conversion applied).
    pub body: String,
    /// Total request duration in milliseconds.
    pub time_ms: u64,
    /// Downloaded body size in bytes (as reported by curl).
    pub size_bytes: u64,
}

use serde::Deserialize;

/// The body payload sent with a request.
/// Matches the TypeScript `RequestBody` union shape.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CurlBody {
    /// Raw body (JSON, XML, plain text).
    Raw {
        content: String,
        #[serde(rename = "contentType")]
        content_type: String,
    },
    /// multipart/form-data fields.
    #[serde(rename = "form-data")]
    FormData { fields: Vec<[String; 2]> },
    /// application/x-www-form-urlencoded fields.
    #[serde(rename = "x-www-form-urlencoded")]
    UrlEncoded { fields: Vec<[String; 2]> },
}

/// Structured HTTP request received from the frontend via IPC.
/// Produced by `curlService.ts` after variable interpolation.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurlRequest {
    /// HTTP method string, e.g. "GET", "POST".
    pub method: String,
    /// Fully-resolved URL (all `{{variables}}` already interpolated).
    pub url: String,
    /// Additional request headers as [key, value] pairs.
    pub headers: Vec<[String; 2]>,
    /// Optional request body. `None` for GET/HEAD/OPTIONS.
    pub body: Option<CurlBody>,
    /// If true, pass `-L` to curl to follow 3xx redirects.
    pub follow_redirects: bool,
    /// Optional per-request timeout in milliseconds.
    pub timeout_ms: Option<u64>,
}

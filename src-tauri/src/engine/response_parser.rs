use crate::engine::curl_builder::META_SENTINEL;
use crate::models::curl_response::CurlResponse;

/// Maps a numeric HTTP status code to a standard reason phrase.
fn status_text(code: u16) -> &'static str {
    match code {
        100 => "Continue",
        101 => "Switching Protocols",
        102 => "Processing",
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        204 => "No Content",
        206 => "Partial Content",
        301 => "Moved Permanently",
        302 => "Found",
        303 => "See Other",
        304 => "Not Modified",
        307 => "Temporary Redirect",
        308 => "Permanent Redirect",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        409 => "Conflict",
        410 => "Gone",
        415 => "Unsupported Media Type",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        501 => "Not Implemented",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "Unknown",
    }
}

/// Parses curl's combined stdout into a `CurlResponse`.
///
/// curl is invoked with:
///   `-D -`  → dumps response status line + headers to stdout
///   `-o -`  → appends response body to stdout
///   `-w "\n__REQUAEST_META__\n%{http_code}\n%{time_total}\n%{size_download}"`
///           → appends a metadata block after the body
///
/// The combined stdout layout is therefore:
/// ```text
/// HTTP/1.1 200 OK\r\n
/// Header-Name: value\r\n
/// \r\n
/// <body bytes>
/// \n__REQUAEST_META__\n
/// 200\n
/// 0.342167\n
/// 1234
/// ```
///
/// When curl follows redirects (`-L`), the header block may appear multiple
/// times (one per redirect). We always use the *last* block.
pub fn parse(stdout: &[u8], stderr: &[u8]) -> Result<CurlResponse, String> {
    // Convert the entire stdout to a lossy UTF-8 string for splitting.
    let raw = String::from_utf8_lossy(stdout);

    // ── Split at the sentinel ──────────────────────────────────────────────
    let sentinel_marker = format!("\n{}\n", META_SENTINEL);
    let (http_part, meta_part) = raw
        .split_once(&sentinel_marker)
        .ok_or_else(|| {
            let err = String::from_utf8_lossy(stderr);
            if err.is_empty() {
                "curl produced no output (sentinel not found)".to_string()
            } else {
                format!("curl error: {}", err.trim())
            }
        })?;

    // ── Parse metadata block ───────────────────────────────────────────────
    let meta_lines: Vec<&str> = meta_part.trim().lines().collect();
    if meta_lines.len() < 3 {
        return Err(format!(
            "Malformed curl metadata block: {:?}",
            meta_part
        ));
    }

    let status_code: u16 = meta_lines[0]
        .trim()
        .parse()
        .map_err(|_| format!("Cannot parse HTTP status code: '{}'", meta_lines[0]))?;

    // time_total is in seconds with up to 6 decimal places → convert to ms.
    let time_secs: f64 = meta_lines[1]
        .trim()
        .parse()
        .map_err(|_| format!("Cannot parse time_total: '{}'", meta_lines[1]))?;
    let time_ms = (time_secs * 1000.0).round() as u64;

    let size_bytes: u64 = meta_lines[2]
        .trim()
        .parse()
        .unwrap_or(0); // curl reports 0 for e.g. HEAD responses — safe to default

    // ── Parse HTTP response (headers + body) ──────────────────────────────
    // With `-L` curl may output multiple header blocks (one per redirect).
    // We find the *last* `HTTP/` line and use only the block that follows it.
    let last_http_start = http_part
        .rfind("HTTP/")
        .ok_or("No HTTP status line found in curl output")?;
    let last_block = &http_part[last_http_start..];

    // The header block ends at the first blank line (\r\n\r\n or \n\n).
    // Everything after is the body.
    let (header_section, body) = if let Some(pos) = last_block.find("\r\n\r\n") {
        (&last_block[..pos], &last_block[pos + 4..])
    } else if let Some(pos) = last_block.find("\n\n") {
        (&last_block[..pos], &last_block[pos + 2..])
    } else {
        // Edge case: no body at all (e.g. 204 No Content)
        (last_block, "")
    };

    // ── Parse status line ─────────────────────────────────────────────────
    // Format: "HTTP/1.1 200 OK" or "HTTP/2 200"
    let mut header_lines = header_section.lines();
    let _status_line = header_lines.next().unwrap_or(""); // consume the status line

    // ── Parse individual headers ──────────────────────────────────────────
    let mut headers: Vec<[String; 2]> = Vec::new();
    for line in header_lines {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            continue;
        }
        if let Some((key, value)) = line.split_once(": ") {
            headers.push([key.trim().to_string(), value.trim().to_string()]);
        } else if let Some((key, value)) = line.split_once(':') {
            // Handle headers with no space after colon (rare but valid)
            headers.push([key.trim().to_string(), value.trim().to_string()]);
        }
    }

    Ok(CurlResponse {
        status: status_code,
        status_text: status_text(status_code).to_string(),
        headers,
        body: body.to_string(),
        time_ms,
        size_bytes,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a minimal synthetic curl stdout for a simple 200 OK response.
    fn make_stdout(
        status_line: &str,
        headers: &[(&str, &str)],
        body: &str,
        http_code: &str,
        time_total: &str,
        size_download: &str,
    ) -> Vec<u8> {
        let mut s = String::new();
        s.push_str(status_line);
        s.push_str("\r\n");
        for (k, v) in headers {
            s.push_str(&format!("{}: {}\r\n", k, v));
        }
        s.push_str("\r\n");
        s.push_str(body);
        s.push('\n');
        s.push_str(META_SENTINEL);
        s.push('\n');
        s.push_str(http_code);
        s.push('\n');
        s.push_str(time_total);
        s.push('\n');
        s.push_str(size_download);
        s.into_bytes()
    }

    #[test]
    fn test_parse_200_ok() {
        let stdout = make_stdout(
            "HTTP/1.1 200 OK",
            &[("Content-Type", "application/json")],
            r#"{"id":1}"#,
            "200",
            "0.342000",
            "8",
        );
        let resp = parse(&stdout, b"").unwrap();
        assert_eq!(resp.status, 200);
        assert_eq!(resp.status_text, "OK");
        assert_eq!(resp.body, r#"{"id":1}"#);
        assert_eq!(resp.time_ms, 342);
        assert_eq!(resp.size_bytes, 8);
        assert_eq!(resp.headers.len(), 1);
        assert_eq!(resp.headers[0], ["Content-Type".to_string(), "application/json".to_string()]);
    }

    #[test]
    fn test_parse_404_not_found() {
        let stdout = make_stdout(
            "HTTP/2 404",
            &[("content-length", "0")],
            "",
            "404",
            "0.100000",
            "0",
        );
        let resp = parse(&stdout, b"").unwrap();
        assert_eq!(resp.status, 404);
        assert_eq!(resp.status_text, "Not Found");
    }

    #[test]
    fn test_parse_201_created() {
        let stdout = make_stdout(
            "HTTP/1.1 201 Created",
            &[("Location", "/api/items/42")],
            r#"{"id":42}"#,
            "201",
            "0.500000",
            "9",
        );
        let resp = parse(&stdout, b"").unwrap();
        assert_eq!(resp.status, 201);
        assert_eq!(resp.status_text, "Created");
        assert_eq!(resp.size_bytes, 9);
    }

    #[test]
    fn test_parse_204_no_content_empty_body() {
        let stdout = make_stdout("HTTP/1.1 204 No Content", &[], "", "204", "0.050000", "0");
        let resp = parse(&stdout, b"").unwrap();
        assert_eq!(resp.status, 204);
        // Body should be empty (or just whitespace)
        assert!(resp.body.trim().is_empty());
    }

    #[test]
    fn test_parse_follows_redirects_uses_last_header_block() {
        // Simulate -L output: two HTTP header blocks (redirect + final response)
        let mut stdout = String::new();
        stdout.push_str("HTTP/1.1 301 Moved Permanently\r\nLocation: https://new.example.com\r\n\r\n");
        stdout.push_str("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n");
        stdout.push_str("Hello, world!");
        stdout.push('\n');
        stdout.push_str(META_SENTINEL);
        stdout.push_str("\n200\n0.250000\n13");

        let resp = parse(stdout.as_bytes(), b"").unwrap();
        assert_eq!(resp.status, 200);
        assert_eq!(resp.body, "Hello, world!");
        // Headers should be from the final block only
        assert_eq!(resp.headers.len(), 1);
        assert_eq!(resp.headers[0][0], "Content-Type");
    }

    #[test]
    fn test_parse_returns_error_when_no_sentinel() {
        let bad_output = b"HTTP/1.1 200 OK\r\n\r\nbody without sentinel";
        let result = parse(bad_output, b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_returns_curl_stderr_in_error() {
        let result = parse(b"", b"curl: (6) Could not resolve host");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Could not resolve host"), "err was: {}", err);
    }

    #[test]
    fn test_time_ms_rounding() {
        let stdout = make_stdout("HTTP/1.1 200 OK", &[], "ok", "200", "1.0005000", "2");
        let resp = parse(&stdout, b"").unwrap();
        // 1.0005 * 1000 = 1000.5 → rounds to 1001
        assert_eq!(resp.time_ms, 1001);
    }
}

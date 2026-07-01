use crate::models::curl_request::{CurlBody, CurlRequest};

/// Sentinel string injected via curl's `-w` write-out flag.
/// Separates the HTTP response (headers + body) from the curl metadata block.
pub const META_SENTINEL: &str = "__REQUAEST_META__";

/// Converts a `CurlRequest` into the `Vec<String>` of arguments passed to the
/// `curl` binary.
///
/// Arg order:
///   1. Silent mode + write-out template
///   2. Header dump + body capture flags
///   3. HTTP method
///   4. Request headers
///   5. Body flags
///   6. Follow-redirects / timeout
///   7. URL (always last)
pub fn build_args(req: &CurlRequest, headers_path: &str) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // ── 1. Silent + metadata write-out ───────────────────────────────────────
    args.push("-s".into());
    // Write status code, time (seconds, 6 decimal places), and download size
    // after the sentinel. The sentinel is preceded by a newline so it always
    // starts on its own line, even if the body has no trailing newline.
    args.push("-w".into());
    args.push(format!(
        "\n{sentinel}\n%{{http_code}}\n%{{time_total}}\n%{{size_download}}",
        sentinel = META_SENTINEL
    ));

    // ── 2. Dump headers to stdout + send body to stdout ───────────────────────
    // `-D -` writes the response status line and headers to stdout.
    // `-o -` writes the response body to stdout.
    // Combined they give us one continuous stream we can parse.
    args.push("-D".into());
    args.push(headers_path.into());
    args.push("-o".into());
    args.push("-".into());

    // ── 3. HTTP method ────────────────────────────────────────────────────────
    args.push("-X".into());
    args.push(req.method.clone());

    // ── 4. Request headers ────────────────────────────────────────────────────
    for [key, value] in &req.headers {
        args.push("-H".into());
        args.push(format!("{}: {}", key, value));
    }

    // ── 5. Body ───────────────────────────────────────────────────────────────
    match &req.body {
        None => {}

        Some(CurlBody::Raw {
            content,
            content_type,
        }) => {
            // Inject Content-Type unless the caller already provided it.
            let has_ct = req
                .headers
                .iter()
                .any(|[k, _]| k.to_lowercase() == "content-type");
            if !has_ct {
                args.push("-H".into());
                args.push(format!("Content-Type: {}", content_type));
            }
            args.push("--data-raw".into());
            args.push(content.clone());
        }

        Some(CurlBody::FormData { fields }) => {
            for [key, value] in fields {
                args.push("-F".into());
                args.push(format!("{}={}", key, value));
            }
        }

        Some(CurlBody::UrlEncoded { fields }) => {
            // Build a single urlencoded string and pass it via --data-urlencode
            // for each pair (curl handles percent-encoding).
            for [key, value] in fields {
                args.push("--data-urlencode".into());
                args.push(format!("{}={}", key, value));
            }
        }
    }

    // ── 6. Follow redirects / timeout ─────────────────────────────────────────
    if req.follow_redirects {
        args.push("-L".into());
    }

    if let Some(ms) = req.timeout_ms {
        // curl --max-time expects seconds (float allowed).
        let secs = ms as f64 / 1000.0;
        args.push("--max-time".into());
        args.push(format!("{:.3}", secs));
    }

    // ── 7. URL (always last) ──────────────────────────────────────────────────
    args.push(req.url.clone());

    args
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::curl_request::{CurlBody, CurlRequest};

    fn base_get(url: &str) -> CurlRequest {
        CurlRequest {
            method: "GET".into(),
            url: url.into(),
            headers: vec![],
            body: None,
            follow_redirects: true,
            timeout_ms: None,
        }
    }

    #[test]
    fn test_simple_get_has_silent_flag() {
        let args = build_args(&base_get("https://example.com"), "headers.txt");
        assert!(args.contains(&"-s".to_string()));
    }

    #[test]
    fn test_simple_get_url_is_last() {
        let url = "https://example.com/api";
        let args = build_args(&base_get(url), "headers.txt");
        assert_eq!(args.last().unwrap(), url);
    }

    #[test]
    fn test_simple_get_has_header_dump_flags() {
        let args = build_args(&base_get("https://example.com"), "headers.txt");
        // -D <file> must appear together
        let d_pos = args.iter().position(|a| a == "-D").unwrap();
        assert_eq!(args[d_pos + 1], "headers.txt");
        // -o - must appear together
        let o_pos = args.iter().position(|a| a == "-o").unwrap();
        assert_eq!(args[o_pos + 1], "-");
    }

    #[test]
    fn test_follow_redirects_adds_l_flag() {
        let req = base_get("https://example.com");
        let args = build_args(&req, "headers.txt");
        assert!(args.contains(&"-L".to_string()));
    }

    #[test]
    fn test_no_follow_redirects_omits_l_flag() {
        let mut req = base_get("https://example.com");
        req.follow_redirects = false;
        let args = build_args(&req, "headers.txt");
        assert!(!args.contains(&"-L".to_string()));
    }

    #[test]
    fn test_timeout_ms_converted_to_seconds() {
        let mut req = base_get("https://example.com");
        req.timeout_ms = Some(5000);
        let args = build_args(&req, "headers.txt");
        let mt_pos = args.iter().position(|a| a == "--max-time").unwrap();
        assert_eq!(args[mt_pos + 1], "5.000");
    }

    #[test]
    fn test_custom_header_injected() {
        let mut req = base_get("https://example.com");
        req.headers = vec![["Authorization".into(), "Bearer tok".into()]];
        let args = build_args(&req, "headers.txt");
        assert!(args.contains(&"Authorization: Bearer tok".to_string()));
    }

    #[test]
    fn test_raw_body_injects_content_type_when_missing() {
        let req = CurlRequest {
            method: "POST".into(),
            url: "https://example.com/api".into(),
            headers: vec![],
            body: Some(CurlBody::Raw {
                content: r#"{"a":1}"#.into(),
                content_type: "application/json".into(),
            }),
            follow_redirects: false,
            timeout_ms: None,
        };
        let args = build_args(&req, "headers.txt");
        assert!(args.contains(&"Content-Type: application/json".to_string()));
        assert!(args.contains(&"--data-raw".to_string()));
        assert!(args.contains(&r#"{"a":1}"#.to_string()));
    }

    #[test]
    fn test_raw_body_skips_content_type_when_caller_provides_it() {
        let req = CurlRequest {
            method: "POST".into(),
            url: "https://example.com/api".into(),
            headers: vec![["Content-Type".into(), "text/plain".into()]],
            body: Some(CurlBody::Raw {
                content: "hello".into(),
                content_type: "application/json".into(), // would be wrong type
            }),
            follow_redirects: false,
            timeout_ms: None,
        };
        let args = build_args(&req, "headers.txt");
        // Only one Content-Type header — from the caller, not the body default
        let ct_count = args
            .iter()
            .filter(|a| a.to_lowercase().starts_with("content-type"))
            .count();
        assert_eq!(ct_count, 1);
        assert!(args.contains(&"Content-Type: text/plain".to_string()));
    }

    #[test]
    fn test_form_data_fields_use_f_flag() {
        let req = CurlRequest {
            method: "POST".into(),
            url: "https://example.com/upload".into(),
            headers: vec![],
            body: Some(CurlBody::FormData {
                fields: vec![
                    ["file".into(), "@path/to/file".into()],
                    ["name".into(), "Alice".into()],
                ],
            }),
            follow_redirects: false,
            timeout_ms: None,
        };
        let args = build_args(&req, "headers.txt");
        // Each field gets a -F flag
        let f_count = args.iter().filter(|a| a.as_str() == "-F").count();
        assert_eq!(f_count, 2);
    }

    #[test]
    fn test_urlencoded_fields_use_data_urlencode_flag() {
        let req = CurlRequest {
            method: "POST".into(),
            url: "https://example.com/form".into(),
            headers: vec![],
            body: Some(CurlBody::UrlEncoded {
                fields: vec![
                    ["username".into(), "alice".into()],
                    ["password".into(), "s3cr3t".into()],
                ],
            }),
            follow_redirects: false,
            timeout_ms: None,
        };
        let args = build_args(&req, "headers.txt");
        let count = args
            .iter()
            .filter(|a| a.as_str() == "--data-urlencode")
            .count();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_write_out_contains_sentinel() {
        let args = build_args(&base_get("https://example.com"), "headers.txt");
        let w_pos = args.iter().position(|a| a == "-w").unwrap();
        assert!(args[w_pos + 1].contains(META_SENTINEL));
    }
}

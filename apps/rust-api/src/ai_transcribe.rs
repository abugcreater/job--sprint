use axum::http::StatusCode;
use serde_json::{Value, json};

pub(crate) fn transcribe_upload_response(
    body: &[u8],
    content_type: &str,
    max_bytes: usize,
    provider: &str,
) -> (StatusCode, Value) {
    if body.len() > max_bytes {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            json!({ "ok": false, "error": "audio_too_large", "message": "音频文件过大，请控制单次回答录音长度。" }),
        );
    }
    if !content_type
        .to_ascii_lowercase()
        .starts_with("multipart/form-data")
    {
        return (
            StatusCode::BAD_REQUEST,
            json!({ "ok": false, "error": "malformed_upload", "message": "请使用 multipart/form-data 上传 audio 文件。" }),
        );
    }
    let Some(audio_bytes) = multipart_audio_len(body, content_type) else {
        return (
            StatusCode::BAD_REQUEST,
            json!({ "ok": false, "error": "malformed_upload", "message": "未找到有效 audio 文件。" }),
        );
    };
    if provider == "none" {
        return (
            StatusCode::OK,
            json!({
                "ok": false,
                "mode": "not_configured",
                "provider": provider,
                "audioBytes": audio_bytes,
                "message": "ASR 服务未配置，可继续手动输入"
            }),
        );
    }
    (
        StatusCode::NOT_IMPLEMENTED,
        json!({ "ok": false, "mode": "provider_not_implemented", "provider": provider, "message": "当前服务端只完成录音上传闭环，ASR provider 尚未接入。" }),
    )
}

fn multipart_audio_len(body: &[u8], content_type: &str) -> Option<usize> {
    let boundary = content_type.split("boundary=").nth(1)?.trim_matches('"');
    let marker = format!("--{boundary}");
    let text = String::from_utf8_lossy(body);
    for part in text.split(&marker) {
        if !(part.contains("name=\"audio\"") || part.contains("filename=")) {
            continue;
        }
        let (_, content) = part.split_once("\r\n\r\n")?;
        let content = content.trim_end_matches("\r\n").trim_end_matches("--");
        if !content.is_empty() {
            return Some(content.len());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transcribe_upload_response_validates_upload_and_provider() {
        let (status, payload) = transcribe_upload_response(
            b"--x\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"a.m4a\"\r\n\r\nabc\r\n--x--",
            "multipart/form-data; boundary=x",
            1024,
            "none",
        );

        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            payload.get("mode").and_then(Value::as_str),
            Some("not_configured")
        );
        assert_eq!(payload.get("audioBytes").and_then(Value::as_i64), Some(3));

        let (status, payload) = transcribe_upload_response(b"abc", "text/plain", 1024, "none");
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(
            payload.get("error").and_then(Value::as_str),
            Some("malformed_upload")
        );

        let (status, payload) =
            transcribe_upload_response(&[1, 2, 3], "multipart/form-data; boundary=x", 2, "none");
        assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
        assert_eq!(
            payload.get("error").and_then(Value::as_str),
            Some("audio_too_large")
        );
    }
}

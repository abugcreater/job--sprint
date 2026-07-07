use axum::http::{HeaderMap, header};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;
use std::{collections::HashMap, env};
use subtle::ConstantTimeEq;

const SESSION_COOKIE: &str = "job_sprint_session";

type HmacSha256 = Hmac<Sha256>;

pub(crate) fn sign_session(payload: Value, secret: &str) -> String {
    let body = URL_SAFE_NO_PAD.encode(payload.to_string().as_bytes());
    let signature = hmac_base64(&body, secret);
    format!("{body}.{signature}")
}

pub(crate) fn session_payload(token: &str, secret: &str) -> Result<Value, &'static str> {
    let Some((body, signature)) = token.split_once('.') else {
        return Err("missing_session");
    };
    let expected = hmac_base64(body, secret);
    if !constant_time_eq(signature, &expected) {
        return Err("bad_session");
    }
    URL_SAFE_NO_PAD
        .decode(body)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .ok_or("bad_session")
}

pub(crate) fn session_cookie_value(headers: &HeaderMap) -> Option<String> {
    parse_cookies(headers).get(SESSION_COOKIE).cloned()
}

pub(crate) fn session_cookie(value: &str, max_age: Option<i64>, secure: bool) -> String {
    let mut parts = vec![
        format!("{}={}", SESSION_COOKIE, urlencoding::encode(value)),
        "Path=/".to_string(),
        "HttpOnly".to_string(),
        "SameSite=Lax".to_string(),
    ];
    if let Some(max_age) = max_age {
        parts.push(format!("Max-Age={max_age}"));
    }
    if secure {
        parts.push("Secure".to_string());
    }
    parts.join("; ")
}

pub(crate) fn is_secure_request(headers: &HeaderMap) -> bool {
    if env::var("JOB_SPRINT_COOKIE_SECURE")
        .unwrap_or_default()
        .eq_ignore_ascii_case("true")
    {
        return true;
    }
    headers
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .map(|value| value.eq_ignore_ascii_case("https"))
        .unwrap_or(false)
}

fn hmac_base64(body: &str, secret: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("hmac accepts arbitrary key length");
    mac.update(body.as_bytes());
    URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
}

fn parse_cookies(headers: &HeaderMap) -> HashMap<String, String> {
    headers
        .get(header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .split(';')
        .filter_map(|part| {
            let (key, value) = part.split_once('=')?;
            Some((
                key.trim().to_string(),
                urlencoding::decode(value.trim())
                    .map(|decoded| decoded.into_owned())
                    .unwrap_or_else(|_| value.trim().to_string()),
            ))
        })
        .collect()
}

fn constant_time_eq(left: &str, right: &str) -> bool {
    left.len() == right.len() && left.as_bytes().ct_eq(right.as_bytes()).into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;
    use serde_json::json;

    #[test]
    fn signed_session_round_trips_payload() {
        let token = sign_session(json!({ "user": "kai", "exp": 123456 }), "secret");
        let payload = session_payload(&token, "secret").expect("valid session payload");

        assert_eq!(payload.get("user").and_then(Value::as_str), Some("kai"));
        assert!(session_payload(&token, "wrong-secret").is_err());
        assert_eq!(
            session_payload("malformed", "secret"),
            Err("missing_session")
        );
    }

    #[test]
    fn cookie_helpers_encode_decode_and_mark_secure() {
        let cookie = session_cookie("a.b/c", Some(60), true);
        assert!(cookie.contains("job_sprint_session=a.b%2Fc"));
        assert!(cookie.contains("Max-Age=60"));
        assert!(cookie.contains("Secure"));

        let mut headers = HeaderMap::new();
        headers.insert(header::COOKIE, HeaderValue::from_str(&cookie).unwrap());

        assert_eq!(session_cookie_value(&headers).as_deref(), Some("a.b/c"));
    }

    #[test]
    fn secure_request_uses_first_forwarded_proto() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-proto", HeaderValue::from_static("https, http"));

        assert!(is_secure_request(&headers));
    }
}

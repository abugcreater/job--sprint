use axum::body::Bytes;
use serde_json::{Value, json};

pub(crate) fn parse_json_body(body: Bytes) -> Result<Value, String> {
    if body.is_empty() {
        return Ok(json!({}));
    }
    serde_json::from_slice::<Value>(&body).map_err(|error| error.to_string())
}

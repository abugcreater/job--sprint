use axum::{http::StatusCode, response::Response};
use serde_json::json;
use std::env;

use crate::auth_config::get_auth_config;
use crate::http_responses::json_response;

pub(crate) async fn health() -> Response {
    let auth_config = get_auth_config();
    json_response(
        StatusCode::OK,
        json!({
            "ok": true,
            "authConfigured": auth_config.configured,
            "authDisabled": auth_config.disabled,
            "userCount": auth_config.users.len(),
            "bearerTokenCount": auth_config.bearer_tokens.len(),
            "apiConfigured": env::var("ANTHROPIC_BASE_URL").is_ok() && env::var("ANTHROPIC_AUTH_TOKEN").is_ok(),
            "model": env::var("ANTHROPIC_MODEL").ok(),
            "runtimeStorage": "sqlite"
        }),
    )
}

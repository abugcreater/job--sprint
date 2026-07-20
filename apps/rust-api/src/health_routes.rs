use axum::{http::StatusCode, response::Response};
use serde_json::json;
use std::env;

use crate::auth_config::get_auth_config;
use crate::http_responses::json_response;

pub(crate) async fn health() -> Response {
    let auth_config = get_auth_config();
    let provider_base_url = non_empty_env("ANTHROPIC_BASE_URL");
    let provider_token = non_empty_env("ANTHROPIC_AUTH_TOKEN");
    json_response(
        StatusCode::OK,
        json!({
            "ok": true,
            "authConfigured": auth_config.configured,
            "authDisabled": auth_config.disabled,
            "userCount": auth_config.users.len(),
            "bearerTokenCount": auth_config.bearer_tokens.len(),
            "apiConfigured": provider_base_url.is_some() && provider_token.is_some(),
            "model": non_empty_env("ANTHROPIC_MODEL"),
            "runtimeStorage": "sqlite"
        }),
    )
}

fn non_empty_env(name: &str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.trim().is_empty())
}

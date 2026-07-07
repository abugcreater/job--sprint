use axum::http::{HeaderMap, header};
use chrono::{DateTime, Utc};

use crate::auth_config::AuthConfig;
use crate::auth_hash::{constant_time_eq, sha256_hex};
use crate::auth_state::{AuthState, authenticated_state, unauthenticated_state};

pub(crate) fn verify_bearer_token(headers: &HeaderMap, config: &AuthConfig) -> Option<AuthState> {
    let raw = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let presented = raw
        .strip_prefix("Bearer ")
        .or_else(|| raw.strip_prefix("bearer "))?
        .trim();
    if presented.is_empty() {
        return Some(unauthenticated_state(config.clone(), "bad_bearer_token"));
    }
    let presented_hash = sha256_hex(presented);
    let token = config.bearer_tokens.iter().find(|token| {
        token_not_expired(token.expires_at.as_deref())
            && constant_time_eq(&token.token_hash, &presented_hash)
    });
    let Some(token) = token else {
        return Some(unauthenticated_state(config.clone(), "bad_bearer_token"));
    };
    let Some(user) = config.user_map.get(&token.username) else {
        return Some(unauthenticated_state(
            config.clone(),
            "bearer_user_not_found",
        ));
    };
    Some(authenticated_state(
        config.clone(),
        user,
        "bearer",
        &token.permissions,
    ))
}

fn token_not_expired(expires_at: Option<&str>) -> bool {
    let Some(expires_at) = expires_at else {
        return true;
    };
    DateTime::parse_from_rfc3339(expires_at)
        .map(|expires_at| expires_at.with_timezone(&Utc) > Utc::now())
        .unwrap_or(true)
}

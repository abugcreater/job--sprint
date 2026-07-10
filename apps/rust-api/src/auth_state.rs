use axum::{
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde::Serialize;
use serde_json::{Value, json};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::auth_bearer::verify_bearer_token;
use crate::auth_config::{AuthConfig, UserConfig, get_auth_config};
use crate::auth_http::reject_unauthenticated;
pub(crate) use crate::auth_http::{
    reject_static_unauthenticated, runtime_response, runtime_response_status,
};
use crate::auth_permissions::{has_permission, permissions_are_read_only, permissions_for};
use crate::http_responses::json_response;
use crate::session_token::{session_cookie_value, session_payload};

pub(crate) const SESSION_TTL_MS: i64 = 8 * 60 * 60 * 1000;

pub(crate) type HandlerResult<T> = Result<T, Box<Response>>;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PublicUser {
    username: String,
    display_name: String,
    role: String,
    data_scope: String,
    invite_batch: String,
    permissions: Vec<String>,
    pub(crate) read_only: bool,
}

#[derive(Clone, Debug)]
pub(crate) struct AuthState {
    pub(crate) authenticated: bool,
    pub(crate) user_profile: Option<PublicUser>,
    pub(crate) config: AuthConfig,
    pub(crate) auth_method: Option<String>,
    pub(crate) reason: Option<String>,
}

pub(crate) fn verify_session(headers: &HeaderMap) -> AuthState {
    let config = get_auth_config();
    if config.disabled {
        let user = config.users.first().expect("disabled auth user exists");
        return authenticated_state(config.clone(), user, "disabled", &[]);
    }
    if !config.configured {
        return unauthenticated_state(
            config.clone(),
            config
                .config_error
                .clone()
                .unwrap_or_else(|| "auth_not_configured".to_string()),
        );
    }

    if let Some(bearer_state) = verify_bearer_token(headers, &config) {
        return bearer_state;
    }

    let Some(token) = session_cookie_value(headers) else {
        return unauthenticated_state(config, "missing_session");
    };
    let payload = match session_payload(&token, &config.session_secret) {
        Ok(payload) => payload,
        Err(reason) => return unauthenticated_state(config, reason),
    };
    let username = payload.get("user").and_then(Value::as_str).unwrap_or("");
    let exp = payload.get("exp").and_then(Value::as_i64).unwrap_or(0);
    let Some(user) = config.user_map.get(username) else {
        return unauthenticated_state(config, "expired_session");
    };
    if exp < now_millis() {
        return unauthenticated_state(config, "expired_session");
    }
    authenticated_state(config.clone(), user, "session", &[])
}

pub(crate) fn authenticated_state(
    config: AuthConfig,
    user_config: &UserConfig,
    auth_method: &str,
    extra_permissions: &[String],
) -> AuthState {
    AuthState {
        authenticated: true,
        user_profile: Some(public_user(user_config, extra_permissions)),
        config,
        auth_method: Some(auth_method.to_string()),
        reason: None,
    }
}

pub(crate) fn unauthenticated_state(config: AuthConfig, reason: impl Into<String>) -> AuthState {
    AuthState {
        authenticated: false,
        user_profile: None,
        config,
        auth_method: None,
        reason: Some(reason.into()),
    }
}

pub(crate) fn public_user(user: &UserConfig, extra_permissions: &[String]) -> PublicUser {
    let permissions = permissions_for(&user.role, &user.permissions, extra_permissions);
    let read_only = permissions_are_read_only(&permissions);
    PublicUser {
        username: user.username.clone(),
        display_name: user.display_name.clone(),
        role: user.role.clone(),
        data_scope: user.data_scope.clone(),
        invite_batch: user.invite_batch.clone(),
        permissions,
        read_only,
    }
}

pub(crate) fn require_auth(headers: &HeaderMap) -> HandlerResult<AuthState> {
    let auth_state = verify_session(headers);
    if auth_state.authenticated {
        Ok(auth_state)
    } else {
        Err(Box::new(reject_unauthenticated(&auth_state)))
    }
}

pub(crate) fn require_write_permission(auth_state: &AuthState) -> HandlerResult<()> {
    require_permission(auth_state, "runtime:write")
}

pub(crate) fn require_permission(auth_state: &AuthState, permission: &str) -> HandlerResult<()> {
    if auth_has_permission(auth_state, permission) {
        Ok(())
    } else {
        Err(Box::new(json_response(
            StatusCode::FORBIDDEN,
            json!({
                "ok": false,
                "error": "forbidden",
                "message": "当前账号没有访问该功能的权限。"
            }),
        )))
    }
}

pub(crate) fn auth_has_permission(auth_state: &AuthState, permission: &str) -> bool {
    let permissions = auth_state
        .user_profile
        .as_ref()
        .map(|user| user.permissions.as_slice())
        .unwrap_or(&[]);
    has_permission(permissions, permission)
}

pub(crate) fn user_data_scope(auth_state: &AuthState) -> String {
    auth_state
        .user_profile
        .as_ref()
        .map(|user| user.data_scope.clone())
        .unwrap_or_else(|| get_auth_config().data_owner)
}

pub(crate) fn user_username(auth_state: &AuthState) -> String {
    auth_state
        .user_profile
        .as_ref()
        .map(|user| user.username.clone())
        .unwrap_or_else(|| get_auth_config().data_owner)
}

pub(crate) fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::Response,
};
use serde_json::{Value, json};

use crate::AppState;
use crate::auth_config::get_auth_config;
use crate::auth_hash::{constant_time_eq, sha256_hex};
use crate::auth_state::{SESSION_TTL_MS, now_millis, public_user, verify_session};
use crate::http_responses::{bad_json, insert_header, json_response};
use crate::login_rate;
use crate::parse_json_body;
use crate::session_token::{is_secure_request, session_cookie, sign_session};

pub(crate) async fn session(headers: HeaderMap) -> Response {
    let auth_state = verify_session(&headers);
    let status = if auth_state.authenticated {
        StatusCode::OK
    } else if auth_state.reason.as_deref() == Some("auth_not_configured") {
        StatusCode::SERVICE_UNAVAILABLE
    } else {
        StatusCode::UNAUTHORIZED
    };
    json_response(
        status,
        json!({
            "ok": true,
            "authenticated": auth_state.authenticated,
            "authConfigured": auth_state.config.configured,
            "authDisabled": auth_state.config.disabled,
            "user": auth_state.user_profile,
            "authMethod": auth_state.auth_method
        }),
    )
}

pub(crate) async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth_config = get_auth_config();
    if auth_config.disabled {
        return json_response(
            StatusCode::OK,
            json!({ "ok": true, "authenticated": true, "authDisabled": true }),
        );
    }
    if !auth_config.configured {
        return json_response(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({
                "ok": false,
                "error": "auth_not_configured",
                "message": "job-sprint 应用层认证未配置。请设置 JOB_SPRINT_USERS_JSON 或 JOB_SPRINT_USERS_FILE，并提供至少 32 字符的 JOB_SPRINT_SESSION_SECRET。"
            }),
        );
    }

    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let username = payload
        .get("username")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let password = payload
        .get("password")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let rate_state = login_rate::state(&state.login_failures, &headers, &username);
    if rate_state.limited {
        let mut response = json_response(
            StatusCode::TOO_MANY_REQUESTS,
            json!({
                "ok": false,
                "error": "too_many_login_attempts",
                "message": "登录失败次数过多，请稍后再试。"
            }),
        );
        insert_header(
            response.headers_mut(),
            header::RETRY_AFTER,
            &rate_state.retry_after_seconds.to_string(),
        );
        return response;
    }

    let valid_user = auth_config
        .user_map
        .get(&username)
        .filter(|user| constant_time_eq(&sha256_hex(&password), &user.password_hash));
    let Some(user_config) = valid_user else {
        login_rate::record_failure(&state.login_failures, &rate_state.key);
        return json_response(
            StatusCode::UNAUTHORIZED,
            json!({ "ok": false, "error": "invalid_credentials", "message": "用户名或密码不正确。" }),
        );
    };
    login_rate::clear_failures(&state.login_failures, &rate_state.key);

    let token = sign_session(
        json!({
            "user": user_config.username,
            "iat": now_millis(),
            "exp": now_millis() + SESSION_TTL_MS
        }),
        &auth_config.session_secret,
    );
    let user = public_user(user_config, &[]);
    let mut response = json_response(
        StatusCode::OK,
        json!({ "ok": true, "authenticated": true, "user": user }),
    );
    insert_header(
        response.headers_mut(),
        header::SET_COOKIE,
        &session_cookie(
            &token,
            Some(SESSION_TTL_MS / 1000),
            is_secure_request(&headers),
        ),
    );
    response
}

pub(crate) async fn logout(headers: HeaderMap) -> Response {
    let mut response = json_response(
        StatusCode::OK,
        json!({ "ok": true, "authenticated": false }),
    );
    insert_header(
        response.headers_mut(),
        header::SET_COOKIE,
        &session_cookie("", Some(0), is_secure_request(&headers)),
    );
    response
}

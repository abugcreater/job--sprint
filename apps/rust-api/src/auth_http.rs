use axum::{http::StatusCode, response::Response};
use serde_json::{Map, Value, json};

use crate::auth_state::AuthState;
use crate::http_responses::{json_response, redirect_response};
use crate::static_files::request_base;

pub(crate) fn reject_unauthenticated(auth_state: &AuthState) -> Response {
    let status = if auth_state.reason.as_deref() == Some("auth_not_configured") {
        StatusCode::SERVICE_UNAVAILABLE
    } else {
        StatusCode::UNAUTHORIZED
    };
    json_response(
        status,
        json!({
            "ok": false,
            "authenticated": false,
            "error": auth_state.reason.as_deref().unwrap_or("unauthorized"),
            "message": if status == StatusCode::SERVICE_UNAVAILABLE {
                "job-sprint 应用层认证未配置，私有资源保持关闭。"
            } else {
                "请先登录 job-sprint。"
            }
        }),
    )
}

pub(crate) fn runtime_response(auth_state: &AuthState, extra: Value) -> Response {
    runtime_response_status(auth_state, StatusCode::OK, extra)
}

pub(crate) fn runtime_response_status(
    auth_state: &AuthState,
    status: StatusCode,
    extra: Value,
) -> Response {
    let mut payload = Map::new();
    payload.insert("ok".to_string(), json!(true));
    payload.insert("storage".to_string(), json!("sqlite"));
    payload.insert(
        "readOnly".to_string(),
        json!(
            auth_state
                .user_profile
                .as_ref()
                .map(|user| user.read_only)
                .unwrap_or(false)
        ),
    );
    if let Value::Object(extra) = extra {
        payload.extend(extra);
    }
    json_response(status, Value::Object(payload))
}

pub(crate) fn reject_static_unauthenticated(
    request_path: &str,
    pathname: &str,
    auth_state: &AuthState,
) -> Response {
    if pathname == "/"
        || pathname == "/schedule.html"
        || pathname == "/react"
        || pathname == "/react/"
        || pathname == "/react/index.html"
    {
        let next = if pathname == "/schedule.html" {
            "/schedule.html"
        } else {
            "/react/index.html#/today"
        };
        let base = request_base(request_path);
        return redirect_response(&format!(
            "{base}/login.html?next={}",
            urlencoding::encode(&format!("{base}{next}"))
        ));
    }
    reject_unauthenticated(auth_state)
}

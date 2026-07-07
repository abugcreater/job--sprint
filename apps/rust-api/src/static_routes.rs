use axum::{
    extract::State,
    http::{HeaderMap, Method, StatusCode, Uri},
    response::Response,
};
use serde_json::json;

use crate::AppState;
use crate::auth_state::{auth_has_permission, reject_static_unauthenticated, verify_session};
use crate::http_responses::{bytes_response, json_response, redirect_response, text_response};
use crate::static_files::{
    content_type_for, is_private_static, no_store_path, normalize_pathname, request_base,
    static_path_for,
};

pub(crate) async fn static_or_api_not_found(
    State(state): State<AppState>,
    method: Method,
    headers: HeaderMap,
    uri: Uri,
) -> Response {
    if uri.path().starts_with("/api/") || uri.path().starts_with("/job-sprint/api/") {
        return json_response(StatusCode::NOT_FOUND, json!({ "error": "api_not_found" }));
    }
    if method != Method::GET && method != Method::HEAD {
        return json_response(
            StatusCode::METHOD_NOT_ALLOWED,
            json!({ "error": "method_not_allowed" }),
        );
    }
    let pathname = normalize_pathname(uri.path());
    if pathname == "/react" {
        return redirect_response(&format!(
            "{}{}",
            request_base(uri.path()),
            "/react/index.html#/today"
        ));
    }
    let mut use_public_safe_data = false;
    if is_private_static(&pathname) {
        let auth = verify_session(&headers);
        if !auth.authenticated {
            return reject_static_unauthenticated(uri.path(), &pathname, &auth);
        }
        use_public_safe_data = !auth_has_permission(&auth, "data:private");
    }
    let Some(file_path) = static_path_for(&state.root, &pathname, use_public_safe_data) else {
        return text_response(
            StatusCode::FORBIDDEN,
            "Forbidden",
            "text/plain; charset=utf-8",
        );
    };
    match tokio::fs::read(&file_path).await {
        Ok(bytes) => bytes_response(
            StatusCode::OK,
            bytes,
            content_type_for(&file_path),
            no_store_path(&file_path),
        ),
        Err(_) => text_response(
            StatusCode::NOT_FOUND,
            "Not found",
            "text/plain; charset=utf-8",
        ),
    }
}

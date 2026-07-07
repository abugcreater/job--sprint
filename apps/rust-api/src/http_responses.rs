use axum::{
    Json,
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

pub(crate) fn json_response(status: StatusCode, payload: Value) -> Response {
    let mut response = (status, Json(payload)).into_response();
    apply_common_headers(response.headers_mut());
    response
}

pub(crate) fn text_response(
    status: StatusCode,
    body: &'static str,
    content_type: &'static str,
) -> Response {
    let mut response = (status, body).into_response();
    apply_common_headers(response.headers_mut());
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
}

pub(crate) fn bytes_response(
    status: StatusCode,
    bytes: Vec<u8>,
    content_type: String,
    no_store: bool,
) -> Response {
    let mut response = (status, bytes).into_response();
    apply_common_headers(response.headers_mut());
    insert_header(response.headers_mut(), header::CONTENT_TYPE, &content_type);
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        if no_store {
            HeaderValue::from_static("no-store")
        } else {
            HeaderValue::from_static("public, max-age=60")
        },
    );
    response
}

pub(crate) fn redirect_response(location: &str) -> Response {
    let mut response = StatusCode::FOUND.into_response();
    apply_common_headers(response.headers_mut());
    insert_header(response.headers_mut(), header::LOCATION, location);
    response
}

pub(crate) fn bad_json(message: String) -> Response {
    json_response(
        StatusCode::BAD_REQUEST,
        json!({ "error": "bad_json", "message": message }),
    )
}

pub(crate) fn internal_error(error: impl std::fmt::Display) -> Response {
    json_response(
        StatusCode::INTERNAL_SERVER_ERROR,
        json!({ "error": "internal_error", "message": error.to_string() }),
    )
}

fn apply_common_headers(headers: &mut HeaderMap) {
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("no-referrer"),
    );
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static("geolocation=(), camera=()"),
    );
}

pub(crate) fn insert_header(headers: &mut HeaderMap, name: HeaderName, value: &str) {
    if let Ok(value) = HeaderValue::from_str(value) {
        headers.insert(name, value);
    }
}

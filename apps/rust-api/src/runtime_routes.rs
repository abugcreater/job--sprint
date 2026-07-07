use axum::{body::Bytes, extract::State, http::HeaderMap, response::Response};
use serde_json::{Map, Value, json};

use crate::AppState;
use crate::auth_state::{
    require_auth, require_write_permission, runtime_response, user_data_scope,
};
use crate::http_responses::{bad_json, internal_error};
use crate::parse_json_body;
use crate::runtime_store::{
    normalize_object, normalize_runtime_payload, read_runtime_state, runtime_to_json,
    write_runtime_item, write_runtime_state,
};

pub(crate) async fn get_runtime(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    let runtime = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    runtime_response(&auth, json!({ "data": runtime_to_json(runtime) }))
}

pub(crate) async fn post_runtime(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_write_permission(&auth) {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let mut runtime = normalize_runtime_payload(payload.get("data").cloned().unwrap_or(payload));
    let existing = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    runtime.progress = merge_progress(existing.progress, runtime.progress);
    if let Err(error) = write_runtime_state(&state.db, &user_data_scope(&auth), &runtime).await {
        return internal_error(error);
    }
    runtime_response(&auth, json!({ "data": runtime_to_json(runtime) }))
}

pub(crate) async fn get_progress(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    let runtime = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    runtime_response(&auth, json!({ "progress": runtime.progress }))
}

pub(crate) async fn post_progress(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_write_permission(&auth) {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let progress = payload
        .get("progress")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or(payload);
    let progress = normalize_object(progress);
    let existing = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let progress = merge_progress(existing.progress, progress);
    if let Err(error) =
        write_runtime_item(&state.db, &user_data_scope(&auth), "progress", &progress).await
    {
        return internal_error(error);
    }
    runtime_response(&auth, json!({ "progress": progress }))
}

pub(crate) async fn get_reviews(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    let runtime = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    runtime_response(&auth, json!({ "reviews": runtime.reviews }))
}

pub(crate) async fn post_reviews(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_write_permission(&auth) {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let reviews = payload
        .get("reviews")
        .filter(|value| value.is_object())
        .cloned()
        .unwrap_or(payload);
    let reviews = normalize_object(reviews);
    if let Err(error) =
        write_runtime_item(&state.db, &user_data_scope(&auth), "reviews", &reviews).await
    {
        return internal_error(error);
    }
    runtime_response(&auth, json!({ "reviews": reviews }))
}

fn merge_progress(existing: Value, incoming: Value) -> Value {
    let mut merged = match existing {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    if let Value::Object(incoming) = incoming {
        for (key, value) in incoming {
            merged.insert(key, value);
        }
    }
    Value::Object(merged)
}

use axum::{
    body::Bytes,
    extract::{Path as AxumPath, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde_json::{Map, Value, json};

use crate::AppState;
use crate::auth_state::{
    require_auth, require_write_permission, runtime_response, runtime_response_status,
    user_data_scope,
};
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::parse_json_body;
use crate::runtime_records::{normalize_record, object_value};
use crate::runtime_store::{read_runtime_state, write_runtime_item};

pub(crate) async fn get_applications(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    let runtime = match read_runtime_state(&state.db, &user_data_scope(&auth)).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    runtime_response(&auth, json!({ "applications": runtime.applications }))
}

pub(crate) async fn post_applications(
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
    let scope = user_data_scope(&auth);
    if let Some(rows) = payload.get("applications").and_then(Value::as_array) {
        let applications = Value::Array(
            rows.iter()
                .filter(|item| item.is_object())
                .cloned()
                .map(|item| normalize_record(item, "app"))
                .collect(),
        );
        if let Err(error) =
            write_runtime_item(&state.db, &scope, "applications", &applications).await
        {
            return internal_error(error);
        }
        return runtime_response(&auth, json!({ "applications": applications }));
    }

    let mut runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let record = normalize_record(payload, "app");
    let mut rows = runtime.applications.as_array().cloned().unwrap_or_default();
    rows.push(record.clone());
    runtime.applications = Value::Array(rows);
    if let Err(error) =
        write_runtime_item(&state.db, &scope, "applications", &runtime.applications).await
    {
        return internal_error(error);
    }
    runtime_response_status(
        &auth,
        StatusCode::CREATED,
        json!({ "application": record, "applications": runtime.applications }),
    )
}

pub(crate) async fn update_application(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(id): AxumPath<String>,
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
        Ok(payload) => object_value(payload),
        Err(message) => return bad_json(message),
    };
    let scope = user_data_scope(&auth);
    let mut runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let mut rows = runtime.applications.as_array().cloned().unwrap_or_default();
    let Some(index) = rows
        .iter()
        .position(|item| item.get("id").and_then(Value::as_str) == Some(id.as_str()))
    else {
        return json_response(
            StatusCode::NOT_FOUND,
            json!({ "error": "application_not_found" }),
        );
    };

    let mut current = match rows[index].clone() {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    if let Value::Object(update) = payload {
        for (key, value) in update {
            current.insert(key, value);
        }
    }
    current.insert("id".to_string(), Value::String(id));
    let updated = Value::Object(current);
    rows[index] = updated.clone();
    runtime.applications = Value::Array(rows);
    if let Err(error) =
        write_runtime_item(&state.db, &scope, "applications", &runtime.applications).await
    {
        return internal_error(error);
    }
    runtime_response(&auth, json!({ "application": updated }))
}

pub(crate) async fn delete_application(
    State(state): State<AppState>,
    headers: HeaderMap,
    AxumPath(id): AxumPath<String>,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_write_permission(&auth) {
        return *response;
    }
    let scope = user_data_scope(&auth);
    let mut runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let rows = runtime.applications.as_array().cloned().unwrap_or_default();
    let next: Vec<Value> = rows
        .iter()
        .filter(|item| item.get("id").and_then(Value::as_str) != Some(id.as_str()))
        .cloned()
        .collect();
    if next.len() == rows.len() {
        return json_response(
            StatusCode::NOT_FOUND,
            json!({ "error": "application_not_found" }),
        );
    }
    runtime.applications = Value::Array(next);
    if let Err(error) =
        write_runtime_item(&state.db, &scope, "applications", &runtime.applications).await
    {
        return internal_error(error);
    }
    runtime_response(&auth, json!({ "applications": runtime.applications }))
}

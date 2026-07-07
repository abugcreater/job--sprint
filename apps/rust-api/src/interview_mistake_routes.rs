use axum::{
    body::Bytes,
    extract::{Path as AxumPath, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde_json::{Value, json};

use crate::AppState;
use crate::auth_state::{
    require_auth, require_write_permission, runtime_response, runtime_response_status,
    user_data_scope,
};
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::parse_json_body;
use crate::runtime_records::normalize_record;
use crate::runtime_store::{read_runtime_state, write_runtime_item};

pub(crate) async fn get_interview_mistakes(
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
    runtime_response(
        &auth,
        json!({ "interviewMistakes": runtime.interview_mistakes }),
    )
}

pub(crate) async fn post_interview_mistakes(
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
    if let Some(rows) = payload.get("interviewMistakes").and_then(Value::as_array) {
        let mistakes = Value::Array(
            rows.iter()
                .filter(|item| item.is_object())
                .cloned()
                .map(|item| normalize_record(item, "mistake"))
                .collect(),
        );
        if let Err(error) =
            write_runtime_item(&state.db, &scope, "interview_mistakes", &mistakes).await
        {
            return internal_error(error);
        }
        return runtime_response(&auth, json!({ "interviewMistakes": mistakes }));
    }

    let mut runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let record = normalize_record(payload, "mistake");
    let mut rows = runtime
        .interview_mistakes
        .as_array()
        .cloned()
        .unwrap_or_default();
    rows.insert(0, record.clone());
    runtime.interview_mistakes = Value::Array(rows);
    if let Err(error) = write_runtime_item(
        &state.db,
        &scope,
        "interview_mistakes",
        &runtime.interview_mistakes,
    )
    .await
    {
        return internal_error(error);
    }
    runtime_response_status(
        &auth,
        StatusCode::CREATED,
        json!({ "interviewMistake": record, "interviewMistakes": runtime.interview_mistakes }),
    )
}

pub(crate) async fn delete_interview_mistake(
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
    let rows = runtime
        .interview_mistakes
        .as_array()
        .cloned()
        .unwrap_or_default();
    let next: Vec<Value> = rows
        .iter()
        .filter(|item| item.get("id").and_then(Value::as_str) != Some(id.as_str()))
        .cloned()
        .collect();
    if next.len() == rows.len() {
        return json_response(
            StatusCode::NOT_FOUND,
            json!({ "error": "interview_mistake_not_found" }),
        );
    }
    runtime.interview_mistakes = Value::Array(next);
    if let Err(error) = write_runtime_item(
        &state.db,
        &scope,
        "interview_mistakes",
        &runtime.interview_mistakes,
    )
    .await
    {
        return internal_error(error);
    }
    runtime_response(
        &auth,
        json!({ "interviewMistakes": runtime.interview_mistakes }),
    )
}

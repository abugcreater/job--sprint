mod metrics;
mod narrative;
mod report;
mod window;

use axum::{
    body::Bytes,
    extract::{Query, State},
    http::HeaderMap,
    response::Response,
};
use chrono::Utc;
use serde_json::{Map, Value, json};
use std::collections::HashMap;

use crate::AppState;
use crate::auth_state::{
    now_millis, require_auth, require_permission, require_write_permission, runtime_response,
    user_data_scope,
};
use crate::http_responses::{bad_json, internal_error};
use crate::llm_feedback::list_llm_feedback;
use crate::parse_json_body;
use crate::runtime_store::{read_runtime_state, write_runtime_item};
use report::{build_coach_outcome_report, outcome_snapshots};

pub(crate) async fn get_coach_outcomes(
    State(state): State<AppState>,
    Query(query): Query<HashMap<String, String>>,
    headers: HeaderMap,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "ai:use") {
        return *response;
    }
    let scope = user_data_scope(&auth);
    let runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let feedback = match list_llm_feedback(&state.db, &scope, 50).await {
        Ok(feedback) => feedback,
        Err(error) => return internal_error(error),
    };
    let outcome = build_coach_outcome_report(&runtime.progress, &feedback, query.get("date"));
    runtime_response(
        &auth,
        json!({
            "outcome": outcome,
            "snapshots": outcome_snapshots(&runtime.progress)
        }),
    )
}

pub(crate) async fn record_coach_outcome(
    State(state): State<AppState>,
    Query(query): Query<HashMap<String, String>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "ai:use") {
        return *response;
    }
    if let Err(response) = require_write_permission(&auth) {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let scope = user_data_scope(&auth);
    let runtime = match read_runtime_state(&state.db, &scope).await {
        Ok(runtime) => runtime,
        Err(error) => return internal_error(error),
    };
    let feedback = match list_llm_feedback(&state.db, &scope, 50).await {
        Ok(feedback) => feedback,
        Err(error) => return internal_error(error),
    };
    let date = text(&payload, "date").or_else(|| query.get("date").cloned());
    let mut snapshot = build_coach_outcome_report(&runtime.progress, &feedback, date.as_ref());
    if let Some(object) = snapshot.as_object_mut() {
        object.insert(
            "id".to_string(),
            json!(
                text(&payload, "id").unwrap_or_else(|| format!("coach-outcome-{}", now_millis()))
            ),
        );
        object.insert("createdAt".to_string(), json!(Utc::now().to_rfc3339()));
    }
    let mut snapshots = vec![snapshot.clone()];
    snapshots.extend(outcome_snapshots(&runtime.progress));
    snapshots.truncate(20);

    let mut progress = object_value(runtime.progress);
    progress.insert(
        "coachOutcomeSnapshots".to_string(),
        Value::Array(snapshots.clone()),
    );
    if let Err(error) =
        write_runtime_item(&state.db, &scope, "progress", &Value::Object(progress)).await
    {
        return internal_error(error);
    }
    runtime_response(
        &auth,
        json!({
            "outcome": snapshot,
            "snapshots": snapshots
        }),
    )
}

fn object_value(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

fn text(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

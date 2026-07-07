use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Response,
};

use crate::AppState;
use crate::auth_state::{now_millis, require_auth, require_permission, user_data_scope};
use crate::coach_boundary_feedback::{
    boundary_feedback_from_payload, insert_boundary_feedback, list_boundary_feedback,
};
use crate::coach_boundary_feedback_summary::summarize_boundary_feedback;
use crate::coach_boundary_provider::generate_boundary_suggestions_payload;
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::parse_json_body;

pub(crate) async fn generate_boundary_suggestions(headers: HeaderMap, body: Bytes) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "ai:use") {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    match generate_boundary_suggestions_payload(
        &payload,
        format!("boundary-suggestion-{}", now_millis()),
    )
    .await
    {
        Ok(payload) => json_response(StatusCode::OK, payload),
        Err(payload) => json_response(StatusCode::BAD_REQUEST, payload),
    }
}

pub(crate) async fn record_boundary_feedback(
    State(state): State<AppState>,
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
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    let feedback = match boundary_feedback_from_payload(
        format!("boundary-feedback-{}", now_millis()),
        &payload,
    ) {
        Ok(feedback) => feedback,
        Err(payload) => return json_response(StatusCode::BAD_REQUEST, payload),
    };
    if let Err(error) =
        insert_boundary_feedback(&state.db, &user_data_scope(&auth), &feedback).await
    {
        return internal_error(error);
    }
    let all_feedback = match list_boundary_feedback(&state.db, &user_data_scope(&auth), 100).await {
        Ok(feedback) => feedback,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "feedback": feedback,
            "summary": summarize_boundary_feedback(&all_feedback)
        }),
    )
}

pub(crate) async fn get_boundary_feedback(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "ai:use") {
        return *response;
    }
    let feedback = match list_boundary_feedback(&state.db, &user_data_scope(&auth), 100).await {
        Ok(feedback) => feedback,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "summary": summarize_boundary_feedback(&feedback),
            "feedback": feedback
        }),
    )
}

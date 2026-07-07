use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::Response,
};
use std::env;

use crate::AppState;
use crate::ai_tools::{generate_kb_payload, score_answer_payload};
use crate::ai_transcribe::transcribe_upload_response;
use crate::auth_state::{now_millis, require_auth, require_permission, user_data_scope};
use crate::coach_ai_provider::generate_coach_artifacts_payload;
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::llm_feedback::{coach_feedback_from_payload, insert_llm_feedback, list_llm_feedback};
use crate::llm_feedback_summary::summarize_llm_feedback;
use crate::llm_runs::{coach_llm_run_from_response, insert_llm_run, list_llm_runs};
use crate::parse_json_body;

pub(crate) async fn score_answer(headers: HeaderMap, body: Bytes) -> Response {
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
    match score_answer_payload(&payload) {
        Ok(payload) => json_response(StatusCode::OK, payload),
        Err((status, payload)) => json_response(status, payload),
    }
}

pub(crate) async fn generate_kb(headers: HeaderMap, body: Bytes) -> Response {
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
    let response = generate_kb_payload(
        &payload,
        format!("generated-{}", now_millis()),
        env::var("ANTHROPIC_BASE_URL").is_ok(),
    );
    json_response(StatusCode::OK, response)
}

pub(crate) async fn generate_coach_artifacts(
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
    let profile_id = payload
        .get("profile")
        .and_then(|profile| profile.get("id"))
        .and_then(|id| id.as_str())
        .map(ToString::to_string);
    match generate_coach_artifacts_payload(&payload, format!("artifact-{}", now_millis())).await {
        Ok(mut response_payload) => {
            let run = coach_llm_run_from_response(
                format!("llm-run-{}", now_millis()),
                profile_id.as_deref(),
                &response_payload,
            );
            if let Err(error) = insert_llm_run(&state.db, &user_data_scope(&auth), &run).await {
                return internal_error(error);
            }
            if let Some(object) = response_payload.as_object_mut() {
                object.insert("llmRun".to_string(), run);
            }
            json_response(StatusCode::OK, response_payload)
        }
        Err(payload) => json_response(StatusCode::BAD_REQUEST, payload),
    }
}

pub(crate) async fn get_coach_llm_runs(
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
    let runs = match list_llm_runs(&state.db, &user_data_scope(&auth), 50).await {
        Ok(runs) => runs,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "runs": runs
        }),
    )
}

pub(crate) async fn record_coach_feedback(
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
    let feedback = match coach_feedback_from_payload(format!("feedback-{}", now_millis()), &payload)
    {
        Ok(feedback) => feedback,
        Err(payload) => return json_response(StatusCode::BAD_REQUEST, payload),
    };
    if let Err(error) = insert_llm_feedback(&state.db, &user_data_scope(&auth), &feedback).await {
        return internal_error(error);
    }
    let summary = match list_llm_feedback(&state.db, &user_data_scope(&auth), 50).await {
        Ok(feedback) => summarize_llm_feedback(&feedback),
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "feedback": feedback,
            "summary": summary
        }),
    )
}

pub(crate) async fn get_coach_feedback(
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
    let feedback = match list_llm_feedback(&state.db, &user_data_scope(&auth), 50).await {
        Ok(feedback) => feedback,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "summary": summarize_llm_feedback(&feedback),
            "feedback": feedback
        }),
    )
}

pub(crate) async fn transcribe(headers: HeaderMap, body: Bytes) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "ai:use") {
        return *response;
    }
    let max_bytes = env::var("ASR_MAX_AUDIO_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(8 * 1024 * 1024);
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let provider = env::var("ASR_PROVIDER")
        .unwrap_or_else(|_| "none".to_string())
        .to_ascii_lowercase();
    let (status, payload) = transcribe_upload_response(&body, content_type, max_bytes, &provider);
    json_response(status, payload)
}

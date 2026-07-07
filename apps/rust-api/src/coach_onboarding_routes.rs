use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Response,
};

use crate::AppState;
use crate::auth_state::{
    auth_has_permission, now_millis, require_auth, require_permission, user_data_scope,
};
use crate::coach_onboarding_event_summary::summarize_coach_onboarding_events;
use crate::coach_onboarding_events::{
    coach_onboarding_event_from_payload, insert_coach_onboarding_event,
    list_coach_onboarding_events,
};
use crate::coach_onboarding_report::coach_onboarding_report;
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::parse_json_body;
use uuid::Uuid;

pub(crate) async fn record_coach_onboarding_event(
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
    let event = match coach_onboarding_event_from_payload(
        format!(
            "onboarding-event-{}-{}",
            now_millis(),
            Uuid::new_v4().simple()
        ),
        &payload,
    ) {
        Ok(event) => event,
        Err(payload) => return json_response(StatusCode::BAD_REQUEST, payload),
    };
    if let Err(error) =
        insert_coach_onboarding_event(&state.db, &user_data_scope(&auth), &event).await
    {
        return internal_error(error);
    }
    let events = match list_coach_onboarding_events(&state.db, &user_data_scope(&auth), 50).await {
        Ok(events) => events,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "event": event,
            "summary": summarize_coach_onboarding_events(&events)
        }),
    )
}

pub(crate) async fn get_coach_onboarding_events(
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
    let events = match list_coach_onboarding_events(&state.db, &user_data_scope(&auth), 50).await {
        Ok(events) => events,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "summary": summarize_coach_onboarding_events(&events),
            "events": events
        }),
    )
}

pub(crate) async fn get_coach_onboarding_report(
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
    let scope = user_data_scope(&auth);
    let users = if auth_has_permission(&auth, "*") {
        auth.config.users.clone()
    } else {
        auth.config
            .users
            .iter()
            .filter(|user| user.data_scope == scope)
            .cloned()
            .collect()
    };
    let report = match coach_onboarding_report(&state.db, &users).await {
        Ok(report) => report,
        Err(error) => return internal_error(error),
    };
    json_response(
        StatusCode::OK,
        serde_json::json!({
            "ok": true,
            "summary": report["summary"],
            "batches": report["batches"],
            "users": report["users"]
        }),
    )
}

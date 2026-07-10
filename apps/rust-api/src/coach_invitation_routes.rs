use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde_json::{Value, json};

use crate::AppState;
use crate::auth_account_actions::{
    account_audit_events_for_management, user_accounts_for_management,
};
use crate::auth_account_store::{
    account_provisioning_capability, provision_user_account_from_invitation,
};
use crate::auth_config::UserConfig;
use crate::auth_config::get_auth_config;
use crate::auth_state::{now_millis, require_auth, require_permission, user_username};
use crate::coach_invitations::{
    coach_invitation_from_payload, list_coach_invitations, summarize_coach_invitations,
    upsert_coach_invitation,
};
use crate::http_responses::{bad_json, internal_error, json_response};
use crate::parse_json_body;

pub(crate) async fn get_coach_invitations(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "*") {
        return *response;
    }
    let invitations = match list_coach_invitations(&state.db).await {
        Ok(invitations) => invitations,
        Err(error) => return internal_error(error),
    };
    invitations_response(&get_auth_config().users, invitations)
}

pub(crate) async fn record_coach_invitation(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "*") {
        return *response;
    }
    let payload = match parse_json_body(body) {
        Ok(payload) => payload,
        Err(message) => return bad_json(message),
    };
    if payload.get("operation").and_then(Value::as_str) == Some("account-status") {
        return crate::coach_invitation_action_routes::update_invitation_account_status_response(
            &state,
            &payload,
            &user_username(&auth),
        )
        .await;
    }
    if payload.get("operation").and_then(Value::as_str) == Some("account-batch-status") {
        return crate::coach_invitation_action_routes::update_invitation_account_batch_status_response(
            &state,
            &payload,
            &user_username(&auth),
        )
        .await;
    }
    if payload.get("operation").and_then(Value::as_str) == Some("notification-draft") {
        return crate::coach_invitation_action_routes::generate_invitation_notifications_response(
            &state, &payload,
        )
        .await;
    }
    if payload.get("operation").and_then(Value::as_str) == Some("batch-status") {
        return crate::coach_invitation_action_routes::update_invitation_batch_status_response(
            &state, &payload,
        )
        .await;
    }
    if payload.get("operation").and_then(Value::as_str) == Some("bulk-import") {
        return crate::coach_invitation_import_routes::import_coach_invitations_response(
            &state, &payload,
        )
        .await;
    }
    let mut invitation =
        match coach_invitation_from_payload(format!("coach-invite-{}", now_millis()), &payload) {
            Ok(invitation) => invitation,
            Err(payload) => return json_response(StatusCode::BAD_REQUEST, payload),
        };
    let should_provision = payload
        .get("provisionAccount")
        .and_then(Value::as_bool)
        .unwrap_or(false)
        || payload
            .get("password")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_some();
    let mut account_provisioning = account_provisioning_capability();
    if should_provision {
        match provision_user_account_from_invitation(
            &merge_invitation_payload(&payload, &invitation),
            &user_username(&auth),
        ) {
            Ok(result) => {
                account_provisioning = result;
                invitation["status"] = Value::String("active".to_string());
            }
            Err((status, result)) => {
                return json_response(
                    status,
                    json!({
                        "ok": false,
                        "error": result.get("error").or_else(|| result.get("reason")).and_then(Value::as_str).unwrap_or("account_provisioning_failed"),
                        "accountProvisioning": result
                    }),
                );
            }
        }
    }
    if let Err(error) = upsert_coach_invitation(&state.db, &invitation).await {
        return internal_error(error);
    }
    let invitations = match list_coach_invitations(&state.db).await {
        Ok(invitations) => invitations,
        Err(error) => return internal_error(error),
    };
    let mut response = response_value(&get_auth_config().users, invitations);
    response["invitation"] = invitation;
    response["accountProvisioning"] = account_provisioning;
    json_response(StatusCode::OK, response)
}

fn invitations_response(users: &[UserConfig], invitations: Vec<Value>) -> Response {
    json_response(StatusCode::OK, response_value(users, invitations))
}

pub(crate) fn response_value(users: &[UserConfig], invitations: Vec<Value>) -> Value {
    let summary = summarize_coach_invitations(&invitations);
    json!({
        "ok": true,
        "storage": "sqlite",
        "invitations": invitations,
        "configuredUsers": configured_users(users),
        "accountAuditEvents": account_audit_events_for_management(),
        "summary": summary,
        "accountProvisioning": account_provisioning_capability()
    })
}

fn configured_users(users: &[UserConfig]) -> Vec<Value> {
    if let Some(users) = user_accounts_for_management() {
        return users;
    }
    users
        .iter()
        .map(|user| {
            json!({
                "username": user.username,
                "displayName": user.display_name,
                "dataScope": user.data_scope,
                "inviteBatch": user.invite_batch,
                "role": user.role,
                "disabled": false,
                "canLogin": true
            })
        })
        .collect()
}

fn merge_invitation_payload(payload: &Value, invitation: &Value) -> Value {
    let mut object = payload.as_object().cloned().unwrap_or_default();
    if let Some(invitation_object) = invitation.as_object() {
        for (key, value) in invitation_object {
            object.entry(key.clone()).or_insert_with(|| value.clone());
        }
    }
    Value::Object(object)
}

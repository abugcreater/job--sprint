use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::AppState;
use crate::auth_account_actions::update_user_account_status;
use crate::auth_account_batch_actions::update_user_account_batch_status;
use crate::auth_config::get_auth_config;
use crate::auth_state::{require_auth, require_permission};
use crate::coach_invitation_notifications::invitation_notification_action;
use crate::coach_invitation_routes::response_value;
use crate::coach_invitations::{
    delete_coach_invitation, list_coach_invitations, update_coach_invitation_batch_status,
};
use crate::http_responses::{internal_error, json_response};

pub(crate) async fn delete_coach_invitation_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    let auth = match require_auth(&headers) {
        Ok(auth) => auth,
        Err(response) => return *response,
    };
    if let Err(response) = require_permission(&auth, "*") {
        return *response;
    }
    let username = params
        .get("username")
        .map(String::as_str)
        .unwrap_or("")
        .trim();
    let removed_count = match delete_coach_invitation(&state.db, username).await {
        Ok(count) => count,
        Err(error) => return internal_error(error),
    };
    let mut response = match invitations_response(&state).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    response["deletion"] = json!({
        "status": if removed_count > 0 { "PASS" } else { "USER_ACTION_REQUIRED" },
        "username": username,
        "removedCount": removed_count,
        "message": if removed_count > 0 {
            format!("已删除 {username} 的邀请记录；登录账号不会被自动删除。")
        } else {
            "没有找到可删除的邀请记录。".to_string()
        }
    });
    json_response(
        if removed_count > 0 {
            StatusCode::OK
        } else {
            StatusCode::NOT_FOUND
        },
        response,
    )
}

pub(crate) async fn update_invitation_batch_status_response(
    state: &AppState,
    payload: &Value,
) -> Response {
    let invite_batch = text(payload, "inviteBatch");
    let status = text(payload, "status");
    if invite_batch.is_empty() || !is_valid_invitation_status(&status) {
        return batch_response(state, &invite_batch, &status, 0, StatusCode::BAD_REQUEST).await;
    }
    let affected_count =
        match update_coach_invitation_batch_status(&state.db, &invite_batch, &status).await {
            Ok(count) => count,
            Err(error) => return internal_error(error),
        };
    let code = if affected_count > 0 {
        StatusCode::OK
    } else {
        StatusCode::BAD_REQUEST
    };
    batch_response(state, &invite_batch, &status, affected_count, code).await
}

pub(crate) async fn update_invitation_account_status_response(
    state: &AppState,
    payload: &Value,
) -> Response {
    let account_action = match update_user_account_status(payload) {
        Ok(value) => value,
        Err((status, value)) => {
            return json_response(
                status,
                json!({
                    "ok": false,
                    "error": value.get("error").or_else(|| value.get("reason")).and_then(Value::as_str).unwrap_or("account_action_failed"),
                    "accountAction": value
                }),
            );
        }
    };
    let mut response = match invitations_response(state).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    response["accountAction"] = account_action;
    json_response(StatusCode::OK, response)
}

pub(crate) async fn update_invitation_account_batch_status_response(
    state: &AppState,
    payload: &Value,
) -> Response {
    let account_batch_action = match update_user_account_batch_status(payload) {
        Ok(value) => value,
        Err((status, value)) => {
            return json_response(
                status,
                json!({
                    "ok": false,
                    "error": value.get("error").or_else(|| value.get("reason")).and_then(Value::as_str).unwrap_or("account_batch_action_failed"),
                    "accountBatchAction": value
                }),
            );
        }
    };
    let mut response = match invitations_response(state).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    response["accountBatchAction"] = account_batch_action;
    json_response(StatusCode::OK, response)
}

pub(crate) async fn generate_invitation_notifications_response(
    state: &AppState,
    payload: &Value,
) -> Response {
    let mut response = match invitations_response(state).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let configured_users = response
        .get("configuredUsers")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let invitations = response
        .get("invitations")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let notification_action =
        invitation_notification_action(&configured_users, &invitations, payload);
    let code = if notification_action.get("status").and_then(Value::as_str) == Some("PASS") {
        StatusCode::OK
    } else {
        StatusCode::BAD_REQUEST
    };
    response["notificationAction"] = notification_action;
    json_response(code, response)
}

async fn batch_response(
    state: &AppState,
    invite_batch: &str,
    status: &str,
    affected_count: i64,
    code: StatusCode,
) -> Response {
    let mut response = match invitations_response(state).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    response["batchAction"] = json!({
        "status": if affected_count > 0 { "PASS" } else { "USER_ACTION_REQUIRED" },
        "inviteBatch": invite_batch,
        "nextStatus": status,
        "affectedCount": affected_count,
        "message": if affected_count > 0 {
            format!("已更新 {affected_count} 条 {invite_batch} 批次邀请状态。")
        } else if invite_batch.is_empty() || !is_valid_invitation_status(status) {
            "批次状态更新需要有效批次和状态。".to_string()
        } else {
            "没有找到可更新的邀请批次。".to_string()
        }
    });
    json_response(code, response)
}

async fn invitations_response(state: &AppState) -> Result<Value, Response> {
    list_coach_invitations(&state.db)
        .await
        .map(|invitations| response_value(&get_auth_config().users, invitations))
        .map_err(internal_error)
}

fn is_valid_invitation_status(status: &str) -> bool {
    matches!(status, "draft" | "invited" | "active" | "paused")
}

fn text(payload: &Value, field: &str) -> String {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("")
        .to_string()
}

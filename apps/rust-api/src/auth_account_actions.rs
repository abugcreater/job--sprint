use axum::http::StatusCode;
use serde_json::{Value, json};
use std::{env, path::PathBuf};

use crate::auth_account_store::account_provisioning_capability;
use crate::auth_account_users_file::{read_users_config, write_users_config};

const USERNAME_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";

pub(crate) fn user_accounts_for_management() -> Option<Vec<Value>> {
    let capability = account_provisioning_capability();
    if capability.get("enabled").and_then(Value::as_bool) != Some(true) {
        return None;
    }
    let users_file = PathBuf::from(env::var("JOB_SPRINT_USERS_FILE").ok()?);
    let (_, users, _) = read_users_config(&users_file).ok()?;
    Some(
        users
            .iter()
            .filter(|user| !text(user, "username").is_empty())
            .map(|user| {
                let username = text(user, "username");
                let disabled = user
                    .get("disabled")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                json!({
                    "username": username,
                    "displayName": text_or(user, "displayName", &username),
                    "dataScope": text_or(user, "dataScope", &username),
                    "inviteBatch": text_or(user, "inviteBatch", "default"),
                    "role": text_or(user, "role", "coach"),
                    "disabled": disabled,
                    "canLogin": !disabled
                })
            })
            .collect(),
    )
}

pub(crate) fn update_user_account_status(payload: &Value) -> Result<Value, (StatusCode, Value)> {
    let capability = account_provisioning_capability();
    if capability.get("enabled").and_then(Value::as_bool) != Some(true) {
        return Err((
            StatusCode::CONFLICT,
            json!({
                "status": "USER_ACTION_REQUIRED",
                "enabled": false,
                "reason": capability.get("reason").and_then(Value::as_str).unwrap_or("users_file_missing"),
                "message": capability.get("message").and_then(Value::as_str).unwrap_or("未配置账号文件。")
            }),
        ));
    }
    let username = text(payload, "username");
    let action = text(payload, "action");
    if !valid_username(&username) || !matches!(action.as_str(), "disable" | "enable" | "delete") {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "USER_ACTION_REQUIRED",
                "username": username,
                "action": action,
                "message": "账号动作需要有效登录名和 disable、enable 或 delete。"
            }),
        ));
    }
    update_user_in_file(&username, &action)
}

fn update_user_in_file(username: &str, action: &str) -> Result<Value, (StatusCode, Value)> {
    let users_file = PathBuf::from(env::var("JOB_SPRINT_USERS_FILE").unwrap_or_default());
    let (raw_config, mut users, was_array) = read_users_config(&users_file).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "FAIL", "error": "users_file_unreadable", "message": message}),
        )
    })?;
    let Some(index) = users
        .iter()
        .position(|user| text(user, "username") == username)
    else {
        return Err((
            StatusCode::NOT_FOUND,
            json!({
                "status": "USER_ACTION_REQUIRED",
                "username": username,
                "action": action,
                "message": "没有找到可操作的登录账号。"
            }),
        ));
    };
    if text(&users[index], "role") == "owner" {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "USER_ACTION_REQUIRED",
                "username": username,
                "action": action,
                "message": "owner 或当前登录账号不能在邀请后台禁用或删除。"
            }),
        ));
    }
    if action == "delete" {
        users.remove(index);
    } else if let Some(object) = users[index].as_object_mut() {
        object.insert("disabled".to_string(), Value::Bool(action == "disable"));
    }
    write_users_config(&users_file, raw_config, users, was_array).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "FAIL", "error": "users_file_unwritable", "message": message}),
        )
    })?;
    Ok(json!({
        "status": "PASS",
        "enabled": true,
        "username": username,
        "action": action,
        "disabled": action == "disable",
        "removedCount": if action == "delete" { 1 } else { 0 },
        "message": action_message(action, username)
    }))
}

fn valid_username(username: &str) -> bool {
    (2..=64).contains(&username.len()) && username.chars().all(|item| USERNAME_CHARS.contains(item))
}

fn action_message(action: &str, username: &str) -> String {
    match action {
        "disable" => format!("已禁用 {username} 的登录账号。"),
        "enable" => format!("已恢复 {username} 的登录账号。"),
        _ => format!("已删除 {username} 的登录账号。"),
    }
}

fn text(payload: &Value, field: &str) -> String {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("")
        .to_string()
}

fn text_or(payload: &Value, field: &str, default: &str) -> String {
    let value = text(payload, field);
    if value.is_empty() {
        default.to_string()
    } else {
        value
    }
}

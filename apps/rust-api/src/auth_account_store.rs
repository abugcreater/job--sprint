use axum::http::StatusCode;
use serde_json::{Value, json};
use std::{env, path::PathBuf};

use crate::auth_account_users_file::{read_users_config, write_users_config};
use crate::auth_hash::sha256_hex;

const USERNAME_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";

pub(crate) fn account_provisioning_capability() -> Value {
    if !env::var("JOB_SPRINT_USERS_JSON")
        .unwrap_or_default()
        .trim()
        .is_empty()
    {
        return json!({
            "enabled": false,
            "reason": "users_json_takes_precedence",
            "message": "当前认证使用 JOB_SPRINT_USERS_JSON，不能从页面写入账号。"
        });
    }
    let users_file = env::var("JOB_SPRINT_USERS_FILE").unwrap_or_default();
    if users_file.trim().is_empty() {
        return json!({
            "enabled": false,
            "reason": "users_file_missing",
            "message": "未配置 JOB_SPRINT_USERS_FILE，邀请台账不会创建登录账号。"
        });
    }
    json!({
        "enabled": true,
        "reason": "users_file_configured"
    })
}

pub(crate) fn provision_user_account_from_invitation(
    payload: &Value,
) -> Result<Value, (StatusCode, Value)> {
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
    let password = text(payload, "password");
    let account_role = text(payload, "accountRole");
    if !valid_username(&username) {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "FAIL",
                "error": "invalid_username",
                "message": "登录名只能包含字母、数字、点、下划线或连字符，长度 2-64。"
            }),
        ));
    }
    if password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "FAIL",
                "error": "password_too_short",
                "message": "登录密码至少 8 位。"
            }),
        ));
    }
    if account_role == "owner" {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "FAIL",
                "error": "owner_account_role_forbidden",
                "message": "邀请账号不能开通 owner 权限；owner 账号只能通过服务端配置。"
            }),
        ));
    }
    if !account_role.is_empty() && !valid_account_role(&account_role) {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "status": "FAIL",
                "error": "invalid_account_role",
                "message": "邀请账号角色只能是 coach 或 viewer。"
            }),
        ));
    }

    let users_file = PathBuf::from(env::var("JOB_SPRINT_USERS_FILE").unwrap_or_default());
    let (raw_config, mut users, was_array) = read_users_config(&users_file).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({
                "status": "FAIL",
                "error": "users_file_unreadable",
                "message": message
            }),
        )
    })?;
    let next_user = user_from_invitation(payload, &password);
    let index = users
        .iter()
        .position(|user| text(user, "username") == username);
    let action = if let Some(index) = index {
        users[index] = merge_user(&users[index], &next_user);
        "password_reset"
    } else {
        users.push(next_user);
        "created"
    };
    write_users_config(&users_file, raw_config, users, was_array).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({
                "status": "FAIL",
                "error": "users_file_unwritable",
                "message": message
            }),
        )
    })?;

    Ok(json!({
        "status": "PASS",
        "enabled": true,
        "action": action,
        "username": username,
        "role": role_from_payload(payload),
        "dataScope": text_or(payload, "dataScope", &username),
        "inviteBatch": text_or(payload, "inviteBatch", "default"),
        "canLogin": true,
        "message": if action == "created" { "登录账号已开通。" } else { "登录密码已重置。" }
    }))
}

fn user_from_invitation(payload: &Value, password: &str) -> Value {
    let username = text(payload, "username");
    json!({
        "username": username,
        "displayName": text_or(payload, "displayName", &username),
        "role": role_from_payload(payload),
        "dataScope": text_or(payload, "dataScope", &username),
        "inviteBatch": text_or(payload, "inviteBatch", "default"),
        "passwordHash": sha256_hex(password),
        "permissions": []
    })
}

fn merge_user(existing: &Value, next: &Value) -> Value {
    let mut object = existing.as_object().cloned().unwrap_or_default();
    if let Some(next_object) = next.as_object() {
        for (key, value) in next_object {
            object.insert(key.clone(), value.clone());
        }
    }
    Value::Object(object)
}

fn role_from_payload(payload: &Value) -> String {
    match text(payload, "accountRole").as_str() {
        "viewer" => "viewer".to_string(),
        _ => "coach".to_string(),
    }
}

fn valid_username(username: &str) -> bool {
    (2..=64).contains(&username.len()) && username.chars().all(|item| USERNAME_CHARS.contains(item))
}

fn valid_account_role(role: &str) -> bool {
    role == "coach" || role == "viewer"
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

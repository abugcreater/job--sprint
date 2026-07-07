use axum::http::StatusCode;
use serde_json::{Value, json};
use std::{collections::BTreeSet, env, path::PathBuf};

use crate::auth_account_store::account_provisioning_capability;
use crate::auth_account_users_file::{read_users_config, write_users_config};

const USERNAME_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";

pub(crate) fn update_user_account_batch_status(
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
    let action = text(payload, "action");
    if !matches!(action.as_str(), "disable" | "enable" | "delete") {
        return Err(invalid_batch_action(&action));
    }
    let users_file = PathBuf::from(env::var("JOB_SPRINT_USERS_FILE").unwrap_or_default());
    let (raw_config, mut users, was_array) = read_users_config(&users_file).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "FAIL", "error": "users_file_unreadable", "message": message}),
        )
    })?;
    let requested = requested_usernames(payload, &users);
    if requested.is_empty() || requested.iter().any(|username| !valid_username(username)) {
        return Err(invalid_batch_action(&action));
    }
    let mut affected = BTreeSet::new();
    let mut skipped_users = Vec::new();
    for username in &requested {
        let Some(user) = users
            .iter()
            .find(|user| text(user, "username") == *username)
        else {
            skipped_users.push(json!({"username": username, "reason": "not_found"}));
            continue;
        };
        if text(user, "role") == "owner" {
            skipped_users.push(json!({"username": username, "reason": "protected_account"}));
            continue;
        }
        affected.insert(username.clone());
    }
    if affected.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            batch_action_value(&action, requested.len(), 0, skipped_users),
        ));
    }
    if action == "delete" {
        users.retain(|user| !affected.contains(&text(user, "username")));
    } else {
        for user in &mut users {
            if affected.contains(&text(user, "username"))
                && let Some(object) = user.as_object_mut()
            {
                object.insert("disabled".to_string(), Value::Bool(action == "disable"));
            }
        }
    }
    write_users_config(&users_file, raw_config, users, was_array).map_err(|message| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "FAIL", "error": "users_file_unwritable", "message": message}),
        )
    })?;
    Ok(batch_action_value(
        &action,
        requested.len(),
        affected.len(),
        skipped_users,
    ))
}

fn requested_usernames(payload: &Value, users: &[Value]) -> Vec<String> {
    let names = payload
        .get("usernames")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToString::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if !names.is_empty() {
        return names
            .into_iter()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .take(100)
            .collect();
    }
    let invite_batch = text(payload, "inviteBatch");
    if invite_batch.is_empty() {
        return vec![];
    }
    users
        .iter()
        .filter(|user| text(user, "inviteBatch") == invite_batch)
        .map(|user| text(user, "username"))
        .filter(|item| !item.is_empty())
        .take(100)
        .collect()
}

fn invalid_batch_action(action: &str) -> (StatusCode, Value) {
    (
        StatusCode::BAD_REQUEST,
        json!({
            "status": "USER_ACTION_REQUIRED",
            "action": action,
            "requestedCount": 0,
            "affectedCount": 0,
            "skippedCount": 0,
            "skippedUsers": [],
            "message": "批量账号动作需要有效登录名和 disable、enable 或 delete。"
        }),
    )
}

fn batch_action_value(
    action: &str,
    requested_count: usize,
    affected_count: usize,
    skipped_users: Vec<Value>,
) -> Value {
    let verb = match action {
        "disable" => "禁用",
        "enable" => "恢复",
        _ => "删除",
    };
    json!({
        "status": if affected_count > 0 { "PASS" } else { "USER_ACTION_REQUIRED" },
        "action": action,
        "requestedCount": requested_count,
        "affectedCount": affected_count,
        "skippedCount": skipped_users.len(),
        "skippedUsers": skipped_users,
        "message": if affected_count > 0 {
            format!("已{verb} {affected_count} 个登录账号。")
        } else {
            "没有找到可批量处理的登录账号。".to_string()
        }
    })
}

fn valid_username(username: &str) -> bool {
    (2..=64).contains(&username.len()) && username.chars().all(|item| USERNAME_CHARS.contains(item))
}

fn text(payload: &Value, field: &str) -> String {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("")
        .to_string()
}

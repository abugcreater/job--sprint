use axum::http::StatusCode;
use serde_json::{Value, json};

pub(crate) fn data_scope_conflict(users: &[Value], username: &str, next_user: &Value) -> Option<(StatusCode, Value)> {
    let data_scope = text(next_user, "dataScope");
    let conflicting_username = users.iter().find_map(|user| {
        let existing_username = text(user, "username");
        let existing_data_scope = text_or(user, "dataScope", &existing_username);
        (existing_username != username && existing_data_scope == data_scope).then_some(existing_username)
    })?;
    Some((
        StatusCode::CONFLICT,
        json!({
            "status": "USER_ACTION_REQUIRED",
            "error": "data_scope_conflict",
            "username": username,
            "dataScope": data_scope,
            "conflictingUsername": conflicting_username,
            "message": "数据域已被其他登录账号使用；每个邀请账号必须使用独立数据域。"
        }),
    ))
}

fn text(payload: &Value, field: &str) -> String {
    payload.get(field).and_then(Value::as_str).map(str::trim).unwrap_or("").to_string()
}

fn text_or(payload: &Value, field: &str, default: &str) -> String {
    let value = text(payload, field);
    if value.is_empty() { default.to_string() } else { value }
}

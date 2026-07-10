use chrono::Utc;
use serde_json::{Value, json};
use std::{fs, path::PathBuf};

pub(crate) fn account_audit_events_from_config(raw_config: &Value) -> Vec<Value> {
    if raw_config.is_array() {
        return vec![];
    }
    normalize_account_audit_events(raw_config.get("accountAuditEvents"))
}

pub(crate) fn append_account_audit_event(existing_events: &[Value], event: Value) -> Vec<Value> {
    let username = text(&event, "username");
    let affected_usernames = affected_usernames(&event, &username);
    let skipped_users = skipped_users(&event);
    let affected_count = affected_usernames.len();
    let skipped_count = skipped_users.len();
    let next_event = json!({
        "id": format!("account-audit-{}-{}", Utc::now().timestamp_millis(), affected_count),
        "createdAt": Utc::now().to_rfc3339(),
        "actorUsername": text_or(&event, "actorUsername", "system"),
        "action": text(&event, "action"),
        "username": username,
        "role": text(&event, "role"),
        "dataScope": text_or(&event, "dataScope", &text(&event, "username")),
        "inviteBatch": text_or(&event, "inviteBatch", "default"),
        "affectedUsernames": affected_usernames,
        "affectedCount": number_or(&event, "affectedCount", affected_count),
        "requestedCount": number_or(&event, "requestedCount", affected_count),
        "skippedCount": number_or(&event, "skippedCount", skipped_count),
        "skippedUsers": skipped_users,
        "message": text(&event, "message")
    });
    let mut next = vec![next_event];
    next.extend(normalize_account_audit_events(Some(&Value::Array(existing_events.to_vec()))));
    next.truncate(100);
    next
}

pub(crate) fn write_users_config_with_audit(
    path: &PathBuf,
    raw_config: Value,
    users: Vec<Value>,
    account_audit_events: Vec<Value>,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut object = raw_config.as_object().cloned().unwrap_or_default();
    object.insert("users".to_string(), Value::Array(users));
    object.insert(
        "accountAuditEvents".to_string(),
        Value::Array(normalize_account_audit_events(Some(&Value::Array(account_audit_events)))),
    );
    fs::write(
        path,
        serde_json::to_string_pretty(&Value::Object(object)).map_err(|error| error.to_string())?
            + "\n",
    )
    .map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn normalize_account_audit_events(value: Option<&Value>) -> Vec<Value> {
    value
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter(|item| item.is_object() && !text(item, "action").is_empty())
                .map(normalize_account_audit_event)
                .take(100)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn normalize_account_audit_event(item: &Value) -> Value {
    let username = text(item, "username");
    let affected = affected_usernames(item, &username);
    let skipped = skipped_users(item);
    let affected_count = affected.len();
    let skipped_count = skipped.len();
    json!({
        "id": text_or(item, "id", &format!("account-audit-{}-{}", text(item, "action"), username)),
        "createdAt": text(item, "createdAt"),
        "actorUsername": text_or(item, "actorUsername", "system"),
        "action": text(item, "action"),
        "username": username,
        "role": text(item, "role"),
        "dataScope": text_or(item, "dataScope", &username),
        "inviteBatch": text_or(item, "inviteBatch", "default"),
        "affectedUsernames": affected,
        "affectedCount": number_or(item, "affectedCount", affected_count),
        "requestedCount": number_or(item, "requestedCount", affected_count),
        "skippedCount": number_or(item, "skippedCount", skipped_count),
        "skippedUsers": skipped,
        "message": text(item, "message")
    })
}

fn affected_usernames(event: &Value, username: &str) -> Vec<String> {
    event
        .get("affectedUsernames")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToString::to_string)
                .take(100)
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| if username.is_empty() { vec![] } else { vec![username.to_string()] })
}

fn skipped_users(event: &Value) -> Vec<Value> {
    event
        .get("skippedUsers")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let username = text(item, "username");
                    (!username.is_empty())
                        .then(|| json!({"username": username, "reason": text_or(item, "reason", "skipped")}))
                })
                .take(100)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn number_or(payload: &Value, field: &str, fallback: usize) -> usize {
    payload
        .get(field)
        .and_then(Value::as_u64)
        .map(|value| value as usize)
        .unwrap_or(fallback)
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

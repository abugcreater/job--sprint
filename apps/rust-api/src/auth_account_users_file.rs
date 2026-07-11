use serde_json::Value;
use std::{fs, path::PathBuf};

pub(crate) fn read_users_config(path: &PathBuf) -> Result<(Value, Vec<Value>, bool), String> {
    let raw = if path.exists() {
        fs::read_to_string(path).map_err(|error| error.to_string())?
    } else {
        "{\"users\":[]}".to_string()
    };
    let parsed: Value = serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    let was_array = parsed.is_array();
    let users = if was_array {
        parsed.as_array().cloned().unwrap_or_default()
    } else {
        parsed
            .get("users")
            .and_then(Value::as_array)
            .cloned()
            .ok_or_else(|| {
                "JOB_SPRINT_USERS_FILE 必须是数组或包含 users 数组的 JSON。".to_string()
            })?
    };
    Ok((
        parsed,
        users.into_iter().filter(|user| user.is_object()).collect(),
        was_array,
    ))
}

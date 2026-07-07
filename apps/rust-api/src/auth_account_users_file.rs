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

pub(crate) fn write_users_config(
    path: &PathBuf,
    raw_config: Value,
    users: Vec<Value>,
    was_array: bool,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let next = if was_array {
        Value::Array(users)
    } else {
        let mut object = raw_config.as_object().cloned().unwrap_or_default();
        object.insert("users".to_string(), Value::Array(users));
        Value::Object(object)
    };
    fs::write(
        path,
        serde_json::to_string_pretty(&next).map_err(|error| error.to_string())? + "\n",
    )
    .map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

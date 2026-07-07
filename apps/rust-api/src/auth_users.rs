use serde_json::Value;
use std::collections::HashMap;

use crate::auth_hash::{is_hex64, sha256_hex};
use crate::auth_values::{string_array_field, string_field};

pub(crate) const DEFAULT_OWNER_ROLE: &str = "owner";
const GUEST_ROLE: &str = "viewer";

#[derive(Clone, Debug)]
pub(crate) struct UserConfig {
    pub(crate) username: String,
    pub(crate) display_name: String,
    pub(crate) role: String,
    pub(crate) data_scope: String,
    pub(crate) invite_batch: String,
    pub(crate) password_hash: String,
    pub(crate) permissions: Vec<String>,
}

pub(crate) fn disabled_auth_user() -> UserConfig {
    UserConfig {
        username: "auth-disabled".to_string(),
        display_name: "本地免登录".to_string(),
        role: DEFAULT_OWNER_ROLE.to_string(),
        data_scope: "kai".to_string(),
        invite_batch: "default".to_string(),
        password_hash: String::new(),
        permissions: Vec::new(),
    }
}

pub(crate) fn legacy_env_user(username: String, password_hash: String) -> UserConfig {
    UserConfig {
        username: username.clone(),
        display_name: username.clone(),
        role: DEFAULT_OWNER_ROLE.to_string(),
        data_scope: username,
        invite_batch: "default".to_string(),
        password_hash,
        permissions: Vec::new(),
    }
}

pub(crate) fn users_from_config_object(config: &Value) -> Vec<UserConfig> {
    let rows = config
        .as_array()
        .cloned()
        .or_else(|| config.get("users").and_then(Value::as_array).cloned())
        .unwrap_or_default();

    rows.into_iter()
        .filter_map(|row| {
            let object = row.as_object()?;
            let username = string_field(object, "username");
            let role = string_field(object, "role");
            let role = if role.is_empty() {
                if username == "guest" {
                    GUEST_ROLE.to_string()
                } else {
                    DEFAULT_OWNER_ROLE.to_string()
                }
            } else {
                role
            };
            let password_hash = string_field(object, "passwordHash").to_lowercase();
            let password_sha256 = string_field(object, "passwordSha256").to_lowercase();
            let password = string_field(object, "password");
            let effective_password_hash = if !password_hash.is_empty() {
                password_hash
            } else if !password_sha256.is_empty() {
                password_sha256
            } else if !password.is_empty() {
                sha256_hex(&password)
            } else {
                String::new()
            };
            let disabled = object
                .get("disabled")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            if username.is_empty() || !is_hex64(&effective_password_hash) || disabled {
                return None;
            }
            Some(UserConfig {
                display_name: field_or_default(object, "displayName", &username),
                data_scope: field_or_default(object, "dataScope", &username),
                invite_batch: invite_batch(object),
                username,
                role,
                password_hash: effective_password_hash,
                permissions: string_array_field(object, "permissions"),
            })
        })
        .collect()
}

fn invite_batch(object: &serde_json::Map<String, Value>) -> String {
    let value = string_field(object, "inviteBatch");
    if value.is_empty() {
        field_or_default(object, "invitationBatch", "default")
    } else {
        value
    }
}

pub(crate) fn users_by_name(users: &[UserConfig]) -> HashMap<String, UserConfig> {
    users
        .iter()
        .map(|user| (user.username.clone(), user.clone()))
        .collect()
}

pub(crate) fn primary_data_scope(users: &[UserConfig]) -> String {
    users
        .iter()
        .find(|user| user.username == "kai")
        .or_else(|| users.iter().find(|user| user.role == DEFAULT_OWNER_ROLE))
        .or_else(|| users.first())
        .map(|user| user.data_scope.clone())
        .unwrap_or_else(|| "kai".to_string())
}

fn field_or_default(
    object: &serde_json::Map<String, Value>,
    field: &str,
    default_value: &str,
) -> String {
    let value = string_field(object, field);
    if value.is_empty() {
        default_value.to_string()
    } else {
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn users_from_config_object_normalizes_defaults_and_hashes_passwords() {
        let users = users_from_config_object(&json!({
            "users": [
                {
                    "username": "kai",
                    "displayName": "Kai",
                    "inviteBatch": "2026-07-alpha",
                    "password": "secret",
                    "permissions": ["runtime:write"]
                },
                {
                    "username": "guest",
                    "passwordSha256": sha256_hex("guest")
                },
                {
                    "username": "disabled",
                    "password": "secret",
                    "disabled": true
                }
            ]
        }));

        assert_eq!(users.len(), 2);
        assert_eq!(users[0].role, "owner");
        assert_eq!(users[0].display_name, "Kai");
        assert_eq!(users[0].invite_batch, "2026-07-alpha");
        assert_eq!(users[0].password_hash, sha256_hex("secret"));
        assert_eq!(users[0].permissions, vec!["runtime:write"]);
        assert_eq!(users[1].role, "viewer");
    }

    #[test]
    fn primary_data_scope_prefers_kai_then_owner_then_first_user() {
        let users = users_from_config_object(&json!([
            {"username": "guest", "password": "guest"},
            {"username": "kai", "password": "secret", "dataScope": "private-kai"}
        ]));

        assert_eq!(primary_data_scope(&users), "private-kai");
    }
}

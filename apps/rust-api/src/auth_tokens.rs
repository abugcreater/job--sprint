use serde_json::Value;
use std::{collections::HashSet, env, fs};

use crate::auth_hash::{is_hex64, sha256_hex};
use crate::auth_users::UserConfig;
use crate::auth_values::{string_array_field, string_field};

#[derive(Clone, Debug)]
pub(crate) struct BearerToken {
    pub(crate) token_hash: String,
    pub(crate) username: String,
    pub(crate) expires_at: Option<String>,
    pub(crate) permissions: Vec<String>,
}

pub(crate) fn bearer_tokens_from_env(users: &[UserConfig]) -> (Vec<BearerToken>, Option<String>) {
    let raw = match env::var("JOB_SPRINT_BEARER_TOKENS_JSON") {
        Ok(inline) if !inline.is_empty() => Some(Ok(inline)),
        _ => match env::var("JOB_SPRINT_BEARER_TOKENS_FILE") {
            Ok(file) if !file.is_empty() => Some(fs::read_to_string(file)),
            _ => None,
        },
    };
    let Some(raw) = raw else {
        return (Vec::new(), None);
    };
    let raw = match raw {
        Ok(raw) => raw,
        Err(error) => {
            return (
                Vec::new(),
                Some(format!("bearer_tokens_file_unreadable:{}", error.kind())),
            );
        }
    };
    let parsed = match serde_json::from_str::<Value>(&raw) {
        Ok(value) => value,
        Err(error) => {
            return (
                Vec::new(),
                Some(format!("invalid_json:bearer_tokens:{error}")),
            );
        }
    };
    (bearer_tokens_from_value(&parsed, users), None)
}

fn bearer_tokens_from_value(parsed: &Value, users: &[UserConfig]) -> Vec<BearerToken> {
    let rows = parsed
        .as_array()
        .cloned()
        .or_else(|| parsed.get("tokens").and_then(Value::as_array).cloned())
        .unwrap_or_default();
    let known_users: HashSet<String> = users.iter().map(|user| user.username.clone()).collect();
    rows.into_iter()
        .filter_map(|row| {
            let object = row.as_object()?;
            let token_hash = string_field(object, "tokenHash").to_lowercase();
            let sha256 = string_field(object, "sha256").to_lowercase();
            let token = string_field(object, "token");
            let effective_hash = if !token_hash.is_empty() {
                token_hash
            } else if !sha256.is_empty() {
                sha256
            } else if !token.is_empty() {
                sha256_hex(&token)
            } else {
                String::new()
            };
            let username = string_field(object, "username");
            if !is_hex64(&effective_hash) || !known_users.contains(&username) {
                return None;
            }
            Some(BearerToken {
                token_hash: effective_hash,
                username,
                expires_at: object
                    .get("expiresAt")
                    .and_then(Value::as_str)
                    .map(ToString::to_string),
                permissions: string_array_field(object, "permissions"),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth_users::legacy_env_user;
    use serde_json::json;

    #[test]
    fn bearer_tokens_from_value_filters_invalid_and_unknown_users() {
        let users = vec![legacy_env_user("kai".to_string(), sha256_hex("password"))];
        let tokens = bearer_tokens_from_value(
            &json!({
                "tokens": [
                    {
                        "token": "valid-token",
                        "username": "kai",
                        "expiresAt": "2030-01-01T00:00:00Z",
                        "permissions": ["runtime:read"]
                    },
                    {
                        "tokenHash": "not-a-sha",
                        "username": "kai"
                    },
                    {
                        "token": "unknown-user-token",
                        "username": "guest"
                    }
                ]
            }),
            &users,
        );

        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].token_hash, sha256_hex("valid-token"));
        assert_eq!(tokens[0].username, "kai");
        assert_eq!(
            tokens[0].expires_at.as_deref(),
            Some("2030-01-01T00:00:00Z")
        );
        assert_eq!(tokens[0].permissions, vec!["runtime:read"]);
    }
}

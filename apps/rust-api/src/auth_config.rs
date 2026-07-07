use serde_json::Value;
use std::{collections::HashMap, env, fs};

use crate::auth_hash::{is_hex64, sha256_hex};
pub(crate) use crate::auth_tokens::BearerToken;
use crate::auth_tokens::bearer_tokens_from_env;
pub(crate) use crate::auth_users::UserConfig;
use crate::auth_users::{
    disabled_auth_user, legacy_env_user, primary_data_scope, users_by_name,
    users_from_config_object,
};

const MIN_SESSION_SECRET_LENGTH: usize = 32;

#[derive(Clone, Debug)]
pub(crate) struct AuthConfig {
    pub(crate) disabled: bool,
    pub(crate) configured: bool,
    pub(crate) users: Vec<UserConfig>,
    pub(crate) user_map: HashMap<String, UserConfig>,
    pub(crate) bearer_tokens: Vec<BearerToken>,
    pub(crate) session_secret: String,
    pub(crate) config_error: Option<String>,
    pub(crate) data_owner: String,
}

pub(crate) fn get_auth_config() -> AuthConfig {
    if is_auth_disabled() {
        let user = disabled_auth_user();
        return AuthConfig {
            disabled: true,
            configured: true,
            users: vec![user.clone()],
            user_map: users_by_name(std::slice::from_ref(&user)),
            bearer_tokens: Vec::new(),
            session_secret: "auth-disabled".to_string(),
            config_error: None,
            data_owner: "kai".to_string(),
        };
    }

    let session_secret = env::var("JOB_SPRINT_SESSION_SECRET").unwrap_or_default();
    let (users, user_error) = load_configured_users();
    let (bearer_tokens, bearer_error) = bearer_tokens_from_env(&users);
    let configured = !users.is_empty()
        && session_secret.len() >= MIN_SESSION_SECRET_LENGTH
        && user_error.is_none()
        && bearer_error.is_none();
    let data_owner = primary_data_scope(&users);

    AuthConfig {
        disabled: false,
        configured,
        user_map: users_by_name(&users),
        users,
        bearer_tokens,
        session_secret,
        config_error: user_error.or(bearer_error),
        data_owner,
    }
}

fn is_auth_disabled() -> bool {
    env::var("JOB_SPRINT_AUTH_DISABLED")
        .unwrap_or_default()
        .eq_ignore_ascii_case("true")
}

fn load_configured_users() -> (Vec<UserConfig>, Option<String>) {
    if let Ok(inline) = env::var("JOB_SPRINT_USERS_JSON")
        && !inline.is_empty()
    {
        return match serde_json::from_str::<Value>(&inline) {
            Ok(value) => (users_from_config_object(&value), None),
            Err(error) => (
                Vec::new(),
                Some(format!("invalid_json:JOB_SPRINT_USERS_JSON:{error}")),
            ),
        };
    }

    if let Ok(users_file) = env::var("JOB_SPRINT_USERS_FILE")
        && !users_file.is_empty()
    {
        return match fs::read_to_string(&users_file) {
            Ok(raw) => match serde_json::from_str::<Value>(&raw) {
                Ok(value) => (users_from_config_object(&value), None),
                Err(error) => (
                    Vec::new(),
                    Some(format!("invalid_json:JOB_SPRINT_USERS_FILE:{error}")),
                ),
            },
            Err(error) => (
                Vec::new(),
                Some(format!("users_file_unreadable:{}", error.kind())),
            ),
        };
    }

    let user = env::var("JOB_SPRINT_AUTH_USER").unwrap_or_default();
    let password = env::var("JOB_SPRINT_AUTH_PASSWORD").unwrap_or_default();
    let password_hash = env::var("JOB_SPRINT_AUTH_PASSWORD_SHA256").unwrap_or_default();
    let normalized_hash = password_hash.to_lowercase();
    if !password_hash.is_empty() && !is_hex64(&password_hash) {
        return (Vec::new(), Some("invalid_legacy_password_hash".to_string()));
    }
    let effective_password_hash = if !normalized_hash.is_empty() {
        normalized_hash
    } else if !password.is_empty() {
        sha256_hex(&password)
    } else {
        String::new()
    };
    if user.is_empty() || effective_password_hash.is_empty() {
        return (Vec::new(), None);
    }
    (vec![legacy_env_user(user, effective_password_hash)], None)
}

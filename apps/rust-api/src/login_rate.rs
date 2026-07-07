use axum::http::HeaderMap;
use std::{
    collections::HashMap,
    env,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use crate::auth_hash::sha256_hex;

const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS: u64 = 15 * 60 * 1000;
const DEFAULT_LOGIN_RATE_LIMIT_MAX: u32 = 8;

pub(crate) type LoginFailureStore = Arc<Mutex<HashMap<String, LoginFailure>>>;

#[derive(Clone)]
pub(crate) struct LoginFailure {
    count: u32,
    first_at: Instant,
}

pub(crate) struct RateState {
    pub(crate) key: String,
    pub(crate) limited: bool,
    pub(crate) retry_after_seconds: u64,
}

pub(crate) fn new_login_failure_store() -> LoginFailureStore {
    Arc::new(Mutex::new(HashMap::new()))
}

pub(crate) fn state(store: &LoginFailureStore, headers: &HeaderMap, username: &str) -> RateState {
    let key = login_rate_key(headers, username);
    let window = login_rate_limit_window();
    let mut guard = store.lock().expect("login failure mutex poisoned");
    guard.retain(|_, item| item.first_at.elapsed() <= window);
    let attempts = guard.get(&key).map(|item| item.count).unwrap_or(0);
    let retry_after_seconds = guard
        .get(&key)
        .map(|item| {
            let remaining = window.saturating_sub(item.first_at.elapsed());
            remaining.as_secs().max(1)
        })
        .unwrap_or(1);
    RateState {
        key,
        limited: attempts >= login_rate_limit_max(),
        retry_after_seconds,
    }
}

pub(crate) fn record_failure(store: &LoginFailureStore, key: &str) {
    let window = login_rate_limit_window();
    let mut guard = store.lock().expect("login failure mutex poisoned");
    match guard.get_mut(key) {
        Some(item) if item.first_at.elapsed() <= window => {
            item.count += 1;
        }
        _ => {
            guard.insert(
                key.to_string(),
                LoginFailure {
                    count: 1,
                    first_at: Instant::now(),
                },
            );
        }
    }
}

pub(crate) fn clear_failures(store: &LoginFailureStore, key: &str) {
    store
        .lock()
        .expect("login failure mutex poisoned")
        .remove(key);
}

fn login_rate_key(headers: &HeaderMap, username: &str) -> String {
    let normalized_user = username.trim().to_lowercase();
    format!(
        "{}:{}",
        client_ip(headers),
        &sha256_hex(&normalized_user)[..16]
    )
}

fn client_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
        .to_string()
}

fn login_rate_limit_window() -> Duration {
    Duration::from_millis(
        env::var("JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS),
    )
}

fn login_rate_limit_max() -> u32 {
    env::var("JOB_SPRINT_LOGIN_RATE_LIMIT_MAX")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(DEFAULT_LOGIN_RATE_LIMIT_MAX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn key_uses_forwarded_ip_and_normalized_username() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("203.0.113.10, 10.0.0.1"),
        );

        assert_eq!(
            login_rate_key(&headers, " Kai "),
            login_rate_key(&headers, "kai")
        );

        let mut other_headers = HeaderMap::new();
        other_headers.insert("x-forwarded-for", HeaderValue::from_static("203.0.113.11"));
        assert_ne!(
            login_rate_key(&headers, "kai"),
            login_rate_key(&other_headers, "kai")
        );
    }

    #[test]
    fn failure_store_records_and_clears_attempts() {
        let store = new_login_failure_store();
        let headers = HeaderMap::new();
        let rate_state = state(&store, &headers, "kai");

        record_failure(&store, &rate_state.key);
        assert_eq!(store.lock().unwrap().get(&rate_state.key).unwrap().count, 1);

        clear_failures(&store, &rate_state.key);
        assert!(!store.lock().unwrap().contains_key(&rate_state.key));
    }
}

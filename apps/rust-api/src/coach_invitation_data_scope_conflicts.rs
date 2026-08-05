use serde_json::{Value, json};
use std::collections::BTreeMap;

pub(crate) fn data_scope_conflicts(users: &[Value]) -> Vec<Value> {
    let mut usernames_by_scope: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for user in users {
        let username = user
            .get("username")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("");
        if username.is_empty() {
            continue;
        }
        let data_scope = user
            .get("dataScope")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(username);
        let usernames = usernames_by_scope
            .entry(data_scope.to_string())
            .or_default();
        if !usernames.iter().any(|value| value == username) {
            usernames.push(username.to_string());
        }
    }
    usernames_by_scope
        .into_iter()
        .filter_map(|(data_scope, mut usernames)| {
            if usernames.len() < 2 {
                return None;
            }
            usernames.sort();
            Some(json!({ "dataScope": data_scope, "usernames": usernames }))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_scope_conflicts_only_returns_reused_scopes() {
        let conflicts = data_scope_conflicts(&[
            json!({"username": "kai", "dataScope": "kai"}),
            json!({"username": "mia", "dataScope": "mia"}),
            json!({"username": "mia-shadow", "dataScope": "mia"}),
            json!({"username": "missing-scope"}),
            json!({"username": ""}),
        ]);

        assert_eq!(
            conflicts,
            vec![json!({
                "dataScope": "mia",
                "usernames": ["mia", "mia-shadow"]
            })]
        );
    }
}

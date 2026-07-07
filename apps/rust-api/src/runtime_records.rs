use chrono::Utc;
use serde_json::{Map, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub(crate) fn object_value(value: Value) -> Value {
    if value.is_object() {
        value
    } else {
        Value::Object(Map::new())
    }
}

pub(crate) fn normalize_record(value: Value, prefix: &str) -> Value {
    let mut object = match value {
        Value::Object(object) => object,
        _ => Map::new(),
    };
    let has_id = object
        .get("id")
        .and_then(Value::as_str)
        .map(|id| !id.is_empty())
        .unwrap_or(false);
    if !has_id {
        object.insert("id".to_string(), Value::String(make_id(prefix)));
    }
    if !object.contains_key("createdAt") {
        object.insert(
            "createdAt".to_string(),
            Value::String(Utc::now().to_rfc3339()),
        );
    }
    Value::Object(object)
}

fn make_id(prefix: &str) -> String {
    format!("{prefix}-{}-{}", now_millis(), Uuid::new_v4().simple())
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn normalize_record_adds_missing_id_and_created_at() {
        let record = normalize_record(json!({ "company": "Acme" }), "app");
        let object = record.as_object().expect("record object");

        assert!(object["id"].as_str().unwrap().starts_with("app-"));
        assert!(object["createdAt"].as_str().is_some());
        assert_eq!(object["company"], "Acme");
    }

    #[test]
    fn normalize_record_preserves_existing_id_and_created_at() {
        let record = normalize_record(
            json!({
                "id": "app-existing",
                "createdAt": "2026-01-01T00:00:00Z"
            }),
            "app",
        );

        assert_eq!(record["id"], "app-existing");
        assert_eq!(record["createdAt"], "2026-01-01T00:00:00Z");
    }
}

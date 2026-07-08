use chrono::Utc;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};
use std::{env, fs};

#[derive(Clone, Debug)]
pub(crate) struct RuntimeState {
    pub(crate) progress: Value,
    pub(crate) reviews: Value,
    pub(crate) applications: Value,
    pub(crate) interview_mistakes: Value,
}

pub(crate) async fn migrate_legacy_runtime_json(
    db: &SqlitePool,
    _default_scope: &str,
) -> sqlx::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM runtime_items")
        .fetch_one(db)
        .await?;
    if count > 0 {
        return Ok(());
    }

    let Ok(raw_path) = env::var("RUNTIME_DATA_PATH") else {
        return Ok(());
    };
    if raw_path.is_empty() {
        return Ok(());
    }
    let raw = match fs::read_to_string(&raw_path) {
        Ok(raw) => raw,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(sqlx::Error::Io(error)),
    };
    let parsed = match serde_json::from_str::<Value>(&raw) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(()),
    };

    if parsed.get("schemaVersion").and_then(Value::as_i64) == Some(2)
        && let Some(users) = parsed.get("users").and_then(Value::as_object)
    {
        for (scope, state) in users {
            write_runtime_state(db, scope, &runtime_state_from_value(state.clone())).await?;
        }
    }
    Ok(())
}

fn runtime_state_from_value(value: Value) -> RuntimeState {
    RuntimeState {
        progress: normalize_object(value.get("progress").cloned().unwrap_or_else(|| json!({}))),
        reviews: normalize_object(value.get("reviews").cloned().unwrap_or_else(|| json!({}))),
        applications: normalize_array(
            value
                .get("applications")
                .cloned()
                .unwrap_or_else(|| json!([])),
        ),
        interview_mistakes: normalize_array(
            value
                .get("interviewMistakes")
                .or_else(|| value.get("interview_mistakes"))
                .cloned()
                .unwrap_or_else(|| json!([])),
        ),
    }
}

pub(crate) async fn read_runtime_state(db: &SqlitePool, scope: &str) -> sqlx::Result<RuntimeState> {
    let rows = sqlx::query("SELECT item_key, value FROM runtime_items WHERE scope = ?")
        .bind(scope)
        .fetch_all(db)
        .await?;
    let mut state = RuntimeState {
        progress: json!({}),
        reviews: json!({}),
        applications: json!([]),
        interview_mistakes: json!([]),
    };
    for row in rows {
        let key: String = row.try_get("item_key")?;
        let raw: String = row.try_get("value")?;
        let value = serde_json::from_str::<Value>(&raw).unwrap_or(Value::Null);
        match key.as_str() {
            "progress" => state.progress = normalize_object(value),
            "reviews" => state.reviews = normalize_object(value),
            "applications" => state.applications = normalize_array(value),
            "interview_mistakes" => state.interview_mistakes = normalize_array(value),
            _ => {}
        }
    }
    Ok(state)
}

pub(crate) async fn write_runtime_item(
    db: &SqlitePool,
    scope: &str,
    key: &str,
    value: &Value,
) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO runtime_items (scope, item_key, value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(scope, item_key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(scope)
    .bind(key)
    .bind(value.to_string())
    .bind(Utc::now().to_rfc3339())
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn write_runtime_state(
    db: &SqlitePool,
    scope: &str,
    state: &RuntimeState,
) -> sqlx::Result<()> {
    let mut tx = db.begin().await?;
    for (key, value) in [
        ("progress", &state.progress),
        ("reviews", &state.reviews),
        ("applications", &state.applications),
        ("interview_mistakes", &state.interview_mistakes),
    ] {
        sqlx::query(
            r#"
            INSERT INTO runtime_items (scope, item_key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(scope, item_key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(scope)
        .bind(key)
        .bind(value.to_string())
        .bind(Utc::now().to_rfc3339())
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub(crate) fn runtime_to_json(state: RuntimeState) -> Value {
    json!({
        "progress": state.progress,
        "reviews": state.reviews,
        "applications": state.applications,
        "interviewMistakes": state.interview_mistakes
    })
}

pub(crate) fn normalize_runtime_payload(value: Value) -> RuntimeState {
    RuntimeState {
        progress: normalize_object(value.get("progress").cloned().unwrap_or_else(|| json!({}))),
        reviews: normalize_object(value.get("reviews").cloned().unwrap_or_else(|| json!({}))),
        applications: normalize_array(
            value
                .get("applications")
                .cloned()
                .unwrap_or_else(|| json!([])),
        ),
        interview_mistakes: normalize_array(
            value
                .get("interviewMistakes")
                .cloned()
                .unwrap_or_else(|| json!([])),
        ),
    }
}

pub(crate) fn normalize_object(value: Value) -> Value {
    if value.is_object() { value } else { json!({}) }
}

fn normalize_array(value: Value) -> Value {
    if value.is_array() { value } else { json!([]) }
}

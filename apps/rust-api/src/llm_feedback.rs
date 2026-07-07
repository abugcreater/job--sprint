use chrono::Utc;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};

pub(crate) fn coach_feedback_from_payload(id: String, payload: &Value) -> Result<Value, Value> {
    let artifact_id = required_text(payload, "artifactId")?;
    let decision = required_text(payload, "decision")?;
    if decision != "accepted" && decision != "rejected" {
        return Err(json!({
            "ok": false,
            "error": "invalid_feedback_decision",
            "message": "AI 草稿反馈只能是 accepted 或 rejected。"
        }));
    }
    Ok(json!({
        "id": id,
        "profileId": optional_text(payload, "profileId").unwrap_or_default(),
        "artifactId": artifact_id,
        "llmRunId": optional_text(payload, "llmRunId").unwrap_or_default(),
        "artifactType": optional_text(payload, "artifactType").unwrap_or_else(|| "unknown".to_string()),
        "decision": decision,
        "reason": optional_text(payload, "reason").unwrap_or_default(),
        "title": optional_text(payload, "title").unwrap_or_default(),
        "createdAt": Utc::now().to_rfc3339()
    }))
}

pub(crate) async fn insert_llm_feedback(
    db: &SqlitePool,
    scope: &str,
    feedback: &Value,
) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO llm_feedback (
            id, scope, profile_id, artifact_id, llm_run_id,
            artifact_type, decision, reason, title, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            scope = excluded.scope,
            profile_id = excluded.profile_id,
            artifact_id = excluded.artifact_id,
            llm_run_id = excluded.llm_run_id,
            artifact_type = excluded.artifact_type,
            decision = excluded.decision,
            reason = excluded.reason,
            title = excluded.title,
            created_at = excluded.created_at
        "#,
    )
    .bind(text_field(feedback, "id", "feedback-unknown"))
    .bind(scope)
    .bind(optional_text_field(feedback, "profileId"))
    .bind(text_field(feedback, "artifactId", "artifact-unknown"))
    .bind(optional_text_field(feedback, "llmRunId"))
    .bind(text_field(feedback, "artifactType", "unknown"))
    .bind(text_field(feedback, "decision", "rejected"))
    .bind(optional_text_field(feedback, "reason"))
    .bind(optional_text_field(feedback, "title"))
    .bind(text_field(feedback, "createdAt", ""))
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn list_llm_feedback(
    db: &SqlitePool,
    scope: &str,
    limit: i64,
) -> sqlx::Result<Vec<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT id, profile_id, artifact_id, llm_run_id, artifact_type, decision, reason, title, created_at
        FROM llm_feedback
        WHERE scope = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        "#,
    )
    .bind(scope)
    .bind(limit.clamp(1, 100))
    .fetch_all(db)
    .await?;
    let mut feedback = Vec::with_capacity(rows.len());
    for row in rows {
        feedback.push(json!({
            "id": row.try_get::<String, _>("id")?,
            "profileId": row.try_get::<Option<String>, _>("profile_id")?.unwrap_or_default(),
            "artifactId": row.try_get::<String, _>("artifact_id")?,
            "llmRunId": row.try_get::<Option<String>, _>("llm_run_id")?.unwrap_or_default(),
            "artifactType": row.try_get::<String, _>("artifact_type")?,
            "decision": row.try_get::<String, _>("decision")?,
            "reason": row.try_get::<Option<String>, _>("reason")?.unwrap_or_default(),
            "title": row.try_get::<Option<String>, _>("title")?.unwrap_or_default(),
            "createdAt": row.try_get::<String, _>("created_at")?
        }));
    }
    Ok(feedback)
}

fn required_text(payload: &Value, field: &str) -> Result<String, Value> {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| {
            json!({
                "ok": false,
                "error": format!("{field}_required"),
                "message": "AI 草稿反馈缺少必要字段。"
            })
        })
}

fn optional_text(payload: &Value, field: &str) -> Option<String> {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn text_field(feedback: &Value, field: &str, default: &str) -> String {
    feedback
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn optional_text_field(feedback: &Value, field: &str) -> Option<String> {
    feedback
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

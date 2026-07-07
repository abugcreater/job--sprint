use chrono::Utc;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};

pub(crate) fn boundary_feedback_from_payload(id: String, payload: &Value) -> Result<Value, Value> {
    let suggestion_id = required_text(payload, "suggestionId")?;
    let topic = required_text(payload, "topic")?;
    let decision = required_text(payload, "decision")?;
    if decision != "accepted" && decision != "rejected" && decision != "needs_revision" {
        return Err(json!({
            "ok": false,
            "error": "invalid_boundary_feedback_decision",
            "message": "边界候选反馈只能是 accepted、rejected 或 needs_revision。"
        }));
    }
    Ok(json!({
        "id": optional_text(payload, "id").unwrap_or(id),
        "profileId": optional_text(payload, "profileId").unwrap_or_default(),
        "suggestionId": suggestion_id,
        "topic": topic,
        "decision": decision,
        "reason": optional_text(payload, "reason").unwrap_or_else(|| default_reason(&decision).to_string()),
        "sourceSummary": optional_text(payload, "sourceSummary").unwrap_or_default(),
        "sourceConfidence": optional_text(payload, "sourceConfidence").unwrap_or_default(),
        "sourceProvider": optional_text(payload, "sourceProvider").unwrap_or_default(),
        "sourcePromptVersion": optional_text(payload, "sourcePromptVersion").unwrap_or_default(),
        "sourceInputHash": optional_text(payload, "sourceInputHash").unwrap_or_default(),
        "createdAt": optional_text(payload, "createdAt").unwrap_or_else(|| Utc::now().to_rfc3339())
    }))
}

pub(crate) async fn insert_boundary_feedback(
    db: &SqlitePool,
    scope: &str,
    feedback: &Value,
) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO coach_boundary_feedback (
            id, scope, profile_id, suggestion_id, topic, decision, reason,
            source_summary, source_confidence, source_provider,
            source_prompt_version, source_input_hash, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            scope = excluded.scope,
            profile_id = excluded.profile_id,
            suggestion_id = excluded.suggestion_id,
            topic = excluded.topic,
            decision = excluded.decision,
            reason = excluded.reason,
            source_summary = excluded.source_summary,
            source_confidence = excluded.source_confidence,
            source_provider = excluded.source_provider,
            source_prompt_version = excluded.source_prompt_version,
            source_input_hash = excluded.source_input_hash,
            created_at = excluded.created_at
        "#,
    )
    .bind(text_field(feedback, "id", "boundary-feedback-unknown"))
    .bind(scope)
    .bind(optional_text_field(feedback, "profileId"))
    .bind(text_field(feedback, "suggestionId", "suggestion-unknown"))
    .bind(text_field(feedback, "topic", "unknown"))
    .bind(text_field(feedback, "decision", "rejected"))
    .bind(optional_text_field(feedback, "reason"))
    .bind(optional_text_field(feedback, "sourceSummary"))
    .bind(optional_text_field(feedback, "sourceConfidence"))
    .bind(optional_text_field(feedback, "sourceProvider"))
    .bind(optional_text_field(feedback, "sourcePromptVersion"))
    .bind(optional_text_field(feedback, "sourceInputHash"))
    .bind(text_field(feedback, "createdAt", ""))
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn list_boundary_feedback(
    db: &SqlitePool,
    scope: &str,
    limit: i64,
) -> sqlx::Result<Vec<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT id, profile_id, suggestion_id, topic, decision, reason,
               source_summary, source_confidence, source_provider,
               source_prompt_version, source_input_hash, created_at
        FROM coach_boundary_feedback
        WHERE scope = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        "#,
    )
    .bind(scope)
    .bind(limit.clamp(1, 200))
    .fetch_all(db)
    .await?;
    let mut feedback = Vec::with_capacity(rows.len());
    for row in rows {
        feedback.push(json!({
            "id": row.try_get::<String, _>("id")?,
            "profileId": row.try_get::<Option<String>, _>("profile_id")?.unwrap_or_default(),
            "suggestionId": row.try_get::<String, _>("suggestion_id")?,
            "topic": row.try_get::<String, _>("topic")?,
            "decision": row.try_get::<String, _>("decision")?,
            "reason": row.try_get::<Option<String>, _>("reason")?.unwrap_or_default(),
            "sourceSummary": row.try_get::<Option<String>, _>("source_summary")?.unwrap_or_default(),
            "sourceConfidence": row.try_get::<Option<String>, _>("source_confidence")?.unwrap_or_default(),
            "sourceProvider": row.try_get::<Option<String>, _>("source_provider")?.unwrap_or_default(),
            "sourcePromptVersion": row.try_get::<Option<String>, _>("source_prompt_version")?.unwrap_or_default(),
            "sourceInputHash": row.try_get::<Option<String>, _>("source_input_hash")?.unwrap_or_default(),
            "createdAt": row.try_get::<String, _>("created_at")?
        }));
    }
    Ok(feedback)
}

fn required_text(payload: &Value, field: &str) -> Result<String, Value> {
    optional_text(payload, field).ok_or_else(|| {
        json!({
            "ok": false,
            "error": format!("{field}_required"),
            "message": "边界候选反馈缺少必要字段。"
        })
    })
}

fn optional_text(payload: &Value, field: &str) -> Option<String> {
    payload
        .get(field)
        .and_then(Value::as_str)
        .map(|value| {
            value
                .trim()
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        })
        .filter(|value| !value.is_empty())
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

fn default_reason(decision: &str) -> &'static str {
    match decision {
        "accepted" => "已采纳",
        "needs_revision" => "需要人工修订后再保存",
        _ => "不适合当前知识边界",
    }
}

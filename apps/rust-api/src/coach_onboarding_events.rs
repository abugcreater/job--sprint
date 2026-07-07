use chrono::Utc;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};

const STEP_IDS: &[&str] = &[
    "account_scope",
    "profile_template",
    "material_boundary",
    "first_schedule",
    "ai_review",
    "complete",
];

pub(crate) fn coach_onboarding_event_from_payload(
    id: String,
    payload: &Value,
) -> Result<Value, Value> {
    let step_id = required_text(payload, "stepId")?;
    if !STEP_IDS.contains(&step_id.as_str()) {
        return Err(json!({
            "ok": false,
            "error": "invalid_step_id",
            "message": "首登观察事件的 stepId 不在允许范围内。"
        }));
    }
    let progress_label = required_text(payload, "progressLabel")?;
    let completion_rate = number_in_range(payload, "completionRate", 0, 100).ok_or_else(|| {
        json!({
            "ok": false,
            "error": "completionRate_required",
            "message": "首登观察事件缺少有效完成率。"
        })
    })?;
    let drop_off_label = required_text(payload, "dropOffLabel")?;
    let risk_label = required_text(payload, "riskLabel")?;
    let next_action_label = required_text(payload, "nextActionLabel")?;
    Ok(json!({
        "id": id,
        "profileId": optional_text(payload, "profileId").unwrap_or_default(),
        "stepId": step_id,
        "stepLabel": optional_text(payload, "stepLabel").unwrap_or_else(|| drop_off_label.clone()),
        "progressLabel": progress_label,
        "completionRate": completion_rate,
        "completionRateLabel": optional_text(payload, "completionRateLabel").unwrap_or_else(|| format!("{completion_rate}%")),
        "dropOffLabel": drop_off_label,
        "riskLabel": risk_label,
        "nextActionLabel": next_action_label,
        "source": optional_text(payload, "source").unwrap_or_else(|| "react-first-login".to_string()),
        "createdAt": Utc::now().to_rfc3339()
    }))
}

pub(crate) async fn insert_coach_onboarding_event(
    db: &SqlitePool,
    scope: &str,
    event: &Value,
) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO coach_onboarding_events (
            id, scope, profile_id, step_id, step_label,
            progress_label, completion_rate, completion_rate_label,
            drop_off_label, risk_label, next_action_label, source, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            scope = excluded.scope,
            profile_id = excluded.profile_id,
            step_id = excluded.step_id,
            step_label = excluded.step_label,
            progress_label = excluded.progress_label,
            completion_rate = excluded.completion_rate,
            completion_rate_label = excluded.completion_rate_label,
            drop_off_label = excluded.drop_off_label,
            risk_label = excluded.risk_label,
            next_action_label = excluded.next_action_label,
            source = excluded.source,
            created_at = excluded.created_at
        "#,
    )
    .bind(text_field(event, "id", "onboarding-event-unknown"))
    .bind(scope)
    .bind(optional_text_field(event, "profileId"))
    .bind(text_field(event, "stepId", "profile_template"))
    .bind(optional_text_field(event, "stepLabel"))
    .bind(text_field(event, "progressLabel", "0/5"))
    .bind(number_field(event, "completionRate", 0))
    .bind(text_field(event, "completionRateLabel", "0%"))
    .bind(text_field(event, "dropOffLabel", "未知放弃点"))
    .bind(text_field(event, "riskLabel", "未知风险"))
    .bind(text_field(event, "nextActionLabel", "继续首登"))
    .bind(text_field(event, "source", "react-first-login"))
    .bind(text_field(event, "createdAt", ""))
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn list_coach_onboarding_events(
    db: &SqlitePool,
    scope: &str,
    limit: i64,
) -> sqlx::Result<Vec<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT id, profile_id, step_id, step_label, progress_label,
               completion_rate, completion_rate_label, drop_off_label,
               risk_label, next_action_label, source, created_at
        FROM coach_onboarding_events
        WHERE scope = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        "#,
    )
    .bind(scope)
    .bind(limit.clamp(1, 100))
    .fetch_all(db)
    .await?;
    let mut events = Vec::with_capacity(rows.len());
    for row in rows {
        events.push(json!({
            "id": row.try_get::<String, _>("id")?,
            "profileId": row.try_get::<Option<String>, _>("profile_id")?.unwrap_or_default(),
            "stepId": row.try_get::<String, _>("step_id")?,
            "stepLabel": row.try_get::<Option<String>, _>("step_label")?.unwrap_or_default(),
            "progressLabel": row.try_get::<String, _>("progress_label")?,
            "completionRate": row.try_get::<i64, _>("completion_rate")?,
            "completionRateLabel": row.try_get::<String, _>("completion_rate_label")?,
            "dropOffLabel": row.try_get::<String, _>("drop_off_label")?,
            "riskLabel": row.try_get::<String, _>("risk_label")?,
            "nextActionLabel": row.try_get::<String, _>("next_action_label")?,
            "source": row.try_get::<String, _>("source")?,
            "createdAt": row.try_get::<String, _>("created_at")?
        }));
    }
    Ok(events)
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
                "message": "首登观察事件缺少必要字段。"
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

fn number_in_range(payload: &Value, field: &str, min: i64, max: i64) -> Option<i64> {
    let value = payload
        .get(field)
        .and_then(|raw| raw.as_i64().or_else(|| raw.as_str()?.parse::<i64>().ok()))?;
    Some(value.clamp(min, max))
}

fn text_field(event: &Value, field: &str, default: &str) -> String {
    event
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn optional_text_field(event: &Value, field: &str) -> Option<String> {
    event
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn number_field(event: &Value, field: &str, default: i64) -> i64 {
    event.get(field).and_then(Value::as_i64).unwrap_or(default)
}

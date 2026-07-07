use chrono::Utc;
use serde_json::{Value, json};
use sqlx::{Row, SqlitePool};

const STATUSES: &[&str] = &["draft", "invited", "active", "paused"];

pub(crate) fn coach_invitation_from_payload(id: String, payload: &Value) -> Result<Value, Value> {
    let username = required_text(payload, "username")?;
    let status = optional_text(payload, "status").unwrap_or_else(|| "draft".to_string());
    if !STATUSES.contains(&status.as_str()) {
        return Err(json!({
            "ok": false,
            "error": "invalid_invitation_status",
            "message": "邀请状态只能是 draft、invited、active 或 paused。"
        }));
    }
    let now = Utc::now().to_rfc3339();
    Ok(json!({
        "id": optional_text(payload, "id").unwrap_or(id),
        "username": username,
        "displayName": optional_text(payload, "displayName").unwrap_or_else(|| username.clone()),
        "dataScope": optional_text(payload, "dataScope").unwrap_or_else(|| username.clone()),
        "inviteBatch": optional_text(payload, "inviteBatch").unwrap_or_else(|| "default".to_string()),
        "templateVersion": optional_text(payload, "templateVersion").unwrap_or_else(|| "role-family-v1".to_string()),
        "roleFamily": optional_text(payload, "roleFamily").unwrap_or_else(|| "other_it".to_string()),
        "targetRole": optional_text(payload, "targetRole").unwrap_or_default(),
        "status": status,
        "note": optional_text(payload, "note").unwrap_or_default(),
        "createdAt": optional_text(payload, "createdAt").unwrap_or_else(|| now.clone()),
        "updatedAt": now
    }))
}

pub(crate) async fn upsert_coach_invitation(
    db: &SqlitePool,
    invitation: &Value,
) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO coach_invitations (
            id, username, display_name, data_scope, invite_batch,
            template_version, role_family, target_role, status, note, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
            id = excluded.id,
            display_name = excluded.display_name,
            data_scope = excluded.data_scope,
            invite_batch = excluded.invite_batch,
            template_version = excluded.template_version,
            role_family = excluded.role_family,
            target_role = excluded.target_role,
            status = excluded.status,
            note = excluded.note,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(text_field(invitation, "id", "coach-invite-unknown"))
    .bind(text_field(invitation, "username", "unknown"))
    .bind(text_field(invitation, "displayName", "unknown"))
    .bind(text_field(invitation, "dataScope", "unknown"))
    .bind(text_field(invitation, "inviteBatch", "default"))
    .bind(text_field(invitation, "templateVersion", "role-family-v1"))
    .bind(text_field(invitation, "roleFamily", "other_it"))
    .bind(optional_text_field(invitation, "targetRole"))
    .bind(text_field(invitation, "status", "draft"))
    .bind(optional_text_field(invitation, "note"))
    .bind(text_field(invitation, "createdAt", ""))
    .bind(text_field(invitation, "updatedAt", ""))
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn update_coach_invitation_batch_status(
    db: &SqlitePool,
    invite_batch: &str,
    status: &str,
) -> sqlx::Result<i64> {
    let updated_at = Utc::now().to_rfc3339();
    let result = sqlx::query(
        r#"
        UPDATE coach_invitations
        SET status = ?, updated_at = ?
        WHERE invite_batch = ?
        "#,
    )
    .bind(status)
    .bind(updated_at)
    .bind(invite_batch)
    .execute(db)
    .await?;
    Ok(result.rows_affected() as i64)
}

pub(crate) async fn delete_coach_invitation(db: &SqlitePool, username: &str) -> sqlx::Result<i64> {
    let result = sqlx::query(
        r#"
        DELETE FROM coach_invitations
        WHERE username = ?
        "#,
    )
    .bind(username)
    .execute(db)
    .await?;
    Ok(result.rows_affected() as i64)
}

pub(crate) async fn list_coach_invitations(db: &SqlitePool) -> sqlx::Result<Vec<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT id, username, display_name, data_scope, invite_batch,
               template_version, role_family, target_role, status, note, created_at, updated_at
        FROM coach_invitations
        ORDER BY updated_at DESC, username ASC
        LIMIT 200
        "#,
    )
    .fetch_all(db)
    .await?;
    let mut invitations = Vec::with_capacity(rows.len());
    for row in rows {
        invitations.push(json!({
            "id": row.try_get::<String, _>("id")?,
            "username": row.try_get::<String, _>("username")?,
            "displayName": row.try_get::<String, _>("display_name")?,
            "dataScope": row.try_get::<String, _>("data_scope")?,
            "inviteBatch": row.try_get::<String, _>("invite_batch")?,
            "templateVersion": row.try_get::<String, _>("template_version")?,
            "roleFamily": row.try_get::<String, _>("role_family")?,
            "targetRole": row.try_get::<Option<String>, _>("target_role")?.unwrap_or_default(),
            "status": row.try_get::<String, _>("status")?,
            "note": row.try_get::<Option<String>, _>("note")?.unwrap_or_default(),
            "createdAt": row.try_get::<String, _>("created_at")?,
            "updatedAt": row.try_get::<String, _>("updated_at")?
        }));
    }
    Ok(invitations)
}

pub(crate) fn summarize_coach_invitations(invitations: &[Value]) -> Value {
    let count = |status: &str| {
        invitations
            .iter()
            .filter(|item| item.get("status").and_then(Value::as_str) == Some(status))
            .count() as i64
    };
    let batch_count = invitations
        .iter()
        .filter_map(|item| item.get("inviteBatch").and_then(Value::as_str))
        .collect::<std::collections::BTreeSet<_>>()
        .len() as i64;
    let template_version_count = invitations
        .iter()
        .filter_map(|item| item.get("templateVersion").and_then(Value::as_str))
        .collect::<std::collections::BTreeSet<_>>()
        .len() as i64;
    json!({
        "totalInvitations": invitations.len() as i64,
        "batchCount": batch_count,
        "templateVersionCount": template_version_count,
        "draftCount": count("draft"),
        "invitedCount": count("invited"),
        "activeCount": count("active"),
        "pausedCount": count("paused"),
        "nextActionLabel": if invitations.is_empty() { "先创建第一条邀请记录。" } else { "为 active 用户开通账号、发送登录入口，并跟进首登完成率。" }
    })
}

fn required_text(payload: &Value, field: &str) -> Result<String, Value> {
    optional_text(payload, field).ok_or_else(|| {
        json!({
            "ok": false,
            "error": format!("{field}_required"),
            "message": "邀请记录缺少必要字段。"
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

fn text_field(value: &Value, field: &str, default: &str) -> String {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|item| !item.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn optional_text_field(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .filter(|item| !item.is_empty())
        .map(ToString::to_string)
}

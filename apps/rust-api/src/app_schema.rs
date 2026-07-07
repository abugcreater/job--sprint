use crate::app_schema_boundary_feedback::create_coach_boundary_feedback;
use sqlx::{Row, SqlitePool};

pub(crate) async fn init_db(db: &SqlitePool) -> sqlx::Result<()> {
    create_users(db).await?;
    create_runtime_items(db).await?;
    create_llm_runs(db).await?;
    create_llm_feedback(db).await?;
    create_coach_boundary_feedback(db).await?;
    create_coach_onboarding_events(db).await?;
    create_coach_invitations(db).await?;
    Ok(())
}

async fn create_users(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            role TEXT NOT NULL,
            data_scope TEXT NOT NULL,
            password_hash_sha256 TEXT NOT NULL,
            permissions_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn create_runtime_items(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS runtime_items (
            scope TEXT NOT NULL,
            item_key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (scope, item_key)
        )
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn create_llm_runs(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS llm_runs (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            profile_id TEXT,
            provider TEXT NOT NULL,
            model TEXT,
            prompt_version TEXT NOT NULL,
            schema_version TEXT NOT NULL,
            input_summary_hash TEXT NOT NULL,
            artifact_count INTEGER NOT NULL,
            schema_status TEXT NOT NULL,
            status TEXT NOT NULL,
            warning TEXT,
            error TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            latency_ms INTEGER,
            estimated_cost_usd REAL,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    ensure_llm_run_metric_columns(db).await?;
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_llm_runs_scope_created_at
        ON llm_runs(scope, created_at DESC)
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn create_llm_feedback(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS llm_feedback (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            profile_id TEXT, artifact_id TEXT NOT NULL, llm_run_id TEXT,
            artifact_type TEXT NOT NULL,
            decision TEXT NOT NULL,
            reason TEXT, title TEXT, created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_llm_feedback_scope_created_at
        ON llm_feedback(scope, created_at DESC)
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn create_coach_onboarding_events(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS coach_onboarding_events (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            profile_id TEXT,
            step_id TEXT NOT NULL,
            step_label TEXT,
            progress_label TEXT NOT NULL,
            completion_rate INTEGER NOT NULL,
            completion_rate_label TEXT NOT NULL,
            drop_off_label TEXT NOT NULL,
            risk_label TEXT NOT NULL,
            next_action_label TEXT NOT NULL,
            source TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_coach_onboarding_events_scope_created_at
        ON coach_onboarding_events(scope, created_at DESC)
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn create_coach_invitations(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS coach_invitations (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            data_scope TEXT NOT NULL,
            invite_batch TEXT NOT NULL,
            template_version TEXT NOT NULL DEFAULT 'role-family-v1',
            role_family TEXT NOT NULL,
            target_role TEXT,
            status TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    ensure_coach_invitation_template_column(db).await?;
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_coach_invitations_batch_status
        ON coach_invitations(invite_batch, status)
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn ensure_coach_invitation_template_column(db: &SqlitePool) -> sqlx::Result<()> {
    if !table_has_column(db, "coach_invitations", "template_version").await? {
        sqlx::query(
            "ALTER TABLE coach_invitations ADD COLUMN template_version TEXT NOT NULL DEFAULT 'role-family-v1'",
        )
        .execute(db)
        .await?;
    }
    Ok(())
}

#[rustfmt::skip]
async fn ensure_llm_run_metric_columns(db: &SqlitePool) -> sqlx::Result<()> {
    for (name, sql) in [
        ("input_tokens", "ALTER TABLE llm_runs ADD COLUMN input_tokens INTEGER"),
        ("output_tokens", "ALTER TABLE llm_runs ADD COLUMN output_tokens INTEGER"),
        ("latency_ms", "ALTER TABLE llm_runs ADD COLUMN latency_ms INTEGER"),
        ("estimated_cost_usd", "ALTER TABLE llm_runs ADD COLUMN estimated_cost_usd REAL"),
    ] {
        if !table_has_column(db, "llm_runs", name).await? {
            sqlx::query(sql).execute(db).await?;
        }
    }
    Ok(())
}

async fn table_has_column(db: &SqlitePool, table: &str, column: &str) -> sqlx::Result<bool> {
    let rows = sqlx::query(&format!("PRAGMA table_info({table})"))
        .fetch_all(db)
        .await?;
    Ok(rows
        .iter()
        .any(|row| row.get::<String, _>("name") == column))
}

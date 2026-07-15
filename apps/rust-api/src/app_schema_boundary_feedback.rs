use sqlx_sqlite::SqlitePool;

pub(crate) async fn create_coach_boundary_feedback(db: &SqlitePool) -> sqlx::Result<()> {
    sqlx::query::query(
        r#"
        CREATE TABLE IF NOT EXISTS coach_boundary_feedback (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            profile_id TEXT,
            suggestion_id TEXT NOT NULL,
            topic TEXT NOT NULL,
            decision TEXT NOT NULL,
            reason TEXT,
            source_summary TEXT,
            source_confidence TEXT,
            source_provider TEXT,
            source_prompt_version TEXT,
            source_input_hash TEXT,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(db)
    .await?;
    sqlx::query::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_coach_boundary_feedback_scope_created_at
        ON coach_boundary_feedback(scope, created_at DESC)
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

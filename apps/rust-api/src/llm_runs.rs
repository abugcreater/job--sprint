use chrono::Utc;
use serde_json::{Value, json};
use sqlx::row::Row;
use sqlx_sqlite::SqlitePool;

pub(crate) fn coach_llm_run_from_response(
    id: String,
    profile_id: Option<&str>,
    response: &Value,
) -> Value {
    let artifacts = response
        .get("artifacts")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let provider = response
        .get("provider")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let status = if provider == "local-fallback" {
        "fallback"
    } else if artifacts.is_empty() {
        "failed"
    } else {
        "success"
    };
    json!({
        "id": id,
        "profileId": profile_id.unwrap_or(""),
        "provider": provider,
        "model": response.get("model").and_then(Value::as_str),
        "promptVersion": response.get("promptVersion").and_then(Value::as_str).unwrap_or("coach-artifacts-v1"),
        "schemaVersion": response.get("schemaVersion").and_then(Value::as_str).unwrap_or("coach-artifact-list-v1"),
        "inputSummaryHash": response.get("inputSummaryHash").and_then(Value::as_str).unwrap_or("unknown"),
        "artifactCount": artifacts.len(),
        "schemaStatus": if artifacts.is_empty() { "failed" } else { "pass" },
        "status": status,
        "warning": response.get("warning").and_then(Value::as_str),
        "error": response.get("error").and_then(Value::as_str),
        "inputTokens": response.get("usage").and_then(|usage| usage.get("inputTokens")).and_then(Value::as_i64),
        "outputTokens": response.get("usage").and_then(|usage| usage.get("outputTokens")).and_then(Value::as_i64),
        "latencyMs": response.get("latencyMs").and_then(Value::as_i64),
        "estimatedCostUsd": response.get("estimatedCostUsd").and_then(Value::as_f64),
        "createdAt": Utc::now().to_rfc3339()
    })
}

pub(crate) async fn insert_llm_run(db: &SqlitePool, scope: &str, run: &Value) -> sqlx::Result<()> {
    sqlx::query::query(
        r#"
        INSERT INTO llm_runs (
            id, scope, profile_id, provider, model, prompt_version, schema_version,
            input_summary_hash, artifact_count, schema_status, status, warning, error,
            input_tokens, output_tokens, latency_ms, estimated_cost_usd, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            scope = excluded.scope,
            profile_id = excluded.profile_id,
            provider = excluded.provider,
            model = excluded.model,
            prompt_version = excluded.prompt_version,
            schema_version = excluded.schema_version,
            input_summary_hash = excluded.input_summary_hash,
            artifact_count = excluded.artifact_count,
            schema_status = excluded.schema_status,
            status = excluded.status,
            warning = excluded.warning,
            error = excluded.error,
            input_tokens = excluded.input_tokens,
            output_tokens = excluded.output_tokens,
            latency_ms = excluded.latency_ms,
            estimated_cost_usd = excluded.estimated_cost_usd,
            created_at = excluded.created_at
        "#,
    )
    .bind(text_field(run, "id", "llm-run-unknown"))
    .bind(scope)
    .bind(optional_text_field(run, "profileId"))
    .bind(text_field(run, "provider", "unknown"))
    .bind(optional_text_field(run, "model"))
    .bind(text_field(run, "promptVersion", "coach-artifacts-v1"))
    .bind(text_field(run, "schemaVersion", "coach-artifact-list-v1"))
    .bind(text_field(run, "inputSummaryHash", "unknown"))
    .bind(
        run.get("artifactCount")
            .and_then(Value::as_i64)
            .unwrap_or(0),
    )
    .bind(text_field(run, "schemaStatus", "not_checked"))
    .bind(text_field(run, "status", "failed"))
    .bind(optional_text_field(run, "warning"))
    .bind(optional_text_field(run, "error"))
    .bind(optional_i64_field(run, "inputTokens"))
    .bind(optional_i64_field(run, "outputTokens"))
    .bind(optional_i64_field(run, "latencyMs"))
    .bind(run.get("estimatedCostUsd").and_then(Value::as_f64))
    .bind(text_field(run, "createdAt", ""))
    .execute(db)
    .await?;
    Ok(())
}

pub(crate) async fn list_llm_runs(
    db: &SqlitePool,
    scope: &str,
    limit: i64,
) -> sqlx::Result<Vec<Value>> {
    let rows = sqlx::query::query(
        r#"
        SELECT id, profile_id, provider, model, prompt_version, schema_version,
               input_summary_hash, artifact_count, schema_status, status, warning, error,
               input_tokens, output_tokens, latency_ms, estimated_cost_usd, created_at
        FROM llm_runs
        WHERE scope = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        "#,
    )
    .bind(scope)
    .bind(limit.clamp(1, 100))
    .fetch_all(db)
    .await?;
    let mut runs = Vec::with_capacity(rows.len());
    for row in rows {
        runs.push(json!({
            "id": row.try_get::<String, _>("id")?,
            "profileId": row.try_get::<Option<String>, _>("profile_id")?.unwrap_or_default(),
            "provider": row.try_get::<String, _>("provider")?,
            "model": row.try_get::<Option<String>, _>("model")?,
            "promptVersion": row.try_get::<String, _>("prompt_version")?,
            "schemaVersion": row.try_get::<String, _>("schema_version")?,
            "inputSummaryHash": row.try_get::<String, _>("input_summary_hash")?,
            "artifactCount": row.try_get::<i64, _>("artifact_count")?,
            "schemaStatus": row.try_get::<String, _>("schema_status")?,
            "status": row.try_get::<String, _>("status")?,
            "warning": row.try_get::<Option<String>, _>("warning")?,
            "error": row.try_get::<Option<String>, _>("error")?,
            "inputTokens": row.try_get::<Option<i64>, _>("input_tokens")?,
            "outputTokens": row.try_get::<Option<i64>, _>("output_tokens")?,
            "latencyMs": row.try_get::<Option<i64>, _>("latency_ms")?,
            "estimatedCostUsd": row.try_get::<Option<f64>, _>("estimated_cost_usd")?,
            "createdAt": row.try_get::<String, _>("created_at")?
        }));
    }
    Ok(runs)
}

fn text_field(run: &Value, field: &str, default: &str) -> String {
    run.get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn optional_text_field(run: &Value, field: &str) -> Option<String> {
    run.get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn optional_i64_field(run: &Value, field: &str) -> Option<i64> {
    run.get(field).and_then(Value::as_i64)
}

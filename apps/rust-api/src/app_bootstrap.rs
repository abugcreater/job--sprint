use axum::{Router, extract::DefaultBodyLimit};
use chrono::Utc;
use sqlx_sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::{env, fs, path::PathBuf, str::FromStr, sync::Arc};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;

use crate::api_routes;
use crate::app_schema::init_db;
use crate::auth_config::{UserConfig, get_auth_config};
use crate::login_rate::{LoginFailureStore, new_login_failure_store};
use crate::runtime_store::migrate_legacy_runtime_json;

const MAX_BODY_BYTES: usize = 256 * 1024;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) db: SqlitePool,
    pub(crate) root: Arc<PathBuf>,
    pub(crate) login_failures: LoginFailureStore,
}

pub async fn build_app_from_env() -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let options = sqlite_connect_options_from_env()?;
    let db = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;
    init_db(&db).await?;
    let auth_config = get_auth_config();
    sync_configured_users(&db, &auth_config.users).await?;
    migrate_legacy_runtime_json(&db, &auth_config.data_owner).await?;

    let state = AppState {
        db,
        root: Arc::new(find_project_root()?),
        login_failures: new_login_failure_store(),
    };

    Ok(api_routes()
        .merge(Router::new().nest("/job-sprint", api_routes()))
        .with_state(state)
        .layer(DefaultBodyLimit::max(max_body_bytes()))
        .layer(TraceLayer::new_for_http()))
}

pub async fn serve_from_env() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8000);
    let app = build_app_from_env().await?;
    let listener = TcpListener::bind(format!("{host}:{port}")).await?;
    println!("job-sprint rust api listening on http://{host}:{port}");
    axum::serve(listener, app).await?;
    Ok(())
}

fn find_project_root() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let mut current = env::current_dir()?;
    loop {
        if current.join("package.json").exists() && current.join("apps").exists() {
            return Ok(current);
        }
        if !current.pop() {
            return Ok(env::current_dir()?);
        }
    }
}

async fn sync_configured_users(db: &SqlitePool, users: &[UserConfig]) -> sqlx::Result<()> {
    for user in users {
        sqlx::query::query(
            r#"
            INSERT INTO users (
                username, display_name, role, data_scope,
                password_hash_sha256, permissions_json, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                display_name = excluded.display_name,
                role = excluded.role,
                data_scope = excluded.data_scope,
                password_hash_sha256 = excluded.password_hash_sha256,
                permissions_json = excluded.permissions_json,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&user.username)
        .bind(&user.display_name)
        .bind(&user.role)
        .bind(&user.data_scope)
        .bind(&user.password_hash)
        .bind(serde_json::to_string(&user.permissions).unwrap_or_else(|_| "[]".to_string()))
        .bind(Utc::now().to_rfc3339())
        .execute(db)
        .await?;
    }
    Ok(())
}

fn max_body_bytes() -> usize {
    let request_limit = env::var("JOB_SPRINT_MAX_BODY_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(MAX_BODY_BYTES);
    let asr_limit = env::var("ASR_MAX_AUDIO_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(8 * 1024 * 1024);
    request_limit.max(asr_limit)
}

fn sqlite_connect_options_from_env() -> Result<SqliteConnectOptions, sqlx::Error> {
    if let Ok(database_url) = env::var("DATABASE_URL") {
        return SqliteConnectOptions::from_str(&database_url)
            .map(|options| options.create_if_missing(true));
    }

    let db_path = env::var("JOB_SPRINT_RUNTIME_DB_PATH")
        .or_else(|_| env::var("JOB_SPRINT_DB_PATH"))
        .or_else(|_| env::var("RUNTIME_DB_PATH"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("apps/rust-api/data/runtime.sqlite"));
    if let Some(parent) = db_path.parent()
        && !parent.as_os_str().is_empty()
    {
        fs::create_dir_all(parent).map_err(sqlx::Error::Io)?;
    }
    Ok(SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true))
}

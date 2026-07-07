use axum::{
    body::{Body, to_bytes},
    http::{Method, Request, StatusCode, header},
};
use job_sprint_rust_api::build_app_from_env;
use serde_json::{Value, json};
use std::{env, fs};
use tempfile::tempdir;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};
use tower::ServiceExt;

struct TestResponse {
    status: StatusCode,
    headers: axum::http::HeaderMap,
    json: Value,
}

#[tokio::test]
async fn boundary_suggestions_use_provider_and_filter_existing_topics() {
    clear_env();
    let tmp = tempdir().unwrap();
    let db_path = tmp.path().join("runtime.sqlite3");
    let runtime_path = tmp.path().join("runtime.json");
    fs::write(&runtime_path, "{}").unwrap();
    let provider_url = start_mock_boundary_provider().await;
    set_env("JOB_SPRINT_RUNTIME_DB_PATH", &db_path);
    set_env("RUNTIME_DATA_PATH", &runtime_path);
    set_env("JOB_SPRINT_AUTH_USER", "test-user");
    set_env("JOB_SPRINT_AUTH_PASSWORD", "test-password-only");
    set_env(
        "JOB_SPRINT_SESSION_SECRET",
        "test-session-secret-only-long-enough",
    );
    set_env("ANTHROPIC_AUTH_TOKEN", "test-token-that-must-not-leak");
    set_env("ANTHROPIC_BASE_URL", provider_url);
    set_env("ANTHROPIC_MODEL", "mock-boundary-model");

    let app = build_app_from_env().await.unwrap();
    let login = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "test-user", "password": "test-password-only" })),
        &[],
    )
    .await;
    assert_eq!(login.status, StatusCode::OK);
    let cookie = login
        .headers
        .get(header::SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_string();

    let res = request(
        &app,
        Method::POST,
        "/api/coach/boundary-suggestions",
        Some(json!({
            "profile": { "id": "profile-ai", "targetRole": "Java + AI 工程化", "roleFamily": "backend" },
            "knowledgeBoundaries": [{ "topic": "Redis" }],
            "text": "JD 要求 RAG、Agent、Java 工程化，面试反馈需要说明检索召回和幻觉边界。"
        })),
        &[("cookie", cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["provider"], "anthropic-compatible");
    assert_eq!(res.json["model"], "mock-boundary-model");
    assert_eq!(res.json["inputSummaryHash"], "provider-boundary-rust");
    let topics = res.json["suggestions"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["topic"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert!(topics.contains(&"RAG"));
    assert!(!topics.contains(&"Redis"));
}

async fn request(
    app: &axum::Router,
    method: Method,
    uri: &str,
    body: Option<Value>,
    headers: &[(&str, &str)],
) -> TestResponse {
    let body = body.map(|value| value.to_string()).unwrap_or_default();
    let mut builder = Request::builder().method(method).uri(uri);
    if !body.is_empty() {
        builder = builder.header(header::CONTENT_TYPE, "application/json");
    }
    for (key, value) in headers {
        builder = builder.header(*key, *value);
    }
    let response = app
        .clone()
        .oneshot(builder.body(Body::from(body)).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    TestResponse {
        status,
        headers,
        json,
    }
}

async fn start_mock_boundary_provider() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        loop {
            let Ok((mut stream, _)) = listener.accept().await else {
                break;
            };
            tokio::spawn(async move {
                let mut buffer = [0_u8; 4096];
                let _ = stream.read(&mut buffer).await;
                let text = json!({
                    "inputSummaryHash": "provider-boundary-rust",
                    "suggestions": [
                        { "topic": "Redis", "level": "可讲", "gap": "应被过滤", "evidence": "已有 Redis", "targetUse": "过滤验证", "sourceSummary": "Redis 已存在", "confidence": "high" },
                        { "topic": "RAG", "level": "了解", "gap": "补齐检索召回和幻觉边界", "evidence": "JD 要求 RAG 和 Agent", "targetUse": "Java + AI 工程化岗位表达", "sourceSummary": "JD 要求 RAG、Agent、Java 工程化", "confidence": "high" }
                    ]
                }).to_string();
                let body = json!({ "content": [{ "type": "text", "text": text }] }).to_string();
                let response = format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes()).await;
            });
        }
    });
    format!("http://{addr}")
}

fn clear_env() {
    for key in [
        "JOB_SPRINT_RUNTIME_DB_PATH",
        "RUNTIME_DATA_PATH",
        "JOB_SPRINT_AUTH_USER",
        "JOB_SPRINT_AUTH_PASSWORD",
        "JOB_SPRINT_SESSION_SECRET",
        "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_MODEL",
    ] {
        remove_env(key);
    }
}

fn set_env<K: AsRef<std::ffi::OsStr>, V: AsRef<std::ffi::OsStr>>(key: K, value: V) {
    unsafe {
        env::set_var(key, value);
    }
}

fn remove_env<K: AsRef<std::ffi::OsStr>>(key: K) {
    unsafe {
        env::remove_var(key);
    }
}

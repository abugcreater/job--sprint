use axum::{
    body::{Body, to_bytes},
    http::{Method, Request, StatusCode, header},
};
use job_sprint_rust_api::build_app_from_env;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::row::Row;
use sqlx_sqlite::SqlitePool;
use std::{env, fs};
use tempfile::tempdir;
use tower::ServiceExt;

#[path = "runtime_contract/boundary_feedback.rs"]
mod boundary_feedback;
#[path = "runtime_contract/coach_onboarding.rs"]
mod coach_onboarding;
#[path = "runtime_contract/invitation_account.rs"]
mod invitation_account;
#[path = "runtime_contract/mock_provider.rs"]
mod mock_provider;
#[path = "runtime_contract/multi_user.rs"]
mod multi_user;
#[path = "runtime_contract/outcomes.rs"]
mod outcomes;

struct TestResponse {
    status: StatusCode,
    headers: axum::http::HeaderMap,
    json: Value,
    raw: String,
}

#[tokio::test]
async fn runtime_contract_matches_node_core_api() {
    clear_job_sprint_env();
    set_env("JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS", "60000");
    set_env("JOB_SPRINT_LOGIN_RATE_LIMIT_MAX", "8");
    set_env("ANTHROPIC_AUTH_TOKEN", "test-token-that-must-not-leak");

    let tmp = tempdir().unwrap();
    let db_path = tmp.path().join("runtime.sqlite3");
    let legacy_runtime_path = tmp.path().join("runtime.json");
    set_env("JOB_SPRINT_RUNTIME_DB_PATH", &db_path);
    set_env("RUNTIME_DATA_PATH", &legacy_runtime_path);
    set_env("JOB_SPRINT_AUTH_USER", "test-user");
    set_env("JOB_SPRINT_AUTH_PASSWORD", "test-password-only");
    set_env(
        "JOB_SPRINT_SESSION_SECRET",
        "test-session-secret-only-long-enough",
    );
    fs::write(
        &legacy_runtime_path,
        json!({
            "schemaVersion": 2,
            "users": {
                "test-user": {
                    "progress": { "completed": { "legacy-json": true } },
                    "reviews": { "2026-07-03": { "projectPoint": "legacy runtime json" } },
                    "applications": [],
                    "interviewMistakes": []
                }
            }
        })
        .to_string(),
    )
    .unwrap();

    let app = build_app_from_env().await.unwrap();
    let db = SqlitePool::connect(&format!("sqlite://{}", db_path.display()))
        .await
        .unwrap();
    let user_row = sqlx::query::query("SELECT username, role, data_scope FROM users WHERE username = ?")
        .bind("test-user")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(user_row.get::<String, _>("username"), "test-user");
    assert_eq!(user_row.get::<String, _>("role"), "owner");
    assert_eq!(user_row.get::<String, _>("data_scope"), "test-user");

    let mut res = request(&app, Method::GET, "/api/health", None, &[]).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["ok"], true);
    assert_eq!(res.json["authConfigured"], true);
    assert_eq!(res.json["runtimeStorage"], "sqlite");
    assert!(!res.raw.contains("test-token-that-must-not-leak"));

    res = request(&app, Method::GET, "/job-sprint/api/health", None, &[]).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["runtimeStorage"], "sqlite");

    res = request(&app, Method::GET, "/api/progress", None, &[]).await;
    assert_eq!(res.status, StatusCode::UNAUTHORIZED);

    let login = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "test-user", "password": "test-password-only" })),
        &[],
    )
    .await;
    assert_eq!(login.status, StatusCode::OK);
    let cookie = response_cookie(&login);
    assert!(cookie.contains("HttpOnly"));
    assert!(cookie.contains("SameSite=Lax"));
    assert!(cookie.contains("Max-Age="));
    let session_cookie = cookie.split(';').next().unwrap().to_string();

    res = request(
        &app,
        Method::GET,
        "/api/auth/session",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["authenticated"], true);
    assert_eq!(res.json["user"]["username"], "test-user");

    res = request(
        &app,
        Method::GET,
        "/api/runtime",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(
        res.json["data"]["progress"]["completed"]["legacy-json"],
        true
    );
    assert_eq!(
        res.json["data"]["reviews"]["2026-07-03"]["projectPoint"],
        "legacy runtime json"
    );

    res = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "test-user", "password": "test-password-only" })),
        &[("x-forwarded-proto", "https")],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert!(response_cookie(&res).contains("Secure"));

    for _ in 0..8 {
        res = request(
            &app,
            Method::POST,
            "/api/auth/login",
            Some(json!({ "username": "rate-limited-user", "password": "wrong-password" })),
            &[],
        )
        .await;
        assert_eq!(res.status, StatusCode::UNAUTHORIZED);
    }
    res = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "rate-limited-user", "password": "wrong-password" })),
        &[],
    )
    .await;
    assert_eq!(res.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(res.json["error"], "too_many_login_attempts");
    assert!(res.headers.get(header::RETRY_AFTER).is_some());

    res = request(
        &app,
        Method::POST,
        "/api/progress",
        Some(json!({ "block-1": true })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["progress"]["block-1"], true);
    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.json["progress"]["block-1"], true);

    res = request(
        &app,
        Method::POST,
        "/api/progress",
        Some(json!({ "remoteAcceptance": { "marker": true } })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["progress"]["block-1"], true);
    assert_eq!(res.json["progress"]["remoteAcceptance"]["marker"], true);
    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.json["progress"]["remoteAcceptance"]["marker"], true);

    res = request(
        &app,
        Method::POST,
        "/api/reviews",
        Some(json!({ "2026-07-01": { "projectPoint": "API runtime" } })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    res = request(
        &app,
        Method::GET,
        "/api/reviews",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(
        res.json["reviews"]["2026-07-01"]["projectPoint"],
        "API runtime"
    );

    res = request(
        &app,
        Method::POST,
        "/api/applications",
        Some(json!({ "company": "Example", "role": "Senior Java", "status": "todo" })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::CREATED);
    let application_id = res.json["application"]["id"].as_str().unwrap().to_string();
    res = request(
        &app,
        Method::PUT,
        &format!("/api/applications/{application_id}"),
        Some(json!({ "status": "contacted" })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["application"]["status"], "contacted");
    res = request(
        &app,
        Method::DELETE,
        &format!("/api/applications/{application_id}"),
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["applications"].as_array().unwrap().len(), 0);
    res = request(
        &app,
        Method::POST,
        "/api/applications",
        Some(json!({ "applications": [{ "id": "offline-app", "company": "Offline", "role": "Java AI" }] })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["applications"][0]["id"], "offline-app");

    res = request(
        &app,
        Method::POST,
        "/api/interview-mistakes",
        Some(json!({ "question": "G1 vs ZGC", "score": 62 })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::CREATED);
    let mistake_id = res.json["interviewMistake"]["id"]
        .as_str()
        .unwrap()
        .to_string();
    res = request(
        &app,
        Method::GET,
        "/api/interview-mistakes",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.json["interviewMistakes"].as_array().unwrap().len(), 1);
    res = request(
        &app,
        Method::DELETE,
        &format!("/api/interview-mistakes/{mistake_id}"),
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["interviewMistakes"].as_array().unwrap().len(), 0);
    res = request(
        &app,
        Method::POST,
        "/api/interview-mistakes",
        Some(json!({ "interviewMistakes": [{ "id": "offline-mistake", "question": "Spring tx", "score": 58 }] })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["interviewMistakes"][0]["id"], "offline-mistake");

    res = request(
        &app,
        Method::POST,
        "/api/runtime",
        Some(json!({
            "data": {
                "progress": { "completed": { "runtime-sync": true } },
                "reviews": { "2026-07-04": { "projectPoint": "Rust runtime" } },
                "applications": [{ "id": "runtime-app", "company": "Runtime DB", "role": "Rust API" }],
                "interviewMistakes": [{ "id": "runtime-mistake", "question": "SQLite WAL?", "score": 71 }]
            }
        })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["storage"], "sqlite");
    assert_eq!(
        res.json["data"]["progress"]["completed"]["runtime-sync"],
        true
    );
    assert_eq!(
        res.json["data"]["progress"]["remoteAcceptance"]["marker"],
        true
    );
    res = request(
        &app,
        Method::GET,
        "/api/runtime",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(
        res.json["data"]["reviews"]["2026-07-04"]["projectPoint"],
        "Rust runtime"
    );
    assert_eq!(res.json["data"]["applications"][0]["id"], "runtime-app");
    assert_eq!(
        res.json["data"]["interviewMistakes"][0]["id"],
        "runtime-mistake"
    );
    let runtime_db_rows = sqlx::query::query("SELECT item_key, value FROM runtime_items WHERE scope = ?")
        .bind("test-user")
        .fetch_all(&db)
        .await
        .unwrap();
    let runtime_db_map = runtime_db_rows
        .into_iter()
        .map(|row| {
            (
                row.get::<String, _>("item_key"),
                serde_json::from_str::<Value>(&row.get::<String, _>("value")).unwrap(),
            )
        })
        .collect::<std::collections::HashMap<_, _>>();
    assert_eq!(
        runtime_db_map["progress"]["completed"]["runtime-sync"],
        true
    );
    assert_eq!(
        runtime_db_map["progress"]["remoteAcceptance"]["marker"],
        true
    );
    assert_eq!(
        runtime_db_map["reviews"]["2026-07-04"]["projectPoint"],
        "Rust runtime"
    );
    assert_eq!(runtime_db_map["applications"][0]["id"], "runtime-app");
    assert_eq!(
        runtime_db_map["interview_mistakes"][0]["id"],
        "runtime-mistake"
    );

    res = request(
        &app,
        Method::POST,
        "/api/generate-kb",
        Some(json!({ "topic": "Rust 后端入库" })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["provider"], "local-fallback");
    assert!(!res.json["entries"].as_array().unwrap().is_empty());
    assert!(!res.raw.contains("test-token-that-must-not-leak"));

    res = request(
        &app,
        Method::POST,
        "/api/coach/artifacts",
        Some(json!({ "knowledgeBoundaries": [] })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::BAD_REQUEST);
    assert_eq!(res.json["error"], "profile_required");

    res = request(
        &app,
        Method::POST,
        "/api/coach/artifacts",
        Some(json!({
            "profile": {
                "id": "profile-kai",
                "targetRole": "后端工程师",
                "roleFamily": "backend",
                "dailyMinutes": 60
            },
            "knowledgeBoundaries": [
                { "topic": "MQ 幂等", "level": "了解", "gap": "缺少故障证据" }
            ],
            "opportunitySignals": [{ "company": "杭研平台", "role": "高级 Java 后端", "status": "约面", "keywords": ["MQ", "Redis", "稳定性"], "feedback": "面试官关注故障恢复" }],
            "sprint": { "date": "2026-07-06", "currentTask": { "title": "补 MQ 幂等证据" } }
        })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["provider"], "local-fallback");
    assert_eq!(res.json["artifacts"][0]["profileId"], "profile-kai");
    assert_eq!(res.json["artifacts"][0]["status"], "draft");
    assert_eq!(res.json["artifacts"][0]["type"], "knowledge_card");
    let first_coach_artifact = &res.json["artifacts"][0];
    let role_source = first_coach_artifact["sources"][1].as_str().unwrap();
    let role_body = first_coach_artifact["body"].as_str().unwrap();
    let opportunity_source = first_coach_artifact["sources"][3].as_str().unwrap();
    let reason = first_coach_artifact["reason"].as_str().unwrap();
    assert!(role_source.contains("角色视角：服务链路") && role_body.contains("接口/任务链路"));
    let opportunity_ok = opportunity_source.contains("机会：杭研平台-高级 Java 后端")
        && reason.contains("面试官关注故障恢复");
    assert!(opportunity_ok);
    assert_eq!(res.json["llmRun"]["profileId"], "profile-kai");
    assert_eq!(res.json["llmRun"]["provider"], "local-fallback");
    assert_eq!(res.json["llmRun"]["status"], "fallback");
    assert_eq!(res.json["llmRun"]["schemaStatus"], "pass");
    assert_eq!(res.json["llmRun"]["artifactCount"], 3);
    let coach_artifact_id = res.json["artifacts"][0]["id"].as_str().unwrap().to_string();
    let coach_llm_run_id = res.json["llmRun"]["id"].as_str().unwrap().to_string();

    res = request(
        &app,
        Method::POST,
        "/api/coach/feedback",
        Some(json!({
            "profileId": "profile-kai",
            "artifactId": coach_artifact_id,
            "llmRunId": coach_llm_run_id,
            "artifactType": "knowledge_card",
            "decision": "accepted",
            "reason": "合同测试采纳",
            "title": "MQ 幂等知识卡"
        })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["feedback"]["profileId"], "profile-kai");
    assert_eq!(res.json["feedback"]["decision"], "accepted");
    assert_eq!(res.json["feedback"]["artifactType"], "knowledge_card");
    assert_eq!(res.json["summary"]["reviewedCount"], 1);
    assert_eq!(res.json["summary"]["acceptedCount"], 1);
    assert_eq!(res.json["summary"]["acceptanceRateLabel"], "100%");

    res = request(
        &app,
        Method::GET,
        "/api/coach/feedback",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["feedback"][0]["profileId"], "profile-kai");
    assert_eq!(res.json["feedback"][0]["decision"], "accepted");
    assert_eq!(res.json["feedback"][0]["title"], "MQ 幂等知识卡");
    assert_eq!(res.json["summary"]["reviewedCount"], 1);
    assert_eq!(res.json["summary"]["qualityLabel"], "建议贴合");

    let feedback_row = sqlx::query::query(
        "SELECT scope, profile_id, artifact_id, llm_run_id, artifact_type, decision FROM llm_feedback WHERE scope = ?",
    )
    .bind("test-user")
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(feedback_row.get::<String, _>("scope"), "test-user");
    assert_eq!(feedback_row.get::<String, _>("profile_id"), "profile-kai");
    assert_eq!(
        feedback_row.get::<String, _>("artifact_id"),
        res.json["feedback"][0]["artifactId"].as_str().unwrap()
    );
    assert_eq!(
        feedback_row.get::<String, _>("llm_run_id"),
        res.json["feedback"][0]["llmRunId"].as_str().unwrap()
    );
    assert_eq!(
        feedback_row.get::<String, _>("artifact_type"),
        "knowledge_card"
    );
    assert_eq!(feedback_row.get::<String, _>("decision"), "accepted");

    outcomes::verify_coach_outcomes(&app, session_cookie.as_str()).await;

    boundary_feedback::verify_boundary_feedback(&app, &db, session_cookie.as_str()).await;

    coach_onboarding::verify_coach_onboarding_events(&app, &db, session_cookie.as_str()).await;

    res = request(
        &app,
        Method::GET,
        "/api/coach/llm-runs",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["runs"][0]["profileId"], "profile-kai");
    assert_eq!(res.json["runs"][0]["promptVersion"], "coach-artifacts-v1");
    assert_eq!(
        res.json["runs"][0]["schemaVersion"],
        "coach-artifact-list-v1"
    );
    assert_eq!(res.json["runs"][0]["status"], "fallback");

    let llm_run_row = sqlx::query::query(
        "SELECT scope, profile_id, provider, status, artifact_count FROM llm_runs WHERE scope = ?",
    )
    .bind("test-user")
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(llm_run_row.get::<String, _>("scope"), "test-user");
    assert_eq!(llm_run_row.get::<String, _>("profile_id"), "profile-kai");
    assert_eq!(llm_run_row.get::<String, _>("provider"), "local-fallback");
    assert_eq!(llm_run_row.get::<String, _>("status"), "fallback");
    assert_eq!(llm_run_row.get::<i64, _>("artifact_count"), 3);

    let provider_url = mock_provider::start_mock_anthropic_provider().await;
    set_env("ANTHROPIC_BASE_URL", provider_url);
    set_env("ANTHROPIC_MODEL", "mock-coach-model");
    set_env("ANTHROPIC_INPUT_COST_PER_MILLION", "3");
    set_env("ANTHROPIC_OUTPUT_COST_PER_MILLION", "15");
    res = request(
        &app,
        Method::POST,
        "/api/coach/artifacts",
        Some(json!({
            "profile": { "id": "profile-kai", "targetRole": "实施工程师", "roleFamily": "implementation" },
            "knowledgeBoundaries": [{ "topic": "客户现场问题闭环", "level": "了解", "gap": "缺少复盘证据" }],
            "sprint": { "date": "2026-07-06" }
        })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["provider"], "anthropic-compatible");
    assert_eq!(res.json["model"], "mock-coach-model");
    assert_eq!(res.json["artifacts"][0]["sourceType"], "generated-ai");
    assert_eq!(res.json["usage"]["inputTokens"], 111);
    assert_eq!(res.json["usage"]["outputTokens"], 222);
    assert!(res.json["estimatedCostUsd"].as_f64().unwrap() > 0.0);
    let provider_llm_run_id = res.json["llmRun"]["id"].as_str().unwrap().to_string();

    res = request(
        &app,
        Method::GET,
        "/api/coach/llm-runs",
        None,
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert!(res.json["runs"].as_array().unwrap().iter().any(|run| {
        run["id"] == provider_llm_run_id
            && run["provider"] == "anthropic-compatible"
            && run["inputTokens"] == 111
            && run["outputTokens"] == 222
            && run["latencyMs"].as_i64().unwrap_or(0) >= 0
    }));

    let provider_run_row = sqlx::query::query(
        "SELECT provider, status, input_tokens, output_tokens, latency_ms, estimated_cost_usd FROM llm_runs WHERE id = ?",
    )
    .bind(&provider_llm_run_id)
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(
        provider_run_row.get::<String, _>("provider"),
        "anthropic-compatible"
    );
    assert_eq!(provider_run_row.get::<String, _>("status"), "success");
    assert_eq!(provider_run_row.get::<i64, _>("input_tokens"), 111);
    assert_eq!(provider_run_row.get::<i64, _>("output_tokens"), 222);
    assert!(provider_run_row.get::<i64, _>("latency_ms") >= 0);
    assert!(
        provider_run_row
            .get::<f64, _>("estimated_cost_usd")
            .is_sign_positive()
    );
    remove_env("ANTHROPIC_BASE_URL");
    remove_env("ANTHROPIC_MODEL");
    remove_env("ANTHROPIC_INPUT_COST_PER_MILLION");
    remove_env("ANTHROPIC_OUTPUT_COST_PER_MILLION");

    res = request(
        &app,
        Method::POST,
        "/api/score-answer",
        Some(json!({ "question": "为什么用 Rust?", "answer": "先讲边界，再讲 API、SQLite、测试和回滚。" })),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["provider"], "local-fallback");

    res = raw_request(
        &app,
        Method::POST,
        "/api/progress",
        "{bad json",
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::BAD_REQUEST);
    assert_eq!(res.json["error"], "bad_json");

    res = request(
        &app,
        Method::POST,
        "/api/auth/logout",
        Some(json!({})),
        &[("cookie", session_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    let logged_out_cookie = response_cookie(&res).split(';').next().unwrap().to_string();
    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("cookie", logged_out_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::UNAUTHORIZED);

    multi_user::verify_multi_user_permissions().await;
    invitation_account::verify_invitation_account_provisioning().await;
}

async fn request(
    app: &axum::Router,
    method: Method,
    uri: &str,
    body: Option<Value>,
    headers: &[(&str, &str)],
) -> TestResponse {
    let body = body.map(|value| value.to_string()).unwrap_or_default();
    raw_request(app, method, uri, &body, headers).await
}

async fn raw_request(
    app: &axum::Router,
    method: Method,
    uri: &str,
    body: &str,
    headers: &[(&str, &str)],
) -> TestResponse {
    let mut builder = Request::builder().method(method).uri(uri);
    if !body.is_empty() {
        builder = builder.header(header::CONTENT_TYPE, "application/json");
    }
    for (key, value) in headers {
        builder = builder.header(*key, *value);
    }
    let response = app
        .clone()
        .oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let raw = String::from_utf8(bytes.to_vec()).unwrap();
    let json = serde_json::from_str(&raw).unwrap_or(Value::Null);
    TestResponse {
        status,
        headers,
        json,
        raw,
    }
}

fn response_cookie(response: &TestResponse) -> String {
    response
        .headers
        .get(header::SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap()
        .to_string()
}

fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn clear_job_sprint_env() {
    for key in [
        "DATABASE_URL",
        "JOB_SPRINT_RUNTIME_DB_PATH",
        "RUNTIME_DB_PATH",
        "JOB_SPRINT_AUTH_DISABLED",
        "JOB_SPRINT_AUTH_USER",
        "JOB_SPRINT_AUTH_PASSWORD",
        "JOB_SPRINT_AUTH_PASSWORD_SHA256",
        "JOB_SPRINT_SESSION_SECRET",
        "JOB_SPRINT_USERS_JSON",
        "JOB_SPRINT_USERS_FILE",
        "JOB_SPRINT_BEARER_TOKENS_JSON",
        "JOB_SPRINT_BEARER_TOKENS_FILE",
        "JOB_SPRINT_COOKIE_SECURE",
        "JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS",
        "JOB_SPRINT_LOGIN_RATE_LIMIT_MAX",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_INPUT_COST_PER_MILLION",
        "ANTHROPIC_OUTPUT_COST_PER_MILLION",
        "AI_PROVIDER_TIMEOUT_MS",
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

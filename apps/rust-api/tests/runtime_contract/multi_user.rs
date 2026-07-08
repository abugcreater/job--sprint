use super::{clear_job_sprint_env, raw_request, request, response_cookie, set_env, sha256_hex};
use axum::http::{Method, StatusCode};
use job_sprint_rust_api::build_app_from_env;
use serde_json::{Value, json};
use sqlx::Row;
use tempfile::tempdir;

struct CoachRuntimeSeed<'a> {
    prefix: &'a str,
    profile_id: &'a str,
    role_family: &'a str,
    target_role: &'a str,
    boundary_topic: &'a str,
    schedule_title: &'a str,
    artifact_title: &'a str,
    timestamp: &'a str,
}

pub async fn verify_multi_user_permissions() {
    clear_job_sprint_env();
    let tmp = tempdir().unwrap();
    let kai_password = "kai-test-password";
    let guest_password = "guest-test-password";
    let alex_password = "alex-test-password";
    let bearer_token = "opaque-test-token";
    let db_path = tmp.path().join("runtime.sqlite3");
    set_env("JOB_SPRINT_RUNTIME_DB_PATH", &db_path);
    set_env(
        "JOB_SPRINT_SESSION_SECRET",
        "test-session-secret-for-multi-user-auth",
    );
    set_env(
        "JOB_SPRINT_USERS_JSON",
        json!({
            "users": [
                {
                    "username": "kai",
                    "displayName": "Kai",
                    "role": "owner",
                    "dataScope": "kai",
                    "inviteBatch": "2026-07-alpha",
                    "passwordHash": sha256_hex(kai_password)
                },
                {
                    "username": "guest",
                    "displayName": "Guest",
                    "role": "viewer",
                    "dataScope": "guest",
                    "passwordHash": sha256_hex(guest_password)
                },
                {
                    "username": "alex",
                    "displayName": "Alex",
                    "role": "coach",
                    "dataScope": "alex",
                    "inviteBatch": "2026-07-alpha",
                    "passwordHash": sha256_hex(alex_password)
                }
            ]
        })
        .to_string(),
    );
    set_env(
        "JOB_SPRINT_BEARER_TOKENS_JSON",
        json!({
            "tokens": [
                {
                    "label": "test automation",
                    "username": "kai",
                    "tokenHash": sha256_hex(bearer_token),
                    "permissions": ["runtime:write", "ai:use"]
                }
            ]
        })
        .to_string(),
    );

    let app = build_app_from_env().await.unwrap();
    let mut res = request(&app, Method::GET, "/api/health", None, &[]).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["authConfigured"], true);
    assert_eq!(res.json["userCount"], 3);
    assert_eq!(res.json["bearerTokenCount"], 1);
    assert!(!res.raw.contains(kai_password));
    assert!(!res.raw.contains(guest_password));
    assert!(!res.raw.contains(alex_password));
    assert!(!res.raw.contains(bearer_token));

    let guest_cookie = login_cookie(&app, "guest", guest_password).await;
    res = request(
        &app,
        Method::GET,
        "/api/auth/session",
        None,
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["user"]["username"], "guest");
    assert_eq!(res.json["user"]["role"], "viewer");
    assert_eq!(res.json["user"]["readOnly"], true);

    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["readOnly"], true);
    assert_eq!(res.json["progress"], json!({}));

    res = request(
        &app,
        Method::POST,
        "/api/progress",
        Some(json!({ "block-1": true })),
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::FORBIDDEN);

    res = raw_request(
        &app,
        Method::GET,
        "/data/interview_context.json",
        "",
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["version"], "profile-generated-v1-public-safe");
    assert!(res.json["profile"].is_null());
    assert_eq!(res.json["questionBank"], json!([]));
    assert!(!res.raw.contains("candidate-interview-context-v1"));
    assert!(!res.raw.contains("高级 Java"));
    assert!(!res.raw.contains("/path/to/local-user"));

    res = raw_request(
        &app,
        Method::GET,
        "/assets/embedded-data.js",
        "",
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert!(res.raw.contains("public-safe"));
    assert!(!res.raw.contains("/path/to/local-user"));

    let alex_cookie = login_cookie(&app, "alex", alex_password).await;
    res = request(
        &app,
        Method::GET,
        "/api/auth/session",
        None,
        &[("cookie", alex_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["user"]["username"], "alex");
    assert_eq!(res.json["user"]["role"], "coach");
    assert_eq!(res.json["user"]["dataScope"], "alex");
    assert_eq!(res.json["user"]["inviteBatch"], "2026-07-alpha");
    assert_eq!(res.json["user"]["readOnly"], false);

    res = request(
        &app,
        Method::POST,
        "/api/runtime",
        Some(json!({
            "data": coach_runtime(CoachRuntimeSeed {
                prefix: "Alex 前端",
                profile_id: "profile-alex",
                role_family: "frontend",
                target_role: "前端工程师",
                boundary_topic: "前端性能边界",
                schedule_title: "Alex 补前端性能证据",
                artifact_title: "Alex 前端性能表达卡",
                timestamp: "2026-07-06T10:00:00.000Z",
            })
        })),
        &[("cookie", alex_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["data"]["progress"]["coach"]["userProfiles"][0]["name"],
        "Alex 前端画像"
    );

    let kai_cookie = login_cookie(&app, "kai", kai_password).await;
    res = raw_request(
        &app,
        Method::GET,
        "/data/interview_context.json",
        "",
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["version"], "profile-generated-v1");
    assert!(res.json["profile"].is_null());
    assert_eq!(res.json["questionBank"], json!([]));
    assert!(!res.raw.contains("candidate-interview-context-v1"));
    assert!(!res.raw.contains("高级 Java"));
    assert!(!res.raw.contains("/path/to/local-user"));

    res = request(
        &app,
        Method::POST,
        "/api/progress",
        Some(json!({ "kai-block": true })),
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);

    let mut kai_runtime = coach_runtime(CoachRuntimeSeed {
        prefix: "Kai 后端",
        profile_id: "profile-kai",
        role_family: "backend",
        target_role: "后端工程师",
        boundary_topic: "MQ 幂等边界",
        schedule_title: "Kai 讲 MQ 幂等",
        artifact_title: "Kai MQ 幂等追问",
        timestamp: "2026-07-06T10:05:00.000Z",
    });
    kai_runtime["progress"]["kai-block"] = json!(true);
    res = request(
        &app,
        Method::POST,
        "/api/runtime",
        Some(json!({ "data": kai_runtime })),
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["data"]["progress"]["coach"]["userProfiles"][0]["name"],
        "Kai 后端画像"
    );

    res = request(
        &app,
        Method::GET,
        "/api/runtime",
        None,
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["data"]["progress"]["coach"]["userProfiles"][0]["name"],
        "Kai 后端画像"
    );
    assert!(!res.raw.contains("Alex 前端画像"));
    assert!(!res.raw.contains("Alex 补前端性能证据"));

    res = request(
        &app,
        Method::GET,
        "/api/runtime",
        None,
        &[("cookie", alex_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["data"]["progress"]["coach"]["userProfiles"][0]["name"],
        "Alex 前端画像"
    );
    assert_eq!(
        res.json["data"]["progress"]["coach"]["knowledgeBoundaries"][0]["topic"],
        "前端性能边界"
    );
    assert_eq!(
        res.json["data"]["progress"]["coach"]["coachScheduleEvents"][0]["title"],
        "Alex 补前端性能证据"
    );
    assert_eq!(
        res.json["data"]["progress"]["coach"]["aiArtifacts"][0]["title"],
        "Alex 前端性能表达卡"
    );
    assert!(!res.raw.contains("Kai 后端画像"));
    assert!(!res.raw.contains("Kai 讲 MQ 幂等"));

    let db = sqlx::SqlitePool::connect(&format!("sqlite://{}", db_path.display()))
        .await
        .unwrap();
    let kai_row = sqlx::query("SELECT value FROM runtime_items WHERE scope = ? AND item_key = ?")
        .bind("kai")
        .bind("progress")
        .fetch_one(&db)
        .await
        .unwrap();
    let alex_row = sqlx::query("SELECT value FROM runtime_items WHERE scope = ? AND item_key = ?")
        .bind("alex")
        .bind("progress")
        .fetch_one(&db)
        .await
        .unwrap();
    let kai_progress: Value = serde_json::from_str(&kai_row.get::<String, _>("value")).unwrap();
    let alex_progress: Value = serde_json::from_str(&alex_row.get::<String, _>("value")).unwrap();
    assert_eq!(
        kai_progress["coach"]["userProfiles"][0]["name"],
        "Kai 后端画像"
    );
    assert_eq!(
        alex_progress["coach"]["userProfiles"][0]["name"],
        "Alex 前端画像"
    );
    assert!(!kai_progress.to_string().contains("Alex 前端画像"));
    assert!(!alex_progress.to_string().contains("Kai 后端画像"));

    res = request(
        &app,
        Method::GET,
        "/api/coach/invitations",
        None,
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::FORBIDDEN);

    res = request(
        &app,
        Method::GET,
        "/api/coach/invitations",
        None,
        &[("cookie", alex_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::FORBIDDEN);

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "username": "mia",
            "displayName": "Mia",
            "dataScope": "mia",
            "inviteBatch": "2026-07-beta",
            "templateVersion": "jd-focus-v1",
            "roleFamily": "qa",
            "targetRole": "测试开发工程师",
            "status": "invited",
            "note": "首批泛 IT 试用用户"
        })),
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK, "{}", res.raw);
    assert_eq!(res.json["invitation"]["username"], "mia");
    assert_eq!(res.json["invitation"]["inviteBatch"], "2026-07-beta");
    assert_eq!(res.json["invitation"]["templateVersion"], "jd-focus-v1");
    assert_eq!(res.json["summary"]["invitedCount"], 1);
    assert_eq!(res.json["summary"]["templateVersionCount"], 1);
    assert_eq!(
        res.json["summary"]["nextActionLabel"],
        "为 active 用户开通账号、发送登录入口，并跟进首登完成率。"
    );

    res = request(
        &app,
        Method::GET,
        "/api/coach/invitations",
        None,
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["invitations"][0]["username"], "mia");
    assert_eq!(res.json["invitations"][0]["templateVersion"], "jd-focus-v1");
    assert_eq!(res.json["configuredUsers"].as_array().unwrap().len(), 3);
    assert_eq!(
        res.json["configuredUsers"][0]["inviteBatch"],
        "2026-07-alpha"
    );

    let invitation_row = sqlx::query(
        "SELECT invite_batch, template_version, role_family, status FROM coach_invitations WHERE username = ?",
    )
    .bind("mia")
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(
        invitation_row.get::<String, _>("invite_batch"),
        "2026-07-beta"
    );
    assert_eq!(
        invitation_row.get::<String, _>("template_version"),
        "jd-focus-v1"
    );
    assert_eq!(invitation_row.get::<String, _>("role_family"), "qa");
    assert_eq!(invitation_row.get::<String, _>("status"), "invited");

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "operation": "batch-status",
            "inviteBatch": "2026-07-beta",
            "status": "paused"
        })),
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK, "{}", res.raw);
    assert_eq!(res.json["batchAction"]["status"], "PASS");
    assert_eq!(res.json["batchAction"]["affectedCount"], 1);
    assert_eq!(res.json["invitations"][0]["status"], "paused");

    res = request(
        &app,
        Method::DELETE,
        "/api/coach/invitations?username=mia",
        None,
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK, "{}", res.raw);
    assert_eq!(res.json["deletion"]["status"], "PASS");
    assert_eq!(res.json["deletion"]["removedCount"], 1);
    assert!(res.json["invitations"].as_array().unwrap().is_empty());

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "operation": "bulk-import",
            "records": [
                {
                    "username": "nora",
                    "displayName": "Nora",
                    "dataScope": "nora",
                    "inviteBatch": "2026-07-import",
                    "templateVersion": "jd-focus-v1",
                    "roleFamily": "data",
                    "targetRole": "数据分析师",
                    "status": "invited",
                    "note": "批量导入试用用户"
                },
                {
                    "username": "dev",
                    "displayName": "Dev",
                    "dataScope": "dev",
                    "inviteBatch": "2026-07-import",
                    "templateVersion": "role-family-v1",
                    "roleFamily": "frontend",
                    "targetRole": "前端工程师",
                    "status": "invited"
                }
            ]
        })),
        &[("cookie", kai_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK, "{}", res.raw);
    assert_eq!(res.json["importAction"]["status"], "PASS");
    assert_eq!(res.json["importAction"]["importedCount"], 2);
    assert_eq!(res.json["summary"]["totalInvitations"], 2);
    assert!(
        res.json["invitations"]
            .as_array()
            .unwrap()
            .iter()
            .any(|invitation| invitation["username"] == "nora")
    );
    assert!(
        !res.json["configuredUsers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|user| user["username"] == "nora")
    );

    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("cookie", guest_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["progress"], json!({}));

    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("authorization", "Bearer opaque-test-token")],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["progress"]["kai-block"], true);

    res = request(
        &app,
        Method::POST,
        "/api/progress",
        Some(json!({ "bearer-block": true })),
        &[("authorization", "Bearer opaque-test-token")],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["progress"]["bearer-block"], true);
    let row = sqlx::query("SELECT value FROM runtime_items WHERE scope = ? AND item_key = ?")
        .bind("kai")
        .bind("progress")
        .fetch_one(&db)
        .await
        .unwrap();
    let progress: Value = serde_json::from_str(&row.get::<String, _>("value")).unwrap();
    assert_eq!(progress["bearer-block"], true);

    res = request(
        &app,
        Method::GET,
        "/api/progress",
        None,
        &[("authorization", "Bearer wrong-token")],
    )
    .await;
    assert_eq!(res.status, StatusCode::UNAUTHORIZED);
}

fn coach_runtime(seed: CoachRuntimeSeed<'_>) -> Value {
    json!({
        "progress": {
            "coach": {
                "userProfiles": [{
                    "id": seed.profile_id,
                    "name": format!("{}画像", seed.prefix),
                    "roleFamily": seed.role_family,
                    "targetRole": seed.target_role,
                    "targetLevel": "高级",
                    "cities": "杭州",
                    "salaryTarget": "面议",
                    "companyTypes": "产品型公司",
                    "experienceSummary": format!("{}经验摘要", seed.prefix),
                    "projectEvidence": format!("{}项目证据", seed.prefix),
                    "nonClaims": format!("{}不可夸大边界", seed.prefix),
                    "dailyMinutes": 60,
                    "active": true,
                    "createdAt": seed.timestamp,
                    "updatedAt": seed.timestamp
                }],
                "knowledgeBoundaries": [{
                    "id": format!("boundary-{}", seed.profile_id),
                    "profileId": seed.profile_id,
                    "topic": seed.boundary_topic,
                    "level": "可讲",
                    "gap": format!("{}需要补齐的知识边界", seed.prefix),
                    "evidence": format!("{}已有证据", seed.prefix),
                    "targetUse": format!("{} JD", seed.target_role),
                    "createdAt": seed.timestamp,
                    "updatedAt": seed.timestamp
                }],
                "coachScheduleEvents": [{
                    "id": format!("event-{}", seed.profile_id),
                    "profileId": seed.profile_id,
                    "date": "2026-07-06",
                    "start": "20:00",
                    "end": "20:30",
                    "kind": "learning",
                    "title": seed.schedule_title,
                    "reason": format!("{}自己的日程建议", seed.prefix),
                    "evidenceRequired": true,
                    "createdAt": seed.timestamp,
                    "updatedAt": seed.timestamp
                }],
                "aiArtifacts": [{
                    "id": format!("artifact-{}", seed.profile_id),
                    "profileId": seed.profile_id,
                    "type": "knowledge_card",
                    "title": seed.artifact_title,
                    "body": format!("只引用{}的画像和知识边界。", seed.prefix),
                    "reason": format!("来自{}知识边界", seed.prefix),
                    "sources": [
                        format!("画像：{}", seed.target_role),
                        format!("知识边界：{}", seed.boundary_topic)
                    ],
                    "confidence": "high",
                    "status": "draft",
                    "targetDate": "2026-07-06",
                    "createdAt": seed.timestamp,
                    "updatedAt": seed.timestamp
                }]
            },
            "lastSavedAt": seed.timestamp
        },
        "reviews": {},
        "applications": [],
        "interviewMistakes": []
    })
}

async fn login_cookie(app: &axum::Router, username: &str, password: &str) -> String {
    let res = request(
        app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": username, "password": password })),
        &[],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK, "{}", res.raw);
    response_cookie(&res).split(';').next().unwrap().to_string()
}

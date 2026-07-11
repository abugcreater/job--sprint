use super::{clear_job_sprint_env, request, response_cookie, set_env, sha256_hex};
use axum::http::{Method, StatusCode};
use job_sprint_rust_api::build_app_from_env;
use serde_json::json;
use std::fs;
use tempfile::tempdir;

pub(crate) async fn verify_invitation_account_provisioning() {
    clear_job_sprint_env();
    let tmp = tempdir().unwrap();
    let db_path = tmp.path().join("runtime.sqlite3");
    let users_file = tmp.path().join("users.json");
    let owner_password = "Owner-pass-2026!";
    let first_password = "Mia-pass-2026!";
    let reset_password = "Mia-reset-2026!";
    let leo_password = "Leo-pass-2026!";
    set_env("JOB_SPRINT_RUNTIME_DB_PATH", &db_path);
    set_env("JOB_SPRINT_USERS_FILE", &users_file);
    set_env(
        "JOB_SPRINT_SESSION_SECRET",
        "invite-account-provisioning-session-secret",
    );
    fs::write(
        &users_file,
        json!({
            "users": [{
                "username": "kai",
                "displayName": "Kai",
                "role": "owner",
                "dataScope": "kai",
                "inviteBatch": "2026-07-alpha",
                "passwordHash": sha256_hex(owner_password)
            }]
        })
        .to_string(),
    )
    .unwrap();

    let app = build_app_from_env().await.unwrap();
    let owner_login = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "kai", "password": owner_password })),
        &[],
    )
    .await;
    assert_eq!(owner_login.status, StatusCode::OK);
    let owner_cookie = response_cookie(&owner_login)
        .split(';')
        .next()
        .unwrap()
        .to_string();

    let mut res = request(
        &app,
        Method::GET,
        "/api/coach/invitations",
        None,
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountProvisioning"]["enabled"], true);

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "username": "shadow-owner",
            "displayName": "Shadow Owner",
            "dataScope": "shadow-owner",
            "inviteBatch": "2026-07-beta",
            "roleFamily": "qa",
            "targetRole": "测试开发工程师",
            "status": "invited",
            "provisionAccount": true,
            "accountRole": "owner",
            "password": "Shadow-owner-2026!"
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::BAD_REQUEST);
    assert_eq!(
        res.json["accountProvisioning"]["error"],
        "owner_account_role_forbidden"
    );
    assert!(!fs::read_to_string(&users_file)
        .unwrap()
        .contains("shadow-owner"));

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "username": "mia",
            "displayName": "Mia",
            "dataScope": "mia",
            "inviteBatch": "2026-07-beta",
            "roleFamily": "qa",
            "targetRole": "测试开发工程师",
            "status": "invited",
            "provisionAccount": true,
            "accountRole": "coach",
            "password": first_password
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["invitation"]["status"], "active");
    assert_eq!(res.json["accountProvisioning"]["status"], "PASS");
    assert_eq!(res.json["accountProvisioning"]["action"], "created");
    assert_eq!(res.json["accountAuditEvents"][0]["action"], "created");
    assert_eq!(res.json["accountAuditEvents"][0]["actorUsername"], "kai");
    assert_eq!(res.json["accountAuditEvents"][0]["username"], "mia");
    assert!(
        res.json["configuredUsers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|user| user["username"] == "mia")
    );
    assert!(!res.raw.contains(first_password));
    assert!(!res.raw.contains(&sha256_hex(first_password)));

    let users_raw = fs::read_to_string(&users_file).unwrap();
    assert!(
        users_raw.contains("\"username\":\"mia\"") || users_raw.contains("\"username\": \"mia\"")
    );
    assert!(users_raw.contains(&sha256_hex(first_password)));
    assert!(!users_raw.contains(first_password));

    let mia_login = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "mia", "password": first_password })),
        &[],
    )
    .await;
    assert_eq!(mia_login.status, StatusCode::OK);
    let mia_cookie = response_cookie(&mia_login)
        .split(';')
        .next()
        .unwrap()
        .to_string();
    res = request(
        &app,
        Method::GET,
        "/api/auth/session",
        None,
        &[("cookie", mia_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["user"]["username"], "mia");
    assert_eq!(res.json["user"]["dataScope"], "mia");
    assert_eq!(res.json["user"]["inviteBatch"], "2026-07-beta");

    res = request(
        &app,
        Method::POST,
        "/api/runtime",
        Some(json!({
            "data": {
                "progress": { "coach": { "userProfiles": [{ "id": "profile-mia", "name": "Mia 测试开发画像", "active": true }] } },
                "reviews": {},
                "applications": [],
                "interviewMistakes": []
            }
        })),
        &[("cookie", mia_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["data"]["progress"]["coach"]["userProfiles"][0]["name"],
        "Mia 测试开发画像"
    );

    res = request(
        &app,
        Method::GET,
        "/api/runtime",
        None,
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert!(!res.raw.contains("Mia 测试开发画像"));

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "username": "mia",
            "displayName": "Mia",
            "dataScope": "mia",
            "inviteBatch": "2026-07-beta",
            "roleFamily": "qa",
            "targetRole": "测试开发工程师",
            "status": "active",
            "provisionAccount": true,
            "accountRole": "coach",
            "password": reset_password
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountProvisioning"]["action"], "password_reset");
    assert_eq!(res.json["accountAuditEvents"][0]["action"], "password_reset");
    assert_eq!(res.json["accountAuditEvents"][0]["username"], "mia");

    res = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "mia", "password": first_password })),
        &[],
    )
    .await;
    assert_eq!(res.status, StatusCode::UNAUTHORIZED);
    res = request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": "mia", "password": reset_password })),
        &[],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "username": "leo",
            "displayName": "Leo",
            "dataScope": "leo",
            "inviteBatch": "2026-07-beta",
            "roleFamily": "backend",
            "targetRole": "后端工程师",
            "status": "invited",
            "provisionAccount": true,
            "accountRole": "coach",
            "password": leo_password
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountProvisioning"]["action"], "created");
    assert_eq!(
        login_status(&app, "leo", leo_password).await,
        StatusCode::OK
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "operation": "notification-draft",
            "usernames": ["mia", "leo"],
            "channel": "im",
            "baseUrl": "https://example.test"
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["notificationAction"]["status"], "PASS");
    assert_eq!(res.json["notificationAction"]["generatedCount"], 2);
    assert_eq!(
        res.json["notificationAction"]["notifications"][0]["loginUrl"],
        "https://example.test/job-sprint/react/index.html"
    );
    assert!(
        res.json["notificationAction"]["notifications"][0]["body"]
            .as_str()
            .unwrap()
            .contains("密码请通过单独安全渠道")
    );
    assert!(!res.raw.contains(reset_password));
    assert!(!res.raw.contains(leo_password));
    assert!(!res.raw.contains(&sha256_hex(reset_password)));
    assert!(!res.raw.contains(&sha256_hex(leo_password)));

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "operation": "account-batch-status",
            "usernames": ["mia", "leo", "kai", "ghost"],
            "action": "disable"
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountBatchAction"]["affectedCount"], 2);
    assert_eq!(res.json["accountBatchAction"]["skippedCount"], 2);
    assert_eq!(res.json["accountAuditEvents"][0]["action"], "batch_disable");
    assert_eq!(res.json["accountAuditEvents"][0]["affectedCount"], 2);
    assert_eq!(res.json["accountAuditEvents"][0]["skippedCount"], 2);
    assert_eq!(
        login_status(&app, "mia", reset_password).await,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        login_status(&app, "leo", leo_password).await,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        login_status(&app, "kai", owner_password).await,
        StatusCode::OK
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({
            "operation": "account-batch-status",
            "usernames": ["mia", "leo"],
            "action": "enable"
        })),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountBatchAction"]["affectedCount"], 2);
    assert_eq!(
        login_status(&app, "mia", reset_password).await,
        StatusCode::OK
    );
    assert_eq!(
        login_status(&app, "leo", leo_password).await,
        StatusCode::OK
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({"operation": "account-status", "username": "mia", "action": "disable"})),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountAction"]["disabled"], true);
    assert_eq!(
        login_status(&app, "mia", reset_password).await,
        StatusCode::UNAUTHORIZED
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({"operation": "account-status", "username": "mia", "action": "enable"})),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountAction"]["disabled"], false);
    assert_eq!(
        login_status(&app, "mia", reset_password).await,
        StatusCode::OK
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({"operation": "account-status", "username": "kai", "action": "disable"})),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::BAD_REQUEST);

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(json!({"operation": "account-status", "username": "mia", "action": "delete"})),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountAction"]["removedCount"], 1);
    assert_eq!(res.json["accountAuditEvents"][0]["action"], "delete");
    assert_eq!(res.json["accountAuditEvents"][0]["username"], "mia");
    assert_eq!(
        login_status(&app, "mia", reset_password).await,
        StatusCode::UNAUTHORIZED
    );

    res = request(
        &app,
        Method::POST,
        "/api/coach/invitations",
        Some(
            json!({"operation": "account-batch-status", "usernames": ["leo"], "action": "delete"}),
        ),
        &[("cookie", owner_cookie.as_str())],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["accountBatchAction"]["affectedCount"], 1);
    let users_config: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&users_file).unwrap()).unwrap();
    let audit_events = users_config["accountAuditEvents"].as_array().unwrap();
    assert!(audit_events.iter().any(|event| event["action"] == "created" && event["username"] == "mia"));
    assert!(audit_events.iter().any(|event| {
        event["action"] == "batch_delete"
            && event["affectedUsernames"]
                .as_array()
                .unwrap()
                .iter()
                .any(|username| username == "leo")
    }));
    let audit_raw = serde_json::to_string(audit_events).unwrap();
    assert!(!audit_raw.contains(first_password));
    assert!(!audit_raw.contains(reset_password));
    assert!(!audit_raw.contains(leo_password));
    assert_eq!(
        login_status(&app, "leo", leo_password).await,
        StatusCode::UNAUTHORIZED
    );
}

async fn login_status(app: &axum::Router, username: &str, password: &str) -> StatusCode {
    request(
        app,
        Method::POST,
        "/api/auth/login",
        Some(json!({ "username": username, "password": password })),
        &[],
    )
    .await
    .status
}

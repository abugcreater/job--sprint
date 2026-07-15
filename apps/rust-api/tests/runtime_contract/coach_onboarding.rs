use super::request;
use axum::http::{Method, StatusCode};
use serde_json::json;
use sqlx::row::Row;
use sqlx_sqlite::SqlitePool;

pub async fn verify_coach_onboarding_events(
    app: &axum::Router,
    db: &SqlitePool,
    session_cookie: &str,
) {
    let mut res = request(
        app,
        Method::POST,
        "/api/coach/onboarding-events",
        Some(json!({
            "profileId": "profile-kai",
            "stepId": "profile_template",
            "stepLabel": "首登画像模板",
            "progressLabel": "1/5",
            "completionRate": 20,
            "completionRateLabel": "20%",
            "dropOffLabel": "首登画像模板",
            "riskLabel": "高风险",
            "nextActionLabel": "进入首登模板",
            "source": "react-first-login"
        })),
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["event"]["profileId"], "profile-kai");
    assert_eq!(res.json["event"]["stepId"], "profile_template");
    assert_eq!(res.json["summary"]["latestCompletionRateLabel"], "20%");
    assert_eq!(res.json["summary"]["highestRiskLabel"], "高风险");

    res = request(
        app,
        Method::POST,
        "/api/coach/onboarding-events",
        Some(json!({
            "profileId": "profile-kai",
            "stepId": "complete",
            "stepLabel": "首登完成",
            "progressLabel": "5/5",
            "completionRate": 100,
            "completionRateLabel": "100%",
            "dropOffLabel": "无放弃点",
            "riskLabel": "无风险",
            "nextActionLabel": "进入日常迭代"
        })),
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["summary"]["eventCount"], 2);
    assert_eq!(res.json["summary"]["latestCompletionRateLabel"], "100%");
    assert_eq!(res.json["summary"]["latestDropOffLabel"], "无放弃点");
    assert_eq!(res.json["summary"]["highestRiskLabel"], "高风险");
    assert_eq!(res.json["summary"]["firstLoginStatus"], "首登完成");

    res = request(
        app,
        Method::GET,
        "/api/coach/onboarding-events",
        None,
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["events"].as_array().unwrap().len(), 2);
    assert_eq!(res.json["events"][0]["stepId"], "complete");
    assert_eq!(res.json["events"][1]["stepId"], "profile_template");

    res = request(
        app,
        Method::GET,
        "/api/coach/onboarding-report",
        None,
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["summary"]["totalUsers"], 1);
    assert_eq!(res.json["summary"]["startedCount"], 1);
    assert_eq!(res.json["summary"]["completedCount"], 1);
    assert_eq!(res.json["summary"]["completionRateLabel"], "100%");
    assert_eq!(res.json["batches"][0]["inviteBatch"], "default");

    let onboarding_row = sqlx::query::query(
        "SELECT scope, profile_id, step_id, completion_rate, drop_off_label FROM coach_onboarding_events WHERE scope = ? AND step_id = ?",
    )
    .bind("test-user")
    .bind("complete")
    .fetch_one(db)
    .await
    .unwrap();
    assert_eq!(onboarding_row.get::<String, _>("scope"), "test-user");
    assert_eq!(onboarding_row.get::<String, _>("profile_id"), "profile-kai");
    assert_eq!(onboarding_row.get::<String, _>("step_id"), "complete");
    assert_eq!(onboarding_row.get::<i64, _>("completion_rate"), 100);
    assert_eq!(
        onboarding_row.get::<String, _>("drop_off_label"),
        "无放弃点"
    );
}

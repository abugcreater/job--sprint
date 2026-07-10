use super::request;
use axum::http::{Method, StatusCode};
use serde_json::json;
use sqlx::row::Row;
use sqlx_sqlite::SqlitePool;

pub async fn verify_boundary_feedback(app: &axum::Router, db: &SqlitePool, session_cookie: &str) {
    let mut res = request(
        app,
        Method::POST,
        "/api/coach/boundary-feedback",
        Some(json!({
            "profileId": "profile-kai",
            "suggestionId": "boundary-suggestion-mq",
            "topic": "MQ",
            "decision": "needs_revision",
            "reason": "需要拆成故障恢复和补偿链路",
            "sourceSummary": "JD 要求 MQ、Redis、稳定性。",
            "sourceConfidence": "high",
            "sourceProvider": "local-fallback",
            "sourcePromptVersion": "coach-boundary-suggestions-v1",
            "sourceInputHash": "boundary-hash-mq"
        })),
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.json["feedback"]["profileId"], "profile-kai");
    assert_eq!(res.json["feedback"]["decision"], "needs_revision");
    assert_eq!(res.json["feedback"]["topic"], "MQ");
    assert_eq!(res.json["summary"]["totalCount"], 1);
    assert_eq!(res.json["summary"]["revisionRateLabel"], "100%");
    assert_eq!(res.json["summary"]["topTopics"][0]["topic"], "MQ");

    res = request(
        app,
        Method::GET,
        "/api/coach/boundary-feedback",
        None,
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["feedback"][0]["sourcePromptVersion"],
        "coach-boundary-suggestions-v1"
    );
    assert_eq!(res.json["summary"]["revisionCount"], 1);
    assert!(
        res.json["summary"]["nextExtractionHint"]
            .as_str()
            .unwrap()
            .contains("候选边界需要校准")
    );

    let boundary_feedback_row = sqlx::query::query(
        "SELECT scope, profile_id, suggestion_id, topic, decision, source_prompt_version FROM coach_boundary_feedback WHERE scope = ?",
    )
    .bind("test-user")
    .fetch_one(db)
    .await
    .unwrap();
    assert_eq!(boundary_feedback_row.get::<String, _>("scope"), "test-user");
    assert_eq!(
        boundary_feedback_row.get::<String, _>("profile_id"),
        "profile-kai"
    );
    assert_eq!(
        boundary_feedback_row.get::<String, _>("suggestion_id"),
        "boundary-suggestion-mq"
    );
    assert_eq!(boundary_feedback_row.get::<String, _>("topic"), "MQ");
    assert_eq!(
        boundary_feedback_row.get::<String, _>("decision"),
        "needs_revision"
    );
    assert_eq!(
        boundary_feedback_row.get::<String, _>("source_prompt_version"),
        "coach-boundary-suggestions-v1"
    );
}

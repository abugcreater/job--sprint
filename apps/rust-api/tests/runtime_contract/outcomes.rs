use super::request;
use axum::http::{Method, StatusCode};
use serde_json::json;

pub async fn verify_coach_outcomes(app: &axum::Router, session_cookie: &str) {
    let mut res = request(
        app,
        Method::POST,
        "/api/runtime",
        Some(json!({
            "data": {
                "progress": {
                    "completed": {
                        "coach-event-event-ai-runtime": true,
                        "manual-review-runtime": true
                    },
                    "coachFeedback": [{
                        "id": "feedback-runtime-schedule",
                        "profileId": "profile-kai",
                        "artifactId": "artifact-schedule-runtime",
                        "artifactType": "schedule_suggestion",
                        "decision": "accepted",
                        "title": "补 MQ 故障恢复回答",
                        "createdAt": "2026-07-06T18:00:00+08:00"
                    }],
                    "evidenceByTaskId": {
                        "coach-event-event-ai-runtime": [{
                            "id": "runtime-evidence-ai",
                            "taskId": "coach-event-event-ai-runtime",
                            "type": "interview_answer",
                            "title": "Rust AI 采纳日程复盘",
                            "content": "围绕 MQ 故障恢复完成一次 60 秒回答。",
                            "createdAt": "2026-07-06T21:00:00+08:00",
                            "verified": true
                        }],
                        "manual-review-runtime": [{
                            "id": "runtime-evidence-review",
                            "taskId": "manual-review-runtime",
                            "type": "review",
                            "title": "Rust 周归因复盘",
                            "content": "路径问题：AI 建议颗粒度偏大。",
                            "createdAt": "2026-07-06T22:00:00+08:00",
                            "verified": true
                        }]
                    },
                    "delayRecords": [{
                        "id": "runtime-delay-1",
                        "taskId": "manual-review-runtime",
                        "date": "2026-07-06",
                        "minutes": 30,
                        "reason": "临时面试加时",
                        "recoveryAction": "压缩复盘范围",
                        "createdAt": "2026-07-06T19:00:00+08:00"
                    }],
                    "coach": {
                        "coachScheduleEvents": [{
                            "id": "event-ai-runtime",
                            "profileId": "profile-kai",
                            "date": "2026-07-06",
                            "start": "20:00",
                            "end": "20:30",
                            "kind": "interview",
                            "title": "补 MQ 故障恢复回答",
                            "reason": "AI 日程建议",
                            "evidenceRequired": true,
                            "acceptedFromArtifactId": "artifact-schedule-runtime",
                            "createdAt": "2026-07-06T18:00:00+08:00",
                            "updatedAt": "2026-07-06T18:00:00+08:00"
                        }]
                    }
                },
                "reviews": {},
                "applications": [],
                "interviewMistakes": []
            }
        })),
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);

    res = request(
        app,
        Method::GET,
        "/api/coach/outcomes?date=2026-07-06",
        None,
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["outcome"]["attributionLevel"],
        "server-weekly-runtime"
    );
    assert_eq!(res.json["outcome"]["metrics"]["effectiveActionCount"], 2);
    assert_eq!(
        res.json["outcome"]["metrics"]["acceptedScheduleCompletionRateLabel"],
        "100%"
    );
    assert_eq!(
        res.json["outcome"]["metrics"]["interviewReviewRateLabel"],
        "100%"
    );
    assert_eq!(res.json["outcome"]["metrics"]["delayCount"], 1);

    res = request(
        app,
        Method::POST,
        "/api/coach/outcomes",
        Some(json!({ "date": "2026-07-06" })),
        &[("cookie", session_cookie)],
    )
    .await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(
        res.json["outcome"]["schemaVersion"],
        "coach-outcome-report-v1"
    );
    assert_eq!(res.json["snapshots"].as_array().unwrap().len(), 1);
    assert_eq!(
        res.json["snapshots"][0]["metrics"]["effectiveActionCount"],
        2
    );
}

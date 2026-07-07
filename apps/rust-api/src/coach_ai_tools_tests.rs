use serde_json::json;

use crate::coach_ai_tools::coach_artifacts_payload;
use crate::coach_boundary_suggestions::boundary_suggestions_payload;

#[test]
fn coach_artifacts_requires_profile() {
    let result = coach_artifacts_payload(&json!({}), "artifact-test".to_string(), false);

    assert!(result.is_err());
    assert_eq!(result.unwrap_err()["error"], "profile_required");
}

#[test]
fn coach_artifacts_uses_boundary_and_marks_fallback() {
    let payload = coach_artifacts_payload(
        &json!({
            "profile": { "id": "profile-kai", "targetRole": "后端工程师", "roleFamily": "backend" },
            "knowledgeBoundaries": [{ "topic": "MQ 幂等", "level": "了解", "gap": "缺少故障证据" }],
            "opportunitySignals": [{
                "company": "杭研平台",
                "role": "高级 Java 后端",
                "status": "约面",
                "keywords": ["MQ", "Redis", "稳定性"],
                "feedback": "面试官关注故障恢复"
            }],
            "sprint": { "date": "2026-07-06" }
        }),
        "artifact-test".to_string(),
        true,
    )
    .expect("coach artifacts");

    assert_eq!(payload["provider"], "local-fallback");
    assert_eq!(payload["promptVersion"], "coach-artifacts-v1");
    assert_eq!(payload["schemaVersion"], "coach-artifact-list-v1");
    assert!(payload["inputSummaryHash"].as_str().unwrap().len() >= 8);
    assert_eq!(payload["warning"], "ai_generation_fallback");
    assert_eq!(payload["artifacts"][0]["profileId"], "profile-kai");
    assert_eq!(payload["artifacts"][0]["type"], "knowledge_card");
    assert!(
        payload["artifacts"][0]["title"]
            .as_str()
            .unwrap()
            .contains("MQ 幂等")
    );
    assert!(
        payload["artifacts"][0]["sources"][1]
            .as_str()
            .unwrap()
            .contains("角色视角：服务链路")
    );
    assert!(
        payload["artifacts"][0]["sources"][3]
            .as_str()
            .unwrap()
            .contains("机会：杭研平台-高级 Java 后端")
    );
    assert!(
        payload["artifacts"][0]["sources"][4]
            .as_str()
            .unwrap()
            .contains("JD焦点：MQ 的故障恢复")
    );
    assert!(
        payload["artifacts"][0]["sources"][5]
            .as_str()
            .unwrap()
            .contains("JD解析：硬技能 MQ、Redis、稳定性")
    );
    assert!(
        payload["artifacts"][0]["body"]
            .as_str()
            .unwrap()
            .contains("接口/任务链路")
    );
    assert!(
        payload["artifacts"][0]["body"]
            .as_str()
            .unwrap()
            .contains("证据要求「准备故障恢复案例、影响范围、定位链路和复盘动作」")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("JD 焦点「MQ 的故障恢复」")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("JD 解析题「你如何在 MQ 场景处理故障恢复？」")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("追问库：")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("上下游系统的边界")
    );
    assert!(
        payload["artifacts"][0]["reason"]
            .as_str()
            .unwrap()
            .contains("面试官关注故障恢复")
    );
    assert!(
        payload["artifacts"][0]["reason"]
            .as_str()
            .unwrap()
            .contains("JD 解析「硬技能 MQ、Redis、稳定性")
    );
}

#[test]
fn coach_artifacts_uses_role_family_when_target_role_is_empty() {
    let payload = coach_artifacts_payload(
        &json!({
            "profile": { "id": "profile-impl", "targetRole": "", "roleFamily": "implementation" },
            "knowledgeBoundaries": [{ "topic": "客户现场问题闭环", "level": "了解", "gap": "缺少复盘证据" }],
            "sprint": { "date": "2026-07-06" }
        }),
        "artifact-test".to_string(),
        false,
    )
    .expect("coach artifacts");

    assert!(
        payload["artifacts"][2]["title"]
            .as_str()
            .unwrap()
            .contains("实施")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("客户背景")
    );
    assert!(
        payload["artifacts"][2]["body"]
            .as_str()
            .unwrap()
            .contains("交付清单")
    );
}

#[test]
fn boundary_suggestions_extract_common_topics_for_any_role() {
    let payload = boundary_suggestions_payload(
        &json!({
            "profile": { "id": "profile-impl", "targetRole": "实施顾问", "roleFamily": "implementation" },
            "knowledgeBoundaries": [{ "topic": "Redis" }],
            "text": "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。"
        }),
        "boundary-test".to_string(),
    )
    .expect("boundary suggestions");

    assert_eq!(payload["provider"], "local-fallback");
    assert_eq!(payload["promptVersion"], "coach-boundary-suggestions-v1");
    assert_eq!(
        payload["schemaVersion"],
        "coach-boundary-suggestion-list-v1"
    );
    let topics = payload["suggestions"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["topic"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert!(topics.contains(&"MQ"));
    assert!(topics.contains(&"稳定性"));
    assert!(!topics.contains(&"Redis"));
    assert!(
        payload["suggestions"][0]["gap"]
            .as_str()
            .unwrap()
            .contains("故障场景")
    );
}

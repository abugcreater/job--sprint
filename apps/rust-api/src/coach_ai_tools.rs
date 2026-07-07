use serde_json::{Value, json};

use crate::coach_ai_metadata::{PROMPT_VERSION, SCHEMA_VERSION, input_summary_hash};
use crate::coach_opportunity_signals::{coach_opportunity_context, sources_with_opportunity};
use crate::coach_role_playbook::{role_family_label, role_family_playbook};

struct CoachArtifactDraft<'a> {
    id: String,
    profile_id: &'a str,
    artifact_type: &'a str,
    title: String,
    body: String,
    reason: String,
    sources: Value,
    confidence: &'a str,
    target_date: &'a str,
}

pub(crate) fn coach_artifacts_payload(
    payload: &Value,
    generated_prefix: String,
    anthropic_base_configured: bool,
) -> Result<Value, Value> {
    let Some(profile) = payload.get("profile").and_then(Value::as_object) else {
        return Err(json!({
            "ok": false,
            "error": "profile_required",
            "message": "请先保存一个目标画像，再生成 AI 教练草稿。"
        }));
    };
    if !profile.get("id").is_some_and(Value::is_string) {
        return Err(json!({
            "ok": false,
            "error": "profile_required",
            "message": "请先保存一个目标画像，再生成 AI 教练草稿。"
        }));
    }

    let profile_id = profile.get("id").and_then(Value::as_str).unwrap_or("");
    let role_family = profile
        .get("roleFamily")
        .and_then(Value::as_str)
        .unwrap_or("other");
    let role_family_fallback = role_family_label(role_family);
    let playbook = role_family_playbook(role_family);
    let target_role = string_or(profile.get("targetRole"), role_family_fallback);
    let minutes = profile
        .get("dailyMinutes")
        .and_then(Value::as_i64)
        .unwrap_or(45)
        .clamp(15, 60);
    let target_date = payload
        .get("targetDate")
        .and_then(Value::as_str)
        .or_else(|| {
            payload
                .get("sprint")
                .and_then(|sprint| sprint.get("date"))
                .and_then(Value::as_str)
        })
        .unwrap_or("2026-07-06");
    let boundaries = payload
        .get("knowledgeBoundaries")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let opportunity = coach_opportunity_context(payload);
    let input_summary_hash = input_summary_hash(
        profile_id,
        target_role.as_str(),
        role_family,
        &boundaries,
        &opportunity.hash_parts,
        target_date,
    );
    let mut response = if boundaries.is_empty() {
        json!({
            "provider": "local-fallback",
            "promptVersion": PROMPT_VERSION,
            "schemaVersion": SCHEMA_VERSION,
            "inputSummaryHash": input_summary_hash,
            "artifacts": [
                coach_artifact(
                    CoachArtifactDraft {
                        id: format!("{generated_prefix}-boundary"),
                        profile_id,
                        artifact_type: "daily_next_step",
                        title: format!("先补一条{role_family_fallback}知识边界"),
                        body: format!("unknown：当前没有可引用的知识边界。请先录入一个围绕「{}」的主题，再生成个性化建议。{}", playbook.lens, opportunity.knowledge_hint),
                        reason: format!("缺少知识边界，不能生成{role_family_fallback}个性化 AI 建议；后续需要能引用{}。{}", playbook.evidence, opportunity.reason_hint),
                        sources: sources_with_opportunity(vec![format!("画像：{target_role}"), format!("角色视角：{}", playbook.lens), "知识边界：unknown".to_string()], &opportunity),
                        confidence: "low",
                        target_date
                    }
                )
            ]
        })
    } else {
        let boundary = &boundaries[0];
        let topic = string_or(boundary.get("topic"), "当前知识边界");
        let level = string_or(boundary.get("level"), "unknown");
        let gap = string_or(boundary.get("gap"), "未写明");
        let sources = sources_with_opportunity(
            vec![
                format!("画像：{target_role}"),
                format!("角色视角：{}", playbook.lens),
                format!("知识边界：{topic}({level})"),
            ],
            &opportunity,
        );
        let role_questions = playbook.question_bank_for(&topic, &opportunity.focus_label);
        let primary_question = role_questions
            .first()
            .cloned()
            .unwrap_or_else(|| playbook.interview_prompt_for(&topic));
        let follow_up_questions = role_questions
            .iter()
            .skip(1)
            .cloned()
            .collect::<Vec<_>>()
            .join("；");
        json!({
            "provider": "local-fallback",
            "promptVersion": PROMPT_VERSION,
            "schemaVersion": SCHEMA_VERSION,
            "inputSummaryHash": input_summary_hash,
            "artifacts": [
                coach_artifact(
                    CoachArtifactDraft {
                        id: format!("{generated_prefix}-card"),
                        profile_id,
                        artifact_type: "knowledge_card",
                        title: format!("{topic} 面试表达卡"),
                        body: format!("围绕「{topic}」补一张知识卡：按「{}」组织回答，用「{}」做证据，最后列出还不能夸大的部分。{}{}", playbook.answer_frame, playbook.evidence, optional_focus_sentence(&opportunity.focus_label, "补充 JD 焦点", "下的候选追问。"), opportunity.knowledge_hint),
                        reason: format!("该主题当前为「{level}」，薄弱点是「{gap}」；角色视角是「{}」。{}", playbook.lens, opportunity.reason_hint),
                        sources: sources.clone(),
                        confidence: "high",
                        target_date
                    }
                ),
                coach_artifact(
                    CoachArtifactDraft {
                        id: format!("{generated_prefix}-schedule"),
                        profile_id,
                        artifact_type: "schedule_suggestion",
                        title: format!("今晚 {minutes} 分钟补 {topic}"),
                        body: format!("建议新增一条 {minutes} 分钟知识任务，聚焦「{}」，产出一段可面试回答和一条 Evidence Gate 证据。{}{}", playbook.schedule_focus, optional_focus_sentence(&opportunity.focus_label, "练习目标收敛到", "。"), opportunity.schedule_hint),
                        reason: format!("目标岗位「{target_role}」需要能解释「{topic}」，并补齐{}。{}", playbook.evidence, opportunity.reason_hint),
                        sources: sources.clone(),
                        confidence: "high",
                        target_date
                    }
                ),
                coach_artifact(
                    CoachArtifactDraft {
                        id: format!("{generated_prefix}-question"),
                        profile_id,
                        artifact_type: "interview_question",
                        title: format!("{target_role} 追问：{topic}"),
                        body: format!("候选题：{}{} 追问库：{}", opportunity.focus_question_hint, primary_question, follow_up_questions),
                        reason: format!("从知识边界「{topic}」、目标岗位「{target_role}」、机会信号和角色题卡库生成，并按「{}」检查表达。{}", playbook.answer_frame, opportunity.reason_hint),
                        sources,
                        confidence: "medium",
                        target_date
                    }
                )
            ]
        })
    };
    if anthropic_base_configured {
        response["warning"] = json!("ai_generation_fallback");
    }
    Ok(response)
}

fn coach_artifact(draft: CoachArtifactDraft<'_>) -> Value {
    json!({
        "id": draft.id,
        "profileId": draft.profile_id,
        "type": draft.artifact_type,
        "title": draft.title,
        "body": draft.body,
        "reason": draft.reason,
        "sources": draft.sources,
        "confidence": draft.confidence,
        "status": "draft",
        "targetDate": draft.target_date,
        "createdAt": "2026-07-06T00:00:00.000Z",
        "updatedAt": "2026-07-06T00:00:00.000Z",
        "sourceType": "generated-local"
    })
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn optional_focus_sentence(focus: &str, prefix: &str, suffix: &str) -> String {
    if focus.is_empty() {
        String::new()
    } else {
        format!("{prefix}「{focus}」{suffix}")
    }
}

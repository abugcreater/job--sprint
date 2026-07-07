use chrono::Utc;
use serde_json::{Value, json};
use std::env;

use crate::coach_ai_metadata::{PROMPT_VERSION, SCHEMA_VERSION};
use crate::coach_role_playbook::role_family_playbook;

const ARTIFACT_TYPES: &[&str] = &[
    "knowledge_card",
    "schedule_suggestion",
    "interview_question",
    "daily_next_step",
];
const SYSTEM_PROMPT: &str = "你是泛 IT 求职者的 AI 求职教练。\n\
你必须根据用户画像、知识边界、已有日程、岗位机会/JD信号和今日任务生成建议。\n\
建议只能是草稿，不能直接修改正式日程或编造用户没有提供的经历。\n\
如果缺少知识边界，只能输出 unknown 或追问，不要假装知道。\n\
只输出 JSON，不要 Markdown。";

pub(crate) fn provider_request(payload: &Value, model: &str) -> Value {
    json!({
        "model": model,
        "max_tokens": 1600,
        "temperature": 0.25,
        "system": SYSTEM_PROMPT,
        "messages": [{
            "role": "user",
            "content": json!({
                "task": "generate_job_coach_artifacts",
                "productRule": "输出必须进入 AI 草稿区，由用户接受或拒绝后才影响正式计划。",
                "profile": payload.get("profile").cloned().unwrap_or(Value::Null),
                "rolePlaybook": role_family_playbook(payload.get("profile").and_then(|profile| profile.get("roleFamily")).and_then(Value::as_str).unwrap_or("other")).as_json(),
                "knowledgeBoundaries": array_value(payload, "knowledgeBoundaries"),
                "scheduleEvents": array_value(payload, "scheduleEvents"),
                "opportunitySignals": array_value(payload, "opportunitySignals"),
                "sprint": payload.get("sprint").cloned().unwrap_or_else(|| json!({})),
                "outputSchema": { "artifacts": [schema_artifact()] }
            }).to_string()
        }]
    })
}

pub(crate) fn response_from_provider(
    payload: &Value,
    generated_prefix: String,
    model: &str,
    data: Value,
    latency_ms: u128,
) -> Result<Value, String> {
    let parsed = extract_json(&provider_text(&data))?;
    let artifacts = parsed
        .get("artifacts")
        .and_then(Value::as_array)
        .ok_or_else(|| "provider_schema_missing_artifacts".to_string())?;
    if artifacts.is_empty() {
        return Err("provider_schema_empty_artifacts".to_string());
    }
    let usage = usage_from_response(&data);
    let profile_id = payload
        .get("profile")
        .and_then(|profile| profile.get("id"))
        .and_then(Value::as_str)
        .unwrap_or("");
    Ok(json!({
        "provider": "anthropic-compatible",
        "model": model,
        "promptVersion": PROMPT_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "inputSummaryHash": parsed.get("inputSummaryHash").and_then(Value::as_str).unwrap_or("provider"),
        "latencyMs": i64::try_from(latency_ms).unwrap_or(i64::MAX),
        "usage": usage,
        "estimatedCostUsd": estimated_cost(&usage),
        "artifacts": artifacts.iter().take(6).enumerate().map(|(index, artifact)| {
            normalize_artifact(artifact, index, &generated_prefix, profile_id, &target_date(payload))
        }).collect::<Vec<_>>()
    }))
}

fn normalize_artifact(
    artifact: &Value,
    index: usize,
    prefix: &str,
    profile_id: &str,
    target_date: &str,
) -> Value {
    let now = Utc::now().to_rfc3339();
    let artifact_type = enum_string(artifact, "type", ARTIFACT_TYPES, "daily_next_step");
    json!({
        "id": string_or(artifact.get("id"), &format!("{prefix}-ai-{index}")),
        "profileId": string_or(artifact.get("profileId"), profile_id),
        "type": artifact_type,
        "title": clip(&string_or(artifact.get("title"), &format!("AI 建议 {}", index + 1)), 90),
        "body": clip(&string_or(artifact.get("body"), "请先补充画像、知识边界或日程上下文。"), 1200),
        "reason": clip(&string_or(artifact.get("reason"), "来自 AI 教练上下文。"), 320),
        "sources": artifact.get("sources").filter(|value| value.is_array()).cloned().unwrap_or_else(|| json!(["AI 教练上下文"])),
        "confidence": enum_string(artifact, "confidence", &["low", "medium", "high"], "medium"),
        "status": "draft",
        "targetDate": clip(&string_or(artifact.get("targetDate"), target_date), 20),
        "createdAt": string_or(artifact.get("createdAt"), &now),
        "updatedAt": string_or(artifact.get("updatedAt"), &now),
        "sourceType": "generated-ai"
    })
}

pub(crate) fn provider_text(data: &Value) -> String {
    data.get("content")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n")
        })
        .or_else(|| {
            data.get("completion")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .or_else(|| data.get("text").and_then(Value::as_str).map(str::to_string))
        .unwrap_or_default()
}

pub(crate) fn extract_json(text: &str) -> Result<Value, String> {
    serde_json::from_str(text)
        .or_else(|_| {
            let start = text.find('{').ok_or(())?;
            let end = text.rfind('}').ok_or(())?;
            serde_json::from_str(&text[start..=end]).map_err(|_| ())
        })
        .map_err(|_| "provider_json_payload_invalid".to_string())
}

fn usage_from_response(data: &Value) -> Value {
    let usage = data.get("usage").unwrap_or(&Value::Null);
    json!({
        "inputTokens": token_field(usage, "input_tokens").or_else(|| token_field(usage, "prompt_tokens")),
        "outputTokens": token_field(usage, "output_tokens").or_else(|| token_field(usage, "completion_tokens"))
    })
}

fn estimated_cost(usage: &Value) -> Value {
    match (
        usage.get("inputTokens").and_then(Value::as_f64),
        usage.get("outputTokens").and_then(Value::as_f64),
        env_rate("ANTHROPIC_INPUT_COST_PER_MILLION"),
        env_rate("ANTHROPIC_OUTPUT_COST_PER_MILLION"),
    ) {
        (Some(input), Some(output), Some(input_rate), Some(output_rate)) => {
            json!(((input * input_rate) + (output * output_rate)) / 1_000_000.0)
        }
        _ => Value::Null,
    }
}

fn target_date(payload: &Value) -> String {
    payload
        .get("targetDate")
        .and_then(Value::as_str)
        .or_else(|| {
            payload
                .get("sprint")
                .and_then(|sprint| sprint.get("date"))
                .and_then(Value::as_str)
        })
        .unwrap_or("2026-07-06")
        .to_string()
}

fn schema_artifact() -> Value {
    json!({
        "type": "knowledge_card | schedule_suggestion | interview_question | daily_next_step",
        "title": "草稿标题",
        "body": "可直接展示给用户的建议内容",
        "reason": "为什么给这条建议，必须引用事实或边界",
        "sources": ["画像/知识边界/日程/今日任务来源"],
        "confidence": "low | medium | high",
        "targetDate": "YYYY-MM-DD"
    })
}

fn array_value(payload: &Value, field: &str) -> Value {
    payload
        .get(field)
        .filter(|value| value.is_array())
        .cloned()
        .unwrap_or_else(|| json!([]))
}

fn token_field(usage: &Value, field: &str) -> Option<i64> {
    usage.get(field).and_then(Value::as_i64)
}

fn env_rate(key: &str) -> Option<f64> {
    env::var(key)
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
}

fn enum_string(value: &Value, field: &str, allowed: &[&str], fallback: &str) -> String {
    let candidate = string_or(value.get(field), fallback);
    if allowed.contains(&candidate.as_str()) {
        candidate
    } else {
        fallback.to_string()
    }
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

pub(crate) fn clip(value: &str, limit: usize) -> String {
    let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
    normalized.chars().take(limit).collect()
}

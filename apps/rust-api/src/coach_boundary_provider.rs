use serde_json::{Value, json};
use std::{env, time::Instant};

use crate::coach_ai_provider_format::{clip, extract_json, provider_text};
use crate::coach_boundary_suggestions::{
    PROMPT_VERSION, SCHEMA_VERSION, boundary_suggestions_payload,
};

struct ProviderConfig {
    base_url: Option<String>,
    token: Option<String>,
    model: String,
    timeout_ms: u64,
}

pub(crate) async fn generate_boundary_suggestions_payload(
    payload: &Value,
    generated_prefix: String,
) -> Result<Value, Value> {
    let config = ProviderConfig::from_env();
    let provider_requested = config.base_url.is_some() || config.token.is_some();
    let mut fallback = boundary_suggestions_payload(payload, generated_prefix.clone())?;
    let fallback_hash = string_or(fallback.get("inputSummaryHash"), "provider");
    if config.base_url.is_none() || config.token.is_none() {
        if provider_requested {
            fallback["warning"] = json!("ai_generation_fallback");
            fallback["error"] = json!("provider_config_incomplete");
        }
        return Ok(fallback);
    }
    match call_provider(payload, generated_prefix, &config, &fallback_hash).await {
        Ok(response) => Ok(response),
        Err(error) => {
            fallback["warning"] = json!("ai_generation_fallback");
            fallback["error"] = json!(error);
            Ok(fallback)
        }
    }
}

impl ProviderConfig {
    fn from_env() -> Self {
        Self {
            base_url: env_value("ANTHROPIC_BASE_URL"),
            token: env_value("ANTHROPIC_AUTH_TOKEN"),
            model: env::var("ANTHROPIC_MODEL")
                .unwrap_or_else(|_| "claude-3-5-sonnet-20241022".to_string()),
            timeout_ms: env::var("AI_PROVIDER_TIMEOUT_MS")
                .ok()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(12_000)
                .clamp(500, 60_000),
        }
    }
}

async fn call_provider(
    payload: &Value,
    generated_prefix: String,
    config: &ProviderConfig,
    fallback_hash: &str,
) -> Result<Value, String> {
    let start = Instant::now();
    let endpoint = format!(
        "{}/v1/messages",
        config
            .base_url
            .as_deref()
            .unwrap_or("")
            .trim_end_matches('/')
    );
    let response = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(config.timeout_ms))
        .build()
        .map_err(|error| format!("provider_client_error: {error}"))?
        .post(endpoint)
        .header("content-type", "application/json")
        .header("x-api-key", config.token.as_deref().unwrap_or(""))
        .header(
            "authorization",
            format!("Bearer {}", config.token.as_deref().unwrap_or("")),
        )
        .header("anthropic-version", "2023-06-01")
        .json(&provider_request(payload, &config.model))
        .send()
        .await
        .map_err(|error| format!("provider_request_failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("provider_http_{}", response.status().as_u16()));
    }
    let data = response
        .json::<Value>()
        .await
        .map_err(|error| format!("provider_json_error: {error}"))?;
    response_from_provider(
        payload,
        generated_prefix,
        &config.model,
        data,
        start.elapsed().as_millis(),
        fallback_hash,
    )
}

fn provider_request(payload: &Value, model: &str) -> Value {
    json!({
        "model": model,
        "max_tokens": 1100,
        "temperature": 0.15,
        "system": "你是泛 IT 求职者的 AI 求职教练和知识边界审计官。只能从用户提供材料提取候选知识边界；候选项需用户确认后才写入正式数据；只输出 JSON。",
        "messages": [{
            "role": "user",
            "content": json!({
                "task": "suggest_job_coach_knowledge_boundaries",
                "productRule": "候选项进入草稿区，由用户采纳或拒绝后才写入正式知识边界。",
                "profile": payload.get("profile").cloned().unwrap_or(Value::Null),
                "existingTopics": existing_topics(payload),
                "sourceText": string_or(payload.get("text").or_else(|| payload.get("sourceText")), ""),
                "outputSchema": { "suggestions": [{ "topic": "主题名", "level": "陌生 | 了解 | 可讲 | 可实战 | 可面试追问", "gap": "缺口说明", "evidence": "来源片段或需要补的证据", "targetUse": "用于什么岗位/JD/面试表达", "sourceSummary": "不超过 120 字的来源摘要", "confidence": "low | medium | high" }] }
            }).to_string()
        }]
    })
}

fn response_from_provider(
    payload: &Value,
    generated_prefix: String,
    model: &str,
    data: Value,
    latency_ms: u128,
    fallback_hash: &str,
) -> Result<Value, String> {
    let parsed = extract_json(&provider_text(&data))?;
    let entries = parsed
        .get("suggestions")
        .and_then(Value::as_array)
        .ok_or_else(|| "provider_schema_missing_suggestions".to_string())?;
    let existing = existing_topics(payload);
    let target_role = payload
        .get("profile")
        .and_then(|profile| profile.get("targetRole"))
        .and_then(Value::as_str)
        .unwrap_or("目标岗位");
    let suggestions = entries
        .iter()
        .filter_map(|entry| normalize_suggestion(entry, &generated_prefix, target_role, &existing))
        .take(4)
        .collect::<Vec<_>>();
    if suggestions.is_empty() {
        return Err("provider_schema_empty_suggestions".to_string());
    }
    Ok(json!({
        "provider": "anthropic-compatible",
        "model": model,
        "promptVersion": PROMPT_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "inputSummaryHash": parsed.get("inputSummaryHash").and_then(Value::as_str).unwrap_or(fallback_hash),
        "latencyMs": i64::try_from(latency_ms).unwrap_or(i64::MAX),
        "suggestions": suggestions
    }))
}

fn normalize_suggestion(
    entry: &Value,
    prefix: &str,
    target_role: &str,
    existing: &[String],
) -> Option<Value> {
    let topic = clip(&string_or(entry.get("topic"), ""), 80);
    if topic.is_empty() || existing.contains(&topic.to_lowercase()) {
        return None;
    }
    Some(json!({
        "id": string_or(entry.get("id"), &format!("{prefix}-{topic}")),
        "topic": topic,
        "level": enum_string(entry, "level", &["陌生", "了解", "可讲", "可实战", "可面试追问"], "了解"),
        "gap": clip(&string_or(entry.get("gap"), "补齐机制、边界、项目证据和不能夸大的部分。"), 220),
        "evidence": clip(&string_or(entry.get("evidence"), "待补充相关项目、笔记或复盘证据。"), 220),
        "targetUse": clip(&string_or(entry.get("targetUse"), &format!("{target_role}：用于目标岗位表达")), 180),
        "sourceSummary": clip(&string_or(entry.get("sourceSummary"), "来自用户提供材料。"), 120),
        "confidence": enum_string(entry, "confidence", &["low", "medium", "high"], "medium")
    }))
}

fn existing_topics(payload: &Value) -> Vec<String> {
    payload
        .get("knowledgeBoundaries")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(|item| string_or(item.get("topic"), "").to_lowercase())
                .collect()
        })
        .unwrap_or_default()
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
        .trim()
        .replace(char::is_whitespace, " ")
}

fn env_value(key: &str) -> Option<String> {
    env::var(key).ok().filter(|value| !value.is_empty())
}

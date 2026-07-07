use serde_json::{Value, json};
use std::collections::HashMap;

pub(crate) fn summarize_llm_feedback(feedback: &[Value]) -> Value {
    let reviewed: Vec<&Value> = feedback
        .iter()
        .filter(|item| {
            matches!(
                item.get("decision").and_then(Value::as_str),
                Some("accepted") | Some("rejected")
            )
        })
        .collect();
    let accepted_count = reviewed
        .iter()
        .filter(|item| item.get("decision").and_then(Value::as_str) == Some("accepted"))
        .count();
    let rejected: Vec<&Value> = reviewed
        .iter()
        .copied()
        .filter(|item| item.get("decision").and_then(Value::as_str) == Some("rejected"))
        .collect();
    let acceptance_rate = if reviewed.is_empty() {
        0
    } else {
        ((accepted_count as f64 / reviewed.len() as f64) * 100.0).round() as i64
    };
    let top_rejected_types = top_rejected_types(&rejected);
    let recent_rejection_reasons = recent_rejection_reasons(&rejected);
    let next_prompt_hint = next_prompt_hint(&top_rejected_types, &recent_rejection_reasons);
    json!({
        "reviewedCount": reviewed.len(),
        "acceptedCount": accepted_count,
        "rejectedCount": rejected.len(),
        "acceptanceRate": acceptance_rate,
        "acceptanceRateLabel": if reviewed.is_empty() { "暂无".to_string() } else { format!("{acceptance_rate}%") },
        "qualityLabel": feedback_quality_label(reviewed.len(), acceptance_rate),
        "topRejectedTypes": top_rejected_types,
        "recentRejectionReasons": recent_rejection_reasons,
        "nextPromptHint": next_prompt_hint
    })
}

fn top_rejected_types(rejected: &[&Value]) -> Vec<Value> {
    let mut rejected_type_counts: HashMap<String, i64> = HashMap::new();
    for item in rejected {
        let artifact_type = item
            .get("artifactType")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .unwrap_or("unknown");
        *rejected_type_counts
            .entry(artifact_type.to_string())
            .or_insert(0) += 1;
    }
    let mut top_rejected_types: Vec<Value> = rejected_type_counts
        .into_iter()
        .map(|(artifact_type, count)| {
            json!({
                "type": artifact_type,
                "count": count,
                "label": artifact_type_label(&artifact_type)
            })
        })
        .collect();
    top_rejected_types.sort_by(|left, right| {
        let left_count = left
            .get("count")
            .and_then(Value::as_i64)
            .unwrap_or_default();
        let right_count = right
            .get("count")
            .and_then(Value::as_i64)
            .unwrap_or_default();
        right_count.cmp(&left_count).then_with(|| {
            left.get("label")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .cmp(
                    right
                        .get("label")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                )
        })
    });
    top_rejected_types.truncate(3);
    top_rejected_types
}

fn recent_rejection_reasons(rejected: &[&Value]) -> Vec<Value> {
    rejected
        .iter()
        .filter_map(|item| item.get("reason").and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .take(5)
        .map(|value| json!(value))
        .collect()
}

fn feedback_quality_label(reviewed_count: usize, acceptance_rate: i64) -> &'static str {
    if reviewed_count == 0 {
        "等待反馈"
    } else if acceptance_rate >= 70 {
        "建议贴合"
    } else if acceptance_rate >= 40 {
        "需要校准"
    } else {
        "偏离目标"
    }
}

fn next_prompt_hint(top_rejected_types: &[Value], recent_rejection_reasons: &[Value]) -> String {
    if top_rejected_types.is_empty() && recent_rejection_reasons.is_empty() {
        return "先接受或拒绝至少一条草稿，AI 教练才有质量反馈可复用。".to_string();
    }
    let type_hint = if top_rejected_types.is_empty() {
        "继续沿用已采纳建议的方向".to_string()
    } else {
        let labels = top_rejected_types
            .iter()
            .filter_map(|item| item.get("label").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("、");
        format!("少生成{labels}类低贴合建议")
    };
    let reason_hint = recent_rejection_reasons
        .first()
        .and_then(Value::as_str)
        .map(|reason| format!("重点避开：{reason}"))
        .unwrap_or_else(|| "继续观察拒绝原因".to_string());
    format!("{type_hint}；{reason_hint}。")
}

fn artifact_type_label(artifact_type: &str) -> &'static str {
    match artifact_type {
        "knowledge_card" => "知识卡",
        "schedule_suggestion" => "日程建议",
        "interview_question" => "候选题",
        "daily_next_step" => "下一步",
        _ => "未知",
    }
}

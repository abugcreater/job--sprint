use serde_json::{Value, json};
use std::collections::HashMap;

pub(crate) fn summarize_boundary_feedback(feedback: &[Value]) -> Value {
    let accepted_count = feedback
        .iter()
        .filter(|item| item.get("decision").and_then(Value::as_str) == Some("accepted"))
        .count();
    let rejected = filter_by_decision(feedback, "rejected");
    let revisions = filter_by_decision(feedback, "needs_revision");
    let needs_calibration = rejected.len() + revisions.len();
    let revision_rate = if feedback.is_empty() {
        0
    } else {
        ((needs_calibration as f64 / feedback.len() as f64) * 100.0).round() as i64
    };
    let mut calibration_records = rejected;
    calibration_records.extend(revisions);
    let top_topics = top_calibration_topics(&calibration_records);
    let recent_reasons = recent_reasons(&calibration_records);
    let next_hint = next_extraction_hint(
        feedback.len(),
        accepted_count,
        needs_calibration,
        &recent_reasons,
        &top_topics,
    );
    json!({
        "totalCount": feedback.len(),
        "acceptedCount": accepted_count,
        "rejectedCount": calibration_records.iter().filter(|item| item.get("decision").and_then(Value::as_str) == Some("rejected")).count(),
        "revisionCount": calibration_records.iter().filter(|item| item.get("decision").and_then(Value::as_str) == Some("needs_revision")).count(),
        "revisionRate": revision_rate,
        "revisionRateLabel": if feedback.is_empty() { "暂无".to_string() } else { format!("{revision_rate}%") },
        "topTopics": top_topics,
        "recentReasons": recent_reasons,
        "nextExtractionHint": next_hint
    })
}

fn filter_by_decision<'a>(feedback: &'a [Value], decision: &str) -> Vec<&'a Value> {
    feedback
        .iter()
        .filter(|item| item.get("decision").and_then(Value::as_str) == Some(decision))
        .collect()
}

fn top_calibration_topics(records: &[&Value]) -> Vec<Value> {
    let mut counts: HashMap<String, i64> = HashMap::new();
    for item in records {
        let topic = item
            .get("topic")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .unwrap_or("unknown");
        *counts.entry(topic.to_string()).or_insert(0) += 1;
    }
    let mut topics: Vec<Value> = counts
        .into_iter()
        .map(|(topic, count)| json!({ "topic": topic, "count": count }))
        .collect();
    topics.sort_by(|left, right| {
        let left_count = left
            .get("count")
            .and_then(Value::as_i64)
            .unwrap_or_default();
        let right_count = right
            .get("count")
            .and_then(Value::as_i64)
            .unwrap_or_default();
        right_count.cmp(&left_count).then_with(|| {
            left.get("topic")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .cmp(
                    right
                        .get("topic")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                )
        })
    });
    topics.truncate(3);
    topics
}

fn recent_reasons(records: &[&Value]) -> Vec<Value> {
    records
        .iter()
        .filter_map(|item| item.get("reason").and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .take(5)
        .map(|value| json!(value))
        .collect()
}

fn next_extraction_hint(
    total_count: usize,
    accepted_count: usize,
    needs_calibration: usize,
    recent_reasons: &[Value],
    top_topics: &[Value],
) -> String {
    if total_count == 0 {
        return "先采纳、修订或拒绝至少一条候选边界，系统才知道边界提取质量。".to_string();
    }
    if needs_calibration > accepted_count {
        let topic_hint = top_topics
            .first()
            .and_then(|item| item.get("topic").and_then(Value::as_str))
            .map(|topic| format!("，重点校准「{topic}」"))
            .unwrap_or_default();
        let reason_hint = recent_reasons
            .first()
            .and_then(Value::as_str)
            .map(|reason| format!("，最近原因：{reason}"))
            .unwrap_or_default();
        return format!(
            "候选边界需要校准，下一轮应更贴近岗位素材和已有证据{topic_hint}{reason_hint}。"
        );
    }
    "候选边界已有采纳记录，下一轮可以继续沿用当前素材结构。".to_string()
}

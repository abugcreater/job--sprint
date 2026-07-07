use serde_json::Value;

use super::metrics::{RateOutcome, count_at};

pub(super) fn build_signals(
    type_counts: &Value,
    effective_action_count: i64,
    accepted: &RateOutcome,
    feedback_summary: &Value,
) -> Vec<Value> {
    [
        (effective_action_count > 0)
            .then(|| format!("本周有 {effective_action_count} 个完成任务带验证证据。")),
        (accepted.total > 0).then(|| format!("AI 采纳日程完成 {}。", accepted.label)),
        feedback_summary
            .get("reviewedCount")
            .and_then(Value::as_i64)
            .filter(|count| *count > 0)
            .map(|count| {
                format!(
                    "AI 草稿反馈 {count} 条，贴合度 {}。",
                    feedback_summary
                        .get("qualityLabel")
                        .and_then(Value::as_str)
                        .unwrap_or("等待反馈")
                )
            }),
        (count_at(type_counts, "delivery_record") > 0).then(|| {
            format!(
                "机会/JD/投递反馈 {} 条。",
                count_at(type_counts, "delivery_record")
            )
        }),
    ]
    .into_iter()
    .flatten()
    .take(4)
    .map(Value::String)
    .collect()
}

pub(super) fn build_risks(
    type_counts: &Value,
    delay_count: i64,
    accepted: &RateOutcome,
    interview: &RateOutcome,
) -> Vec<Value> {
    [
        (count_at(type_counts, "review") == 0)
            .then(|| "缺少复盘证据，服务端无法判断动作是否改变结果。".to_string()),
        (count_at(type_counts, "delivery_record") == 0)
            .then(|| "缺少机会反馈，学习动作和真实岗位要求仍可能脱节。".to_string()),
        (accepted.total > 0 && accepted.rate < 60)
            .then(|| "AI 采纳日程完成率低于 60%，建议粒度需要收窄。".to_string()),
        (interview.total > 0 && interview.rate < 60)
            .then(|| "面试题复盘率低于 60%，表达提升不可稳定验证。".to_string()),
        (delay_count > 0).then(|| format!("本周有 {delay_count} 条延期，需要调整任务颗粒度。")),
    ]
    .into_iter()
    .flatten()
    .take(5)
    .map(Value::String)
    .collect()
}

pub(super) fn build_next_week_focus(
    type_counts: &Value,
    accepted: &RateOutcome,
    interview: &RateOutcome,
) -> Vec<Value> {
    [
        (count_at(type_counts, "delivery_record") == 0)
            .then(|| "至少记录一条机会/JD/HR 反馈，校准知识边界。".to_string()),
        (count_at(type_counts, "review") == 0)
            .then(|| "每天收尾补一条复盘证据，先写事实再写欠缺。".to_string()),
        (accepted.total > 0 && accepted.rate < 60)
            .then(|| "下一轮 AI 日程建议只保留一条当天可完成动作。".to_string()),
        (interview.total > 0 && interview.rate < 60)
            .then(|| "补一轮 60 秒回答和复盘证据。".to_string()),
        Some("保留已产生验证证据的动作，下周只扩一个新变量。".to_string()),
    ]
    .into_iter()
    .flatten()
    .take(4)
    .map(Value::String)
    .collect()
}

pub(super) fn outcome_score(
    evidence_count: i64,
    effective_count: i64,
    accepted_rate: i64,
    interview_rate: i64,
    feedback_count: i64,
) -> i64 {
    (std::cmp::min(25, evidence_count * 5)
        + std::cmp::min(25, effective_count * 10)
        + if accepted_rate > 0 {
            std::cmp::min(20, accepted_rate / 5)
        } else {
            0
        }
        + if interview_rate > 0 {
            std::cmp::min(15, interview_rate / 7)
        } else {
            0
        }
        + if feedback_count > 0 { 15 } else { 0 })
    .min(100)
}

pub(super) fn score_label(score: i64) -> &'static str {
    if score >= 80 {
        "推进稳定"
    } else if score >= 60 {
        "闭环成形"
    } else if score >= 40 {
        "局部有效"
    } else {
        "证据不足"
    }
}

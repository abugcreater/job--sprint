use serde_json::Value;

use crate::coach_jd_insights::{JdInsights, build_jd_insights};

pub(crate) struct OpportunitySignal {
    pub(crate) company: String,
    pub(crate) role: String,
    pub(crate) status: String,
    pub(crate) keywords: Vec<String>,
    pub(crate) tags: Vec<String>,
    pub(crate) feedback: String,
    pub(crate) notes: String,
    pub(crate) jd_insights: JdInsights,
}

pub(crate) fn normalize_signals(value: Option<&Value>) -> Vec<OpportunitySignal> {
    value
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .take(8)
                .map(|item| {
                    let role = string_or(item.get("role").or_else(|| item.get("title")), "");
                    let keywords = split_words(item.get("keywords"));
                    let tags = item
                        .get("tags")
                        .and_then(Value::as_array)
                        .map(|tags| {
                            tags.iter()
                                .filter_map(Value::as_str)
                                .map(clip)
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();
                    let feedback =
                        string_or(item.get("feedback").or_else(|| item.get("hrFeedback")), "");
                    let notes = string_or(item.get("notes"), "");
                    let jd_insights = build_jd_insights(&keywords, &tags, &role, &feedback, &notes);
                    OpportunitySignal {
                        company: string_or(item.get("company"), ""),
                        role,
                        status: string_or(item.get("status"), ""),
                        keywords,
                        tags,
                        feedback,
                        notes,
                        jd_insights,
                    }
                })
                .filter(|item| !item.company.is_empty() || !item.role.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

pub(crate) fn source_label(signal: &OpportunitySignal) -> String {
    let keywords = signal
        .keywords
        .iter()
        .take(3)
        .cloned()
        .collect::<Vec<_>>()
        .join("、");
    let status = if signal.status.is_empty() {
        String::new()
    } else {
        format!("({})", signal.status)
    };
    let jd = if keywords.is_empty() {
        String::new()
    } else {
        format!(" JD:{keywords}")
    };
    format!(
        "机会：{}-{}{}{}",
        fallback(&signal.company, "未命名公司"),
        fallback(&signal.role, "未知岗位"),
        status,
        jd
    )
}

pub(crate) fn build_focus_label(signal: &OpportunitySignal) -> String {
    let primary_keyword = signal
        .keywords
        .iter()
        .chain(signal.tags.iter())
        .find(|item| !item.is_empty())
        .cloned()
        .unwrap_or_default();
    let focus_term = extract_focus_term(&format!(
        "{} {} {}",
        signal.feedback,
        signal.notes,
        signal.keywords.join(" ")
    ));
    if !primary_keyword.is_empty()
        && !focus_term.is_empty()
        && !primary_keyword.contains(&focus_term)
    {
        return format!("{primary_keyword} 的{focus_term}");
    }
    if !focus_term.is_empty() {
        focus_term
    } else {
        signal
            .keywords
            .iter()
            .take(2)
            .cloned()
            .collect::<Vec<_>>()
            .join(" / ")
    }
}

pub(crate) fn optional_phrase(value: &str, label: &str) -> String {
    if value.is_empty() {
        String::new()
    } else {
        format!("{label}「{value}」")
    }
}

pub(crate) fn fallback<'a>(value: &'a str, fallback: &'a str) -> &'a str {
    if value.is_empty() { fallback } else { value }
}

fn split_words(value: Option<&Value>) -> Vec<String> {
    if let Some(items) = value.and_then(Value::as_array) {
        return items.iter().filter_map(Value::as_str).map(clip).collect();
    }
    string_or(value, "")
        .split(['、', ',', '，', ' '])
        .map(clip)
        .filter(|item| !item.is_empty())
        .take(8)
        .collect()
}

fn extract_focus_term(text: &str) -> String {
    [
        "故障恢复",
        "稳定性",
        "幂等",
        "补偿",
        "性能",
        "缓存",
        "高并发",
        "事务",
        "自动化",
        "质量",
        "监控",
        "发布",
        "回滚",
        "指标",
        "用户路径",
    ]
    .iter()
    .find(|term| text.contains(**term))
    .unwrap_or(&"")
    .to_string()
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .map(clip)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn clip(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(120)
        .collect()
}

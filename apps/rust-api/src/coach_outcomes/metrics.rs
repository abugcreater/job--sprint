use chrono::{DateTime, Utc};
use serde_json::{Map, Value, json};
use std::collections::{HashMap, HashSet};

use super::window::{inside_window, text};

#[derive(Clone)]
pub(super) struct EvidenceRecord {
    pub(super) task_id: String,
    pub(super) evidence_type: String,
    pub(super) verified: bool,
}

pub(super) struct RateOutcome {
    pub(super) total: i64,
    pub(super) completed: i64,
    pub(super) rate: i64,
    pub(super) label: String,
}

pub(super) fn weekly_evidence(
    value: Option<&Value>,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> Vec<EvidenceRecord> {
    let mut records = Vec::new();
    if let Some(map) = value.and_then(Value::as_object) {
        for (task_id, items) in map {
            if let Some(items) = items.as_array() {
                for item in items {
                    if inside_window(&text(item, "createdAt").unwrap_or_default(), start, end) {
                        records.push(EvidenceRecord {
                            task_id: text(item, "taskId").unwrap_or_else(|| task_id.clone()),
                            evidence_type: text(item, "type").unwrap_or_default(),
                            verified: item
                                .get("verified")
                                .and_then(Value::as_bool)
                                .unwrap_or(false),
                        });
                    }
                }
            }
        }
    }
    records
}

pub(super) fn weekly_delays(
    value: Option<&Value>,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> i64 {
    value
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter(|item| {
                    inside_window(
                        &text(item, "createdAt")
                            .or_else(|| text(item, "date"))
                            .unwrap_or_default(),
                        start,
                        end,
                    )
                })
                .count() as i64
        })
        .unwrap_or_default()
}

pub(super) fn accepted_schedule_outcome(
    events: Option<&Value>,
    completed: &HashMap<String, bool>,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> RateOutcome {
    let accepted: Vec<Value> = events
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|event| {
            text(event, "acceptedFromArtifactId").is_some_and(|value| !value.is_empty())
        })
        .filter(|event| inside_window(&text(event, "date").unwrap_or_default(), start, end))
        .collect();
    let done = accepted
        .iter()
        .filter(|event| {
            completed
                .get(&format!(
                    "coach-event-{}",
                    text(event, "id").unwrap_or_default()
                ))
                .copied()
                .unwrap_or(false)
        })
        .count() as i64;
    rate_outcome(accepted.len() as i64, done)
}

pub(super) fn interview_review_outcome(
    events: Option<&Value>,
    completed: &HashMap<String, bool>,
    evidence: &[EvidenceRecord],
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> RateOutcome {
    let evidence_task_ids = evidence
        .iter()
        .filter(|record| {
            record.verified
                && matches!(
                    record.evidence_type.as_str(),
                    "interview_answer" | "oral_score" | "review"
                )
        })
        .map(|record| record.task_id.clone())
        .collect::<HashSet<_>>();
    let interview_events = events
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|event| text(event, "kind").as_deref() == Some("interview"))
        .filter(|event| inside_window(&text(event, "date").unwrap_or_default(), start, end))
        .collect::<Vec<_>>();
    let done = interview_events
        .iter()
        .filter(|event| {
            let task_id = format!("coach-event-{}", text(event, "id").unwrap_or_default());
            completed.get(&task_id).copied().unwrap_or(false)
                || evidence_task_ids.contains(&task_id)
        })
        .count() as i64;
    rate_outcome(interview_events.len() as i64, done)
}

pub(super) fn evidence_type_counts(records: &[EvidenceRecord]) -> Value {
    let mut counts = Map::new();
    for key in [
        "review",
        "oral_score",
        "interview_answer",
        "delivery_record",
        "learning_note",
    ] {
        counts.insert(key.to_string(), json!(0));
    }
    for record in records {
        let count = count_in_map(&counts, &record.evidence_type) + 1;
        counts.insert(record.evidence_type.clone(), json!(count));
    }
    Value::Object(counts)
}

pub(super) fn completed_map(value: Option<&Value>) -> HashMap<String, bool> {
    value
        .and_then(Value::as_object)
        .map(|map| {
            map.iter()
                .filter_map(|(key, value)| value.as_bool().map(|done| (key.clone(), done)))
                .collect()
        })
        .unwrap_or_default()
}

pub(super) fn count_at(value: &Value, field: &str) -> i64 {
    value.get(field).and_then(Value::as_i64).unwrap_or_default()
}

fn rate_outcome(total: i64, completed: i64) -> RateOutcome {
    let rate = if total > 0 {
        ((completed as f64 / total as f64) * 100.0).round() as i64
    } else {
        0
    };
    RateOutcome {
        total,
        completed,
        rate,
        label: if total > 0 {
            format!("{rate}%")
        } else {
            "暂无".to_string()
        },
    }
}

fn count_in_map(map: &Map<String, Value>, field: &str) -> i64 {
    map.get(field).and_then(Value::as_i64).unwrap_or_default()
}

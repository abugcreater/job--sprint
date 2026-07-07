use serde_json::{Value, json};
use sqlx::SqlitePool;

use crate::auth_config::UserConfig;
use crate::coach_onboarding_event_summary::summarize_coach_onboarding_events;
use crate::coach_onboarding_events::list_coach_onboarding_events;

pub(crate) async fn coach_onboarding_report(
    db: &SqlitePool,
    users: &[UserConfig],
) -> sqlx::Result<Value> {
    let mut rows = Vec::with_capacity(users.len());
    for user in users {
        let events = list_coach_onboarding_events(db, &user.data_scope, 50).await?;
        let summary = summarize_coach_onboarding_events(&events);
        rows.push(json!({
            "username": user.username,
            "displayName": user.display_name,
            "dataScope": user.data_scope,
            "inviteBatch": user.invite_batch,
            "latestEvent": events.first().cloned().unwrap_or(Value::Null),
            "summary": summary
        }));
    }
    Ok(json!({
        "summary": summarize_rows(&rows),
        "batches": summarize_batches(&rows),
        "users": rows
    }))
}

fn summarize_rows(rows: &[Value]) -> Value {
    let total_users = rows.len() as i64;
    let started_count = rows.iter().filter(|row| event_count(row) > 0).count() as i64;
    let completed_count = rows
        .iter()
        .filter(|row| latest_completion_rate(row) >= 100)
        .count() as i64;
    let completion_rate = if total_users == 0 {
        0
    } else {
        ((completed_count as f64 / total_users as f64) * 100.0).round() as i64
    };
    json!({
        "totalUsers": total_users,
        "startedCount": started_count,
        "completedCount": completed_count,
        "completionRate": completion_rate,
        "completionRateLabel": if total_users == 0 { "暂无".to_string() } else { format!("{completion_rate}%") },
        "topDropOffs": top_drop_offs(rows),
        "highestRiskLabel": highest_risk_label(rows)
    })
}

fn summarize_batches(rows: &[Value]) -> Vec<Value> {
    let mut batches = rows
        .iter()
        .filter_map(|row| row.get("inviteBatch").and_then(Value::as_str))
        .collect::<Vec<_>>();
    batches.sort_unstable();
    batches.dedup();
    batches
        .into_iter()
        .map(|batch| {
            let batch_rows = rows
                .iter()
                .filter(|row| row.get("inviteBatch").and_then(Value::as_str) == Some(batch))
                .cloned()
                .collect::<Vec<_>>();
            let summary = summarize_rows(&batch_rows);
            json!({
                "inviteBatch": batch,
                "totalUsers": summary["totalUsers"],
                "startedCount": summary["startedCount"],
                "completedCount": summary["completedCount"],
                "completionRate": summary["completionRate"],
                "completionRateLabel": summary["completionRateLabel"],
                "topDropOffs": summary["topDropOffs"],
                "topDropOffLabel": summary["topDropOffs"].as_array().and_then(|items| items.first()).and_then(|item| item.get("label")).and_then(Value::as_str).unwrap_or("暂无"),
                "highestRiskLabel": summary["highestRiskLabel"]
            })
        })
        .collect()
}

fn top_drop_offs(rows: &[Value]) -> Vec<Value> {
    let mut counts = std::collections::BTreeMap::<String, i64>::new();
    for row in rows {
        let label = row
            .pointer("/summary/latestDropOffLabel")
            .and_then(Value::as_str)
            .unwrap_or("");
        if label.is_empty() || label == "暂无" || label == "无放弃点" {
            continue;
        }
        *counts.entry(label.to_string()).or_insert(0) += 1;
    }
    let mut out = counts
        .into_iter()
        .map(|(label, count)| json!({ "label": label, "count": count }))
        .collect::<Vec<_>>();
    out.sort_by(|left, right| {
        right["count"]
            .as_i64()
            .cmp(&left["count"].as_i64())
            .then_with(|| left["label"].as_str().cmp(&right["label"].as_str()))
    });
    out.truncate(5);
    out
}

fn highest_risk_label(rows: &[Value]) -> String {
    rows.iter()
        .filter_map(|row| {
            row.pointer("/summary/highestRiskLabel")
                .and_then(Value::as_str)
        })
        .max_by_key(|label| risk_rank(label))
        .unwrap_or("暂无")
        .to_string()
}

fn risk_rank(label: &str) -> i64 {
    if label.contains('高') {
        3
    } else if label.contains('中') {
        2
    } else if label.contains('低') {
        1
    } else {
        0
    }
}

fn event_count(row: &Value) -> i64 {
    row.pointer("/summary/eventCount")
        .and_then(Value::as_i64)
        .unwrap_or_default()
}

fn latest_completion_rate(row: &Value) -> i64 {
    row.pointer("/summary/latestCompletionRate")
        .and_then(Value::as_i64)
        .unwrap_or_default()
}

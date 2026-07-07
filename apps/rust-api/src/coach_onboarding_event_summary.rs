use serde_json::{Value, json};

pub(crate) fn summarize_coach_onboarding_events(events: &[Value]) -> Value {
    let Some(latest) = events.first() else {
        return json!({
            "eventCount": 0,
            "latestCompletionRate": 0,
            "latestCompletionRateLabel": "暂无",
            "latestDropOffLabel": "暂无",
            "latestRiskLabel": "暂无",
            "highestRiskLabel": "暂无",
            "nextActionLabel": "等待首登观察",
            "firstLoginStatus": "等待首登"
        });
    };
    let latest_completion_rate = latest
        .get("completionRate")
        .and_then(Value::as_i64)
        .unwrap_or_default();
    json!({
        "eventCount": events.len(),
        "latestCompletionRate": latest_completion_rate,
        "latestCompletionRateLabel": latest.get("completionRateLabel").and_then(Value::as_str).unwrap_or("0%"),
        "latestDropOffLabel": latest.get("dropOffLabel").and_then(Value::as_str).unwrap_or("未知放弃点"),
        "latestRiskLabel": latest.get("riskLabel").and_then(Value::as_str).unwrap_or("未知风险"),
        "highestRiskLabel": highest_risk_label(events),
        "nextActionLabel": latest.get("nextActionLabel").and_then(Value::as_str).unwrap_or("继续首登"),
        "firstLoginStatus": if latest_completion_rate >= 100 { "首登完成" } else { "首登进行中" }
    })
}

fn highest_risk_label(events: &[Value]) -> String {
    events
        .iter()
        .filter_map(|item| item.get("riskLabel").and_then(Value::as_str))
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

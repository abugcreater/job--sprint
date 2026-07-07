use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde_json::Value;

pub(super) fn outcome_window(requested: Option<&String>) -> (DateTime<Utc>, DateTime<Utc>) {
    let end = requested
        .and_then(|value| parse_date(value))
        .unwrap_or_else(|| Utc::now().date_naive())
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc();
    (end - Duration::days(6), end)
}

pub(super) fn format_date(date: DateTime<Utc>) -> String {
    date.date_naive().format("%Y-%m-%d").to_string()
}

pub(super) fn inside_window(value: &str, start: DateTime<Utc>, end: DateTime<Utc>) -> bool {
    let date_text = if value.len() == 10 {
        format!("{value}T12:00:00Z")
    } else {
        value.to_string()
    };
    let date = DateTime::parse_from_rfc3339(&date_text)
        .map(|date| date.with_timezone(&Utc))
        .ok();
    let Some(date) = date else { return false };
    date >= start && date < end + Duration::days(1)
}

pub(super) fn text(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn parse_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value.get(0..10)?, "%Y-%m-%d").ok()
}

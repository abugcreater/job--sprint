use serde_json::Value;

pub(crate) const PROMPT_VERSION: &str = "coach-artifacts-v1";
pub(crate) const SCHEMA_VERSION: &str = "coach-artifact-list-v1";

pub(crate) fn input_summary_hash(
    profile_id: &str,
    target_role: &str,
    role_family: &str,
    boundaries: &[Value],
    opportunity_hash_parts: &[String],
    target_date: &str,
) -> String {
    let boundary_topics = boundaries
        .iter()
        .take(10)
        .map(|boundary| string_or(boundary.get("topic"), "unknown"))
        .collect::<Vec<_>>()
        .join("|");
    let opportunity_summary = opportunity_hash_parts.join("|");
    let summary = format!(
        "{profile_id}|{target_role}|{role_family}|{boundary_topics}|{opportunity_summary}|{target_date}"
    );
    let mut hash: u32 = 0x811c9dc5;
    for byte in summary.as_bytes() {
        hash ^= u32::from(*byte);
        hash = hash.wrapping_mul(0x01000193);
    }
    format!("{hash:08x}")
}

fn string_or(value: Option<&Value>, fallback: &str) -> String {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

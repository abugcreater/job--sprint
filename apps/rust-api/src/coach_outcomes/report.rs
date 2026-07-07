use chrono::Utc;
use serde_json::{Map, Value, json};
use std::collections::HashSet;

use crate::llm_feedback_summary::summarize_llm_feedback;

use super::metrics::{
    accepted_schedule_outcome, completed_map, evidence_type_counts, interview_review_outcome,
    weekly_delays, weekly_evidence,
};
use super::narrative::{
    build_next_week_focus, build_risks, build_signals, outcome_score, score_label,
};
use super::window::{format_date, outcome_window};

pub(crate) fn build_coach_outcome_report(
    progress: &Value,
    feedback: &[Value],
    requested_date: Option<&String>,
) -> Value {
    let progress_object = object_ref(progress);
    let coach = progress_object
        .get("coach")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let completed = completed_map(progress_object.get("completed"));
    let fallback_date = progress_object
        .get("lastSavedAt")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let requested_date = requested_date.cloned().or(fallback_date);
    let (start, end) = outcome_window(requested_date.as_ref());
    let evidence = weekly_evidence(progress_object.get("evidenceByTaskId"), start, end);
    let delays = weekly_delays(progress_object.get("delayRecords"), start, end);
    let accepted_schedule =
        accepted_schedule_outcome(coach.get("coachScheduleEvents"), &completed, start, end);
    let interview_review = interview_review_outcome(
        coach.get("coachScheduleEvents"),
        &completed,
        &evidence,
        start,
        end,
    );
    let feedback_summary = summarize_llm_feedback(feedback);
    let evidence_type_counts = evidence_type_counts(&evidence);
    let effective_action_count = evidence
        .iter()
        .filter(|record| {
            record.verified && completed.get(&record.task_id).copied().unwrap_or(false)
        })
        .map(|record| record.task_id.clone())
        .collect::<HashSet<_>>()
        .len();
    let feedback_reviewed_count = feedback_summary
        .get("reviewedCount")
        .and_then(Value::as_u64)
        .unwrap_or_default() as i64;
    let score = outcome_score(
        evidence.len() as i64,
        effective_action_count as i64,
        accepted_schedule.rate,
        interview_review.rate,
        feedback_reviewed_count,
    );

    json!({
        "schemaVersion": "coach-outcome-report-v1",
        "attributionLevel": "server-weekly-runtime",
        "generatedAt": Utc::now().to_rfc3339(),
        "startDate": format_date(start),
        "endDate": format_date(end),
        "dateRangeLabel": format!("{} 至 {}", format_date(start), format_date(end)),
        "score": score,
        "scoreLabel": score_label(score),
        "summary": format!("服务端周结果归因 {score}/100，{}。", score_label(score)),
        "metrics": {
            "evidenceCount": evidence.len(),
            "verifiedEvidenceCount": evidence.iter().filter(|record| record.verified).count(),
            "completedTaskCount": completed.values().filter(|done| **done).count(),
            "effectiveActionCount": effective_action_count,
            "delayCount": delays,
            "feedbackReviewedCount": feedback_reviewed_count,
            "acceptedScheduleCount": accepted_schedule.total,
            "acceptedScheduleCompletedCount": accepted_schedule.completed,
            "acceptedScheduleCompletionRate": accepted_schedule.rate,
            "acceptedScheduleCompletionRateLabel": accepted_schedule.label,
            "interviewReviewTotalCount": interview_review.total,
            "interviewReviewCompletedCount": interview_review.completed,
            "interviewReviewRate": interview_review.rate,
            "interviewReviewRateLabel": interview_review.label,
            "evidenceTypeCounts": evidence_type_counts
        },
        "signals": build_signals(&evidence_type_counts, effective_action_count as i64, &accepted_schedule, &feedback_summary),
        "risks": build_risks(&evidence_type_counts, delays, &accepted_schedule, &interview_review),
        "nextWeekFocus": build_next_week_focus(&evidence_type_counts, &accepted_schedule, &interview_review)
    })
}

pub(crate) fn outcome_snapshots(progress: &Value) -> Vec<Value> {
    progress
        .get("coachOutcomeSnapshots")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|item| {
            item.get("schemaVersion").and_then(Value::as_str) == Some("coach-outcome-report-v1")
        })
        .take(20)
        .collect()
}

fn object_ref(value: &Value) -> &Map<String, Value> {
    value
        .as_object()
        .expect("runtime progress is normalized object")
}

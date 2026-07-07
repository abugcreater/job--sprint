use serde_json::{Value, json};

use crate::coach_opportunity_signal_parse::{
    build_focus_label, fallback, normalize_signals, optional_phrase, source_label,
};

#[derive(Default)]
pub(crate) struct OpportunityContext {
    pub(crate) sources: Vec<String>,
    pub(crate) hash_parts: Vec<String>,
    pub(crate) knowledge_hint: String,
    pub(crate) schedule_hint: String,
    pub(crate) reason_hint: String,
    pub(crate) focus_label: String,
    pub(crate) focus_question_hint: String,
}

pub(crate) fn coach_opportunity_context(payload: &Value) -> OpportunityContext {
    let signals = normalize_signals(
        payload
            .get("opportunitySignals")
            .or_else(|| payload.get("applications")),
    );
    let Some(primary) = signals.first() else {
        return OpportunityContext::default();
    };
    let label = format!(
        "{}-{}",
        fallback(&primary.company, "未命名公司"),
        fallback(&primary.role, "未知岗位")
    );
    let keyword_text = primary
        .keywords
        .iter()
        .chain(primary.tags.iter())
        .filter(|item| !item.is_empty())
        .take(5)
        .cloned()
        .collect::<Vec<_>>()
        .join("、");
    let status_text = optional_phrase(&primary.status, "，状态");
    let keyword_hint = if keyword_text.is_empty() {
        String::new()
    } else {
        format!("，JD/命中点「{keyword_text}」")
    };
    let focus_label = build_focus_label(primary);
    let focus_hint = if focus_label.is_empty() {
        String::new()
    } else {
        format!("，JD 焦点「{focus_label}」")
    };
    let insight_hint = if primary.jd_insights.summary.is_empty() {
        String::new()
    } else {
        format!("，JD 解析「{}」", primary.jd_insights.summary)
    };
    let responsibility_hint = primary
        .jd_insights
        .responsibilities
        .first()
        .map(|responsibility| format!("，岗位责任「{responsibility}」"))
        .unwrap_or_default();
    let skill_hint = primary
        .jd_insights
        .hard_skills
        .first()
        .map(|skill| format!("，主技能「{skill}」"))
        .unwrap_or_default();
    let risk_hint = primary
        .jd_insights
        .risk_signals
        .first()
        .map(|risk| format!("，风险点「{risk}」"))
        .unwrap_or_default();
    let evidence_hint = primary
        .jd_insights
        .evidence_needs
        .first()
        .map(|evidence| format!("，证据要求「{evidence}」"))
        .unwrap_or_default();
    let feedback = fallback(&primary.feedback, &primary.notes);
    let feedback_hint = optional_phrase(feedback, "，反馈");
    OpportunityContext {
        sources: signals
            .iter()
            .take(3)
            .map(source_label)
            .chain((!focus_label.is_empty()).then(|| format!("JD焦点：{focus_label}")))
            .chain(
                (!primary.jd_insights.summary.is_empty())
                    .then(|| format!("JD解析：{}", primary.jd_insights.summary)),
            )
            .collect(),
        hash_parts: signals
            .iter()
            .take(5)
            .map(|signal| {
                format!(
                    "{}|{}|{}|{}|{}|{}",
                    signal.company,
                    signal.role,
                    signal.status,
                    signal.keywords.join(","),
                    build_focus_label(signal),
                    signal.jd_insights.summary
                )
            })
            .collect(),
        knowledge_hint: format!(
            " 优先贴合当前机会「{label}」{keyword_hint}{focus_hint}{insight_hint}{responsibility_hint}{skill_hint}{risk_hint}{evidence_hint}。"
        ),
        schedule_hint: format!(
            " 这条安排要能服务当前机会「{label}」{status_text}{keyword_hint}{focus_hint}{responsibility_hint}{risk_hint}{evidence_hint}。"
        ),
        reason_hint: format!(
            " 当前机会「{label}」{status_text}{keyword_hint}{focus_hint}{insight_hint}{responsibility_hint}{skill_hint}{risk_hint}{feedback_hint}。"
        ),
        focus_question_hint: if let Some(question) = primary.jd_insights.focus_questions.first() {
            if focus_label.is_empty() {
                format!("围绕 JD 解析题「{question}」，")
            } else {
                format!("围绕 JD 焦点「{focus_label}」和 JD 解析题「{question}」，")
            }
        } else if focus_label.is_empty() {
            String::new()
        } else {
            format!("围绕 JD 焦点「{focus_label}」，")
        },
        focus_label,
    }
}

pub(crate) fn sources_with_opportunity(base: Vec<String>, context: &OpportunityContext) -> Value {
    json!(
        base.into_iter()
            .chain(context.sources.iter().cloned())
            .collect::<Vec<_>>()
    )
}

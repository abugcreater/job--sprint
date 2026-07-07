#[derive(Default)]
pub(crate) struct JdInsights {
    pub(crate) responsibilities: Vec<String>,
    pub(crate) hard_skills: Vec<String>,
    pub(crate) risk_signals: Vec<String>,
    pub(crate) evidence_needs: Vec<String>,
    pub(crate) focus_questions: Vec<String>,
    pub(crate) summary: String,
}

pub(crate) fn build_jd_insights(
    keywords: &[String],
    tags: &[String],
    role: &str,
    feedback: &str,
    notes: &str,
) -> JdInsights {
    let text = format!(
        "{role} {} {} {feedback} {notes}",
        keywords.join(" "),
        tags.join(" ")
    );
    let hard_skills = unique(
        keywords
            .iter()
            .chain(tags.iter())
            .cloned()
            .chain(
                TECH_TERMS
                    .iter()
                    .filter(|term| text.contains(**term))
                    .map(|term| term.to_string()),
            )
            .collect(),
    )
    .into_iter()
    .take(6)
    .collect::<Vec<_>>();
    let risk_signals = RISK_TERMS
        .iter()
        .filter(|term| text.contains(**term))
        .map(|term| term.to_string())
        .take(5)
        .collect::<Vec<_>>();
    let responsibilities = RESPONSIBILITY_RULES
        .iter()
        .filter(|(_, terms)| terms.iter().any(|term| text.contains(term)))
        .map(|(label, _)| label.to_string())
        .take(4)
        .collect::<Vec<_>>();
    let evidence_needs = unique(
        risk_signals
            .iter()
            .map(|risk| risk_evidence_need(risk))
            .chain(
                hard_skills
                    .first()
                    .map(|skill| format!("准备 {skill} 的项目背景、指标和取舍证据")),
            )
            .collect(),
    )
    .into_iter()
    .take(4)
    .collect::<Vec<_>>();
    let focus_questions = unique(
        [
            hard_skills.first().and_then(|skill| {
                risk_signals
                    .first()
                    .map(|risk| format!("你如何在 {skill} 场景处理{risk}？"))
            }),
            hard_skills
                .first()
                .map(|skill| format!("你做过的 {skill} 项目边界和结果是什么？")),
        ]
        .into_iter()
        .flatten()
        .collect(),
    )
    .into_iter()
    .take(3)
    .collect::<Vec<_>>();
    let summary = [
        (!hard_skills.is_empty()).then(|| {
            format!(
                "硬技能 {}",
                hard_skills
                    .iter()
                    .take(3)
                    .cloned()
                    .collect::<Vec<_>>()
                    .join("、")
            )
        }),
        (!risk_signals.is_empty()).then(|| {
            format!(
                "风险 {}",
                risk_signals
                    .iter()
                    .take(2)
                    .cloned()
                    .collect::<Vec<_>>()
                    .join("、")
            )
        }),
        evidence_needs
            .first()
            .map(|evidence| format!("证据 {evidence}")),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join("；");
    JdInsights {
        responsibilities,
        hard_skills,
        risk_signals,
        evidence_needs,
        focus_questions,
        summary,
    }
}

const TECH_TERMS: &[&str] = &[
    "Java",
    "Spring",
    "Spring Boot",
    "MySQL",
    "SQL",
    "Redis",
    "MQ",
    "Kafka",
    "RocketMQ",
    "JVM",
    "Kubernetes",
    "Docker",
    "React",
    "Vue",
    "TypeScript",
    "自动化",
    "测试",
    "数据",
    "监控",
    "RAG",
    "Agent",
];
const RISK_TERMS: &[&str] = &[
    "故障恢复",
    "稳定性",
    "高并发",
    "性能",
    "补偿",
    "幂等",
    "缓存",
    "事务",
    "监控",
    "发布",
    "回滚",
    "质量",
    "安全",
];
const RESPONSIBILITY_RULES: &[(&str, &[&str])] = &[
    ("复杂业务建模", &["业务建模", "领域", "流程", "链路"]),
    ("稳定性治理", &["稳定性", "故障", "监控", "回滚"]),
    ("性能与容量", &["高并发", "性能", "容量", "压测"]),
    ("交付与协作", &["发布", "协作", "推进", "落地"]),
];

fn risk_evidence_need(risk: &str) -> String {
    match risk {
        "故障恢复" => "准备故障恢复案例、影响范围、定位链路和复盘动作".to_string(),
        "补偿" | "幂等" => "准备补偿链路、重试策略和幂等证据".to_string(),
        "稳定性" | "监控" => "准备稳定性指标、告警和线上治理证据".to_string(),
        "性能" | "高并发" => "准备压测指标、瓶颈定位和容量取舍".to_string(),
        _ => format!("准备 {risk} 的真实项目证据和边界"),
    }
}

fn unique(values: Vec<String>) -> Vec<String> {
    let mut result = Vec::new();
    for value in values.into_iter().map(|item| clean(&item)) {
        if !value.is_empty() && !result.contains(&value) {
            result.push(value);
        }
    }
    result
}

fn clean(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(120)
        .collect()
}

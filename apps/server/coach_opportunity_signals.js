function coachOpportunityContext(payload = {}) {
  const signals = normalizeOpportunitySignals(payload.opportunitySignals || payload.applications);
  const primary = signals[0];
  if (!primary) {
    return { signals, sources: [], promptSignals: [], hashParts: [], knowledgeHint: "", scheduleHint: "", reasonHint: "", focusLabel: "", focusQuestionHint: "" };
  }
  const keywordText = primary.keywords.concat(primary.tags).filter(Boolean).slice(0, 5).join("、");
  const label = `${primary.company || "未命名公司"}-${primary.role || "未知岗位"}`;
  const focusLabel = buildFocusLabel(primary);
  const statusText = primary.status ? `，状态「${primary.status}」` : "";
  const keywordHint = keywordText ? `，JD/命中点「${keywordText}」` : "";
  const focusHint = focusLabel ? `，JD 焦点「${focusLabel}」` : "";
  const insightHint = primary.jdInsights.summary ? `，JD 解析「${primary.jdInsights.summary}」` : "";
  const responsibilityHint = primary.jdInsights.responsibilities[0] ? `，岗位责任「${primary.jdInsights.responsibilities[0]}」` : "";
  const skillHint = primary.jdInsights.hardSkills[0] ? `，主技能「${primary.jdInsights.hardSkills[0]}」` : "";
  const riskHint = primary.jdInsights.riskSignals[0] ? `，风险点「${primary.jdInsights.riskSignals[0]}」` : "";
  const evidenceHint = primary.jdInsights.evidenceNeeds[0] ? `，证据要求「${primary.jdInsights.evidenceNeeds[0]}」` : "";
  const feedbackHint = primary.feedback || primary.notes ? `，反馈「${primary.feedback || primary.notes}」` : "";
  return {
    signals,
    sources: signals.slice(0, 3).map(sourceLabel).concat([
      ...(focusLabel ? [`JD焦点：${focusLabel}`] : []),
      ...(primary.jdInsights.summary ? [`JD解析：${primary.jdInsights.summary}`] : [])
    ]),
    promptSignals: signals.slice(0, 5),
    hashParts: signals.slice(0, 5).map((signal) => [signal.company, signal.role, signal.status, signal.keywords.join(","), buildFocusLabel(signal), signal.jdInsights.summary].join("|")),
    knowledgeHint: ` 优先贴合当前机会「${label}」${keywordHint}${focusHint}${insightHint}${responsibilityHint}${skillHint}${riskHint}${evidenceHint}。`,
    scheduleHint: ` 这条安排要能服务当前机会「${label}」${statusText}${keywordHint}${focusHint}${responsibilityHint}${riskHint}${evidenceHint}。`,
    reasonHint: ` 当前机会「${label}」${statusText}${keywordHint}${focusHint}${insightHint}${responsibilityHint}${skillHint}${riskHint}${feedbackHint}。`,
    focusLabel,
    focusQuestionHint: primary.jdInsights.focusQuestions[0]
      ? focusLabel
        ? `围绕 JD 焦点「${focusLabel}」和 JD 解析题「${primary.jdInsights.focusQuestions[0]}」，`
        : `围绕 JD 解析题「${primary.jdInsights.focusQuestions[0]}」，`
      : focusLabel ? `围绕 JD 焦点「${focusLabel}」，` : ""
  };
}

function normalizeOpportunitySignals(value) {
  return (Array.isArray(value) ? value : []).filter(Boolean).slice(0, 8).map((item, index) => {
    const keywords = splitWords(item.keywords).slice(0, 8);
    const tags = Array.isArray(item.tags) ? item.tags.map((tag) => clip(tag, 40)).filter(Boolean).slice(0, 8) : [];
    const role = clip(item.role || item.title, 120);
    const feedback = clip(item.feedback || item.hrFeedback, 240);
    const notes = clip(item.notes, 240);
    return {
      id: clip(item.id || `opportunity-${index}`, 80),
      company: clip(item.company, 80),
      role,
      status: clip(item.status, 40),
      city: clip(item.city, 40),
      keywords,
      tags,
      feedback,
      notes,
      resumeVersion: clip(item.resumeVersion, 80),
      createdAt: clip(item.createdAt, 40),
      jdInsights: buildJdInsights({ keywords, tags, role, feedback, notes })
    };
  }).filter((item) => item.company || item.role);
}

function sourceLabel(signal) {
  const keywords = signal.keywords.slice(0, 3).join("、");
  return `机会：${signal.company || "未命名公司"}-${signal.role || "未知岗位"}${signal.status ? `(${signal.status})` : ""}${keywords ? ` JD:${keywords}` : ""}`;
}

function splitWords(value) {
  if (Array.isArray(value)) return value.map((item) => clip(item, 40)).filter(Boolean);
  return clip(value, 240).split(/[、,，\s]+/).map((item) => clip(item, 40)).filter(Boolean);
}

function buildFocusLabel(signal) {
  const primaryKeyword = signal.keywords.concat(signal.tags).find(Boolean) || "";
  const focusTerm = extractFocusTerm(`${signal.feedback} ${signal.notes} ${signal.keywords.join(" ")}`);
  if (primaryKeyword && focusTerm && !primaryKeyword.includes(focusTerm)) return `${primaryKeyword} 的${focusTerm}`;
  return focusTerm || signal.keywords.slice(0, 2).join(" / ") || primaryKeyword;
}

function extractFocusTerm(text) {
  return ["故障恢复", "稳定性", "幂等", "补偿", "性能", "缓存", "高并发", "事务", "自动化", "质量", "监控", "发布", "回滚", "指标", "用户路径"].find((term) => text.includes(term)) || "";
}

function buildJdInsights({ keywords = [], tags = [], role = "", feedback = "", notes = "" }) {
  const text = [role, keywords.join(" "), tags.join(" "), feedback, notes].join(" ");
  const hardSkills = unique([...keywords, ...tags, ...TECH_TERMS.filter((term) => text.includes(term))]).slice(0, 6);
  const riskSignals = RISK_TERMS.filter((term) => text.includes(term)).slice(0, 5);
  const responsibilities = RESPONSIBILITY_RULES.filter((rule) => rule.terms.some((term) => text.includes(term))).map((rule) => rule.label).slice(0, 4);
  const evidenceNeeds = unique([
    ...riskSignals.map(riskEvidenceNeed),
    ...(hardSkills[0] ? [`准备 ${hardSkills[0]} 的项目背景、指标和取舍证据`] : [])
  ]).slice(0, 4);
  const focusQuestions = unique([
    ...(hardSkills[0] && riskSignals[0] ? [`你如何在 ${hardSkills[0]} 场景处理${riskSignals[0]}？`] : []),
    ...(hardSkills[0] ? [`你做过的 ${hardSkills[0]} 项目边界和结果是什么？`] : [])
  ]).slice(0, 3);
  return {
    responsibilities,
    hardSkills,
    riskSignals,
    evidenceNeeds,
    focusQuestions,
    summary: [
      hardSkills.length ? `硬技能 ${hardSkills.slice(0, 3).join("、")}` : "",
      riskSignals.length ? `风险 ${riskSignals.slice(0, 2).join("、")}` : "",
      evidenceNeeds[0] ? `证据 ${evidenceNeeds[0]}` : ""
    ].filter(Boolean).join("；")
  };
}

const TECH_TERMS = ["Java", "Spring", "Spring Boot", "MySQL", "SQL", "Redis", "MQ", "Kafka", "RocketMQ", "JVM", "Kubernetes", "Docker", "React", "Vue", "TypeScript", "自动化", "测试", "数据", "监控", "RAG", "Agent"];
const RISK_TERMS = ["故障恢复", "稳定性", "高并发", "性能", "补偿", "幂等", "缓存", "事务", "监控", "发布", "回滚", "质量", "安全"];
const RESPONSIBILITY_RULES = [
  { label: "复杂业务建模", terms: ["业务建模", "领域", "流程", "链路"] },
  { label: "稳定性治理", terms: ["稳定性", "故障", "监控", "回滚"] },
  { label: "性能与容量", terms: ["高并发", "性能", "容量", "压测"] },
  { label: "交付与协作", terms: ["发布", "协作", "推进", "落地"] }
];

function riskEvidenceNeed(risk) {
  if (risk === "故障恢复") return "准备故障恢复案例、影响范围、定位链路和复盘动作";
  if (risk === "补偿" || risk === "幂等") return "准备补偿链路、重试策略和幂等证据";
  if (risk === "稳定性" || risk === "监控") return "准备稳定性指标、告警和线上治理证据";
  if (risk === "性能" || risk === "高并发") return "准备压测指标、瓶颈定位和容量取舍";
  return `准备 ${risk} 的真实项目证据和边界`;
}

function unique(values) {
  return [...new Set(values.map((value) => clip(value, 120)).filter(Boolean))];
}

function clip(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

module.exports = { buildJdInsights, coachOpportunityContext, normalizeOpportunitySignals };

import type { ApplicationEvidenceRecord } from "./applicationsAdapter";

export interface OpportunitySignal {
  id: string;
  company: string;
  role: string;
  status: string;
  city: string;
  keywords: string[];
  tags: string[];
  feedback: string;
  notes: string;
  resumeVersion: string;
  createdAt: string;
  jdInsights?: JdInsights;
}

export interface JdInsights {
  responsibilities: string[];
  hardSkills: string[];
  riskSignals: string[];
  evidenceNeeds: string[];
  focusQuestions: string[];
  summary: string;
}

export interface OpportunityCoachContext {
  sources: string[];
  knowledgeHint: string;
  scheduleHint: string;
  reasonHint: string;
  focusLabel: string;
  focusQuestionHint: string;
}

export function buildOpportunitySignals(records: ApplicationEvidenceRecord[], limit = 5): OpportunitySignal[] {
  return records
    .filter((record) => clean(record.company) || clean(record.role))
    .slice(0, limit)
    .map((record) => {
      const keywords = splitKeywords(record.keywords);
      const tags = record.tags.map(clean).filter(Boolean).slice(0, 6);
      const role = clean(record.role);
      const feedback = clean(record.hrFeedback);
      const notes = clean(record.notes);
      return {
        id: record.id,
        company: clean(record.company),
        role,
        status: clean(record.status),
        city: clean(record.city),
        keywords,
        tags,
        feedback,
        notes,
        resumeVersion: clean(record.resumeVersion),
        createdAt: record.createdAt,
        jdInsights: buildJdInsights({ keywords, tags, role, feedback, notes })
      };
    });
}

export function buildOpportunityCoachContext(signals: OpportunitySignal[] = []): OpportunityCoachContext {
  const primary = signals[0];
  if (!primary) {
    return { sources: [], knowledgeHint: "", scheduleHint: "", reasonHint: "", focusLabel: "", focusQuestionHint: "" };
  }
  const keywordText = [...primary.keywords, ...primary.tags].filter(Boolean).slice(0, 5).join("、");
  const opportunityLabel = `${primary.company || "未命名公司"}-${primary.role || "未知岗位"}`;
  const focusLabel = buildFocusLabel(primary);
  const insights = primary.jdInsights ?? buildJdInsights(primary);
  const statusText = primary.status ? `，状态「${primary.status}」` : "";
  const keywordHint = keywordText ? `，JD/命中点「${keywordText}」` : "";
  const focusHint = focusLabel ? `，JD 焦点「${focusLabel}」` : "";
  const insightHint = insights.summary ? `，JD 解析「${insights.summary}」` : "";
  const responsibilityHint = insights.responsibilities[0] ? `，岗位责任「${insights.responsibilities[0]}」` : "";
  const skillHint = insights.hardSkills[0] ? `，主技能「${insights.hardSkills[0]}」` : "";
  const riskHint = insights.riskSignals[0] ? `，风险点「${insights.riskSignals[0]}」` : "";
  const evidenceHint = insights.evidenceNeeds[0] ? `，证据要求「${insights.evidenceNeeds[0]}」` : "";
  const feedbackHint = primary.feedback || primary.notes ? `，反馈「${primary.feedback || primary.notes}」` : "";
  return {
    sources: signals.slice(0, 3).map(opportunitySourceLabel).concat([
      ...(focusLabel ? [`JD焦点：${focusLabel}`] : []),
      ...(insights.summary ? [`JD解析：${insights.summary}`] : [])
    ]),
    knowledgeHint: ` 优先贴合当前机会「${opportunityLabel}」${keywordHint}${focusHint}${insightHint}${responsibilityHint}${skillHint}${riskHint}${evidenceHint}。`,
    scheduleHint: ` 这条安排要能服务当前机会「${opportunityLabel}」${statusText}${keywordHint}${focusHint}${responsibilityHint}${riskHint}${evidenceHint}。`,
    reasonHint: ` 当前机会「${opportunityLabel}」${statusText}${keywordHint}${focusHint}${insightHint}${responsibilityHint}${skillHint}${riskHint}${feedbackHint}。`,
    focusLabel,
    focusQuestionHint: insights.focusQuestions[0]
      ? focusLabel
        ? `围绕 JD 焦点「${focusLabel}」和 JD 解析题「${insights.focusQuestions[0]}」，`
        : `围绕 JD 解析题「${insights.focusQuestions[0]}」，`
      : focusLabel ? `围绕 JD 焦点「${focusLabel}」，` : ""
  };
}

export function opportunitySourceLabel(signal: OpportunitySignal): string {
  const keywordText = signal.keywords.slice(0, 3).join("、");
  const statusText = signal.status ? `(${signal.status})` : "";
  const keywordSuffix = keywordText ? ` JD:${keywordText}` : "";
  return `机会：${signal.company || "未命名公司"}-${signal.role || "未知岗位"}${statusText}${keywordSuffix}`;
}

function splitKeywords(value: string): string[] {
  return clean(value).split(/[、,，\s]+/).map(clean).filter(Boolean).slice(0, 8);
}

function buildFocusLabel(signal: OpportunitySignal): string {
  const primaryKeyword = [...signal.keywords, ...signal.tags].find(Boolean) ?? "";
  const focusTerm = extractFocusTerm(`${signal.feedback} ${signal.notes} ${signal.keywords.join(" ")}`);
  if (primaryKeyword && focusTerm && !primaryKeyword.includes(focusTerm)) return `${primaryKeyword} 的${focusTerm}`;
  return focusTerm || signal.keywords.slice(0, 2).join(" / ") || primaryKeyword;
}

export function buildJdInsights({
  keywords = [],
  tags = [],
  role = "",
  feedback = "",
  notes = ""
}: {
  keywords?: string[];
  tags?: string[];
  role?: string;
  feedback?: string;
  notes?: string;
}): JdInsights {
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

function extractFocusTerm(text: string): string {
  return ["故障恢复", "稳定性", "幂等", "补偿", "性能", "缓存", "高并发", "事务", "自动化", "质量", "监控", "发布", "回滚", "指标", "用户路径"].find((term) => text.includes(term)) ?? "";
}

const TECH_TERMS = ["Java", "Spring", "Spring Boot", "MySQL", "SQL", "Redis", "MQ", "Kafka", "RocketMQ", "JVM", "Kubernetes", "Docker", "React", "Vue", "TypeScript", "自动化", "测试", "数据", "监控", "RAG", "Agent"];
const RISK_TERMS = ["故障恢复", "稳定性", "高并发", "性能", "补偿", "幂等", "缓存", "事务", "监控", "发布", "回滚", "质量", "安全"];
const RESPONSIBILITY_RULES = [
  { label: "复杂业务建模", terms: ["业务建模", "领域", "流程", "链路"] },
  { label: "稳定性治理", terms: ["稳定性", "故障", "监控", "回滚"] },
  { label: "性能与容量", terms: ["高并发", "性能", "容量", "压测"] },
  { label: "交付与协作", terms: ["发布", "协作", "推进", "落地"] }
];

function riskEvidenceNeed(risk: string): string {
  if (risk === "故障恢复") return "准备故障恢复案例、影响范围、定位链路和复盘动作";
  if (risk === "补偿" || risk === "幂等") return "准备补偿链路、重试策略和幂等证据";
  if (risk === "稳定性" || risk === "监控") return "准备稳定性指标、告警和线上治理证据";
  if (risk === "性能" || risk === "高并发") return "准备压测指标、瓶颈定位和容量取舍";
  return `准备 ${risk} 的真实项目证据和边界`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

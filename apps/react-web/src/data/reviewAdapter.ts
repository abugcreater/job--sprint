import { buildDailyEvidence } from "./scheduleAdapter";
import type { LegacySnapshot } from "./legacyAdapters";
import type { AiFeedbackSummary } from "./aiFeedbackAdapter";
import type { DailySprint, ReviewEvidence, RiskItem, Task } from "../types/sprint";

export interface ReviewFormDraft {
  projectPoint: string;
  interviewQuestions: string;
  javaPoint: string;
  pathIssues: string;
  fragileAnswers: string;
  tomorrowPriority: string;
}

export interface ReviewEvidenceRecord {
  id: string;
  taskId: string;
  source: "local" | "legacy";
  type: ReviewEvidence["type"];
  title: string;
  content: string;
  createdAt: string;
  projectPoint: string;
  interviewQuestions: string;
  javaPoint: string;
  pathIssues: string;
  fragileAnswers: string;
  tomorrowPriority: string;
}

export type ReviewRecordFilter = "all" | "has_path_issue" | "has_fragile_answer" | "has_tomorrow_priority";

export const reviewRecordFilters: Array<{ id: ReviewRecordFilter; label: string }> = [
  { id: "all", label: "全部复盘" },
  { id: "has_path_issue", label: "有路径问题" },
  { id: "has_fragile_answer", label: "有薄弱回答" },
  { id: "has_tomorrow_priority", label: "有明日优先" }
];

export interface ReviewTaskSummary {
  id: string;
  title: string;
  durationLabel: string;
  description: string;
  isCurrent: boolean;
  reviewCount: number;
}

export interface ReviewDashboard {
  dateLabel: string;
  targetTask?: Task;
  reviewTasks: ReviewTaskSummary[];
  evidenceRecords: ReviewEvidenceRecord[];
  reviewRecords: ReviewEvidenceRecord[];
  risks: RiskItem[];
  tomorrowAdvice: string[];
  completion: {
    total: number;
    done: number;
    pending: number;
    overdue: number;
    evidenceMissing: number;
    donePercent: number;
  };
}

export interface ReviewAiAnalysis {
  readiness: "ready" | "needs_review" | "needs_evidence";
  summary: string;
  facts: string[];
  gaps: string[];
  recommendations: string[];
  nextAction: string;
}

export interface ReviewExportPayload {
  version: "react-review-export-v1";
  source: "job-sprint-react";
  exportedAt: string;
  date: string;
  count: number;
  records: Array<{
    id: string;
    taskId: string;
    title: string;
    projectPoint: string;
    interviewQuestions: string;
    javaPoint: string;
    pathIssues: string;
    fragileAnswers: string;
    tomorrowPriority: string;
    createdAt: string;
  }>;
}

const reviewEvidenceTypes = new Set(["review"]);

export function createReviewDraft(): ReviewFormDraft {
  return {
    projectPoint: "",
    interviewQuestions: "",
    javaPoint: "",
    pathIssues: "",
    fragileAnswers: "",
    tomorrowPriority: ""
  };
}

export function buildReviewDashboard(
  sprint: DailySprint,
  evidenceByTaskId: Record<string, ReviewEvidence[]>,
  legacy: LegacySnapshot = { completed: {}, reviews: {}, applications: [], interviewSessions: [] }
): ReviewDashboard {
  const currentTask = sprint.tasks.find((task) => task.id === sprint.currentTaskId);
  const reviewTasks = sprint.tasks.filter((task) => task.type === "review");
  const targetTask = currentTask ?? reviewTasks[0] ?? sprint.tasks[0];
  const evidenceRecords = buildEvidenceRecords(sprint, evidenceByTaskId, legacy);
  const reviewRecords = evidenceRecords.filter((record) => record.type === "review");

  return {
    dateLabel: `${sprint.date} ${sprint.weekday}`,
    targetTask,
    reviewTasks: buildReviewTasks(reviewTasks, currentTask, evidenceByTaskId),
    evidenceRecords,
    reviewRecords,
    risks: sprint.risks,
    tomorrowAdvice: buildTomorrowAdvice(sprint, targetTask),
    completion: {
      total: sprint.progress.total,
      done: sprint.progress.done,
      pending: sprint.progress.pending,
      overdue: sprint.progress.overdue,
      evidenceMissing: sprint.progress.evidenceMissing,
      donePercent: sprint.progress.total ? Math.round((sprint.progress.done / sprint.progress.total) * 100) : 0
    }
  };
}

export function buildReviewEvidenceContent(sprint: DailySprint, task: Task, draft: ReviewFormDraft): string {
  const projectPoint = cleanLabeledValue(draft.projectPoint, "项目点");
  const interviewQuestions = cleanLabeledValue(draft.interviewQuestions, "面试题");
  const javaPoint = cleanLabeledValue(draft.javaPoint, "Java 知识点");
  const pathIssues = cleanLabeledValue(draft.pathIssues, "路径问题");
  const fragileAnswers = cleanLabeledValue(draft.fragileAnswers, "易被追问");
  const tomorrowPriority = cleanLabeledValue(draft.tomorrowPriority, "明日优先");
  const parts = [
    `当前任务：${task.title}`,
    `完成进度：${sprint.progress.done}/${sprint.progress.total}`,
    projectPoint ? `项目点：${projectPoint}` : "",
    interviewQuestions ? `面试题：${interviewQuestions}` : "",
    javaPoint ? `Java 知识点：${javaPoint}` : "",
    pathIssues ? `路径问题：${pathIssues}` : "",
    fragileAnswers ? `易被追问：${fragileAnswers}` : "",
    tomorrowPriority ? `明日优先：${tomorrowPriority}` : ""
  ].filter(Boolean);

  return `React 复盘页本地记录：${parts.join("；")}`;
}

export function isReviewDraftReady(draft: ReviewFormDraft): boolean {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

export function reviewRecordToDraft(record: ReviewEvidenceRecord): ReviewFormDraft {
  return {
    projectPoint: record.projectPoint,
    interviewQuestions: record.interviewQuestions,
    javaPoint: record.javaPoint,
    pathIssues: record.pathIssues,
    fragileAnswers: record.fragileAnswers,
    tomorrowPriority: record.tomorrowPriority
  };
}

export function filterReviewRecords(records: ReviewEvidenceRecord[], filter: ReviewRecordFilter = "all"): ReviewEvidenceRecord[] {
  if (filter === "all") return records;
  if (filter === "has_path_issue") return records.filter((record) => Boolean(record.pathIssues));
  if (filter === "has_fragile_answer") return records.filter((record) => Boolean(record.fragileAnswers));
  return records.filter((record) => Boolean(record.tomorrowPriority));
}

export function buildReviewExportPayload(records: ReviewEvidenceRecord[], date: string, exportedAt = new Date().toISOString()): ReviewExportPayload {
  const localRecords = records.filter((record) => record.source === "local");
  return {
    version: "react-review-export-v1",
    source: "job-sprint-react",
    exportedAt,
    date,
    count: localRecords.length,
    records: localRecords.map((record) => ({
      id: record.id,
      taskId: record.taskId,
      title: record.title,
      projectPoint: record.projectPoint,
      interviewQuestions: record.interviewQuestions,
      javaPoint: record.javaPoint,
      pathIssues: record.pathIssues,
      fragileAnswers: record.fragileAnswers,
      tomorrowPriority: record.tomorrowPriority,
      createdAt: record.createdAt
    }))
  };
}

export function buildReviewAiAnalysis(dashboard: ReviewDashboard, aiFeedback?: AiFeedbackSummary): ReviewAiAnalysis {
  const hasEvidence = dashboard.evidenceRecords.length > 0;
  const hasReview = dashboard.reviewRecords.length > 0;
  const fragileAnswers = uniqueFilled(dashboard.reviewRecords.map((record) => record.fragileAnswers));
  const pathIssues = uniqueFilled(dashboard.reviewRecords.map((record) => record.pathIssues));
  const tomorrowPriorities = uniqueFilled(dashboard.reviewRecords.map((record) => record.tomorrowPriority));
  const facts = [
    `今日完成 ${dashboard.completion.done}/${dashboard.completion.total}，缺证据 ${dashboard.completion.evidenceMissing} 项。`,
    `已沉淀证据 ${dashboard.evidenceRecords.length} 条，复盘 ${dashboard.reviewRecords.length} 条。`,
    aiFeedback?.reviewedCount ? `AI 建议反馈 ${aiFeedback.reviewedCount} 条，采纳率 ${aiFeedback.acceptanceRateLabel}，采纳日程完成 ${aiFeedback.acceptedOutcomeRateLabel}。` : "",
    fragileAnswers[0] ? `最新薄弱回答：${fragileAnswers[0]}` : "",
    pathIssues[0] ? `最新路径问题：${pathIssues[0]}` : ""
  ].filter(Boolean);
  const gaps = [
    !hasEvidence ? "缺少 Evidence Gate 证据，无法判断今天是否真实推进。" : "",
    !hasReview ? "缺少本地复盘记录，AI 无法区分事实、推断和建议。" : "",
    dashboard.completion.evidenceMissing > 0 ? `还有 ${dashboard.completion.evidenceMissing} 项完成记录缺证据。` : "",
    fragileAnswers[0] ? `面试回答仍可能被追问穿：${fragileAnswers[0]}` : "",
    pathIssues[0] ? `执行路径仍不稳：${pathIssues[0]}` : "",
    aiFeedback?.acceptedOutcomeCount && aiFeedback.acceptedOutcomeRate < 40 ? "AI 建议被采纳后完成率偏低，说明建议粒度或执行约束需要收窄。" : ""
  ].filter(Boolean);
  const recommendations = [
    fragileAnswers[0] ? `把「${fragileAnswers[0]}」改写成 60 秒回答，必须包含机制、边界和项目证据。` : "",
    pathIssues[0] ? `明日先补路径问题：${pathIssues[0]}，完成后再扩展新任务。` : "",
    tomorrowPriorities[0] ? `沿用你写下的明日优先：${tomorrowPriorities[0]}。` : "",
    aiFeedback?.acceptedOutcomeCount && aiFeedback.acceptedOutcomeRate < 40 ? "下一轮 AI 只生成 30 分钟内可完成的单动作建议。" : "",
    dashboard.completion.pending > 0 ? "先收尾一个待完成任务，再新增学习或机会动作。" : ""
  ].filter(Boolean);

  const readiness: ReviewAiAnalysis["readiness"] = !hasEvidence ? "needs_evidence" : !hasReview ? "needs_review" : "ready";
  return {
    readiness,
    summary: readiness === "ready" ? "本地规则版 AI 分析已生成，可用于明日计划和提示词校准。" : "复盘输入不足，先补证据和本地复盘。",
    facts: facts.length ? facts.slice(0, 5) : ["暂无足够事实。"],
    gaps: gaps.length ? gaps.slice(0, 5) : ["暂未发现明显缺口，继续观察后续结果。"],
    recommendations: recommendations.length ? recommendations.slice(0, 5) : ["保持当前节奏，明日继续补一条可验证证据。"],
    nextAction: recommendations[0] ?? "先补一条证据和一条复盘，再生成下一轮分析。"
  };
}

function buildReviewTasks(
  reviewTasks: Task[],
  currentTask: Task | undefined,
  evidenceByTaskId: Record<string, ReviewEvidence[]>
): ReviewTaskSummary[] {
  const tasks = [...reviewTasks];
  if (currentTask && !tasks.some((task) => task.id === currentTask.id)) {
    tasks.unshift(currentTask);
  }

  return tasks.slice(0, 4).map((task) => ({
    id: task.id,
    title: task.title,
    durationLabel: task.durationLabel,
    description: task.description,
    isCurrent: task.id === currentTask?.id,
    reviewCount: countReviewEvidence(task.id, evidenceByTaskId)
  }));
}

function buildEvidenceRecords(
  sprint: DailySprint,
  evidenceByTaskId: Record<string, ReviewEvidence[]>,
  legacy: LegacySnapshot
): ReviewEvidenceRecord[] {
  const taskIds = new Set(sprint.tasks.map((task) => task.id));
  const localRecords = Object.entries(evidenceByTaskId)
    .filter(([taskId]) => taskIds.has(taskId))
    .flatMap(([taskId, evidence]) =>
      evidence.map((item) => parseReviewRecord(taskId, item, "local"))
    );
  const legacyRecords = buildDailyEvidence(sprint.date, legacy).map((item) => parseReviewRecord(item.taskId, item, "legacy"));

  return [...localRecords, ...legacyRecords]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

function buildTomorrowAdvice(sprint: DailySprint, targetTask?: Task): string[] {
  const nextTask = sprint.nextTaskId ? sprint.tasks.find((task) => task.id === sprint.nextTaskId) : undefined;
  const advice = [
    sprint.nextMilestone,
    nextTask ? `下一任务：${nextTask.durationLabel} ${nextTask.title}` : "",
    targetTask?.acceptanceCriteria ? `当前验收：${targetTask.acceptanceCriteria}` : "",
    sprint.dailyDeliverables.length ? `保留交付：${sprint.dailyDeliverables.slice(0, 2).join("、")}` : ""
  ].filter(Boolean);

  return Array.from(new Set(advice)).slice(0, 4);
}

function countReviewEvidence(taskId: string, evidenceByTaskId: Record<string, ReviewEvidence[]>): number {
  return (evidenceByTaskId[taskId] ?? []).filter((item) => reviewEvidenceTypes.has(item.type)).length;
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueFilled(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function cleanLabeledValue(value: string, label: string): string {
  const cleaned = clean(value);
  const flexibleLabel = label.replace(/\s+/g, "\\s*");
  return cleaned.replace(new RegExp(`^${flexibleLabel}\\s*[:：]\\s*`, "i"), "");
}

function parseReviewRecord(taskId: string, item: ReviewEvidence, source: ReviewEvidenceRecord["source"]): ReviewEvidenceRecord {
  return {
    id: item.id,
    taskId,
    source,
    type: item.type,
    title: item.title,
    content: item.content,
    createdAt: item.createdAt,
    projectPoint: readContentField(item.content, "项目点"),
    interviewQuestions: readContentField(item.content, "面试题"),
    javaPoint: readContentField(item.content, "Java 知识点"),
    pathIssues: readContentField(item.content, "路径问题"),
    fragileAnswers: readContentField(item.content, "易被追问"),
    tomorrowPriority: readContentField(item.content, "明日优先")
  };
}

function readContentField(content: string, label: string): string {
  const marker = `${label}：`;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const valueStart = start + marker.length;
  const valueEnd = content.indexOf("；", valueStart);
  return clean(content.slice(valueStart, valueEnd >= 0 ? valueEnd : undefined));
}

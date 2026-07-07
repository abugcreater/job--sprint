import type { DailySprint, ReviewEvidence, Task, TaskType } from "../types/sprint";

export type ApplicationStatus = "已记录" | "待沟通" | "已沟通" | "约面" | "不匹配";
export type ApplicationStatusFilter = "all" | ApplicationStatus;

export const applicationStatuses: ApplicationStatus[] = ["已记录", "待沟通", "已沟通", "约面", "不匹配"];

export const applicationTagOptions = ["Java", "Spring", "MQ", "RAG", "Agent", "稳定性治理"] as const;

export interface ApplicationFormDraft {
  company: string;
  role: string;
  source: string;
  salaryRange: string;
  city: string;
  keywords: string;
  resumeVersion: string;
  status: ApplicationStatus;
  tags: string[];
  hrFeedback: string;
  notes: string;
}

export interface ApplicationEvidenceRecord {
  id: string;
  taskId: string;
  title: string;
  content: string;
  createdAt: string;
  company: string;
  role: string;
  source: string;
  salaryRange: string;
  city: string;
  keywords: string;
  resumeVersion: string;
  status: ApplicationStatus;
  tags: string[];
  hrFeedback: string;
  notes: string;
}

export interface ApplicationTaskSummary {
  id: string;
  title: string;
  durationLabel: string;
  description: string;
  deliverables: string[];
  isCurrent: boolean;
  recordCount: number;
}

export interface ApplicationDashboard {
  dateLabel: string;
  targetTask?: Task;
  targetTaskTitle: string;
  todaySignals: string[];
  deliveryTasks: ApplicationTaskSummary[];
  recentRecords: ApplicationEvidenceRecord[];
  recordCount: number;
  statusSummary: Array<{ status: ApplicationStatus; count: number }>;
}

export interface ApplicationExportPayload {
  version: "react-applications-export-v1";
  source: "job-sprint-react";
  exportedAt: string;
  date: string;
  count: number;
  records: Array<{
    id: string;
    taskId: string;
    company: string;
    role: string;
    source: string;
    salaryRange: string;
    city: string;
    keywords: string;
    resumeVersion: string;
    status: ApplicationStatus;
    tags: string[];
    hrFeedback: string;
    notes: string;
    createdAt: string;
  }>;
}

const applicationEvidenceTypes = new Set(["delivery_record"]);
const deliveryTaskTypes = new Set<TaskType>(["resume", "delivery"]);
const deliveryKeywords = /投递|简历|JD|岗位|反馈|公司|机会|沟通/;
const emptyDraft = createApplicationDraft();

export function createApplicationDraft(): ApplicationFormDraft {
  return {
    company: "",
    role: "",
    source: "",
    salaryRange: "",
    city: "",
    keywords: "",
    resumeVersion: "",
    status: "已记录",
    tags: ["Java"],
    hrFeedback: "",
    notes: ""
  };
}

export function buildApplicationsDashboard(
  sprint: DailySprint,
  evidenceByTaskId: Record<string, ReviewEvidence[]>
): ApplicationDashboard {
  const currentTask = sprint.tasks.find((task) => task.id === sprint.currentTaskId);
  const deliveryLikeTasks = sprint.tasks.filter(isDeliveryLikeTask);
  const targetTask = pickTargetTask(currentTask, deliveryLikeTasks, sprint.tasks);
  const records = buildRecentRecords(sprint.tasks, evidenceByTaskId);

  return {
    dateLabel: `${sprint.date} ${sprint.weekday}`,
    targetTask,
    targetTaskTitle: targetTask?.title ?? "今日机会反馈",
    todaySignals: buildTodaySignals(sprint, targetTask),
    deliveryTasks: buildDeliveryTasks(deliveryLikeTasks, currentTask, evidenceByTaskId),
    recentRecords: records,
    recordCount: records.length,
    statusSummary: buildStatusSummary(records)
  };
}

export function buildApplicationEvidenceContent(task: Task, draft: ApplicationFormDraft): string {
  const hrFeedback = cleanLabeledValue(cleanLabeledValue(draft.hrFeedback, "沟通反馈"), "HR 反馈");
  const notes = cleanLabeledValue(draft.notes, "反馈摘要");
  const parts = [
    `公司：${clean(draft.company)}`,
    `岗位：${clean(draft.role)}`,
    draft.source.trim() ? `来源：${clean(draft.source)}` : "",
    draft.salaryRange.trim() ? `薪资范围：${clean(draft.salaryRange)}` : "",
    draft.city.trim() ? `城市：${clean(draft.city)}` : "",
    `状态：${draft.status}`,
    draft.keywords.trim() ? `JD 关键词：${clean(draft.keywords)}` : "",
    draft.tags.length ? `命中点：${draft.tags.join("、")}` : "",
    draft.resumeVersion.trim() ? `简历版本：${clean(draft.resumeVersion)}` : "",
    hrFeedback ? `沟通反馈：${hrFeedback}` : "",
    notes ? `反馈摘要：${notes}` : ""
  ].filter(Boolean);

  return `React 机会页本地记录：围绕「${task.title}」补一条机会反馈。${parts.join("；")}`;
}

export function isApplicationDraftReady(draft: ApplicationFormDraft): boolean {
  return Boolean(draft.company.trim() && draft.role.trim());
}

export function applicationRecordToDraft(record: ApplicationEvidenceRecord): ApplicationFormDraft {
  return {
    company: record.company,
    role: record.role,
    source: record.source,
    salaryRange: record.salaryRange,
    city: record.city,
    keywords: record.keywords,
    resumeVersion: record.resumeVersion,
    status: record.status,
    tags: record.tags.length ? record.tags : [...emptyDraft.tags],
    hrFeedback: record.hrFeedback,
    notes: record.notes
  };
}

export function filterApplicationRecords(
  records: ApplicationEvidenceRecord[],
  statusFilter: ApplicationStatusFilter = "all"
): ApplicationEvidenceRecord[] {
  if (statusFilter === "all") return records;
  return records.filter((record) => record.status === statusFilter);
}

export function buildApplicationsExportPayload(
  records: ApplicationEvidenceRecord[],
  date: string,
  exportedAt = new Date().toISOString()
): ApplicationExportPayload {
  return {
    version: "react-applications-export-v1",
    source: "job-sprint-react",
    exportedAt,
    date,
    count: records.length,
    records: records.map((record) => ({
      id: record.id,
      taskId: record.taskId,
      company: record.company,
      role: record.role,
      source: record.source,
      salaryRange: record.salaryRange,
      city: record.city,
      keywords: record.keywords,
      resumeVersion: record.resumeVersion,
      status: record.status,
      tags: record.tags,
      hrFeedback: record.hrFeedback,
      notes: record.notes,
      createdAt: record.createdAt
    }))
  };
}

function pickTargetTask(currentTask: Task | undefined, deliveryLikeTasks: Task[], tasks: Task[]): Task | undefined {
  if (currentTask && isDeliveryLikeTask(currentTask)) return currentTask;
  return deliveryLikeTasks[0] ?? tasks[0];
}

function buildTodaySignals(sprint: DailySprint, targetTask?: Task): string[] {
  const signals = [
    ...sprint.dailyDeliverables,
    ...sprint.mustAnswer,
    targetTask?.acceptanceCriteria,
    targetTask?.description
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item) => deliveryKeywords.test(item));

  const unique = Array.from(new Set(signals));
  return unique.length ? unique.slice(0, 4) : ["记录一条公司、岗位、状态和反馈摘要，作为今日 Evidence Gate 证据。"];
}

function buildDeliveryTasks(
  tasks: Task[],
  currentTask: Task | undefined,
  evidenceByTaskId: Record<string, ReviewEvidence[]>
): ApplicationTaskSummary[] {
  const source = [...tasks];
  if (currentTask && isDeliveryLikeTask(currentTask) && !source.some((task) => task.id === currentTask.id)) {
    source.unshift(currentTask);
  }

  return source.slice(0, 4).map((task) => ({
    id: task.id,
    title: task.title,
    durationLabel: task.durationLabel,
    description: task.description,
    deliverables: task.deliverables,
    isCurrent: task.id === currentTask?.id,
    recordCount: countApplicationEvidence(task.id, evidenceByTaskId)
  }));
}

function buildRecentRecords(tasks: Task[], evidenceByTaskId: Record<string, ReviewEvidence[]>): ApplicationEvidenceRecord[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  return Object.entries(evidenceByTaskId)
    .filter(([taskId]) => taskIds.has(taskId))
    .flatMap(([taskId, evidence]) =>
      evidence
        .filter((item) => applicationEvidenceTypes.has(item.type))
        .map((item) => parseApplicationRecord(taskId, item))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
}

function buildStatusSummary(records: ApplicationEvidenceRecord[]): Array<{ status: ApplicationStatus; count: number }> {
  return applicationStatuses.map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length
  }));
}

function isDeliveryLikeTask(task: Task): boolean {
  return deliveryTaskTypes.has(task.type) || deliveryKeywords.test([task.title, task.description, task.deliverables.join(" ")].join(" "));
}

function countApplicationEvidence(taskId: string, evidenceByTaskId: Record<string, ReviewEvidence[]>): number {
  return (evidenceByTaskId[taskId] ?? []).filter((item) => applicationEvidenceTypes.has(item.type)).length;
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function cleanLabeledValue(value: string, label: string): string {
  const cleaned = clean(value);
  const flexibleLabel = label.replace(/\s+/g, "\\s*");
  return cleaned.replace(new RegExp(`^${flexibleLabel}\\s*[:：]\\s*`, "i"), "");
}

function parseApplicationRecord(taskId: string, item: ReviewEvidence): ApplicationEvidenceRecord {
  return {
    id: item.id,
    taskId,
    title: item.title,
    content: item.content,
    createdAt: item.createdAt,
    company: readContentField(item.content, "公司"),
    role: readContentField(item.content, "岗位"),
    source: readContentField(item.content, "来源"),
    salaryRange: readContentField(item.content, "薪资范围"),
    city: readContentField(item.content, "城市"),
    keywords: readContentField(item.content, "JD 关键词"),
    resumeVersion: readContentField(item.content, "简历版本"),
    status: normalizeApplicationStatus(readContentField(item.content, "状态")),
    tags: readContentField(item.content, "命中点").split("、").map(clean).filter(Boolean),
    hrFeedback: readContentField(item.content, "沟通反馈") || readContentField(item.content, "HR 反馈"),
    notes: readContentField(item.content, "反馈摘要")
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

function normalizeApplicationStatus(value: string): ApplicationStatus {
  if (value === "已投递") return "已记录";
  if (value === "待投递") return "待沟通";
  return applicationStatuses.includes(value as ApplicationStatus) ? (value as ApplicationStatus) : "已记录";
}

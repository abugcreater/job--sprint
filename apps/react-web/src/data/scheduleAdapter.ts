import scheduleJson from "./scheduleCompact.json";
import type { CoachScheduleEvent, DailySprint, EvidenceType, ReviewEvidence, RiskItem, SyncState, Task, TaskStatus, TaskType } from "../types/sprint";
import type { LegacySnapshot } from "./legacyAdapters";
import { buildCoachScheduleTasks } from "./coachScheduleTaskAdapter";

const FIXED_OFFSET = "+08:00";

export interface RawSchedule {
  timezone?: string;
  startDate: string;
  endDate: string;
  version: string;
  totalDays?: number;
  days: RawDay[];
}

export interface RawDay {
  date: string;
  weekday: string;
  dayIndex?: number;
  theme?: string;
  goal?: string;
  risk?: string;
  javaFocus?: string;
  blocks: RawBlock[];
  dailyDeliverables?: string[];
  mustAnswer?: string[];
}

export interface RawBlock {
  id: string;
  start: string;
  end: string;
  endDate?: string;
  category: string;
  title: string;
  description?: string;
  deliverables?: string[];
  interviewQuestions?: string[];
  javaMapping?: string;
  acceptance?: string;
  risk?: string;
  mustRead?: Array<{ label?: string }>;
  sourceFiles?: Array<{ label?: string }>;
}

export interface LocalSprintOverlay {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  syncState?: SyncState;
  coachScheduleEvents?: CoachScheduleEvent[];
  activeProfileId?: string;
}

interface PlanState {
  code: "before" | "running" | "waiting" | "day-ended" | "after" | "empty";
  current: EnrichedBlock | null;
  next: EnrichedBlock | null;
  today: RawDay | null;
  blocks: EnrichedBlock[];
}

interface EnrichedBlock extends RawBlock {
  day: RawDay;
  dayNumber: number;
  startDateTime: Date;
  endDateTime: Date;
}

const scheduleData = scheduleJson as RawSchedule;

export function getScheduleData(): RawSchedule {
  return scheduleData;
}

export function buildTodaySprint(
  schedule: RawSchedule = scheduleData,
  now: Date = new Date(),
  overlay: LocalSprintOverlay = { completed: {}, evidenceByTaskId: {} },
  legacy: LegacySnapshot = { completed: {}, reviews: {}, applications: [], interviewSessions: [] }
): DailySprint {
  const completed = { ...legacy.completed, ...overlay.completed };
  const evidenceByTaskId = overlay.evidenceByTaskId;
  const plan = getPlanState(schedule, now);
  const day = plan.today ?? schedule.days[0];
  const dayNumber = day ? getDayNumber(schedule, day) : 0;
  const dayBlocks = plan.blocks.filter((block) => block.day.date === day?.date);
  const currentBlock = plan.current ?? plan.next ?? dayBlocks.find((block) => !completed[block.id]) ?? dayBlocks[0] ?? null;
  const profileScheduleEvents = overlay.activeProfileId
    ? (overlay.coachScheduleEvents ?? []).filter((event) => event.profileId === overlay.activeProfileId)
    : (overlay.coachScheduleEvents ?? []);
  const customTasks = buildCoachScheduleTasks(profileScheduleEvents, day?.date ?? "", completed, now);
  const tasks = [...dayBlocks.map((block) => mapBlockToTask(block, completed, currentBlock?.id, now)), ...customTasks]
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const dailyEvidence = buildDailyEvidence(day?.date ?? "", legacy);
  const taskEvidenceMissing = tasks.filter((task) => task.status === "done" && !hasTaskEvidence(task.id, evidenceByTaskId, dailyEvidence)).length;
  const done = tasks.filter((task) => task.status === "done").length;
  const currentTask = tasks.find((task) => task.id === currentBlock?.id) ?? tasks[0];
  const nextBlock = currentBlock
    ? dayBlocks.find((block) => block.startDateTime.getTime() > currentBlock.startDateTime.getTime() && !completed[block.id])
    : null;
  const nextTask = tasks.find((task) => task.id === nextBlock?.id);

  return {
    date: day?.date ?? schedule.startDate,
    weekday: day?.weekday ?? "",
    day: dayNumber,
    totalDays: schedule.totalDays ?? schedule.days.length,
    theme: productText(day?.theme ?? "今日冲刺"),
    goal: productText(day?.goal ?? "完成今日求职冲刺任务"),
    tasks,
    currentTaskId: currentTask?.id,
    nextTaskId: nextTask?.id,
    progress: {
      total: tasks.length,
      done,
      pending: Math.max(0, tasks.length - done),
      overdue: tasks.filter((task) => task.status === "pending" && isBefore(task.endAt, now)).length,
      evidenceMissing: taskEvidenceMissing + (dailyEvidence.length ? 0 : 1)
    },
    risks: buildRisks(day, currentTask),
    dailyDeliverables: (day?.dailyDeliverables ?? []).map(productText),
    mustAnswer: (day?.mustAnswer ?? []).map(productText),
    nextMilestone: buildNextMilestone(plan, currentTask),
    syncState: overlay.syncState ?? "local_fallback",
    generatedAt: now.toISOString()
  };
}

export function buildDailyEvidence(date: string, legacy: LegacySnapshot): ReviewEvidence[] {
  if (!date) return [];

  const evidence: ReviewEvidence[] = [];
  const review = getRecordValue(legacy.reviews, date);
  if (hasReviewContent(review)) {
    evidence.push({
      id: `legacy-review-${date}`,
      taskId: "daily",
      type: "review",
      title: "旧版每日复盘",
      content: "检测到旧版复盘内容，可作为今日完成证据。",
      createdAt: `${date}T22:30:00${FIXED_OFFSET}`,
      verified: true
    });
  }

  const sessions = legacy.interviewSessions.filter((record) => recordDate(record) === date);
  sessions.forEach((record, index) => {
    evidence.push({
      id: `legacy-oral-${date}-${index + 1}`,
      taskId: "daily",
      type: "oral_score",
      title: "旧版口述评分",
      content: textFromUnknown(record, "检测到旧版口述记录。"),
      createdAt: `${date}T20:30:00${FIXED_OFFSET}`,
      verified: true
    });
  });

  const applications = legacy.applications.filter((record) => recordDate(record) === date);
  applications.forEach((record, index) => {
    evidence.push({
      id: `legacy-application-${date}-${index + 1}`,
      taskId: "daily",
      type: "delivery_record",
      title: "旧版机会记录",
      content: textFromUnknown(record, "检测到旧版机会记录。"),
      createdAt: `${date}T21:30:00${FIXED_OFFSET}`,
      verified: true
    });
  });

  return evidence;
}

export function getEvidenceSummary(taskId: string, date: string, evidenceByTaskId: Record<string, ReviewEvidence[]>, legacy: LegacySnapshot) {
  const taskEvidence = evidenceByTaskId[taskId] ?? [];
  const dailyEvidence = buildDailyEvidence(date, legacy);
  const evidence = [...taskEvidence, ...dailyEvidence];

  return {
    evidence,
    hasEvidence: evidence.length > 0,
    summary: evidence.length
      ? `已沉淀 ${evidence.length} 条证据：${evidence.map((item) => item.title).join("、")}`
      : "待沉淀：完成前请补一条复盘、口述评分、机会反馈或学习笔记。"
  };
}

function mapBlockToTask(block: EnrichedBlock, completed: Record<string, boolean>, currentTaskId: string | undefined, now: Date): Task {
  const status: TaskStatus = completed[block.id]
    ? "done"
    : block.id === currentTaskId
      ? "active"
      : block.endDateTime.getTime() < now.getTime()
        ? "pending"
        : "pending";
  const sourceLabels = (block.sourceFiles ?? block.mustRead ?? [])
    .map((item) => item.label)
    .filter((label): label is string => Boolean(label));

  return {
    id: block.id,
    day: block.dayNumber,
    date: block.day.date,
    weekday: block.day.weekday,
    title: productText(block.title),
    description: productText(block.description ?? ""),
    type: normalizeTaskType(block.category),
    status,
    startAt: `${block.day.date} ${block.start}`,
    endAt: `${block.endDate ?? block.day.date} ${block.end}`,
    durationLabel: `${block.start}-${block.end}`,
    deliverables: (block.deliverables ?? []).map(productText),
    interviewQuestions: (block.interviewQuestions ?? []).map(productText),
    acceptanceCriteria: productText(block.acceptance ?? "完成任务产出并补齐证据。"),
    javaMapping: productText(block.javaMapping),
    tags: [categoryLabel(block.category), block.day.javaFocus].filter((tag): tag is string => Boolean(tag)).map(productText),
    riskIds: block.risk ? [`risk-${block.id}`] : [],
    evidenceRequired: evidenceRequiredFor(block.category),
    sourceLabels: sourceLabels.map(productText)
  };
}

function productText(value: string | undefined): string {
  return (value ?? "")
    .replace(/投递反馈/g, "机会反馈")
    .replace(/投递记录/g, "机会记录")
    .replace(/简历\/投递/g, "简历/机会")
    .replace(/投递\/证据/g, "机会反馈/证据")
    .replace(/正式密集投递/g, "正式机会验证")
    .replace(/正式投递/g, "正式机会验证")
    .replace(/低风险投递/g, "低风险机会验证")
    .replace(/投递前/g, "机会验证前")
    .replace(/投递后/g, "机会反馈后")
    .replace(/投递/g, "机会验证");
}

function getPlanState(schedule: RawSchedule, now: Date): PlanState {
  const blocks = flattenBlocks(schedule);
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const today = getDayByDate(schedule, formatDate(now));

  if (!first || !last) {
    return { code: "empty", current: null, next: null, today, blocks };
  }

  const nowMs = now.getTime();
  if (nowMs < first.startDateTime.getTime()) {
    return { code: "before", current: null, next: first, today: getDayByDate(schedule, schedule.startDate), blocks };
  }

  if (nowMs >= last.endDateTime.getTime()) {
    return { code: "after", current: null, next: null, today: getDayByDate(schedule, schedule.endDate), blocks };
  }

  const current = blocks.find((block) => nowMs >= block.startDateTime.getTime() && nowMs < block.endDateTime.getTime()) ?? null;
  const next = blocks.find((block) => block.startDateTime.getTime() > nowMs) ?? null;

  if (current) {
    return { code: "running", current, next, today: current.day, blocks };
  }

  const hasRemainingToday = today
    ? today.blocks.some((block) => parseDateTime(today.date, block.start).getTime() > nowMs)
    : false;

  return {
    code: hasRemainingToday ? "waiting" : "day-ended",
    current: null,
    next,
    today: today ?? next?.day ?? null,
    blocks
  };
}

function flattenBlocks(schedule: RawSchedule): EnrichedBlock[] {
  return schedule.days
    .flatMap((day, dayIndex) =>
      day.blocks.map((block) => ({
        ...block,
        day,
        dayNumber: dayIndex + 1,
        startDateTime: parseDateTime(day.date, block.start),
        endDateTime: parseDateTime(block.endDate ?? day.date, block.end)
      }))
    )
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
}

function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${FIXED_OFFSET}`);
}

function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDayByDate(schedule: RawSchedule, date: string): RawDay | null {
  return schedule.days.find((day) => day.date === date) ?? null;
}

function getDayNumber(schedule: RawSchedule, day: RawDay): number {
  return schedule.days.findIndex((item) => item.date === day.date) + 1;
}

function buildRisks(day: RawDay | null, currentTask?: Task): RiskItem[] {
  const risks: RiskItem[] = [];

  if (day?.risk) {
    risks.push({
      id: `risk-${day.date}`,
      level: "medium",
      title: "今日主风险",
      reason: day.risk,
      mitigation: "先把任务输出和 Evidence Gate 做实，再扩展其它页面。"
    });
  }

  if (currentTask?.riskIds.length) {
    risks.push({
      id: currentTask.riskIds[0],
      level: "medium",
      title: "当前任务风险",
      reason: "当前任务有明确风险提示，完成前需要绑定真实项目或证据。",
      mitigation: currentTask.acceptanceCriteria
    });
  }

  return risks.length
    ? risks
    : [
        {
          id: "risk-evidence-gap",
          level: "low",
          title: "证据缺口",
          reason: "今日任务需要有可复盘证据，不能只标记完成。",
          mitigation: "先补口述、复盘或机会反馈，再标记完成。"
        }
      ];
}

function buildNextMilestone(plan: PlanState, currentTask?: Task): string {
  if (plan.current) return `完成 ${plan.current.end} 前的当前任务`;
  if (plan.next) return `准备 ${plan.next.start} 的 ${plan.next.title}`;
  return currentTask ? `复盘 ${currentTask.title}` : "完成今日复盘";
}

function normalizeTaskType(category: string): TaskType {
  const allowed = new Set<TaskType>([
    "project",
    "java",
    "agent",
    "rag",
    "interview",
    "resume",
    "delivery",
    "review",
    "deployment",
    "android",
    "rest",
    "path-audit",
    "path-missing",
    "public-safe",
    "health-check"
  ]);

  if (category === "spring") return "java";
  return allowed.has(category as TaskType) ? (category as TaskType) : "project";
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    project: "项目",
    java: "Java",
    agent: "Agent",
    rag: "RAG",
    interview: "面试",
    resume: "简历",
    delivery: "机会",
    review: "复盘",
    deployment: "部署",
    android: "Android",
    rest: "缓冲"
  };

  return labels[category] ?? category;
}

function evidenceRequiredFor(category: string): EvidenceType[] {
  if (category === "interview") return ["oral_score", "interview_answer"];
  if (category === "delivery" || category === "resume") return ["delivery_record", "learning_note"];
  if (category === "review") return ["review"];
  return ["learning_note", "review"];
}

function hasTaskEvidence(taskId: string, evidenceByTaskId: Record<string, ReviewEvidence[]>, dailyEvidence: ReviewEvidence[]): boolean {
  return Boolean(evidenceByTaskId[taskId]?.length || dailyEvidence.length);
}

function isBefore(dateTime: string, now: Date): boolean {
  const [date, time] = dateTime.split(" ");
  return Boolean(date && time && parseDateTime(date, time).getTime() < now.getTime());
}

function getRecordValue(source: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
}

function hasReviewContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => String(item ?? "").trim().length > 0);
}

function recordDate(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const raw = record.date ?? record.createdAt ?? record.timestamp ?? record.time;
  if (!raw) return null;
  const text = String(raw);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
}

function textFromUnknown(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  return String(record.summary ?? record.title ?? record.question ?? record.company ?? fallback);
}

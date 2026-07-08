import type { CoachScheduleEvent, DailySprint, ReviewEvidence, RiskItem, SyncState, Task } from "../types/sprint";
import type { LegacySnapshot } from "./legacyAdapters";
import { buildCoachScheduleTasks } from "./coachScheduleTaskAdapter";

export interface RawSchedule {
  timezone?: string;
  startDate: string;
  endDate: string;
  version: string;
  totalDays?: number;
  days: [];
}

export interface LocalSprintOverlay {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  syncState?: SyncState;
  coachScheduleEvents?: CoachScheduleEvent[];
  activeProfileId?: string;
}

const scheduleData: RawSchedule = {
  timezone: "Asia/Shanghai",
  startDate: "",
  endDate: "",
  version: "profile-generated-v1",
  totalDays: 0,
  days: []
};

export function getScheduleData(): RawSchedule {
  return scheduleData;
}

export function buildTodaySprint(
  schedule: RawSchedule = scheduleData,
  now: Date = new Date(),
  overlay: LocalSprintOverlay = { completed: {}, evidenceByTaskId: {} },
  _legacy: LegacySnapshot = { completed: {}, reviews: {}, applications: [], interviewSessions: [] }
): DailySprint {
  const completed = { ...overlay.completed };
  const evidenceByTaskId = overlay.evidenceByTaskId;
  const sprintDate = formatDate(now);
  const weekday = formatWeekday(now);
  const profileScheduleEvents = currentProfileEvents(overlay);
  const tasks = buildCoachScheduleTasks(profileScheduleEvents, sprintDate, completed, now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const done = tasks.filter((task) => task.status === "done").length;
  const currentTask = chooseCurrentTask(tasks, completed, now);
  const nextTask = findNextTask(tasks, completed, currentTask);

  return {
    date: sprintDate || schedule.startDate,
    weekday,
    day: tasks.length ? 1 : 0,
    totalDays: tasks.length ? 1 : 0,
    theme: buildTheme(overlay.activeProfileId, currentTask),
    goal: buildGoal(overlay.activeProfileId, currentTask),
    tasks,
    currentTaskId: currentTask?.id,
    nextTaskId: nextTask?.id,
    progress: {
      total: tasks.length,
      done,
      pending: Math.max(0, tasks.length - done),
      overdue: tasks.filter((task) => task.status === "pending" && isBefore(task.endAt, now)).length,
      evidenceMissing: tasks.filter((task) => task.evidenceRequired.length && !hasTaskEvidence(task.id, evidenceByTaskId)).length
    },
    risks: buildRisks(currentTask),
    dailyDeliverables: buildDailyDeliverables(currentTask),
    mustAnswer: buildMustAnswer(currentTask),
    nextMilestone: buildNextMilestone(overlay.activeProfileId, currentTask, nextTask),
    syncState: overlay.syncState ?? "local_fallback",
    generatedAt: now.toISOString()
  };
}

export function buildDailyEvidence(date: string, legacy: LegacySnapshot): ReviewEvidence[] {
  void date;
  void legacy;
  return [];
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

function currentProfileEvents(overlay: LocalSprintOverlay): CoachScheduleEvent[] {
  if (!overlay.activeProfileId) return [];
  return (overlay.coachScheduleEvents ?? []).filter((event) => event.profileId === overlay.activeProfileId);
}

function buildTheme(activeProfileId: string | undefined, currentTask?: Task): string {
  if (currentTask) return `个人求职行动：${currentTask.title}`;
  return activeProfileId ? "等待生成今日日历" : "等待导入简历建档";
}

function buildGoal(activeProfileId: string | undefined, currentTask?: Task): string {
  if (currentTask) return currentTask.description || "围绕当前求职画像完成今天的个人行动。";
  return activeProfileId ? "画像已就绪，先生成今天的个人行动。" : "先导入简历或粘贴 JD，确认求职画像后再生成日历。";
}

function buildRisks(currentTask?: Task): RiskItem[] {
  if (!currentTask) return [];
  return [
    {
      id: `risk-${currentTask.id}`,
      level: currentTask.evidenceRequired.length ? "medium" : "low",
      title: "证据缺口",
      reason: `「${currentTask.title}」需要绑定真实经历、输出或复盘记录，避免只停留在计划。`,
      mitigation: currentTask.acceptanceCriteria || "先补一条可读回证据，再标记完成。"
    }
  ];
}

function buildDailyDeliverables(currentTask?: Task): string[] {
  if (!currentTask) return [];
  return currentTask.deliverables.length ? currentTask.deliverables : [`完成「${currentTask.title}」`];
}

function buildMustAnswer(currentTask?: Task): string[] {
  if (!currentTask) return [];
  if (currentTask.interviewQuestions.length) return currentTask.interviewQuestions;
  return [
    `「${currentTask.title}」的可验证证据是什么？`,
    "哪些经历或结果不能夸大？",
    "完成后下一步最小动作是什么？"
  ];
}

function buildNextMilestone(activeProfileId: string | undefined, currentTask?: Task, nextTask?: Task): string {
  if (nextTask) return `准备 ${nextTask.durationLabel} 的 ${nextTask.title}`;
  if (currentTask?.status === "done") return `复盘 ${currentTask.title}`;
  if (currentTask) return `完成 ${currentTask.durationLabel} 的 ${currentTask.title}`;
  return activeProfileId ? "生成今日个人行动" : "导入简历生成画像";
}

function chooseCurrentTask(tasks: Task[], completed: Record<string, boolean>, now: Date): Task | undefined {
  return tasks.find((task) => task.status === "active")
    ?? tasks.find((task) => isTaskInCurrentWindow(task, now))
    ?? tasks.find((task) => !completed[task.id])
    ?? tasks[0];
}

function findNextTask(tasks: Task[], completed: Record<string, boolean>, currentTask?: Task): Task | undefined {
  if (!currentTask) return undefined;
  return tasks.find((task) => task.id !== currentTask.id && task.startAt > currentTask.startAt && !completed[task.id]);
}

function hasTaskEvidence(taskId: string, evidenceByTaskId: Record<string, ReviewEvidence[]>): boolean {
  return Boolean(evidenceByTaskId[taskId]?.length);
}

function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  }).format(date);
}

function isTaskInCurrentWindow(task: Task, now: Date): boolean {
  const start = parseTaskDateTime(task.startAt);
  const end = parseTaskDateTime(task.endAt);
  if (!start || !end) return false;
  const nowMs = now.getTime();
  return nowMs >= start.getTime() && nowMs < end.getTime();
}

function parseTaskDateTime(value: string): Date | null {
  const [date, time] = value.split(" ");
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00+08:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function isBefore(dateTime: string, now: Date): boolean {
  const parsed = parseTaskDateTime(dateTime);
  return Boolean(parsed && parsed.getTime() < now.getTime());
}

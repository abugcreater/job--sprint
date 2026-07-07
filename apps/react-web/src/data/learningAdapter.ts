import learningKnowledgeJson from "./learningKnowledgeCompact.json";
import type { DailySprint, ReviewEvidence, Task, TaskType } from "../types/sprint";

const learningTaskTypes = new Set<TaskType>(["java", "agent", "rag", "project", "path-audit"]);
const learningKeywords = ["Java", "Spring", "JVM", "Redis", "MQ", "缓存", "事务", "稳定性", "证据", "搜索", "学习"];

export interface LearningTaskSummary {
  id: string;
  title: string;
  description: string;
  durationLabel: string;
  tags: string[];
  deliverables: string[];
  interviewQuestions: string[];
  sourceLabels: string[];
  noteCount: number;
  notes: LearningNoteRecord[];
  statusLabel: string;
  isCurrent: boolean;
}

export interface LearningResource {
  id: string;
  label: string;
  kind: "资料标签" | "本地资料";
  hasPath: boolean;
  summary: string;
  taskIds: string[];
  taskTitles: string[];
}

export interface LearningNoteRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  title: string;
  content: string;
  createdAt: string;
  preview: string;
}

export interface LearningKnowledgeCard {
  id: string;
  category: string;
  title: string;
  publicSummary: string;
  interviewQuestion: string;
  javaMapping: string;
  projectEvidence: string;
  safeWording: string[];
  sourceLabels: string[];
}

export interface LearningKnowledgeFilters {
  query?: string;
  category?: string;
  markedOnly?: boolean;
  markedIds?: Set<string>;
}

export interface LearningDashboard {
  dateLabel: string;
  learningTasks: LearningTaskSummary[];
  resources: LearningResource[];
  knowledgeCards: LearningKnowledgeCard[];
  knowledgeCategories: string[];
  noteCount: number;
  recentNotes: LearningNoteRecord[];
  deliverableCount: number;
  focusTask?: LearningTaskSummary;
}

export const LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY = "jobSprint.react.learningKnowledgeMarks.v1";

interface CompactKnowledgeFile {
  entries: LearningKnowledgeCard[];
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const learningKnowledge = learningKnowledgeJson as CompactKnowledgeFile;

export function buildLearningDashboard(
  sprint: DailySprint,
  evidenceByTaskId: Record<string, ReviewEvidence[]>
): LearningDashboard {
  const sourceTasks = sortLearningTasks(sprint.tasks.filter(isLearningTask), sprint.currentTaskId);
  const learningTasks = sourceTasks.map((task) => toLearningTask(task, evidenceByTaskId, task.id === sprint.currentTaskId));
  const resources = buildResources(sourceTasks);
  const context = buildContext(sourceTasks, resources);
  const knowledgeCards = rankKnowledgeCards(context).slice(0, 6);
  const knowledgeCategories = learningKnowledgeCategories(knowledgeCards);
  const noteCount = learningTasks.reduce((sum, task) => sum + task.noteCount, 0);
  const recentNotes = learningTasks.flatMap((task) => task.notes).sort((a, b) => timestampOf(b.createdAt) - timestampOf(a.createdAt)).slice(0, 8);
  const deliverableCount = learningTasks.reduce((sum, task) => sum + task.deliverables.length, 0);

  return {
    dateLabel: `${sprint.date} ${sprint.weekday}`,
    learningTasks,
    resources,
    knowledgeCards,
    knowledgeCategories,
    noteCount,
    recentNotes,
    deliverableCount,
    focusTask: learningTasks.find((task) => task.noteCount === 0) ?? learningTasks[0]
  };
}

export function buildLearningNoteContent(task: LearningTaskSummary): string {
  const deliverables = task.deliverables.length ? task.deliverables.join("；") : "完成本任务学习产出";
  const questions = task.interviewQuestions.length ? `；关联追问：${task.interviewQuestions.slice(0, 2).join("；")}` : "";
  return `React 学习页本地记录：已为「${task.title}」补一条学习笔记。产出：${deliverables}${questions}`;
}

export function learningKnowledgeCategories(cards: LearningKnowledgeCard[]): string[] {
  return Array.from(new Set(cards.map((card) => card.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

export function filterLearningKnowledgeCards(cards: LearningKnowledgeCard[], filters: LearningKnowledgeFilters = {}): LearningKnowledgeCard[] {
  const query = normalizeSearch(filters.query);
  const category = filters.category ?? "all";
  const markedIds = filters.markedIds ?? new Set<string>();

  return cards.filter((card) => {
    if (category !== "all" && card.category !== category) return false;
    if (filters.markedOnly && !markedIds.has(card.id)) return false;
    if (!query) return true;
    return knowledgeSearchText(card).includes(query);
  });
}

export function findLearningKnowledgeCard(cards: LearningKnowledgeCard[], cardId?: string): LearningKnowledgeCard | undefined {
  if (!cardId) return undefined;
  return cards.find((card) => card.id === cardId);
}

export function readLearningKnowledgeMarks(storage = browserStorage()): Set<string> {
  if (!storage) return new Set<string>();

  try {
    const parsed = JSON.parse(storage.getItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

export function writeLearningKnowledgeMarks(markedIds: Set<string>, storage = browserStorage()): void {
  if (!storage) return;
  storage.setItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY, JSON.stringify(Array.from(markedIds).sort()));
}

export function toggleLearningKnowledgeMark(markedIds: Set<string>, cardId: string): Set<string> {
  const next = new Set(markedIds);
  if (next.has(cardId)) {
    next.delete(cardId);
  } else {
    next.add(cardId);
  }
  return next;
}

function isLearningTask(task: Task): boolean {
  return learningTaskTypes.has(task.type);
}

function sortLearningTasks(tasks: Task[], currentTaskId?: string): Task[] {
  return [...tasks].sort((a, b) => {
    const aPriority = a.id === currentTaskId ? 1 : 0;
    const bPriority = b.id === currentTaskId ? 1 : 0;
    return bPriority - aPriority;
  });
}

function toLearningTask(task: Task, evidenceByTaskId: Record<string, ReviewEvidence[]>, isCurrent: boolean): LearningTaskSummary {
  const notes = (evidenceByTaskId[task.id] ?? [])
    .filter((evidence) => evidence.type === "learning_note")
    .map((evidence) => toLearningNoteRecord(task, evidence))
    .sort((a, b) => timestampOf(b.createdAt) - timestampOf(a.createdAt));
  const noteCount = notes.length;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    durationLabel: task.durationLabel,
    tags: task.tags,
    deliverables: task.deliverables,
    interviewQuestions: task.interviewQuestions,
    sourceLabels: task.sourceLabels,
    noteCount,
    notes,
    statusLabel: noteCount > 0 ? `已补 ${noteCount} 条学习笔记` : "待补学习笔记",
    isCurrent
  };
}

function toLearningNoteRecord(task: Task, evidence: ReviewEvidence): LearningNoteRecord {
  const content = evidence.content.trim();
  const manualNote = readManualNote(content) || content;
  return {
    id: evidence.id,
    taskId: task.id,
    taskTitle: task.title,
    title: evidence.title,
    content,
    createdAt: evidence.createdAt,
    preview: manualNote.length > 160 ? `${manualNote.slice(0, 160)}...` : manualNote
  };
}

function buildResources(tasks: Task[]): LearningResource[] {
  const resources = new Map<string, LearningResource>();

  for (const task of tasks) {
    for (const label of task.sourceLabels) {
      const id = label.toLowerCase().replace(/\s+/g, "-");
      const resource = resources.get(id) ?? {
        id,
        label,
        kind: "资料标签" as const,
        hasPath: false,
        summary: `围绕「${label}」整理关联任务、产出和面试追问；当前数据只有脱敏标签，未配置可打开路径。`,
        taskIds: [],
        taskTitles: []
      };
      if (!resource.taskIds.includes(task.id)) {
        resource.taskIds.push(task.id);
      }
      if (!resource.taskTitles.includes(task.title)) {
        resource.taskTitles.push(task.title);
      }
      resources.set(id, resource);
    }
  }

  return Array.from(resources.values()).sort((a, b) => b.taskTitles.length - a.taskTitles.length || a.label.localeCompare(b.label, "zh-Hans-CN"));
}

function buildContext(tasks: Task[], resources: LearningResource[]): string {
  return [
    tasks.map((task) => [task.title, task.description, task.tags.join(" "), task.deliverables.join(" "), task.interviewQuestions.join(" ")].join(" ")).join(" "),
    resources.map((resource) => resource.label).join(" ")
  ].join(" ");
}

function rankKnowledgeCards(context: string): LearningKnowledgeCard[] {
  const normalizedContext = context.toLowerCase();

  return [...(learningKnowledge.entries ?? [])].sort((a, b) => scoreKnowledgeCard(b, normalizedContext) - scoreKnowledgeCard(a, normalizedContext));
}

function scoreKnowledgeCard(card: LearningKnowledgeCard, normalizedContext: string): number {
  const text = [
    card.category,
    card.title,
    card.publicSummary,
    card.interviewQuestion,
    card.javaMapping,
    card.projectEvidence,
    card.sourceLabels.join(" ")
  ].join(" ").toLowerCase();

  return learningKeywords.reduce((score, keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    return score + (normalizedContext.includes(normalizedKeyword) && text.includes(normalizedKeyword) ? 1 : 0);
  }, 0);
}

function normalizeSearch(value?: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function readManualNote(content: string): string {
  const marker = "手动笔记：";
  const start = content.indexOf(marker);
  if (start < 0) return "";
  return content.slice(start + marker.length).trim();
}

function timestampOf(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function knowledgeSearchText(card: LearningKnowledgeCard): string {
  return [
    card.category,
    card.title,
    card.publicSummary,
    card.interviewQuestion,
    card.javaMapping,
    card.projectEvidence,
    card.safeWording.join(" "),
    card.sourceLabels.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

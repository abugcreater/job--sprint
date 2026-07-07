import interviewQuestionsJson from "./interviewQuestionsCompact.json";
import type { DailySprint, ReviewEvidence, Task, TaskType } from "../types/sprint";

export type InterviewMode = "auto" | "java-core" | "resume-java" | "jd-match" | "llm-basics";

export const interviewModes: Array<{ id: InterviewMode; label: string }> = [
  { id: "auto", label: "自动" },
  { id: "java-core", label: "Java" },
  { id: "resume-java", label: "项目" },
  { id: "jd-match", label: "JD" },
  { id: "llm-basics", label: "AI" }
];

export interface InterviewQuestionOption {
  id: string;
  mode: InterviewMode | "current-task";
  modeLabel: string;
  source: string;
  question: string;
  hint: string;
  expectedKeywords: string[];
  taskId?: string;
  isCurrentTask: boolean;
}

export interface InterviewQuestionFilters {
  query?: string;
  category?: string;
  weakOnly?: boolean;
  weakQuestionIds?: Set<string>;
}

export interface OralTaskSummary {
  id: string;
  title: string;
  durationLabel: string;
  questions: string[];
  isCurrent: boolean;
  evidenceCount: number;
}

export interface OralEvidenceRecord {
  id: string;
  taskId: string;
  title: string;
  content: string;
  createdAt: string;
  scoreSummary: string;
  gaps: string[];
}

export interface OralScoreAnalysis {
  provider: "local_rubric";
  score: number;
  level: "强" | "可用" | "需补强";
  summary: string;
  keywordHits: string[];
  keywordMisses: string[];
  strengths: string[];
  gaps: string[];
  nextQuestions: string[];
}

export interface InterviewDashboard {
  dateLabel: string;
  targetTask?: Task;
  oralTasks: OralTaskSummary[];
  candidateQuestions: InterviewQuestionOption[];
  recentRecords: OralEvidenceRecord[];
  recordCount: number;
  rubricDimensions: string[];
}

export const INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY = "jobSprint.react.interviewWeakQuestions.v1";

interface CompactQuestion {
  id: string;
  mode: InterviewMode;
  source: string;
  question: string;
  hint: string;
  expectedKeywords: string[];
}

interface CompactInterviewFile {
  questionBank: CompactQuestion[];
  scoringRubric?: {
    dimensions?: string[];
  };
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const interviewQuestionData = interviewQuestionsJson as CompactInterviewFile;
const oralEvidenceTypes = new Set(["oral_score", "interview_answer"]);

export function buildInterviewDashboard(
  sprint: DailySprint,
  evidenceByTaskId: Record<string, ReviewEvidence[]>,
  mode: InterviewMode = "auto"
): InterviewDashboard {
  const currentTask = sprint.tasks.find((task) => task.id === sprint.currentTaskId);
  const interviewTasks = sprint.tasks.filter((task) => task.type === "interview");
  const targetTask = currentTask ?? interviewTasks[0] ?? sprint.tasks[0];
  const oralTasks = buildOralTasks(interviewTasks, currentTask, evidenceByTaskId);
  const candidateQuestions = buildCandidateQuestions(targetTask, mode);
  const recentRecords = buildRecentRecords(sprint.tasks, evidenceByTaskId);

  return {
    dateLabel: `${sprint.date} ${sprint.weekday}`,
    targetTask,
    oralTasks,
    candidateQuestions,
    recentRecords,
    recordCount: recentRecords.length,
    rubricDimensions: interviewQuestionData.scoringRubric?.dimensions ?? []
  };
}

export function buildOralEvidenceContent(task: Task, question: InterviewQuestionOption, answer: string, analysis?: OralScoreAnalysis): string {
  const normalizedAnswer = answer.trim().replace(/\s+/g, " ");
  const clippedAnswer = normalizedAnswer.length > 220 ? `${normalizedAnswer.slice(0, 220)}...` : normalizedAnswer;
  const keywords = question.expectedKeywords.length ? `；关键词：${question.expectedKeywords.slice(0, 5).join("、")}` : "";
  const score = analysis ? `；AI评分：${analysis.score}分（${analysis.level}，本地规则版）；薄弱点：${analysis.gaps.join("、") || "暂无明显缺口"}；建议追问：${analysis.nextQuestions.join("、")}` : "";
  return `React 面试页本地记录：围绕「${task.title}」完成一轮口述。题目：${question.question}；回答摘要：${clippedAnswer}${keywords}${score}`;
}

export function scoreOralAnswer(task: Task, question: InterviewQuestionOption, answer: string): OralScoreAnalysis {
  const normalizedAnswer = answer.trim().replace(/\s+/g, " ");
  const answerLower = normalizedAnswer.toLowerCase();
  const keywordHits = question.expectedKeywords.filter((keyword) => answerLower.includes(keyword.toLowerCase()));
  const keywordMisses = question.expectedKeywords.filter((keyword) => !keywordHits.includes(keyword));
  const hasConclusion = /结论|核心|先说|我的判断|适用|边界/.test(normalizedAnswer);
  const hasProjectEvidence = /项目|链路|接口|MQ|Redis|数据库|日志|指标|P99|JFR|jcmd|GC|Trace|证据|文件/.test(normalizedAnswer);
  const hasRisk = /异常|失败|回滚|兜底|降级|风险|限流|重试|幂等|补偿|恢复/.test(normalizedAnswer);
  const hasNextAction = /复盘|下一步|排查|验证|监控|告警|补/.test(normalizedAnswer);
  const lengthScore = normalizedAnswer.length >= 180 ? 18 : normalizedAnswer.length >= 100 ? 12 : normalizedAnswer.length >= 45 ? 7 : 2;
  const keywordScore = question.expectedKeywords.length ? Math.round((keywordHits.length / question.expectedKeywords.length) * 28) : 16;
  const structureScore = [hasConclusion, hasProjectEvidence, hasRisk, hasNextAction].filter(Boolean).length * 10;
  const score = Math.min(100, 20 + lengthScore + keywordScore + structureScore);
  const gaps = [
    !hasConclusion ? "先给结论和适用边界" : "",
    !hasProjectEvidence ? "补真实项目链路、文件或指标" : "",
    !hasRisk ? "补异常分支、失败恢复或生产风险" : "",
    !hasNextAction ? "补复盘动作和下一步验证" : "",
    keywordMisses.length ? `补关键词：${keywordMisses.slice(0, 3).join("、")}` : ""
  ].filter(Boolean);
  const strengths = [
    hasConclusion ? "有结论意识" : "",
    hasProjectEvidence ? "能落到项目证据" : "",
    hasRisk ? "覆盖异常和风险" : "",
    hasNextAction ? "有复盘动作" : "",
    keywordHits.length ? `命中关键词：${keywordHits.slice(0, 4).join("、")}` : ""
  ].filter(Boolean);
  const level = score >= 82 ? "强" : score >= 65 ? "可用" : "需补强";
  const nextQuestions = [
    keywordMisses[0] ? `如果追问「${keywordMisses[0]}」你怎么落到项目？` : `这个回答如何用「${task.title}」里的真实证据支撑？`,
    hasRisk ? "失败恢复后如何验证真的恢复了？" : "线上失败或边界条件是什么？",
    "如果面试官要求给指标或排查顺序，你下一句怎么说？"
  ];

  return {
    provider: "local_rubric",
    score,
    level,
    summary: `本地规则评分 ${score} 分，${level}。${gaps.length ? `优先补：${gaps.slice(0, 2).join("；")}` : "结构和证据基本可用。"}`,
    keywordHits,
    keywordMisses,
    strengths: strengths.length ? strengths : ["已完成一轮可复盘口述"],
    gaps: gaps.length ? gaps : ["继续压缩表达，准备 60 秒版本"],
    nextQuestions
  };
}

export function interviewQuestionCategories(questions: InterviewQuestionOption[]): Array<{ id: string; label: string }> {
  const seen = new Set<string>();
  return questions
    .map((question) => ({ id: question.mode, label: question.modeLabel }))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

export function filterInterviewQuestions(questions: InterviewQuestionOption[], filters: InterviewQuestionFilters = {}): InterviewQuestionOption[] {
  const query = normalizeSearch(filters.query);
  const category = filters.category ?? "all";
  const weakQuestionIds = filters.weakQuestionIds ?? new Set<string>();

  return questions.filter((question) => {
    if (category !== "all" && question.mode !== category) return false;
    if (filters.weakOnly && !weakQuestionIds.has(question.id)) return false;
    if (!query) return true;
    return interviewQuestionSearchText(question).includes(query);
  });
}

export function findInterviewQuestion(questions: InterviewQuestionOption[], questionId?: string): InterviewQuestionOption | undefined {
  if (!questionId) return undefined;
  return questions.find((question) => question.id === questionId);
}

export function readInterviewWeakQuestionMarks(storage = browserStorage()): Set<string> {
  if (!storage) return new Set<string>();

  try {
    const parsed = JSON.parse(storage.getItem(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

export function writeInterviewWeakQuestionMarks(questionIds: Set<string>, storage = browserStorage()): void {
  if (!storage) return;
  storage.setItem(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY, JSON.stringify(Array.from(questionIds).sort()));
}

export function toggleInterviewWeakQuestion(questionIds: Set<string>, questionId: string): Set<string> {
  const next = new Set(questionIds);
  if (next.has(questionId)) {
    next.delete(questionId);
  } else {
    next.add(questionId);
  }
  return next;
}

function buildOralTasks(
  interviewTasks: Task[],
  currentTask: Task | undefined,
  evidenceByTaskId: Record<string, ReviewEvidence[]>
): OralTaskSummary[] {
  const tasks = [...interviewTasks];
  if (currentTask && !tasks.some((task) => task.id === currentTask.id)) {
    tasks.unshift(currentTask);
  }

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    durationLabel: task.durationLabel,
    questions: task.interviewQuestions,
    isCurrent: task.id === currentTask?.id,
    evidenceCount: countOralEvidence(task.id, evidenceByTaskId)
  }));
}

function buildCandidateQuestions(targetTask: Task | undefined, mode: InterviewMode): InterviewQuestionOption[] {
  const fromTask = taskQuestions(targetTask);
  const fromBank = filterQuestionBank(targetTask, mode).map(toQuestionOption);

  const seen = new Set<string>();
  return [...fromTask, ...fromBank].filter((question) => {
    const key = question.question.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function taskQuestions(task: Task | undefined): InterviewQuestionOption[] {
  if (!task) return [];

  return task.interviewQuestions.map((question, index) => ({
    id: `${task.id}-question-${index + 1}`,
    mode: "current-task",
    modeLabel: "当前任务",
    source: task.title,
    question,
    hint: task.javaMapping ?? task.acceptanceCriteria ?? "先讲机制，再讲真实项目边界和证据。",
    expectedKeywords: [...task.tags, ...task.deliverables].slice(0, 8),
    taskId: task.id,
    isCurrentTask: true
  }));
}

function filterQuestionBank(targetTask: Task | undefined, mode: InterviewMode): CompactQuestion[] {
  const questions = interviewQuestionData.questionBank ?? [];
  if (mode !== "auto") {
    return questions.filter((question) => question.mode === mode);
  }

  const taskText = targetTask ? [targetTask.title, targetTask.description, targetTask.javaMapping, targetTask.tags.join(" ")].join(" ") : "";
  if (/LLM|RAG|Agent|AI|模型|检索|初学/.test(taskText)) {
    return questions.filter((question) => question.mode === "llm-basics" || question.mode === "jd-match");
  }
  if (targetTask?.type === "java" || /Spring|JVM|MQ|Redis|事务|缓存|P99/.test(taskText)) {
    return questions.filter((question) => question.mode === "java-core" || question.mode === "resume-java");
  }
  if (targetTask && isDeliveryLike(targetTask.type)) {
    return questions.filter((question) => question.mode === "jd-match" || question.mode === "resume-java");
  }
  return questions.filter((question) => question.mode === "resume-java" || question.mode === "llm-basics");
}

function toQuestionOption(question: CompactQuestion): InterviewQuestionOption {
  return {
    ...question,
    modeLabel: interviewModeLabel(question.mode),
    isCurrentTask: false
  };
}

function isDeliveryLike(type: TaskType): boolean {
  return type === "resume" || type === "delivery";
}

function buildRecentRecords(tasks: Task[], evidenceByTaskId: Record<string, ReviewEvidence[]>): OralEvidenceRecord[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  return Object.entries(evidenceByTaskId)
    .filter(([taskId]) => taskIds.has(taskId))
    .flatMap(([taskId, evidence]) =>
      evidence
        .filter((item) => oralEvidenceTypes.has(item.type))
        .map((item) => ({
          id: item.id,
          taskId,
          title: item.title,
          content: item.content,
          createdAt: item.createdAt,
          scoreSummary: readScoreSummary(item.content),
          gaps: readDelimitedField(item.content, "薄弱点")
        }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
}

function readScoreSummary(content: string): string {
  const score = readContentField(content, "AI评分");
  return score ? `AI评分：${score}` : "";
}

function readDelimitedField(content: string, label: string): string[] {
  return readContentField(content, label).split("、").map((item) => item.trim()).filter(Boolean);
}

function readContentField(content: string, label: string): string {
  const marker = `${label}：`;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const valueStart = start + marker.length;
  const valueEnd = content.indexOf("；", valueStart);
  return content.slice(valueStart, valueEnd >= 0 ? valueEnd : undefined).trim();
}

function countOralEvidence(taskId: string, evidenceByTaskId: Record<string, ReviewEvidence[]>): number {
  return (evidenceByTaskId[taskId] ?? []).filter((item) => oralEvidenceTypes.has(item.type)).length;
}

function interviewModeLabel(mode: InterviewQuestionOption["mode"]): string {
  if (mode === "current-task") return "当前任务";
  return interviewModes.find((item) => item.id === mode)?.label ?? mode;
}

function normalizeSearch(value?: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function interviewQuestionSearchText(question: InterviewQuestionOption): string {
  return [
    question.modeLabel,
    question.source,
    question.question,
    question.hint,
    question.expectedKeywords.join(" ")
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

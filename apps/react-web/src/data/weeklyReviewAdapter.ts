import type { AiFeedbackSummary } from "./aiFeedbackAdapter";
import type { DailySprint, DelayRecord, EvidenceType, ReviewEvidence } from "../types/sprint";

export interface WeeklyReviewAnalysisInput {
  sprint: DailySprint;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  completed: Record<string, boolean>;
  delayRecords: DelayRecord[];
  aiFeedback?: AiFeedbackSummary;
}

export interface WeeklyReviewAnalysis {
  dateRangeLabel: string;
  score: number;
  scoreLabel: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  signals: string[];
  risks: string[];
  nextWeekFocus: string[];
}

const evidenceTypeLabels: Record<EvidenceType, string> = {
  review: "复盘",
  oral_score: "口述",
  interview_answer: "面试回答",
  delivery_record: "机会反馈",
  learning_note: "学习笔记"
};

export function buildWeeklyReviewAnalysis(input: WeeklyReviewAnalysisInput): WeeklyReviewAnalysis {
  const { sprint, evidenceByTaskId, completed, delayRecords, aiFeedback } = input;
  const endDate = parseDateOnly(sprint.date) ?? new Date(sprint.generatedAt);
  const startDate = addDays(endDate, -6);
  const weeklyEvidence = Object.values(evidenceByTaskId)
    .flat()
    .filter((item) => isInsideWindow(item.createdAt, startDate, endDate));
  const weeklyDelays = delayRecords.filter((item) => isInsideWindow(item.createdAt || item.date, startDate, endDate));
  const typeCounts = countEvidenceTypes(weeklyEvidence);
  const typeBreadth = Object.values(typeCounts).filter((count) => count > 0).length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const score = weeklyScore({
    evidenceCount: weeklyEvidence.length,
    reviewCount: typeCounts.review,
    typeBreadth,
    completedCount,
    aiFeedback
  });
  const scoreLabel = scoreToLabel(score);
  const pathIssue = firstReviewField(weeklyEvidence, "路径问题");
  const fragileAnswer = firstReviewField(weeklyEvidence, "易被追问");

  return {
    dateRangeLabel: `${formatDate(startDate)} 至 ${formatDate(endDate)}`,
    score,
    scoreLabel,
    summary: `本周闭环 ${score}/100，${scoreLabel}。`,
    metrics: [
      { label: "证据", value: `${weeklyEvidence.length} 条` },
      { label: "覆盖", value: `${typeBreadth} 类` },
      { label: "完成", value: `${completedCount} 项` },
      { label: "AI 反馈", value: aiFeedback?.reviewedCount ? `${aiFeedback.reviewedCount} 条` : "0 条" }
    ],
    signals: buildSignals(typeCounts, completedCount, aiFeedback),
    risks: buildRisks(typeCounts, weeklyDelays.length, aiFeedback, pathIssue, fragileAnswer),
    nextWeekFocus: buildNextWeekFocus(typeCounts, aiFeedback, pathIssue, fragileAnswer)
  };
}

function weeklyScore({
  evidenceCount,
  reviewCount,
  typeBreadth,
  completedCount,
  aiFeedback
}: {
  evidenceCount: number;
  reviewCount: number;
  typeBreadth: number;
  completedCount: number;
  aiFeedback?: AiFeedbackSummary;
}): number {
  const evidenceScore = Math.min(25, evidenceCount * 5);
  const reviewScore = reviewCount > 0 ? 20 : 0;
  const breadthScore = Math.min(20, typeBreadth * 5);
  const completionScore = completedCount > 0 ? 15 : 0;
  const aiScore = aiFeedback?.reviewedCount
    ? 10 + (aiFeedback.acceptedOutcomeRate >= 60 ? 10 : aiFeedback.acceptedOutcomeRate > 0 ? 5 : 0)
    : 0;
  return Math.min(100, evidenceScore + reviewScore + breadthScore + completionScore + aiScore);
}

function scoreToLabel(score: number): string {
  if (score >= 80) return "闭环稳定";
  if (score >= 60) return "闭环成形";
  if (score >= 40) return "局部有效";
  return "证据不足";
}

function buildSignals(typeCounts: Record<EvidenceType, number>, completedCount: number, aiFeedback?: AiFeedbackSummary): string[] {
  const coveredTypes = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${evidenceTypeLabels[type as EvidenceType]} ${count} 条`);
  return [
    coveredTypes.length ? `本周证据覆盖：${coveredTypes.join("、")}。` : "",
    completedCount ? `已标记完成 ${completedCount} 个任务。` : "",
    aiFeedback?.reviewedCount ? `AI 建议反馈 ${aiFeedback.reviewedCount} 条，采纳日程完成 ${aiFeedback.acceptedOutcomeRateLabel}。` : "",
    typeCounts.delivery_record ? `已有 ${typeCounts.delivery_record} 条机会/JD/沟通反馈进入 Evidence Gate。` : ""
  ].filter(Boolean).slice(0, 4);
}

function buildRisks(
  typeCounts: Record<EvidenceType, number>,
  delayCount: number,
  aiFeedback: AiFeedbackSummary | undefined,
  pathIssue: string,
  fragileAnswer: string
): string[] {
  return [
    typeCounts.review === 0 ? "本周缺少复盘证据，无法判断哪些动作真的改变了结果。" : "",
    typeCounts.oral_score + typeCounts.interview_answer === 0 ? "本周没有口述或面试回答证据，面试表达提升不可验证。" : "",
    typeCounts.delivery_record === 0 ? "本周没有机会反馈，无法把学习和真实岗位要求对齐。" : "",
    delayCount > 0 ? `本周有 ${delayCount} 条延期记录，需要检查任务颗粒度。` : "",
    aiFeedback?.acceptedOutcomeCount && aiFeedback.acceptedOutcomeRate < 60 ? "AI 建议采纳后完成率不足 60%，下周需要降低单条建议粒度。" : "",
    fragileAnswer ? `薄弱回答仍未闭合：${fragileAnswer}` : "",
    pathIssue ? `执行路径仍未闭合：${pathIssue}` : ""
  ].filter(Boolean).slice(0, 5);
}

function buildNextWeekFocus(
  typeCounts: Record<EvidenceType, number>,
  aiFeedback: AiFeedbackSummary | undefined,
  pathIssue: string,
  fragileAnswer: string
): string[] {
  return [
    fragileAnswer ? `把「${fragileAnswer}」改成一段 60 秒可复述答案。` : "",
    pathIssue ? `围绕「${pathIssue}」安排一条 30 分钟修复任务。` : "",
    typeCounts.delivery_record === 0 ? "至少记录一条机会/JD/沟通反馈，校准知识边界。" : "",
    typeCounts.oral_score + typeCounts.interview_answer === 0 ? "安排一轮口述训练，并把文本或评分沉淀为证据。" : "",
    aiFeedback?.acceptedOutcomeCount && aiFeedback.acceptedOutcomeRate < 60 ? "下一轮 AI 草稿只保留一条能当天完成的动作。" : "",
    typeCounts.review === 0 ? "每天收尾补一条复盘证据，先写事实，再写欠缺。" : "",
    "保留本周已证明有效的证据类型，下周只扩一个新变量。"
  ].filter(Boolean).slice(0, 4);
}

function countEvidenceTypes(records: ReviewEvidence[]): Record<EvidenceType, number> {
  return records.reduce<Record<EvidenceType, number>>((counts, record) => ({
    ...counts,
    [record.type]: counts[record.type] + 1
  }), {
    review: 0,
    oral_score: 0,
    interview_answer: 0,
    delivery_record: 0,
    learning_note: 0
  });
}

function firstReviewField(records: ReviewEvidence[], label: string): string {
  for (const record of records.filter((item) => item.type === "review")) {
    const value = readContentField(record.content, label);
    if (value) return value;
  }
  return "";
}

function readContentField(content: string, label: string): string {
  const marker = `${label}：`;
  const start = content.indexOf(marker);
  if (start < 0) return "";
  const valueStart = start + marker.length;
  const valueEnd = content.indexOf("；", valueStart);
  return content.slice(valueStart, valueEnd >= 0 ? valueEnd : undefined).trim().replace(/\s+/g, " ");
}

function isInsideWindow(value: string, start: Date, end: Date): boolean {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const endExclusive = addDays(end, 1);
  return date.getTime() >= start.getTime() && date.getTime() < endExclusive.getTime();
}

function parseDateOnly(value: string): Date | null {
  const date = new Date(`${value}T00:00:00+08:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date): string {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

import type { AiArtifact, CoachScheduleEvent, DailySprint } from "../types/sprint";

export interface AiFeedbackOutcome {
  artifactId: string;
  taskId: string;
  completed: boolean;
}

export interface AiFeedbackSummary {
  reviewedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptanceRate: number;
  acceptanceRateLabel: string;
  acceptedOutcomeCount: number;
  completedAcceptedOutcomeCount: number;
  acceptedOutcomeRate: number;
  acceptedOutcomeRateLabel: string;
  outcomeLabel: string;
  qualityLabel: string;
  topRejectedTypes: Array<{ type: AiArtifact["type"]; count: number; label: string }>;
  recentRejectionReasons: string[];
  nextPromptHint: string;
}

export function summarizeAiFeedback(acceptedArtifacts: AiArtifact[], rejectedArtifacts: AiArtifact[], outcomes: AiFeedbackOutcome[] = []): AiFeedbackSummary {
  const reviewedCount = acceptedArtifacts.length + rejectedArtifacts.length;
  const acceptanceRate = reviewedCount ? Math.round((acceptedArtifacts.length / reviewedCount) * 100) : 0;
  const uniqueOutcomes = uniqueOutcomeByTask(outcomes);
  const completedAcceptedOutcomeCount = uniqueOutcomes.filter((outcome) => outcome.completed).length;
  const acceptedOutcomeRate = uniqueOutcomes.length ? Math.round((completedAcceptedOutcomeCount / uniqueOutcomes.length) * 100) : 0;
  const typeCounts = rejectedArtifacts.reduce<Record<string, number>>((counts, artifact) => {
    counts[artifact.type] = (counts[artifact.type] ?? 0) + 1;
    return counts;
  }, {});
  const topRejectedTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type: type as AiArtifact["type"], count, label: artifactTypeLabel(type as AiArtifact["type"]) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3);
  const recentRejectionReasons = rejectedArtifacts
    .map((artifact) => clean(artifact.rejectionReason ?? ""))
    .filter(Boolean)
    .slice(0, 5);
  return {
    reviewedCount,
    acceptedCount: acceptedArtifacts.length,
    rejectedCount: rejectedArtifacts.length,
    acceptanceRate,
    acceptanceRateLabel: reviewedCount ? `${acceptanceRate}%` : "暂无",
    acceptedOutcomeCount: uniqueOutcomes.length,
    completedAcceptedOutcomeCount,
    acceptedOutcomeRate,
    acceptedOutcomeRateLabel: uniqueOutcomes.length ? `${acceptedOutcomeRate}%` : "暂无",
    outcomeLabel: outcomeQualityLabel(uniqueOutcomes.length, acceptedOutcomeRate),
    qualityLabel: feedbackQualityLabel(reviewedCount, acceptanceRate),
    topRejectedTypes,
    recentRejectionReasons,
    nextPromptHint: nextPromptHint(topRejectedTypes, recentRejectionReasons, reviewedCount, uniqueOutcomes.length, acceptedOutcomeRate)
  };
}

export function buildAcceptedAiScheduleOutcomes(events: CoachScheduleEvent[], acceptedArtifacts: AiArtifact[], sprint: DailySprint): AiFeedbackOutcome[] {
  const acceptedArtifactIds = new Set(acceptedArtifacts.map((artifact) => artifact.id));
  return events
    .filter((event) => event.acceptedFromArtifactId && acceptedArtifactIds.has(event.acceptedFromArtifactId))
    .map((event) => {
      const taskId = `coach-event-${event.id}`;
      const task = sprint.tasks.find((item) => item.id === taskId);
      return task && event.acceptedFromArtifactId ? { artifactId: event.acceptedFromArtifactId, taskId, completed: task.status === "done" } : undefined;
    })
    .filter((outcome): outcome is AiFeedbackOutcome => Boolean(outcome));
}

export function artifactTypeLabel(type: AiArtifact["type"]): string {
  return {
    knowledge_card: "知识卡",
    schedule_suggestion: "日程建议",
    interview_question: "候选题",
    daily_next_step: "下一步"
  }[type];
}

function feedbackQualityLabel(reviewedCount: number, acceptanceRate: number): string {
  if (!reviewedCount) return "等待反馈";
  if (acceptanceRate >= 70) return "建议贴合";
  if (acceptanceRate >= 40) return "需要校准";
  return "偏离目标";
}

function outcomeQualityLabel(outcomeCount: number, outcomeRate: number): string {
  if (!outcomeCount) return "等待采纳日程";
  if (outcomeRate >= 70) return "执行有效";
  if (outcomeRate >= 40) return "需要跟进";
  return "采纳未执行";
}

function nextPromptHint(topRejectedTypes: AiFeedbackSummary["topRejectedTypes"], recentRejectionReasons: string[], reviewedCount: number, outcomeCount: number, outcomeRate: number): string {
  if (!topRejectedTypes.length && !recentRejectionReasons.length) {
    if (outcomeCount && outcomeRate < 40) {
      return "已采纳日程完成率偏低，下一轮建议要更短、更具体，并优先给出能当天完成的动作。";
    }
    if (outcomeCount) {
      return "采纳日程已有完成记录，下一轮可以继续生成同等粒度的今日动作。";
    }
    if (reviewedCount) {
      return "暂无拒绝原因，继续观察已采纳建议是否能带来完成记录。";
    }
    return "先接受或拒绝至少一条草稿，AI 教练才有质量反馈可复用。";
  }
  const typeHint = topRejectedTypes.length ? `少生成${topRejectedTypes.map((item) => item.label).join("、")}类低贴合建议` : "继续沿用已采纳建议的方向";
  const reasonHint = recentRejectionReasons[0] ? `重点避开：${recentRejectionReasons[0]}` : "继续观察拒绝原因";
  const outcomeHint = outcomeCount && outcomeRate < 40 ? "已采纳日程完成率偏低，下一轮建议要更短、更具体" : "";
  return `${typeHint}；${reasonHint}${outcomeHint ? `；${outcomeHint}` : ""}。`;
}

function uniqueOutcomeByTask(outcomes: AiFeedbackOutcome[]): AiFeedbackOutcome[] {
  const seen = new Set<string>();
  return outcomes.filter((outcome) => {
    const key = `${outcome.artifactId}:${outcome.taskId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

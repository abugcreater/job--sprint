import type { DailySprint, ReviewEvidence } from "../types/sprint";
import type { AiFeedbackSummary } from "./aiFeedbackAdapter";

export type EvidenceByTaskId = Record<string, ReviewEvidence[]>;

export interface CoachOutcomeMetrics {
  effectiveActionCount: number;
  effectiveActionLabel: string;
  acceptedScheduleCompletionLabel: string;
  interviewReviewCompletedCount: number;
  interviewReviewTotalCount: number;
  interviewReviewRate: number;
  interviewReviewRateLabel: string;
  interviewReviewLabel: string;
}

export function buildCoachOutcomeMetrics(
  sprint: DailySprint | undefined,
  evidenceByTaskId: EvidenceByTaskId,
  feedbackSummary: AiFeedbackSummary
): CoachOutcomeMetrics {
  if (!sprint) {
    return {
      effectiveActionCount: 0,
      effectiveActionLabel: "0 项",
      acceptedScheduleCompletionLabel: feedbackSummary.acceptedOutcomeRateLabel,
      interviewReviewCompletedCount: 0,
      interviewReviewTotalCount: 0,
      interviewReviewRate: 0,
      interviewReviewRateLabel: "暂无",
      interviewReviewLabel: "等待候选题"
    };
  }

  const effectiveTaskIds = new Set(
    sprint.tasks
      .filter((task) => task.status === "done" && hasVerifiedEvidence(task.id, evidenceByTaskId))
      .map((task) => task.id)
  );
  const interviewTasks = sprint.tasks.filter((task) => task.interviewQuestions.length > 0);
  const reviewedInterviewCount = interviewTasks.filter((task) => hasInterviewReviewEvidence(task.id, evidenceByTaskId)).length;
  const interviewReviewRate = interviewTasks.length ? Math.round((reviewedInterviewCount / interviewTasks.length) * 100) : 0;

  return {
    effectiveActionCount: effectiveTaskIds.size,
    effectiveActionLabel: `${effectiveTaskIds.size} 项`,
    acceptedScheduleCompletionLabel: feedbackSummary.acceptedOutcomeRateLabel,
    interviewReviewCompletedCount: reviewedInterviewCount,
    interviewReviewTotalCount: interviewTasks.length,
    interviewReviewRate,
    interviewReviewRateLabel: interviewTasks.length ? `${interviewReviewRate}%` : "暂无",
    interviewReviewLabel: interviewReviewQualityLabel(interviewTasks.length, interviewReviewRate)
  };
}

function hasVerifiedEvidence(taskId: string, evidenceByTaskId: EvidenceByTaskId): boolean {
  return (evidenceByTaskId[taskId] ?? []).some((item) => item.verified);
}

function hasInterviewReviewEvidence(taskId: string, evidenceByTaskId: EvidenceByTaskId): boolean {
  return (evidenceByTaskId[taskId] ?? []).some((item) => item.verified && ["interview_answer", "oral_score", "review"].includes(item.type));
}

function interviewReviewQualityLabel(totalCount: number, rate: number): string {
  if (!totalCount) return "等待候选题";
  if (rate >= 70) return "复盘充分";
  if (rate >= 40) return "需要补齐";
  return "复盘不足";
}

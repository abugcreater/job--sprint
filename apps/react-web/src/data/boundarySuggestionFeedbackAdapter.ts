import type { BoundarySuggestionFeedback, BoundarySuggestionFeedbackDecision, CoachConfidence } from "../types/sprint";

export interface BoundarySuggestionFeedbackDraft {
  profileId?: string;
  suggestionId: string;
  topic: string;
  decision: BoundarySuggestionFeedbackDecision;
  reason?: string;
  sourceSummary?: string;
  sourceConfidence?: CoachConfidence;
  sourceProvider?: string;
  sourcePromptVersion?: string;
  sourceInputHash?: string;
}

export interface BoundarySuggestionFeedbackSummary {
  totalCount: number;
  acceptedCount: number;
  rejectedCount: number;
  revisionCount: number;
  revisionRateLabel: string;
  recentReasons: string[];
  nextExtractionHint: string;
}

export function createBoundarySuggestionFeedback(draft: BoundarySuggestionFeedbackDraft, now = new Date().toISOString()): BoundarySuggestionFeedback {
  return {
    id: `boundary-feedback-${now}-${Math.random().toString(16).slice(2)}`,
    profileId: draft.profileId,
    suggestionId: draft.suggestionId,
    topic: clean(draft.topic) || "unknown",
    decision: draft.decision,
    reason: clean(draft.reason ?? "") || defaultReason(draft.decision),
    sourceSummary: optionalClean(draft.sourceSummary),
    sourceConfidence: draft.sourceConfidence,
    sourceProvider: optionalClean(draft.sourceProvider),
    sourcePromptVersion: optionalClean(draft.sourcePromptVersion),
    sourceInputHash: optionalClean(draft.sourceInputHash),
    createdAt: now
  };
}

export function summarizeBoundarySuggestionFeedback(records: BoundarySuggestionFeedback[]): BoundarySuggestionFeedbackSummary {
  const acceptedCount = records.filter((record) => record.decision === "accepted").length;
  const rejectedCount = records.filter((record) => record.decision === "rejected").length;
  const revisionCount = records.filter((record) => record.decision === "needs_revision").length;
  const totalCount = records.length;
  const revisionRate = totalCount ? Math.round(((rejectedCount + revisionCount) / totalCount) * 100) : 0;
  const recentReasons = records
    .filter((record) => record.decision !== "accepted")
    .map((record) => clean(record.reason))
    .filter(Boolean)
    .slice(0, 5);

  return {
    totalCount,
    acceptedCount,
    rejectedCount,
    revisionCount,
    revisionRateLabel: totalCount ? `${revisionRate}%` : "暂无",
    recentReasons,
    nextExtractionHint: nextExtractionHint(totalCount, acceptedCount, rejectedCount, revisionCount, recentReasons)
  };
}

function nextExtractionHint(totalCount: number, acceptedCount: number, rejectedCount: number, revisionCount: number, recentReasons: string[]): string {
  if (!totalCount) return "先采纳、修订或拒绝至少一条候选边界，系统才知道边界提取质量。";
  if (rejectedCount + revisionCount > acceptedCount) {
    const reason = recentReasons[0] ? `，最近原因：${recentReasons[0]}` : "";
    return `候选边界需要校准，下一轮应更贴近岗位素材和已有证据${reason}。`;
  }
  return "候选边界已有采纳记录，下一轮可以继续沿用当前素材结构。";
}

function defaultReason(decision: BoundarySuggestionFeedbackDecision): string {
  if (decision === "accepted") return "已采纳";
  if (decision === "needs_revision") return "需要人工修订后再保存";
  return "不适合当前知识边界";
}

function optionalClean(value?: string): string | undefined {
  const cleaned = clean(value ?? "");
  return cleaned || undefined;
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

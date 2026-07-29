import type { ReviewFormDraft } from "./reviewAdapter";

export function cloneReviewDraft(draft: ReviewFormDraft): ReviewFormDraft {
  return { ...draft };
}

export function isReviewDraftDirty(draft: ReviewFormDraft, baseline: ReviewFormDraft): boolean {
  return draft.projectPoint !== baseline.projectPoint
    || draft.interviewQuestions !== baseline.interviewQuestions
    || draft.javaPoint !== baseline.javaPoint
    || draft.pathIssues !== baseline.pathIssues
    || draft.fragileAnswers !== baseline.fragileAnswers
    || draft.tomorrowPriority !== baseline.tomorrowPriority;
}

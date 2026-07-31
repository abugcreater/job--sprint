import type { KnowledgeBoundaryDraft } from "./coachAdapter";

export function cloneBoundaryDraft(draft: KnowledgeBoundaryDraft): KnowledgeBoundaryDraft {
  return { ...draft };
}

export function isBoundaryDraftDirty(draft: KnowledgeBoundaryDraft, baseline: KnowledgeBoundaryDraft): boolean {
  return draft.id !== baseline.id
    || draft.topic !== baseline.topic
    || draft.level !== baseline.level
    || draft.gap !== baseline.gap
    || draft.evidence !== baseline.evidence
    || draft.targetUse !== baseline.targetUse
    || draft.sourceSummary !== baseline.sourceSummary
    || draft.sourceConfidence !== baseline.sourceConfidence
    || draft.confidence !== baseline.confidence
    || draft.sourceProvider !== baseline.sourceProvider
    || draft.sourcePromptVersion !== baseline.sourcePromptVersion
    || draft.sourceInputHash !== baseline.sourceInputHash;
}

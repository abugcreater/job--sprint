import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createBoundaryDraft, type KnowledgeBoundaryDraft } from "../../data/coachAdapter";
import { cloneBoundaryDraft, isBoundaryDraftDirty } from "../../data/boundaryDraftAdapter";
import type { KnowledgeBoundary } from "../../types/sprint";

export type BoundarySuggestionRevisionRequest = {
  kind: "suggestion_revision";
  draft: KnowledgeBoundaryDraft;
  topic: string;
  apply: () => void;
};

type BoundaryDraftReplacement =
  | { kind: "edit"; boundary: KnowledgeBoundary }
  | { kind: "cancel" }
  | BoundarySuggestionRevisionRequest;

interface BoundaryDraftProtectionOptions {
  scopeKey?: string;
  sprintDate: string;
  boundaryDraft: KnowledgeBoundaryDraft;
  setBoundaryDraft: Dispatch<SetStateAction<KnowledgeBoundaryDraft>>;
  setFeedback: Dispatch<SetStateAction<string>>;
}

export function useBoundaryDraftProtection({
  scopeKey,
  sprintDate,
  boundaryDraft,
  setBoundaryDraft,
  setFeedback
}: BoundaryDraftProtectionOptions) {
  const [baseline, setBaseline] = useState<KnowledgeBoundaryDraft>(() => createBoundaryDraft());
  const [discardAction, setDiscardAction] = useState<BoundaryDraftReplacement | null>(null);

  const resetToNewDraft = useCallback(() => {
    const nextDraft = createBoundaryDraft();
    setBoundaryDraft(nextDraft);
    setBaseline(cloneBoundaryDraft(nextDraft));
  }, [setBoundaryDraft]);

  useEffect(() => {
    setDiscardAction(null);
    resetToNewDraft();
  }, [resetToNewDraft, scopeKey, sprintDate]);

  const runReplacement = useCallback((action: BoundaryDraftReplacement) => {
    setDiscardAction(null);
    if (action.kind === "cancel") {
      resetToNewDraft();
      setFeedback("已取消编辑。");
      return;
    }
    if (action.kind === "edit") {
      const nextDraft = createBoundaryDraft(action.boundary);
      setBoundaryDraft(nextDraft);
      setBaseline(cloneBoundaryDraft(nextDraft));
      setFeedback(`正在编辑「${action.boundary.topic}」。`);
      return;
    }
    const nextDraft = cloneBoundaryDraft(action.draft);
    setBoundaryDraft(nextDraft);
    setBaseline(cloneBoundaryDraft(nextDraft));
    action.apply();
  }, [resetToNewDraft, setBoundaryDraft, setFeedback]);

  const requestReplacement = useCallback((action: BoundaryDraftReplacement) => {
    if (isBoundaryDraftDirty(boundaryDraft, baseline)) {
      setDiscardAction(action);
      return;
    }
    runReplacement(action);
  }, [baseline, boundaryDraft, runReplacement]);

  return {
    requestReplacement,
    resetToNewDraft: () => {
      setDiscardAction(null);
      resetToNewDraft();
    },
    discardConfirmation: discardAction ? { actionLabel: replacementLabel(discardAction) } : null,
    continueEditing: () => setDiscardAction(null),
    discardChanges: () => {
      if (discardAction) runReplacement(discardAction);
    }
  };
}

function replacementLabel(action: BoundaryDraftReplacement): string {
  if (action.kind === "cancel") return "退出编辑并恢复新增边界";
  if (action.kind === "edit") return `重新载入「${action.boundary.topic}」已保存的内容`;
  return `将「${action.topic}」载入边界表单`;
}

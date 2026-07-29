import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { cloneReviewDraft, isReviewDraftDirty } from "../../data/reviewDraftAdapter";
import { createReviewDraft, reviewRecordToDraft, type ReviewEvidenceRecord, type ReviewFormDraft } from "../../data/reviewAdapter";

export type ReviewEditingRecord = { taskId: string; evidenceId: string };

interface ReviewDraftProtectionOptions {
  draft: ReviewFormDraft;
  setDraft: Dispatch<SetStateAction<ReviewFormDraft>>;
  setEditingRecord: Dispatch<SetStateAction<ReviewEditingRecord | null>>;
  setFormFeedback: Dispatch<SetStateAction<string>>;
  setReviewView: Dispatch<SetStateAction<"write" | "insights" | "history">>;
}

export function useReviewDraftProtection({
  draft,
  setDraft,
  setEditingRecord,
  setFormFeedback,
  setReviewView
}: ReviewDraftProtectionOptions) {
  const [baseline, setBaseline] = useState<ReviewFormDraft>(() => createReviewDraft());
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const beginEditing = useCallback((record: ReviewEvidenceRecord) => {
    if (record.source !== "local") return;
    const nextDraft = reviewRecordToDraft(record);
    setDraft(nextDraft);
    setBaseline(cloneReviewDraft(nextDraft));
    setConfirmingDiscard(false);
    setEditingRecord({ taskId: record.taskId, evidenceId: record.id });
    setFormFeedback(`正在编辑「${record.title}」。`);
    setReviewView("write");
  }, [setDraft, setEditingRecord, setFormFeedback, setReviewView]);

  const discardEdit = useCallback(() => {
    setConfirmingDiscard(false);
    setEditingRecord(null);
    setDraft(createReviewDraft());
    setBaseline(createReviewDraft());
    setFormFeedback("已取消编辑。");
  }, [setDraft, setEditingRecord, setFormFeedback]);

  const requestCancelEdit = useCallback(() => {
    if (isReviewDraftDirty(draft, baseline)) {
      setConfirmingDiscard(true);
      return;
    }
    discardEdit();
  }, [baseline, discardEdit, draft]);

  return {
    beginEditing,
    requestCancelEdit,
    resetAfterSave: () => {
      setConfirmingDiscard(false);
      setBaseline(createReviewDraft());
    },
    discardConfirmation: confirmingDiscard,
    continueEditing: () => setConfirmingDiscard(false),
    discardChanges: discardEdit
  };
}

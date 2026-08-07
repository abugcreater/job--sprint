import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useRouteLeaveGuard } from "../../app/RouteLeaveGuard";
import type { LearningTaskSummary } from "../../data/learningAdapter";

interface LearningNoteDraftProtectionOptions {
  noteTaskId?: string;
  noteDraft: string;
  setNoteTaskId: Dispatch<SetStateAction<string | undefined>>;
  setNoteDraft: Dispatch<SetStateAction<string>>;
  setNoteFeedback: Dispatch<SetStateAction<string>>;
}

export function useLearningNoteDraftProtection({
  noteTaskId,
  noteDraft,
  setNoteTaskId,
  setNoteDraft,
  setNoteFeedback
}: LearningNoteDraftProtectionOptions) {
  const [discardConfirmation, setDiscardConfirmation] = useState(false);
  const hasUnsavedChanges = Boolean(noteTaskId && noteDraft.trim());
  useRouteLeaveGuard(hasUnsavedChanges);

  const resetNote = useCallback(() => {
    setNoteTaskId(undefined);
    setNoteDraft("");
  }, [setNoteDraft, setNoteTaskId]);

  const beginLearningNote = useCallback((task: LearningTaskSummary) => {
    setDiscardConfirmation(false);
    setNoteTaskId(task.id);
    setNoteDraft("");
    setNoteFeedback("");
  }, [setNoteDraft, setNoteFeedback, setNoteTaskId]);

  const requestCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardConfirmation(true);
      return;
    }
    resetNote();
  }, [hasUnsavedChanges, resetNote]);

  return {
    beginLearningNote,
    requestCancel,
    resetAfterSave: () => {
      setDiscardConfirmation(false);
      resetNote();
    },
    discardConfirmation,
    continueEditing: () => setDiscardConfirmation(false),
    discardChanges: () => {
      setDiscardConfirmation(false);
      resetNote();
    }
  };
}

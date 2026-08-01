import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createScheduleDraft, type CoachScheduleDraft } from "../../data/coachAdapter";
import { cloneScheduleDraft, isScheduleDraftDirty } from "../../data/scheduleDraftAdapter";
import { useRouteLeaveGuard } from "../../app/RouteLeaveGuard";
import type { CoachScheduleEvent } from "../../types/sprint";

type ScheduleDraftReplacement =
  | { kind: "edit"; event: CoachScheduleEvent }
  | { kind: "cancel" };

interface ScheduleDraftProtectionOptions {
  scopeKey?: string;
  sprintDate: string;
  scheduleDraft: CoachScheduleDraft;
  setScheduleDraft: Dispatch<SetStateAction<CoachScheduleDraft>>;
  setFeedback: Dispatch<SetStateAction<string>>;
}

export function useScheduleDraftProtection({
  scopeKey,
  sprintDate,
  scheduleDraft,
  setScheduleDraft,
  setFeedback
}: ScheduleDraftProtectionOptions) {
  const [baseline, setBaseline] = useState<CoachScheduleDraft>(() => createScheduleDraft(sprintDate));
  const [discardAction, setDiscardAction] = useState<ScheduleDraftReplacement | null>(null);
  const hasUnsavedChanges = isScheduleDraftDirty(scheduleDraft, baseline);
  useRouteLeaveGuard(hasUnsavedChanges);

  const resetDraft = useCallback(() => {
    const nextDraft = createScheduleDraft(sprintDate);
    setScheduleDraft(nextDraft);
    setBaseline(cloneScheduleDraft(nextDraft));
  }, [setScheduleDraft, sprintDate]);

  useEffect(() => {
    setDiscardAction(null);
    resetDraft();
  }, [resetDraft, scopeKey]);

  const runReplacement = useCallback((action: ScheduleDraftReplacement) => {
    setDiscardAction(null);
    if (action.kind === "cancel") {
      resetDraft();
      setFeedback("已取消编辑。");
      return;
    }
    const nextDraft = createScheduleDraft(sprintDate, action.event);
    setScheduleDraft(nextDraft);
    setBaseline(cloneScheduleDraft(nextDraft));
    setFeedback(`正在编辑「${action.event.title}」。`);
  }, [resetDraft, setFeedback, setScheduleDraft, sprintDate]);

  const requestReplacement = useCallback((action: ScheduleDraftReplacement) => {
    if (hasUnsavedChanges) {
      setDiscardAction(action);
      return;
    }
    runReplacement(action);
  }, [hasUnsavedChanges, runReplacement]);

  return {
    requestReplacement,
    resetAfterSave: () => {
      setDiscardAction(null);
      resetDraft();
    },
    discardConfirmation: discardAction ? { actionLabel: replacementLabel(discardAction) } : null,
    continueEditing: () => setDiscardAction(null),
    discardChanges: () => {
      if (discardAction) runReplacement(discardAction);
    }
  };
}

function replacementLabel(action: ScheduleDraftReplacement): string {
  if (action.kind === "cancel") return "退出编辑并恢复新增日程";
  return `重新载入「${action.event.title}」已保存的内容`;
}

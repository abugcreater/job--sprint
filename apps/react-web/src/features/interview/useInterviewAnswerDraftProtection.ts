import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useRouteLeaveGuard } from "../../app/RouteLeaveGuard";
import type { InterviewMode, OralScoreAnalysis } from "../../data/interviewAdapter";

type AnswerReplacement =
  | { kind: "clear" }
  | { kind: "mode"; mode: InterviewMode }
  | { kind: "question"; questionId: string };

interface InterviewAnswerDraftProtectionOptions {
  answer: string;
  mode: InterviewMode;
  activeQuestionId?: string;
  setAnswer: Dispatch<SetStateAction<string>>;
  setScoreAnalysis: Dispatch<SetStateAction<OralScoreAnalysis | undefined>>;
  setScoreFeedback: Dispatch<SetStateAction<string>>;
  setMode: Dispatch<SetStateAction<InterviewMode>>;
  setQuestionCategory: Dispatch<SetStateAction<string>>;
  setWeakOnly: Dispatch<SetStateAction<boolean>>;
  setSelectedQuestionId: Dispatch<SetStateAction<string | undefined>>;
}

export function useInterviewAnswerDraftProtection({
  answer,
  mode,
  activeQuestionId,
  setAnswer,
  setScoreAnalysis,
  setScoreFeedback,
  setMode,
  setQuestionCategory,
  setWeakOnly,
  setSelectedQuestionId
}: InterviewAnswerDraftProtectionOptions) {
  const [discardAction, setDiscardAction] = useState<AnswerReplacement | null>(null);
  const hasUnsavedChanges = Boolean(answer.trim());
  useRouteLeaveGuard(hasUnsavedChanges);

  const resetAnswer = useCallback(() => {
    setAnswer("");
    setScoreAnalysis(undefined);
  }, [setAnswer, setScoreAnalysis]);

  const runReplacement = useCallback((action: AnswerReplacement) => {
    setDiscardAction(null);
    resetAnswer();
    if (action.kind === "clear") {
      setScoreFeedback("已清空本次口述回答。");
      return;
    }
    setScoreFeedback("");
    if (action.kind === "mode") {
      setMode(action.mode);
      setQuestionCategory("all");
      setWeakOnly(false);
      setSelectedQuestionId(undefined);
      return;
    }
    setSelectedQuestionId(action.questionId);
  }, [resetAnswer, setMode, setQuestionCategory, setScoreFeedback, setSelectedQuestionId, setWeakOnly]);

  const requestReplacement = useCallback((action: AnswerReplacement) => {
    if (action.kind === "mode" && action.mode === mode) return;
    if (action.kind === "question" && action.questionId === activeQuestionId) return;
    if (hasUnsavedChanges) {
      setDiscardAction(action);
      return;
    }
    runReplacement(action);
  }, [activeQuestionId, hasUnsavedChanges, mode, runReplacement]);

  return {
    requestClearAnswer: () => requestReplacement({ kind: "clear" }),
    requestModeChange: (nextMode: InterviewMode) => requestReplacement({ kind: "mode", mode: nextMode }),
    requestQuestionChange: (questionId: string) => requestReplacement({ kind: "question", questionId }),
    resetAfterSave: () => {
      setDiscardAction(null);
      resetAnswer();
    },
    discardConfirmation: discardAction ? { actionLabel: replacementLabel(discardAction) } : null,
    continueEditing: () => setDiscardAction(null),
    discardChanges: () => {
      if (discardAction) runReplacement(discardAction);
    }
  };
}

function replacementLabel(action: AnswerReplacement): string {
  if (action.kind === "clear") return "清空本次回答";
  if (action.kind === "mode") return "切换题型范围";
  return "改练另一道候选题";
}

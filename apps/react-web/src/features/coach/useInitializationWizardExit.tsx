import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { InitializationDiscardChangesDialog } from "./components/InitializationDiscardChangesDialog";
import { coachStageTitle } from "./components/CoachStageContext";
import type { CoachStageId } from "./components/CoachStageNavigation";

type InitializationWizardExitAction =
  | { kind: "detailed-form" }
  | { kind: "stage"; stage: CoachStageId };

export function useInitializationWizardExit({
  activeStage,
  showOnboarding,
  setActiveStage,
  setShowOnboarding
}: {
  activeStage: CoachStageId;
  showOnboarding: boolean;
  setActiveStage: Dispatch<SetStateAction<CoachStageId>>;
  setShowOnboarding: Dispatch<SetStateAction<boolean>>;
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingExit, setPendingExit] = useState<InitializationWizardExitAction | null>(null);
  const discardRef = useRef<(() => void) | null>(null);

  const applyStageChange = useCallback((stage: CoachStageId) => {
    setActiveStage(stage);
    if (stage !== "profile") setShowOnboarding(false);
    window.requestAnimationFrame(() => {
      const stageWorkspace = document.getElementById(`coach-stage-${stage}`);
      stageWorkspace?.focus({ preventScroll: true });
      stageWorkspace?.scrollIntoView?.({ block: "start" });
    });
  }, [setActiveStage, setShowOnboarding]);

  const applyExit = useCallback((action: InitializationWizardExitAction) => {
    if (action.kind === "detailed-form") {
      setShowOnboarding(false);
      return;
    }
    applyStageChange(action.stage);
  }, [applyStageChange, setShowOnboarding]);

  const requestExit = useCallback((action: InitializationWizardExitAction) => {
    if (!hasUnsavedChanges) {
      applyExit(action);
      return;
    }
    setPendingExit(action);
  }, [applyExit, hasUnsavedChanges]);

  const handleStageChange = useCallback((stage: CoachStageId) => {
    if (stage === activeStage) return;
    if (activeStage === "profile" && showOnboarding) {
      requestExit({ kind: "stage", stage });
      return;
    }
    applyStageChange(stage);
  }, [activeStage, applyStageChange, requestExit, showOnboarding]);

  const discardChanges = useCallback(() => {
    const action = pendingExit;
    if (!action) return;
    discardRef.current?.();
    setPendingExit(null);
    applyExit(action);
  }, [applyExit, pendingExit]);

  const registerDiscard = useCallback((discard: (() => void) | null) => {
    discardRef.current = discard;
  }, []);
  const requestDetailedForm = useCallback(() => requestExit({ kind: "detailed-form" }), [requestExit]);
  const continueEditing = useCallback(() => setPendingExit(null), []);

  return {
    exitDialog: pendingExit ? (
        <InitializationDiscardChangesDialog
          actionLabel={exitLabel(pendingExit)}
        onContinue={continueEditing}
        onDiscard={discardChanges}
      />
    ) : null,
    setHasUnsavedChanges,
    registerDiscard,
    requestDetailedForm,
    handleStageChange
  };
}

function exitLabel(action: InitializationWizardExitAction): string {
  return action.kind === "detailed-form" ? "改用详细画像表单" : `切换到${coachStageTitle(action.stage)}`;
}

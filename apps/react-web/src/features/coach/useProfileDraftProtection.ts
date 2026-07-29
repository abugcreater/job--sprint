import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { cloneProfileDraft, createProfileDraft, isProfileDraftDirty, type ProfileDraft } from "../../data/coachAdapter";
import type { UserProfile } from "../../types/sprint";

type ProfileDraftReplacement =
  | { kind: "new" }
  | { kind: "activate"; profile: UserProfile }
  | { kind: "edit"; profile: UserProfile };

interface ProfileDraftProtectionOptions {
  activeProfile?: UserProfile;
  sprintDate: string;
  profileDraft: ProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
  handleNewProfile: () => void;
  handleActivateProfile: (profile: UserProfile) => void;
  handleEditProfile: (profile: UserProfile) => void;
}

export function useProfileDraftProtection({
  activeProfile,
  sprintDate,
  profileDraft,
  setProfileDraft,
  handleNewProfile,
  handleActivateProfile,
  handleEditProfile
}: ProfileDraftProtectionOptions) {
  const [baseline, setBaseline] = useState<ProfileDraft>(() => cloneProfileDraft(createProfileDraft(activeProfile)));
  const [discardAction, setDiscardAction] = useState<ProfileDraftReplacement | null>(null);

  useEffect(() => {
    const nextDraft = createProfileDraft(activeProfile);
    setProfileDraft(nextDraft);
    setBaseline(cloneProfileDraft(nextDraft));
  }, [activeProfile?.id, setProfileDraft, sprintDate]);

  const runReplacement = useCallback((action: ProfileDraftReplacement) => {
    setDiscardAction(null);
    if (action.kind === "new") {
      handleNewProfile();
      setBaseline(cloneProfileDraft(createProfileDraft()));
      return;
    }
    if (action.kind === "activate") {
      handleActivateProfile(action.profile);
    } else {
      handleEditProfile(action.profile);
    }
    setBaseline(cloneProfileDraft(createProfileDraft(action.profile)));
  }, [handleActivateProfile, handleEditProfile, handleNewProfile]);

  const requestReplacement = useCallback((action: ProfileDraftReplacement) => {
    if (isProfileDraftDirty(profileDraft, baseline)) {
      setDiscardAction(action);
      return;
    }
    runReplacement(action);
  }, [baseline, profileDraft, runReplacement]);

  return {
    requestReplacement,
    markSaved: () => setBaseline(cloneProfileDraft(profileDraft)),
    discardConfirmation: discardAction ? { actionLabel: replacementLabel(discardAction) } : null,
    continueEditing: () => setDiscardAction(null),
    discardChanges: () => {
      if (discardAction) runReplacement(discardAction);
    }
  };
}

function replacementLabel(action: ProfileDraftReplacement): string {
  if (action.kind === "new") return "开始新建一份画像";
  if (action.kind === "activate") return `切换到「${action.profile.name}」`;
  return `重新载入「${action.profile.name}」已保存的内容`;
}

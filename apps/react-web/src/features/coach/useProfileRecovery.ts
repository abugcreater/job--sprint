import { useState } from "react";
import { canSaveProfile, createProfileDraft, type ProfileDraft } from "../../data/coachAdapter";
import type { DeletedUserProfileBundle } from "../../stores/sprintStoreTypes";
import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, KnowledgeBoundary, LlmRun, UserProfile } from "../../types/sprint";

interface ProfileRecoveryOptions {
  profiles: UserProfile[];
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
  saveUserProfile: (draft: ProfileDraft) => void;
  activateUserProfile: (profileId: string) => void;
  deleteUserProfile: (profileId: string) => void;
  restoreUserProfileBundle: (bundle: DeletedUserProfileBundle) => void;
  setProfileDraft: (draft: ProfileDraft) => void;
  setFeedback: (message: string) => void;
  setProfileFeedback: (message: string) => void;
  clearRelatedUndo: () => void;
}

export function useProfileRecovery({
  profiles,
  knowledgeBoundaries,
  boundarySuggestionFeedback,
  coachScheduleEvents,
  aiArtifacts,
  llmRuns,
  saveUserProfile,
  activateUserProfile,
  deleteUserProfile,
  restoreUserProfileBundle,
  setProfileDraft,
  setFeedback,
  setProfileFeedback,
  clearRelatedUndo
}: ProfileRecoveryOptions) {
  const [recentlyDeletedProfileBundle, setRecentlyDeletedProfileBundle] = useState<DeletedUserProfileBundle | null>(null);

  const clearProfileUndo = () => setRecentlyDeletedProfileBundle(null);

  const handleSaveProfile = (profileDraft: ProfileDraft) => {
    if (!canSaveProfile(profileDraft)) {
      setFeedback("请至少填写目标岗位、经验摘要和每日可投入时间。");
      setProfileFeedback("保存失败：请补齐目标岗位、经验摘要和每日可投入时间。");
      return;
    }
    saveUserProfile(profileDraft);
    clearProfileUndo();
    setFeedback("求职画像已保存，后续 AI 建议会引用这份画像。");
    setProfileFeedback("画像已保存。");
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    const deletedBundle = createDeletedProfileBundle({
      profile,
      knowledgeBoundaries,
      boundarySuggestionFeedback,
      coachScheduleEvents,
      aiArtifacts,
      llmRuns
    });
    deleteUserProfile(profileId);
    setRecentlyDeletedProfileBundle(deletedBundle);
    clearRelatedUndo();
    setProfileDraft(createProfileDraft());
    setFeedback(`已删除「${profile.name}」画像，可在求职画像顶部撤销整包恢复。`);
    setProfileFeedback(`已删除「${profile.name}」，关联上下文已同步清理，可短时撤销。`);
  };

  const handleUndoDeleteProfile = () => {
    if (!recentlyDeletedProfileBundle) return;

    const profileName = recentlyDeletedProfileBundle.profile.name;
    restoreUserProfileBundle(recentlyDeletedProfileBundle);
    clearProfileUndo();
    setFeedback(`已恢复「${profileName}」画像及关联上下文。`);
    setProfileFeedback(`已恢复「${profileName}」画像、知识边界、个人日程和 AI 建议。`);
  };

  return {
    recentlyDeletedProfileBundle,
    handleSaveProfile,
    handleDeleteProfile,
    handleUndoDeleteProfile,
    handleNewProfile: () => {
      clearProfileUndo();
      setProfileDraft(createProfileDraft());
    },
    handleActivateProfile: (profile: UserProfile) => {
      clearProfileUndo();
      activateUserProfile(profile.id);
      setFeedback(`已切换到「${profile.name}」。`);
    },
    handleEditProfile: (profile: UserProfile) => {
      clearProfileUndo();
      setProfileDraft(createProfileDraft(profile));
    },
    dismissDeletedProfile: clearProfileUndo
  };
}

function createDeletedProfileBundle({
  profile,
  knowledgeBoundaries,
  boundarySuggestionFeedback,
  coachScheduleEvents,
  aiArtifacts,
  llmRuns
}: Pick<ProfileRecoveryOptions, "knowledgeBoundaries" | "boundarySuggestionFeedback" | "coachScheduleEvents" | "aiArtifacts" | "llmRuns"> & { profile: UserProfile }): DeletedUserProfileBundle {
  const profileId = profile.id;
  return {
    profile,
    knowledgeBoundaries: knowledgeBoundaries.filter((boundary) => boundary.profileId === profileId),
    boundarySuggestionFeedback: boundarySuggestionFeedback.filter((feedback) => feedback.profileId === profileId),
    coachScheduleEvents: coachScheduleEvents.filter((event) => event.profileId === profileId),
    aiArtifacts: aiArtifacts.filter((artifact) => artifact.profileId === profileId),
    llmRuns: llmRuns.filter((run) => run.profileId === profileId)
  };
}

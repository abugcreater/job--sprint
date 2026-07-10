import type { RuntimeData } from "../api/runtimeClientTypes";
import type { CoachScheduleDraft, KnowledgeBoundaryDraft, ProfileDraft } from "../data/coachAdapter";
import type { BoundarySuggestionFeedbackDraft } from "../data/boundarySuggestionFeedbackAdapter";
import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DailySprint, DelayRecord, EvidenceType, KnowledgeBoundary, LlmRun, ReviewEvidence, SprintRestoreSnapshot, SyncState, UserProfile } from "../types/sprint";

export interface DeletedUserProfileBundle {
  profile: UserProfile;
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
}

export interface RuntimeStorageOwner {
  username?: string;
  dataScope?: string;
}

export interface SprintState {
  sprint: DailySprint;
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles: UserProfile[];
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
  syncState: SyncState;
  hasHydrated: boolean;
  lastSavedAt?: string;
  storageOwner?: RuntimeStorageOwner;
  setSprint: (sprint: DailySprint) => void;
  setSyncState: (syncState: SyncState) => void;
  markHydrated: () => void;
  replaceRuntimeData: (data: RuntimeData, syncState?: SyncState, storageOwner?: RuntimeStorageOwner) => void;
  resetRuntimeForOwner: (storageOwner?: RuntimeStorageOwner, syncState?: SyncState) => void;
  toggleTaskCompletion: (taskId: string) => void;
  addEvidence: (taskId: string, type: EvidenceType, title: string, content: string) => void;
  updateEvidence: (taskId: string, evidenceId: string, patch: Partial<Pick<ReviewEvidence, "title" | "content" | "verified">>) => void;
  deleteEvidence: (taskId: string, evidenceId: string) => void;
  restoreEvidence: (record: ReviewEvidence) => void;
  addDelayRecord: (record: Pick<DelayRecord, "taskId" | "date" | "minutes" | "reason" | "recoveryAction">) => void;
  saveUserProfile: (draft: ProfileDraft) => void;
  activateUserProfile: (profileId: string) => void;
  deleteUserProfile: (profileId: string) => void;
  restoreUserProfileBundle: (bundle: DeletedUserProfileBundle) => void;
  saveKnowledgeBoundary: (draft: KnowledgeBoundaryDraft) => void;
  recordBoundarySuggestionFeedback: (draft: BoundarySuggestionFeedbackDraft) => void;
  deleteKnowledgeBoundary: (boundaryId: string) => void;
  restoreKnowledgeBoundary: (boundary: KnowledgeBoundary) => void;
  saveCoachScheduleEvent: (draft: CoachScheduleDraft) => void;
  deleteCoachScheduleEvent: (eventId: string) => void;
  restoreCoachScheduleEvent: (event: CoachScheduleEvent) => void;
  generateAiArtifacts: () => void;
  addAiArtifacts: (artifacts: AiArtifact[]) => void;
  addLlmRun: (run: LlmRun) => void;
  acceptAiArtifact: (artifactId: string) => void;
  rejectAiArtifact: (artifactId: string, rejectionReason: string) => void;
  editAiArtifact: (artifactId: string, patch: Pick<AiArtifact, "title" | "body">) => void;
  restoreSnapshot: (snapshot: SprintRestoreSnapshot) => void;
  refreshSprint: () => void;
}

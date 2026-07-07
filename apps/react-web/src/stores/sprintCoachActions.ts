import {
  acceptArtifact,
  editArtifact,
  generateCoachArtifacts,
  rejectArtifact,
  upsertCoachScheduleEvent,
  upsertKnowledgeBoundary,
  upsertProfile,
  type CoachScheduleDraft,
  type KnowledgeBoundaryDraft,
  type ProfileDraft
} from "../data/coachAdapter";
import { createBoundarySuggestionFeedback, type BoundarySuggestionFeedbackDraft } from "../data/boundarySuggestionFeedbackAdapter";
import { buildApplicationsDashboard } from "../data/applicationsAdapter";
import { buildOpportunitySignals } from "../data/opportunitySignalsAdapter";
import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DailySprint, KnowledgeBoundary, LlmRun, ReviewEvidence, SyncState, UserProfile } from "../types/sprint";

interface CoachActionState {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  userProfiles: UserProfile[];
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
  sprint: DailySprint;
  syncState: SyncState;
}

type SprintFactory = (coachScheduleEvents: CoachScheduleEvent[], userProfiles?: UserProfile[]) => DailySprint;
type CoachPatch = Partial<Pick<CoachActionState, "userProfiles" | "knowledgeBoundaries" | "boundarySuggestionFeedback" | "coachScheduleEvents" | "aiArtifacts" | "llmRuns" | "sprint">> & {
  lastSavedAt?: string;
};

export function saveUserProfilePatch(state: CoachActionState, draft: ProfileDraft): CoachPatch {
  const savedAt = new Date().toISOString();
  return {
    userProfiles: upsertProfile(state.userProfiles, draft, savedAt),
    lastSavedAt: savedAt
  };
}

export function activateUserProfilePatch(state: CoachActionState, profileId: string): CoachPatch {
  return {
    userProfiles: state.userProfiles.map((profile) => ({ ...profile, active: profile.id === profileId })),
    lastSavedAt: new Date().toISOString()
  };
}

export function deleteUserProfilePatch(state: CoachActionState, profileId: string, createSprint: SprintFactory): CoachPatch | CoachActionState {
  if (!state.userProfiles.some((profile) => profile.id === profileId)) return state;
  const savedAt = new Date().toISOString();
  const userProfiles = nextProfilesAfterDelete(state.userProfiles, profileId, savedAt);
  const coachScheduleEvents = state.coachScheduleEvents.filter((event) => event.profileId !== profileId);
  return {
    userProfiles,
    knowledgeBoundaries: state.knowledgeBoundaries.filter((boundary) => boundary.profileId !== profileId),
    boundarySuggestionFeedback: state.boundarySuggestionFeedback.filter((feedback) => feedback.profileId !== profileId),
    coachScheduleEvents,
    aiArtifacts: state.aiArtifacts.filter((artifact) => artifact.profileId !== profileId),
    llmRuns: state.llmRuns.filter((run) => run.profileId !== profileId),
    lastSavedAt: savedAt,
    sprint: createSprint(coachScheduleEvents, userProfiles)
  };
}

export function saveKnowledgeBoundaryPatch(state: CoachActionState, draft: KnowledgeBoundaryDraft): CoachPatch | CoachActionState {
  const profileId = activeProfileId(state.userProfiles);
  if (!profileId) return state;
  const savedAt = new Date().toISOString();
  return {
    knowledgeBoundaries: upsertKnowledgeBoundary(state.knowledgeBoundaries, profileId, draft, savedAt),
    lastSavedAt: savedAt
  };
}

export function recordBoundarySuggestionFeedbackPatch(state: CoachActionState, draft: BoundarySuggestionFeedbackDraft): CoachPatch {
  const feedback = createBoundarySuggestionFeedback(draft);
  return {
    boundarySuggestionFeedback: [feedback, ...state.boundarySuggestionFeedback.filter((item) => item.id !== feedback.id)].slice(0, 200),
    lastSavedAt: feedback.createdAt
  };
}

export function deleteKnowledgeBoundaryPatch(state: CoachActionState, boundaryId: string): CoachPatch {
  return {
    knowledgeBoundaries: state.knowledgeBoundaries.filter((boundary) => boundary.id !== boundaryId),
    lastSavedAt: new Date().toISOString()
  };
}

export function saveCoachScheduleEventPatch(state: CoachActionState, draft: CoachScheduleDraft, createSprint: SprintFactory): CoachPatch | CoachActionState {
  const profileId = activeProfileId(state.userProfiles);
  if (!profileId) return state;
  const savedAt = new Date().toISOString();
  const coachScheduleEvents = upsertCoachScheduleEvent(state.coachScheduleEvents, profileId, draft, undefined, savedAt);
  return {
    coachScheduleEvents,
    lastSavedAt: savedAt,
    sprint: createSprint(coachScheduleEvents)
  };
}

export function deleteCoachScheduleEventPatch(state: CoachActionState, eventId: string, createSprint: SprintFactory): CoachPatch {
  const coachScheduleEvents = state.coachScheduleEvents.filter((event) => event.id !== eventId);
  return {
    coachScheduleEvents,
    lastSavedAt: new Date().toISOString(),
    sprint: createSprint(coachScheduleEvents)
  };
}

export function generateAiArtifactsPatch(state: CoachActionState): CoachPatch | CoachActionState {
  const profile = state.userProfiles.find((item) => item.active) ?? state.userProfiles[0];
  const generated = generateCoachArtifacts({
    profile,
    boundaries: profile ? state.knowledgeBoundaries.filter((item) => item.profileId === profile.id) : [],
    opportunitySignals: buildOpportunitySignals(buildApplicationsDashboard(state.sprint, state.evidenceByTaskId).recentRecords),
    sprint: state.sprint
  });
  if (!generated.length) return state;
  return {
    aiArtifacts: [...generated, ...state.aiArtifacts].slice(0, 80),
    lastSavedAt: new Date().toISOString()
  };
}

export function addAiArtifactsPatch(state: CoachActionState, artifacts: AiArtifact[]): CoachPatch | CoachActionState {
  if (!artifacts.length) return state;
  return {
    aiArtifacts: [...artifacts, ...state.aiArtifacts].slice(0, 80),
    lastSavedAt: new Date().toISOString()
  };
}

export function addLlmRunPatch(state: CoachActionState, run: LlmRun): CoachPatch {
  return {
    llmRuns: [run, ...state.llmRuns].slice(0, 80),
    lastSavedAt: run.createdAt
  };
}

export function acceptAiArtifactPatch(state: CoachActionState, artifactId: string, createSprint: SprintFactory): CoachPatch | CoachActionState {
  const artifact = state.aiArtifacts.find((item) => item.id === artifactId);
  if (!artifact) return state;
  const savedAt = new Date().toISOString();
  const result = acceptArtifact({
    artifact,
    boundaries: state.knowledgeBoundaries,
    scheduleEvents: state.coachScheduleEvents,
    sprint: state.sprint,
    now: savedAt
  });
  return {
    knowledgeBoundaries: result.boundaries,
    coachScheduleEvents: result.scheduleEvents,
    aiArtifacts: state.aiArtifacts.map((item) => (item.id === artifactId ? result.artifact : item)),
    lastSavedAt: savedAt,
    sprint: createSprint(result.scheduleEvents)
  };
}

export function rejectAiArtifactPatch(state: CoachActionState, artifactId: string, rejectionReason: string): CoachPatch {
  const savedAt = new Date().toISOString();
  return {
    aiArtifacts: state.aiArtifacts.map((item) => (item.id === artifactId ? rejectArtifact(item, rejectionReason, savedAt) : item)),
    lastSavedAt: savedAt
  };
}

export function editAiArtifactPatch(state: CoachActionState, artifactId: string, patch: Pick<AiArtifact, "title" | "body">): CoachPatch {
  const savedAt = new Date().toISOString();
  return {
    aiArtifacts: state.aiArtifacts.map((item) => (item.id === artifactId ? editArtifact(item, patch, savedAt) : item)),
    lastSavedAt: savedAt
  };
}

function activeProfileId(profiles: UserProfile[]): string | undefined {
  return profiles.find((profile) => profile.active)?.id ?? profiles[0]?.id;
}

function nextProfilesAfterDelete(profiles: UserProfile[], deletedProfileId: string, savedAt: string): UserProfile[] {
  const remaining = profiles.filter((profile) => profile.id !== deletedProfileId);
  if (!remaining.length) return [];
  if (remaining.some((profile) => profile.active)) return remaining;
  return remaining.map((profile, index) => ({
    ...profile,
    active: index === 0,
    updatedAt: index === 0 ? savedAt : profile.updatedAt
  }));
}

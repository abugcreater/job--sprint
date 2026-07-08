import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addAiArtifactsPatch,
  addLlmRunPatch,
  acceptAiArtifactPatch,
  activateUserProfilePatch,
  deleteCoachScheduleEventPatch,
  deleteKnowledgeBoundaryPatch,
  deleteUserProfilePatch,
  editAiArtifactPatch,
  generateAiArtifactsPatch,
  rejectAiArtifactPatch,
  recordBoundarySuggestionFeedbackPatch,
  saveCoachScheduleEventPatch,
  saveKnowledgeBoundaryPatch,
  saveUserProfilePatch
} from "./sprintCoachActions";
import {
  isDelayRecord,
  isRecord,
  parseAiArtifacts,
  parseBoundarySuggestionFeedback,
  parseCoachScheduleEvents,
  parseKnowledgeBoundaries,
  parseLlmRuns,
  parseUserProfiles,
  sanitizeCompleted,
  sanitizeEvidenceByTaskId
} from "./sprintStoreParsers";
import { createSprint, currentSprintTime } from "./sprintStateFactory";
import { sanitizePersistedSprintState } from "./sprintStoreLegacyMigration";
import { getStorage } from "./sprintStoreStorage";
import type { CoachScheduleEvent, DelayRecord, ReviewEvidence, SyncState } from "../types/sprint";
import type { RuntimeStorageOwner, SprintState } from "./sprintStoreTypes";

export type { RuntimeStorageOwner, SprintState } from "./sprintStoreTypes";
export const useSprintStore = create<SprintState>()(
  persist(
    (set, get) => {
      const completed: SprintState["completed"] = {};
      const evidenceByTaskId: SprintState["evidenceByTaskId"] = {};
      const delayRecords: SprintState["delayRecords"] = [];
      const userProfiles: SprintState["userProfiles"] = [];
      const knowledgeBoundaries: SprintState["knowledgeBoundaries"] = [];
      const boundarySuggestionFeedback: SprintState["boundarySuggestionFeedback"] = [];
      const coachScheduleEvents: SprintState["coachScheduleEvents"] = [];
      const aiArtifacts: SprintState["aiArtifacts"] = [];
      const llmRuns: SprintState["llmRuns"] = [];
      const syncState: SyncState = "local_fallback";

      return {
        completed,
        evidenceByTaskId,
        delayRecords,
        userProfiles,
        knowledgeBoundaries,
        boundarySuggestionFeedback,
        coachScheduleEvents,
        aiArtifacts,
        llmRuns,
        syncState,
        hasHydrated: false,
        sprint: createSprint(completed, evidenceByTaskId, syncState, coachScheduleEvents),
        setSprint: (sprint) => set({ sprint, syncState: sprint.syncState }),
        setSyncState: (syncState) =>
          set((state) => ({
            syncState,
            sprint: createSprint(state.completed, state.evidenceByTaskId, syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
          })),
        markHydrated: () => set({ hasHydrated: true }),
        replaceRuntimeData: (data, nextSyncState = "online", storageOwner) =>
          set((state) => {
            const completed = data.progress.completed ?? {};
            const evidenceByTaskId = data.progress.evidenceByTaskId ?? {};
            const delayRecords = Array.isArray(data.progress.delayRecords)
              ? data.progress.delayRecords.filter(isDelayRecord)
              : [];
            const coach = isRecord(data.progress.coach) ? data.progress.coach : {};
            const userProfiles = parseUserProfiles(coach.userProfiles);
            const knowledgeBoundaries = parseKnowledgeBoundaries(coach.knowledgeBoundaries);
            const boundarySuggestionFeedback = parseBoundarySuggestionFeedback(coach.boundarySuggestionFeedback);
            const coachScheduleEvents = parseCoachScheduleEvents(coach.coachScheduleEvents);
            const aiArtifacts = parseAiArtifacts(coach.aiArtifacts);
            const llmRuns = parseLlmRuns(coach.llmRuns);
            const lastSavedAt = data.progress.lastSavedAt ?? new Date().toISOString();
            return {
              completed,
              evidenceByTaskId,
              delayRecords,
              userProfiles,
              knowledgeBoundaries,
              boundarySuggestionFeedback,
              coachScheduleEvents,
              aiArtifacts,
              llmRuns,
              syncState: nextSyncState,
              storageOwner: storageOwner ?? state.storageOwner,
              lastSavedAt,
              sprint: createSprint(completed, evidenceByTaskId, nextSyncState, coachScheduleEvents, currentSprintTime(state.sprint), userProfiles)
            };
          }),
        resetRuntimeForOwner: (storageOwner, nextSyncState = "syncing") =>
          set((state) => {
            const completed: SprintState["completed"] = {};
            const evidenceByTaskId: SprintState["evidenceByTaskId"] = {};
            const coachScheduleEvents: CoachScheduleEvent[] = [];
            return {
              completed,
              evidenceByTaskId,
              delayRecords: [],
              userProfiles: [],
              knowledgeBoundaries: [],
              boundarySuggestionFeedback: [],
              coachScheduleEvents,
              aiArtifacts: [],
              llmRuns: [],
              syncState: nextSyncState,
              storageOwner,
              lastSavedAt: undefined,
              sprint: createSprint(completed, evidenceByTaskId, nextSyncState, coachScheduleEvents, currentSprintTime(state.sprint), [])
            };
          }),
        toggleTaskCompletion: (taskId) =>
          set((state) => {
            const completed = { ...state.completed, [taskId]: !state.completed[taskId] };
            return {
              completed,
              lastSavedAt: new Date().toISOString(),
              sprint: createSprint(completed, state.evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
            };
          }),
        addEvidence: (taskId, type, title, content) =>
          set((state) => {
            const createdAt = new Date().toISOString();
            const evidence: ReviewEvidence = {
              id: `${taskId}-${type}-${createdAt}`,
              taskId,
              type,
              title,
              content,
              createdAt,
              verified: true
            };
            const evidenceByTaskId = {
              ...state.evidenceByTaskId,
              [taskId]: [...(state.evidenceByTaskId[taskId] ?? []), evidence]
            };
            return {
              evidenceByTaskId,
              lastSavedAt: createdAt,
              sprint: createSprint(state.completed, evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
            };
          }),
        updateEvidence: (taskId, evidenceId, patch) =>
          set((state) => {
            const records = state.evidenceByTaskId[taskId] ?? [];
            if (!records.some((item) => item.id === evidenceId)) return state;

            const savedAt = new Date().toISOString();
            const evidenceByTaskId = {
              ...state.evidenceByTaskId,
              [taskId]: records.map((item) => (item.id === evidenceId ? { ...item, ...patch } : item))
            };

            return {
              evidenceByTaskId,
              lastSavedAt: savedAt,
              sprint: createSprint(state.completed, evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
            };
          }),
        deleteEvidence: (taskId, evidenceId) =>
          set((state) => {
            const records = state.evidenceByTaskId[taskId] ?? [];
            if (!records.some((item) => item.id === evidenceId)) return state;

            const savedAt = new Date().toISOString();
            const remaining = records.filter((item) => item.id !== evidenceId);
            const evidenceByTaskId = { ...state.evidenceByTaskId };
            if (remaining.length) {
              evidenceByTaskId[taskId] = remaining;
            } else {
              delete evidenceByTaskId[taskId];
            }

            return {
              evidenceByTaskId,
              lastSavedAt: savedAt,
              sprint: createSprint(state.completed, evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
            };
          }),
        addDelayRecord: (record) =>
          set((state) => {
            const savedAt = new Date().toISOString();
            const minutes = Math.max(1, Math.round(Number(record.minutes) || 0));
            const delayRecord: DelayRecord = {
              id: `delay-${savedAt}`,
              taskId: record.taskId,
              date: record.date,
              minutes,
              reason: record.reason.trim(),
              recoveryAction: record.recoveryAction.trim(),
              createdAt: savedAt
            };
            return {
              delayRecords: [delayRecord, ...state.delayRecords].slice(0, 30),
              lastSavedAt: savedAt,
              sprint: createSprint(state.completed, state.evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), state.userProfiles)
            };
          }),
        saveUserProfile: (draft) =>
          set((state) => {
            const patch = saveUserProfilePatch(state, draft);
            const userProfiles = patch.userProfiles ?? state.userProfiles;
            return {
              ...patch,
              sprint: createSprint(state.completed, state.evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), userProfiles)
            };
          }),
        activateUserProfile: (profileId) =>
          set((state) => {
            const patch = activateUserProfilePatch(state, profileId);
            const userProfiles = patch.userProfiles ?? state.userProfiles;
            return {
              ...patch,
              sprint: createSprint(state.completed, state.evidenceByTaskId, state.syncState, state.coachScheduleEvents, currentSprintTime(state.sprint), userProfiles)
            };
          }),
        deleteUserProfile: (profileId) =>
          set((state) => deleteUserProfilePatch(state, profileId, (events, profiles = state.userProfiles.filter((profile) => profile.id !== profileId)) => createSprint(state.completed, state.evidenceByTaskId, state.syncState, events, currentSprintTime(state.sprint), profiles))),
        saveKnowledgeBoundary: (draft) => set((state) => saveKnowledgeBoundaryPatch(state, draft)),
        recordBoundarySuggestionFeedback: (draft) => set((state) => recordBoundarySuggestionFeedbackPatch(state, draft)),
        deleteKnowledgeBoundary: (boundaryId) => set((state) => deleteKnowledgeBoundaryPatch(state, boundaryId)),
        saveCoachScheduleEvent: (draft) => set((state) => saveCoachScheduleEventPatch(state, draft, (events, profiles = state.userProfiles) => createSprint(state.completed, state.evidenceByTaskId, state.syncState, events, currentSprintTime(state.sprint), profiles))),
        deleteCoachScheduleEvent: (eventId) => set((state) => deleteCoachScheduleEventPatch(state, eventId, (events, profiles = state.userProfiles) => createSprint(state.completed, state.evidenceByTaskId, state.syncState, events, currentSprintTime(state.sprint), profiles))),
        generateAiArtifacts: () => set((state) => generateAiArtifactsPatch(state)),
        addAiArtifacts: (artifacts) => set((state) => addAiArtifactsPatch(state, artifacts)),
        addLlmRun: (run) => set((state) => addLlmRunPatch(state, run)),
        acceptAiArtifact: (artifactId) => set((state) => acceptAiArtifactPatch(state, artifactId, (events, profiles = state.userProfiles) => createSprint(state.completed, state.evidenceByTaskId, state.syncState, events, currentSprintTime(state.sprint), profiles))),
        rejectAiArtifact: (artifactId, rejectionReason) => set((state) => rejectAiArtifactPatch(state, artifactId, rejectionReason)),
        editAiArtifact: (artifactId, patch) => set((state) => editAiArtifactPatch(state, artifactId, patch)),
        restoreSnapshot: (snapshot) =>
          set((state) => {
            const savedAt = new Date().toISOString();
            const completed = sanitizeCompleted(snapshot.completed);
            const evidenceByTaskId = sanitizeEvidenceByTaskId(snapshot.evidenceByTaskId);
            const delayRecords = snapshot.delayRecords.filter(isDelayRecord).slice(0, 30);
            const userProfiles = parseUserProfiles(snapshot.userProfiles);
            const knowledgeBoundaries = parseKnowledgeBoundaries(snapshot.knowledgeBoundaries);
            const boundarySuggestionFeedback = parseBoundarySuggestionFeedback(snapshot.boundarySuggestionFeedback);
            const coachScheduleEvents = parseCoachScheduleEvents(snapshot.coachScheduleEvents);
            const aiArtifacts = parseAiArtifacts(snapshot.aiArtifacts);
            const llmRuns = parseLlmRuns(snapshot.llmRuns);
            return {
              completed,
              evidenceByTaskId,
              delayRecords,
              userProfiles,
              knowledgeBoundaries,
              boundarySuggestionFeedback,
              coachScheduleEvents,
              aiArtifacts,
              llmRuns,
              syncState: "local_fallback",
              lastSavedAt: savedAt,
              sprint: createSprint(completed, evidenceByTaskId, "local_fallback", coachScheduleEvents, currentSprintTime(state.sprint), userProfiles)
            };
          }),
        refreshSprint: () => {
          const state = get();
          set({ sprint: createSprint(state.completed, state.evidenceByTaskId, state.syncState, state.coachScheduleEvents, new Date(), state.userProfiles) });
        }
      };
    },
    {
      name: "jobSprint.react.v1",
      version: 2,
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        completed: state.completed,
        evidenceByTaskId: state.evidenceByTaskId,
        delayRecords: state.delayRecords,
        userProfiles: state.userProfiles,
        knowledgeBoundaries: state.knowledgeBoundaries,
        boundarySuggestionFeedback: state.boundarySuggestionFeedback,
        coachScheduleEvents: state.coachScheduleEvents,
        aiArtifacts: state.aiArtifacts,
        llmRuns: state.llmRuns,
        syncState: state.syncState,
        storageOwner: state.storageOwner,
        lastSavedAt: state.lastSavedAt
      }),
      migrate: (persistedState) => sanitizePersistedSprintState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedSprintState(persistedState)
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
        state?.refreshSprint();
      }
    }
  )
);

import { useEffect, type PropsWithChildren } from "react";
import { fetchAuthSession, type AuthUser } from "../api/authClient";
import { buildRuntimeData, canUseServerRuntime, fetchRuntimeState, saveRuntimeState } from "../api/runtimeClient";
import { useSprintStore, type RuntimeStorageOwner } from "../stores/sprintStore";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      <RuntimeSyncBridge />
      {children}
    </>
  );
}

function RuntimeSyncBridge() {
  useEffect(() => {
    if (!canUseServerRuntime()) return;

    let disposed = false;
    let loaded = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let saveRequestId = 0;
    let lastPayload = "";
    let pendingData: ReturnType<typeof runtimeDataFromState> | undefined;
    let applyingRemoteState = false;
    let activeOwner: RuntimeStorageOwner | undefined;
    let unsubscribeRuntime: (() => void) | undefined;
    let unsubscribeHydration: (() => void) | undefined;

    async function loadRuntime() {
      try {
        useSprintStore.getState().setSyncState("syncing");
        const session = await fetchAuthSession();
        if (disposed) return;

        activeOwner = session.status === "authenticated" && session.user ? ownerFromUser(session.user) : undefined;
        if (activeOwner) {
          const currentOwner = useSprintStore.getState().storageOwner;
          if (!isStorageOwnerMatch(currentOwner, activeOwner)) {
            useSprintStore.getState().resetRuntimeForOwner(activeOwner, "syncing");
          }
        }

        const response = await fetchRuntimeState();
        if (disposed) return;
        if (response?.data) {
          const localData = runtimeDataFromState(useSprintStore.getState());
          const localOwner = useSprintStore.getState().storageOwner;
          if (shouldUploadLocalFirst(localData, response.data, localOwner, activeOwner)) {
            const saved = await saveRuntimeState(localData);
            if (!disposed && saved?.data) {
              applyRemoteRuntimeData(saved.data, activeOwner);
            } else if (!disposed) {
              useSprintStore.getState().setSyncState("online");
            }
          } else {
            applyRemoteRuntimeData(response.data, activeOwner);
          }
        } else {
          useSprintStore.getState().setSyncState("local_fallback");
        }
      } catch {
        if (!disposed) useSprintStore.getState().setSyncState("failed");
      } finally {
        const state = useSprintStore.getState();
        lastPayload = JSON.stringify(runtimeDataFromState(state));
        loaded = true;
      }
    }

    function startRuntimeSync() {
      if (unsubscribeRuntime || disposed) return;
      unsubscribeRuntime = useSprintStore.subscribe((state) => {
        if (!loaded || disposed || applyingRemoteState) return;
        if (activeOwner && !isStorageOwnerMatch(state.storageOwner, activeOwner)) return;
        const data = runtimeDataFromState(state);
        const payload = JSON.stringify(data);
        if (payload === lastPayload) return;
        lastPayload = payload;
        pendingData = data;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const requestId = ++saveRequestId;
          try {
            const response = await saveRuntimeState(data);
            if (!shouldApplyRuntimeSaveResponse({ disposed, requestId, latestRequestId: saveRequestId, pendingData, requestData: data })) {
              return;
            }
            pendingData = undefined;
            if (response?.data) {
              applyRemoteRuntimeData(response.data, activeOwner);
            }
          } catch {
            if (shouldApplyRuntimeSaveResponse({ disposed, requestId, latestRequestId: saveRequestId, pendingData, requestData: data })) {
              useSprintStore.getState().setSyncState("failed");
            }
          }
        }, 0);
      });

      void loadRuntime();
    }

    function applyRemoteRuntimeData(data: ReturnType<typeof runtimeDataFromState>, owner?: RuntimeStorageOwner) {
      applyingRemoteState = true;
      try {
        useSprintStore.getState().replaceRuntimeData(data, "online", owner);
      } finally {
        applyingRemoteState = false;
      }
      lastPayload = JSON.stringify(runtimeDataFromState(useSprintStore.getState()));
    }

    if (useSprintStore.persist.hasHydrated()) {
      startRuntimeSync();
    } else {
      unsubscribeHydration = useSprintStore.persist.onFinishHydration(() => {
        unsubscribeHydration?.();
        unsubscribeHydration = undefined;
        startRuntimeSync();
      });
    }

    return () => {
      disposed = true;
      if (saveTimer) clearTimeout(saveTimer);
      unsubscribeHydration?.();
      unsubscribeRuntime?.();
    };
  }, []);

  return null;
}

function runtimeDataFromState(state: ReturnType<typeof useSprintStore.getState>) {
  return buildRuntimeData({
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
    lastSavedAt: state.lastSavedAt
  });
}

export function ownerFromUser(user: AuthUser): RuntimeStorageOwner {
  return {
    username: user.username,
    dataScope: user.dataScope || user.username
  };
}

export function shouldApplyRuntimeSaveResponse({
  disposed,
  requestId,
  latestRequestId,
  pendingData,
  requestData
}: {
  disposed: boolean;
  requestId: number;
  latestRequestId: number;
  pendingData: unknown;
  requestData: unknown;
}) {
  return !disposed && requestId === latestRequestId && pendingData === requestData;
}

function hasRuntimeContent(data: ReturnType<typeof buildRuntimeData>) {
  const progress = data.progress ?? {};
  const evidenceCount = Object.values(progress.evidenceByTaskId ?? {}).reduce((count, records) => count + records.length, 0);
  return Boolean(
    Object.keys(progress.completed ?? {}).length ||
      evidenceCount ||
      (progress.delayRecords ?? []).length ||
      (progress.coach?.userProfiles ?? []).length ||
      (progress.coach?.knowledgeBoundaries ?? []).length ||
      (progress.coach?.boundarySuggestionFeedback ?? []).length ||
      (progress.coach?.coachScheduleEvents ?? []).length ||
      (progress.coach?.aiArtifacts ?? []).length ||
      (progress.coach?.llmRuns ?? []).length ||
      Object.keys(data.reviews ?? {}).length ||
      data.applications.length ||
      data.interviewMistakes.length
  );
}

export function isStorageOwnerMatch(left?: RuntimeStorageOwner, right?: RuntimeStorageOwner) {
  if (!right?.dataScope && !right?.username) return true;
  if (!left?.dataScope && !left?.username) return false;
  const leftScope = left.dataScope || left.username || "";
  const rightScope = right.dataScope || right.username || "";
  return Boolean(leftScope && rightScope && leftScope === rightScope);
}

export function shouldUploadLocalFirst(
  localData: ReturnType<typeof buildRuntimeData>,
  remoteData: ReturnType<typeof buildRuntimeData>,
  localOwner?: RuntimeStorageOwner,
  currentOwner?: RuntimeStorageOwner
) {
  if (!isStorageOwnerMatch(localOwner, currentOwner)) return false;
  if (!hasRuntimeContent(localData)) return false;
  if (!hasRuntimeContent(remoteData)) return true;
  return runtimeTimestamp(localData) > runtimeTimestamp(remoteData);
}

function runtimeTimestamp(data: ReturnType<typeof buildRuntimeData>) {
  const raw = data.progress?.lastSavedAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

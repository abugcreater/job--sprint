import { ownerFromUser, shouldApplyRuntimeSaveResponse, shouldUploadLocalFirst, isStorageOwnerMatch } from "../app/providers";
import { buildRuntimeData } from "../api/runtimeClient";

describe("RuntimeSyncBridge", () => {
  it("applies only the latest pending save response", () => {
    const firstPayload = { progress: { completed: { old: true } } };
    const latestPayload = { progress: { completed: { latest: true } } };

    expect(
      shouldApplyRuntimeSaveResponse({
        disposed: false,
        requestId: 1,
        latestRequestId: 2,
        pendingData: latestPayload,
        requestData: firstPayload
      })
    ).toBe(false);

    expect(
      shouldApplyRuntimeSaveResponse({
        disposed: false,
        requestId: 2,
        latestRequestId: 2,
        pendingData: latestPayload,
        requestData: latestPayload
      })
    ).toBe(true);
  });

  it("does not apply responses after the bridge has been disposed", () => {
    const payload = { progress: { completed: { latest: true } } };

    expect(
      shouldApplyRuntimeSaveResponse({
        disposed: true,
        requestId: 1,
        latestRequestId: 1,
        pendingData: payload,
        requestData: payload
      })
    ).toBe(false);
  });

  it("blocks local-first uploads when cached data belongs to a different account scope", () => {
    const currentOwner = ownerFromUser({
      username: "new-user",
      role: "coach",
      dataScope: "new-user",
      readOnly: false,
      permissions: []
    });
    const previousOwner = { username: "old-user", dataScope: "old-user" };
    const localData = buildRuntimeData({
      completed: { "old-task": true },
      evidenceByTaskId: {},
      delayRecords: [],
      userProfiles: [],
      knowledgeBoundaries: [],
      boundarySuggestionFeedback: [],
      coachScheduleEvents: [],
      aiArtifacts: [],
      llmRuns: [],
      syncState: "online",
      lastSavedAt: "2026-07-02T10:00:00+08:00"
    });
    const remoteData = buildRuntimeData({
      completed: {},
      evidenceByTaskId: {},
      delayRecords: [],
      userProfiles: [],
      knowledgeBoundaries: [],
      boundarySuggestionFeedback: [],
      coachScheduleEvents: [],
      aiArtifacts: [],
      llmRuns: [],
      syncState: "online",
      lastSavedAt: undefined
    });

    expect(currentOwner).toEqual({ username: "new-user", dataScope: "new-user" });
    expect(isStorageOwnerMatch(previousOwner, currentOwner)).toBe(false);
    expect(shouldUploadLocalFirst(localData, remoteData, previousOwner, currentOwner)).toBe(false);
    expect(shouldUploadLocalFirst(localData, remoteData, currentOwner, currentOwner)).toBe(true);
  });
});

import { shouldApplyRuntimeSaveResponse } from "../app/providers";

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
});

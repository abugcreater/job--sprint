import {
  RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES,
  shouldUseRuntimeKeepalive
} from "../api/runtimeClient";

describe("runtimeClient", () => {
  it("uses keepalive only for runtime payloads below the browser body limit", () => {
    expect(shouldUseRuntimeKeepalive("x".repeat(1024))).toBe(true);
    expect(shouldUseRuntimeKeepalive("x".repeat(RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES))).toBe(true);
    expect(shouldUseRuntimeKeepalive("x".repeat(RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES + 1))).toBe(false);
  });

  it("counts payload bytes instead of JavaScript characters", () => {
    const multibytePayload = "汉".repeat(Math.ceil(RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES / 2));

    expect(multibytePayload.length).toBeLessThanOrEqual(RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES);
    expect(shouldUseRuntimeKeepalive(multibytePayload)).toBe(false);
  });
});

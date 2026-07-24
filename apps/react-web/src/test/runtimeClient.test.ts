import {
  CoachArtifactRuntimeError,
  RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES,
  coachArtifactRuntimeWarningForStatus,
  coachArtifactRuntimeWarningFromError,
  shouldUseServerRuntimeForEnv,
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

  it("disables server runtime in plain Vite dev unless explicitly enabled", () => {
    expect(shouldUseServerRuntimeForEnv({ protocol: "http:", mode: "development", dev: true })).toBe(false);
    expect(shouldUseServerRuntimeForEnv({ protocol: "http:", mode: "development", dev: true, serverRuntime: "true" })).toBe(true);
    expect(shouldUseServerRuntimeForEnv({ protocol: "http:", mode: "production", dev: false })).toBe(true);
    expect(shouldUseServerRuntimeForEnv({ protocol: "http:", mode: "test", dev: false, serverRuntime: "true" })).toBe(false);
    expect(shouldUseServerRuntimeForEnv({ protocol: "file:", mode: "production", dev: false })).toBe(false);
  });

  it("maps coach artifact HTTP and client failures to safe recovery codes", () => {
    expect(coachArtifactRuntimeWarningForStatus(401)).toBe("auth_required");
    expect(coachArtifactRuntimeWarningForStatus(503)).toBe("api_unavailable");
    expect(coachArtifactRuntimeWarningForStatus(400)).toBe("api_contract_error");
    expect(coachArtifactRuntimeWarningFromError(new CoachArtifactRuntimeError("api_contract_error", "invalid payload"))).toBe("api_contract_error");
    expect(coachArtifactRuntimeWarningFromError(new Error("network error"))).toBe("server_generation_failed");
  });
});

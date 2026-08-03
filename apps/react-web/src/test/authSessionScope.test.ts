import type { AuthSessionState } from "../api/authClient";
import { canReadSprintForSession, isStorageOwnerMatch, ownerFromUser, resolveRuntimeOwnerTransition } from "../app/authSessionScope";

const currentUser = {
  username: "candidate-b",
  dataScope: "candidate-b",
  role: "coach",
  readOnly: false,
  permissions: []
};

describe("auth session scope", () => {
  it("resets a persisted runtime snapshot before switching to a different authenticated data scope", () => {
    const session: AuthSessionState = { status: "authenticated", user: currentUser };

    expect(resolveRuntimeOwnerTransition(session, { username: "candidate-a", dataScope: "candidate-a" })).toEqual({
      storageOwner: { username: "candidate-b", dataScope: "candidate-b" },
      syncState: "syncing"
    });
  });

  it("keeps an authenticated snapshot when the data scope remains the same", () => {
    const session: AuthSessionState = { status: "authenticated", user: { ...currentUser, username: "candidate-b-alias" } };
    const currentOwner = { username: "candidate-b", dataScope: "candidate-b" };

    expect(isStorageOwnerMatch(currentOwner, ownerFromUser(session.user!))).toBe(true);
    expect(resolveRuntimeOwnerTransition(session, currentOwner)).toBeUndefined();
  });

  it("clears any persisted runtime state for an anonymous session", () => {
    expect(resolveRuntimeOwnerTransition({ status: "anonymous" }, { username: "candidate-a", dataScope: "candidate-a" })).toEqual({
      storageOwner: undefined,
      syncState: "local_fallback"
    });
  });

  it("allows business routes only for verified or explicit local modes", () => {
    expect(canReadSprintForSession({ status: "authenticated", user: currentUser })).toBe(true);
    expect(canReadSprintForSession({ status: "authenticated" })).toBe(false);
    expect(canReadSprintForSession({ status: "local" })).toBe(true);
    expect(canReadSprintForSession({ status: "unconfigured" })).toBe(true);
    expect(canReadSprintForSession({ status: "checking" })).toBe(false);
    expect(canReadSprintForSession({ status: "anonymous" })).toBe(false);
    expect(canReadSprintForSession({ status: "failed" })).toBe(false);
  });
});

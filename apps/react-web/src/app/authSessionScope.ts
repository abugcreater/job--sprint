import type { AuthSessionState, AuthUser } from "../api/authClient";
import type { SyncState } from "../types/sprint";
import type { RuntimeStorageOwner } from "../stores/sprintStore";

export interface RuntimeOwnerTransition {
  storageOwner?: RuntimeStorageOwner;
  syncState: SyncState;
}

export function ownerFromUser(user: AuthUser): RuntimeStorageOwner {
  return {
    username: user.username,
    dataScope: user.dataScope || user.username
  };
}

export function isStorageOwnerMatch(left?: RuntimeStorageOwner, right?: RuntimeStorageOwner) {
  if (!right?.dataScope && !right?.username) return true;
  if (!left?.dataScope && !left?.username) return false;
  const leftScope = left.dataScope || left.username || "";
  const rightScope = right.dataScope || right.username || "";
  return Boolean(leftScope && rightScope && leftScope === rightScope);
}

export function resolveRuntimeOwnerTransition(
  session: AuthSessionState,
  currentOwner?: RuntimeStorageOwner
): RuntimeOwnerTransition | undefined {
  if (session.status === "authenticated" && session.user) {
    const storageOwner = ownerFromUser(session.user);
    return isStorageOwnerMatch(currentOwner, storageOwner) ? undefined : { storageOwner, syncState: "syncing" };
  }
  if (session.status === "anonymous") {
    return { storageOwner: undefined, syncState: "local_fallback" };
  }
  return undefined;
}

export function canReadSprintForSession(session: AuthSessionState) {
  if (session.status === "authenticated") return Boolean(session.user?.username);
  return session.status === "local" || session.status === "unconfigured";
}

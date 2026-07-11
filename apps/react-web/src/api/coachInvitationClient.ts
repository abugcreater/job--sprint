import { appPath, canUseServerRuntime } from "./runtimeClient";
export { buildCoachInvitationExport } from "./coachInvitationExport";

export type CoachInvitationStatus = "draft" | "invited" | "active" | "paused";

export interface CoachInvitationRecord {
  id: string;
  username: string;
  displayName: string;
  dataScope: string;
  inviteBatch: string;
  templateVersion: string;
  roleFamily: string;
  targetRole: string;
  status: CoachInvitationStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachConfiguredUser {
  username: string;
  displayName: string;
  dataScope: string;
  inviteBatch: string;
  role: string;
  disabled?: boolean;
  canLogin?: boolean;
}

export interface CoachAccountAuditEvent {
  id: string;
  createdAt: string;
  actorUsername: string;
  action: "created" | "password_reset" | "disable" | "enable" | "delete" | "batch_disable" | "batch_enable" | "batch_delete" | string;
  username?: string;
  role?: string;
  dataScope?: string;
  inviteBatch?: string;
  affectedUsernames?: string[];
  affectedCount?: number;
  requestedCount?: number;
  skippedCount?: number;
  skippedUsers?: Array<{ username: string; reason: string }>;
  message?: string;
}

export interface CoachInvitationSummary {
  totalInvitations: number;
  batchCount: number;
  templateVersionCount?: number;
  draftCount: number;
  invitedCount: number;
  activeCount: number;
  pausedCount: number;
  nextActionLabel: string;
}

export interface AccountProvisioningState {
  status?: "PASS" | "FAIL" | "USER_ACTION_REQUIRED";
  enabled?: boolean;
  reason?: string;
  action?: "created" | "password_reset";
  username?: string;
  role?: string;
  dataScope?: string;
  inviteBatch?: string;
  canLogin?: boolean;
  message?: string;
  error?: string;
}

export type CoachAccountAction = "disable" | "enable" | "delete";
export type CoachInvitationNotificationChannel = "email" | "im" | "manual";

export interface CoachInvitationNotification {
  username: string;
  displayName: string;
  dataScope: string;
  inviteBatch: string;
  roleFamily: string;
  targetRole: string;
  channel: CoachInvitationNotificationChannel;
  title: string;
  body: string;
  loginUrl: string;
  status: "draft";
  generatedAt: string;
}

export interface CoachInvitationResponse {
  ok: boolean;
  storage?: string;
  invitations: CoachInvitationRecord[];
  configuredUsers: CoachConfiguredUser[];
  accountAuditEvents?: CoachAccountAuditEvent[];
  summary: CoachInvitationSummary;
  accountProvisioning?: AccountProvisioningState;
  batchAction?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    inviteBatch?: string;
    nextStatus?: CoachInvitationStatus;
    affectedCount?: number;
    message?: string;
  };
  deletion?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    username?: string;
    removedCount?: number;
    message?: string;
  };
  accountAction?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    username?: string;
    action?: CoachAccountAction;
    disabled?: boolean;
    removedCount?: number;
    message?: string;
  };
  accountBatchAction?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    action?: CoachAccountAction;
    requestedCount?: number;
    affectedCount?: number;
    skippedCount?: number;
    skippedUsers?: Array<{ username: string; reason: string }>;
    message?: string;
  };
  notificationAction?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    channel?: CoachInvitationNotificationChannel;
    inviteBatch?: string | null;
    loginUrl?: string;
    generatedCount?: number;
    skippedCount?: number;
    skippedUsers?: Array<{ username: string; reason: string }>;
    notifications?: CoachInvitationNotification[];
    message?: string;
  };
  importAction?: {
    status: "PASS" | "USER_ACTION_REQUIRED";
    importedCount?: number;
    rejectedCount?: number;
    message?: string;
  };
}

export type CoachInvitationDraft = Pick<
  CoachInvitationRecord,
  "username" | "displayName" | "dataScope" | "inviteBatch" | "templateVersion" | "roleFamily" | "targetRole" | "status" | "note"
> & {
  provisionAccount: boolean;
  accountRole: "coach" | "viewer";
  password: string;
};

export function createCoachInvitationDraft(): CoachInvitationDraft {
  return {
    username: "",
    displayName: "",
    dataScope: "",
    inviteBatch: "2026-07-beta",
    templateVersion: "role-family-v1",
    roleFamily: "backend",
    targetRole: "",
    status: "draft",
    note: "",
    provisionAccount: false,
    accountRole: "coach",
    password: ""
  };
}

export async function fetchCoachInvitations(): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_invitations_load_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function saveCoachInvitation(draft: CoachInvitationDraft): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft)
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    const reason = data?.accountProvisioning?.message || data?.message || `coach_invitation_save_failed:${response.status}`;
    throw new Error(reason);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function updateCoachInvitationBatchStatus(
  inviteBatch: string,
  status: CoachInvitationStatus
): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "batch-status", inviteBatch, status })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.message || `coach_invitation_batch_status_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function updateCoachInvitationAccountStatus(
  username: string,
  action: CoachAccountAction
): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-status", username, action })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.accountAction?.message || data?.message || `coach_invitation_account_action_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function updateCoachInvitationBatchAccountStatus(
  usernames: string[],
  action: CoachAccountAction
): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-batch-status", usernames, action })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.accountBatchAction?.message || data?.message || `coach_invitation_account_batch_action_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function generateCoachInvitationNotifications(
  usernames: string[],
  channel: CoachInvitationNotificationChannel,
  baseUrl?: string
): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/invitations"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "notification-draft", usernames, channel, baseUrl })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.notificationAction?.message || data?.message || `coach_invitation_notification_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export async function deleteCoachInvitation(username: string): Promise<CoachInvitationResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath(`/api/coach/invitations?username=${encodeURIComponent(username)}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data?.message || `coach_invitation_delete_failed:${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.invitations) && data?.summary ? data as CoachInvitationResponse : null;
}

export function buildCoachLoginEntry(user: CoachConfiguredUser, origin = "") {
  const baseUrl = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return JSON.stringify({
    schemaVersion: "coach-login-entry-v1",
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    dataScope: user.dataScope,
    inviteBatch: user.inviteBatch,
    loginUrl: `${baseUrl}/job-sprint/react/index.html`,
    accountStatus: user.disabled ? "disabled" : "enabled"
  }, null, 2);
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

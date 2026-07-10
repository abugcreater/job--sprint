const { getAuthConfig, hasPermission } = require("./auth");
const {
  accountAuditEventsForManagement,
  accountProvisioningCapability,
  provisionUserAccountFromInvitation,
  updateUserAccountStatus,
  userAccountsForManagement
} = require("./auth_account_store");
const { updateUserAccountBatchStatus } = require("./auth_account_batch_store");
const {
  normalizeRuntimeState,
  readRuntimeEnvelope,
  writeRuntimeEnvelope
} = require("./runtime_store");
const {
  readBody,
  sendBadJson,
  sendJson
} = require("./http_utils");
const { bulkImportInvitations } = require("./coach_invitation_import_routes");
const { buildInvitationNotificationAction } = require("./coach_invitation_notifications");

const INVITATION_STATUSES = new Set(["draft", "invited", "active", "paused"]);

function requireInvitationAdmin(res, authState) {
  if (hasPermission(authState, "*")) return true;
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "只有 owner 可以管理邀请账号。"
  });
  return false;
}

async function handleCoachInvitations(req, res, authState) {
  if (!requireInvitationAdmin(res, authState)) return;

  if (req.method === "GET") {
    const invitations = readInvitations(authState);
    sendJson(res, 200, responsePayload(authState, invitations));
    return;
  }

  if (req.method === "POST") {
    let payload;
    try {
      payload = await readBody(req);
    } catch (error) {
      sendBadJson(res, error);
      return;
    }
    if (payload && payload.operation === "batch-status") {
      const result = updateInvitationBatchStatus(authState, payload);
      sendJson(res, result.batchAction.status === "PASS" ? 200 : 400, result);
      return;
    }
    if (payload && payload.operation === "bulk-import") {
      const result = bulkImportInvitations(authState, payload, {
        invitationFromPayload,
        normalizeInvitations,
        ownerDataScope,
        readInvitations,
        responsePayload
      });
      sendJson(res, result.importAction.status === "PASS" ? 200 : 400, result);
      return;
    }
    if (payload && payload.operation === "account-status") {
      const result = updateUserAccountStatus(payload, authState.userProfile?.username || "");
      if (!result.ok) {
        sendJson(res, result.statusCode || 400, {
          ok: false,
          error: result.accountAction.error || result.accountAction.reason || "account_action_failed",
          accountAction: result.accountAction
        });
        return;
      }
      sendJson(res, 200, {
        ...responsePayload(authState, readInvitations(authState)),
        accountAction: result.accountAction
      });
      return;
    }
    if (payload && payload.operation === "account-batch-status") {
      const result = updateUserAccountBatchStatus(payload, authState.userProfile?.username || "");
      if (!result.ok) {
        sendJson(res, result.statusCode || 400, {
          ok: false,
          error: result.accountBatchAction.error || result.accountBatchAction.reason || "account_batch_action_failed",
          accountBatchAction: result.accountBatchAction
        });
        return;
      }
      sendJson(res, 200, {
        ...responsePayload(authState, readInvitations(authState)),
        accountBatchAction: result.accountBatchAction
      });
      return;
    }
    if (payload && payload.operation === "notification-draft") {
      const invitations = readInvitations(authState);
      const response = responsePayload(authState, invitations);
      const notificationAction = buildInvitationNotificationAction(response.configuredUsers, invitations, payload);
      sendJson(res, notificationAction.status === "PASS" ? 200 : 400, {
        ...response,
        notificationAction
      });
      return;
    }
    const invitation = invitationFromPayload(payload);
    if (invitation.error) {
      sendJson(res, 400, invitation);
      return;
    }
    const shouldProvisionAccount = Boolean(payload && (payload.provisionAccount || payload.password));
    let accountProvisioning = accountProvisioningCapability();
    if (shouldProvisionAccount) {
      const result = provisionUserAccountFromInvitation({ ...payload, ...invitation }, process.env, authState.userProfile?.username || "");
      if (!result.ok) {
        sendJson(res, result.statusCode || 400, {
          ok: false,
          error: result.accountProvisioning.error || result.accountProvisioning.reason || "account_provisioning_failed",
          accountProvisioning: result.accountProvisioning
        });
        return;
      }
      accountProvisioning = result.accountProvisioning;
      invitation.status = "active";
    }
    const invitations = upsertInvitation(authState, invitation);
    sendJson(res, 200, {
      ...responsePayload(authState, invitations),
      accountProvisioning,
      invitation
    });
    return;
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url, "http://localhost");
    const username = url.searchParams.get("username") || "";
    const result = deleteInvitation(authState, username);
    sendJson(res, result.deletion.status === "PASS" ? 200 : 404, result);
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function readInvitations(authState) {
  const envelope = readRuntimeEnvelope();
  const ownerScope = ownerDataScope(authState);
  const state = normalizeRuntimeState(envelope.users?.[ownerScope] || {});
  return normalizeInvitations(state.progress?.coachInvitations);
}

function upsertInvitation(authState, invitation) {
  const envelope = readRuntimeEnvelope();
  const ownerScope = ownerDataScope(authState);
  const state = normalizeRuntimeState(envelope.users?.[ownerScope] || {});
  const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
  const invitations = normalizeInvitations(progress.coachInvitations);
  const nextList = [invitation, ...invitations.filter((item) => item.id !== invitation.id && item.username !== invitation.username)].slice(0, 200);
  envelope.users = envelope.users || {};
  envelope.users[ownerScope] = normalizeRuntimeState({
    ...state,
    progress: {
      ...progress,
      coachInvitations: nextList
    }
  });
  writeRuntimeEnvelope(envelope);
  return nextList;
}

function updateInvitationBatchStatus(authState, payload) {
  const inviteBatch = text(payload, "inviteBatch");
  const status = text(payload, "status");
  if (!inviteBatch || !INVITATION_STATUSES.has(status)) {
    return {
      ...responsePayload(authState, readInvitations(authState)),
      batchAction: {
        status: "USER_ACTION_REQUIRED",
        inviteBatch,
        nextStatus: status,
        affectedCount: 0,
        message: "批次状态更新需要有效批次和状态。"
      }
    };
  }
  const envelope = readRuntimeEnvelope();
  const ownerScope = ownerDataScope(authState);
  const state = normalizeRuntimeState(envelope.users?.[ownerScope] || {});
  const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
  const now = new Date().toISOString();
  let affectedCount = 0;
  const nextList = normalizeInvitations(progress.coachInvitations).map((item) => {
    if (item.inviteBatch !== inviteBatch) return item;
    affectedCount += 1;
    return { ...item, status, updatedAt: now };
  });
  if (affectedCount > 0) {
    envelope.users = envelope.users || {};
    envelope.users[ownerScope] = normalizeRuntimeState({
      ...state,
      progress: {
        ...progress,
        coachInvitations: nextList
      }
    });
    writeRuntimeEnvelope(envelope);
  }
  return {
    ...responsePayload(authState, nextList),
    batchAction: {
      status: affectedCount > 0 ? "PASS" : "USER_ACTION_REQUIRED",
      inviteBatch,
      nextStatus: status,
      affectedCount,
      message: affectedCount > 0
        ? `已更新 ${affectedCount} 条 ${inviteBatch} 批次邀请状态。`
        : "没有找到可更新的邀请批次。"
    }
  };
}

function deleteInvitation(authState, username) {
  const cleanUsername = String(username || "").trim();
  const envelope = readRuntimeEnvelope();
  const ownerScope = ownerDataScope(authState);
  const state = normalizeRuntimeState(envelope.users?.[ownerScope] || {});
  const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
  const invitations = normalizeInvitations(progress.coachInvitations);
  const nextList = invitations.filter((item) => item.username !== cleanUsername);
  const removedCount = invitations.length - nextList.length;
  if (removedCount > 0) {
    envelope.users = envelope.users || {};
    envelope.users[ownerScope] = normalizeRuntimeState({
      ...state,
      progress: {
        ...progress,
        coachInvitations: nextList
      }
    });
    writeRuntimeEnvelope(envelope);
  }
  return {
    ...responsePayload(authState, nextList),
    deletion: {
      status: removedCount > 0 ? "PASS" : "USER_ACTION_REQUIRED",
      username: cleanUsername,
      removedCount,
      message: removedCount > 0
        ? `已删除 ${cleanUsername} 的邀请记录；登录账号不会被自动删除。`
        : "没有找到可删除的邀请记录。"
    }
  };
}

function invitationFromPayload(payload) {
  const username = text(payload, "username");
  if (!username) return requiredError("username");
  const inviteBatch = text(payload, "inviteBatch") || "default";
  const status = text(payload, "status") || "draft";
  if (!INVITATION_STATUSES.has(status)) {
    return {
      ok: false,
      error: "invalid_invitation_status",
      message: "邀请状态只能是 draft、invited、active 或 paused。"
    };
  }
  const now = new Date().toISOString();
  return {
    id: text(payload, "id") || `coach-invite-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    username,
    displayName: text(payload, "displayName") || username,
    dataScope: text(payload, "dataScope") || username,
    inviteBatch,
    templateVersion: text(payload, "templateVersion") || "role-family-v1",
    roleFamily: text(payload, "roleFamily") || "other_it",
    targetRole: text(payload, "targetRole"),
    status,
    note: text(payload, "note"),
    createdAt: text(payload, "createdAt") || now,
    updatedAt: now
  };
}

function normalizeInvitations(value) {
  return Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === "object" && text(item, "username"))
      .map((item) => {
        const username = text(item, "username");
        const status = INVITATION_STATUSES.has(text(item, "status")) ? text(item, "status") : "draft";
        return {
          id: text(item, "id") || `coach-invite-${username}`,
          username,
          displayName: text(item, "displayName") || username,
          dataScope: text(item, "dataScope") || username,
          inviteBatch: text(item, "inviteBatch") || "default",
          templateVersion: text(item, "templateVersion") || "role-family-v1",
          roleFamily: text(item, "roleFamily") || "other_it",
          targetRole: text(item, "targetRole"),
          status,
          note: text(item, "note"),
          createdAt: text(item, "createdAt") || new Date().toISOString(),
          updatedAt: text(item, "updatedAt") || new Date().toISOString()
        };
      })
    : [];
}

function responsePayload(authState, invitations) {
  return {
    ok: true,
    storage: "server-json",
    invitations,
    configuredUsers: configuredUsers(authState),
    accountAuditEvents: accountAuditEventsForManagement(),
    summary: summarizeInvitations(invitations),
    accountProvisioning: accountProvisioningCapability()
  };
}

function configuredUsers(authState) {
  const manageableUsers = userAccountsForManagement();
  if (manageableUsers) return manageableUsers;
  const users = getAuthConfig().users || authState.config?.users || [];
  return users.map((user) => ({
    username: user.username,
    displayName: user.displayName || user.username,
    dataScope: user.dataScope || user.username,
    inviteBatch: user.inviteBatch || "default",
    role: user.role || "owner",
    disabled: false,
    canLogin: true
  }));
}

function summarizeInvitations(invitations) {
  const statusCounts = invitations.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  const batchCount = new Set(invitations.map((item) => item.inviteBatch || "default")).size;
  const templateVersionCount = new Set(invitations.map((item) => item.templateVersion || "role-family-v1")).size;
  return {
    totalInvitations: invitations.length,
    batchCount,
    templateVersionCount,
    draftCount: statusCounts.draft || 0,
    invitedCount: statusCounts.invited || 0,
    activeCount: statusCounts.active || 0,
    pausedCount: statusCounts.paused || 0,
    nextActionLabel: invitations.length ? "为 active 用户开通账号、发送登录入口，并跟进首登完成率。" : "先创建第一条邀请记录。"
  };
}

function ownerDataScope(authState) {
  return authState.config?.dataOwner || authState.userProfile?.dataScope || "kai";
}

function requiredError(field) {
  return {
    ok: false,
    error: `${field}_required`,
    message: "邀请记录缺少必要字段。"
  };
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  handleCoachInvitations,
  deleteInvitation,
  invitationFromPayload,
  normalizeInvitations,
  summarizeInvitations,
  buildInvitationNotificationAction,
  updateInvitationBatchStatus
};

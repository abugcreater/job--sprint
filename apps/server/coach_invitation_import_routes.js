const {
  normalizeRuntimeState,
  readRuntimeEnvelope,
  writeRuntimeEnvelope
} = require("./runtime_store");

function bulkImportInvitations(authState, payload, deps) {
  const source = Array.isArray(payload.records) ? payload.records : Array.isArray(payload.invitations) ? payload.invitations : [];
  if (source.length === 0 || source.length > 50) {
    return {
      ...deps.responsePayload(authState, deps.readInvitations(authState)),
      importAction: {
        status: "USER_ACTION_REQUIRED",
        importedCount: 0,
        rejectedCount: source.length === 0 ? 1 : source.length - 50,
        message: source.length === 0 ? "批量导入至少需要 1 条邀请记录。" : "单次批量导入最多支持 50 条邀请记录。"
      }
    };
  }
  const importedByUsername = new Map();
  for (let index = 0; index < source.length; index += 1) {
    const invitation = deps.invitationFromPayload({
      ...source[index],
      id: text(source[index], "id") || `coach-invite-bulk-${Date.now()}-${index}`
    });
    if (invitation.error) {
      return {
        ...deps.responsePayload(authState, deps.readInvitations(authState)),
        importAction: {
          status: "USER_ACTION_REQUIRED",
          importedCount: 0,
          rejectedCount: 1,
          message: `第 ${index + 1} 条邀请记录无效：${invitation.message || invitation.error}`
        }
      };
    }
    importedByUsername.set(invitation.username, invitation);
  }
  const envelope = readRuntimeEnvelope();
  const ownerScope = deps.ownerDataScope(authState);
  const state = normalizeRuntimeState(envelope.users?.[ownerScope] || {});
  const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
  const invitations = deps.normalizeInvitations(progress.coachInvitations);
  const imported = Array.from(importedByUsername.values()).reverse();
  const importedUsernames = new Set(imported.map((item) => item.username));
  const nextList = [...imported, ...invitations.filter((item) => !importedUsernames.has(item.username))].slice(0, 200);
  envelope.users = envelope.users || {};
  envelope.users[ownerScope] = normalizeRuntimeState({
    ...state,
    progress: {
      ...progress,
      coachInvitations: nextList
    }
  });
  writeRuntimeEnvelope(envelope);
  return {
    ...deps.responsePayload(authState, nextList),
    importAction: {
      status: "PASS",
      importedCount: imported.length,
      rejectedCount: 0,
      message: `已批量导入 ${imported.length} 条邀请记录；不会自动创建登录账号。`
    }
  };
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = { bulkImportInvitations };

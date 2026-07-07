const {
  accountProvisioningCapability,
  readUsersConfig,
  resolveUsersFile,
  writeUsersConfig
} = require("./auth_account_store");

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,64}$/;

function updateUserAccountBatchStatus(payload, currentUsername, env = process.env) {
  const capability = accountProvisioningCapability(env);
  if (!capability.enabled) {
    return {
      ok: false,
      statusCode: 409,
      accountBatchAction: {
        status: "USER_ACTION_REQUIRED",
        ...capability
      }
    };
  }
  const action = text(payload, "action");
  if (!["disable", "enable", "delete"].includes(action)) {
    return invalidBatchAction(action);
  }
  const usersFile = resolveUsersFile(env);
  const existingConfig = readUsersConfig(usersFile);
  if (!existingConfig.ok) {
    return { ok: false, statusCode: 500, accountBatchAction: existingConfig.accountProvisioning };
  }
  const requested = requestedUsernames(payload, existingConfig.users);
  if (requested.length === 0 || requested.some((username) => !USERNAME_PATTERN.test(username))) {
    return invalidBatchAction(action);
  }
  const skippedUsers = [];
  const affected = new Set();
  requested.forEach((username) => {
    const user = existingConfig.users.find((item) => text(item, "username") === username);
    if (!user) {
      skippedUsers.push({ username, reason: "not_found" });
      return;
    }
    if (text(user, "role") === "owner" || username === currentUsername) {
      skippedUsers.push({ username, reason: "protected_account" });
      return;
    }
    affected.add(username);
  });

  const nextUsers = action === "delete"
    ? existingConfig.users.filter((user) => !affected.has(text(user, "username")))
    : existingConfig.users.map((user) => affected.has(text(user, "username")) ? { ...user, disabled: action === "disable" } : user);

  if (affected.size > 0) {
    writeUsersConfig(usersFile, existingConfig.wasArray ? nextUsers : { ...existingConfig.raw, users: nextUsers });
  }
  const accountBatchAction = {
    status: affected.size > 0 ? "PASS" : "USER_ACTION_REQUIRED",
    action,
    requestedCount: requested.length,
    affectedCount: affected.size,
    skippedCount: skippedUsers.length,
    skippedUsers,
    message: batchActionMessage(action, affected.size, skippedUsers.length)
  };
  return {
    ok: affected.size > 0,
    statusCode: affected.size > 0 ? 200 : 400,
    accountBatchAction
  };
}

function requestedUsernames(payload, users) {
  const names = Array.isArray(payload?.usernames)
    ? payload.usernames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  if (names.length > 0) return [...new Set(names)].slice(0, 100);
  const inviteBatch = text(payload, "inviteBatch");
  if (!inviteBatch) return [];
  return users
    .filter((user) => text(user, "inviteBatch") === inviteBatch)
    .map((user) => text(user, "username"))
    .filter(Boolean)
    .slice(0, 100);
}

function invalidBatchAction(action) {
  return {
    ok: false,
    statusCode: 400,
    accountBatchAction: {
      status: "USER_ACTION_REQUIRED",
      action,
      requestedCount: 0,
      affectedCount: 0,
      skippedCount: 0,
      skippedUsers: [],
      message: "批量账号动作需要有效登录名和 disable、enable 或 delete。"
    }
  };
}

function batchActionMessage(action, affectedCount, skippedCount) {
  if (affectedCount === 0) return "没有找到可批量处理的登录账号。";
  const verb = action === "disable" ? "禁用" : action === "enable" ? "恢复" : "删除";
  return `已${verb} ${affectedCount} 个登录账号${skippedCount ? `，跳过 ${skippedCount} 个受保护或不存在账号` : ""}。`;
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  updateUserAccountBatchStatus
};

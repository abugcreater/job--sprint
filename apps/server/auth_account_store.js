const fs = require("fs");
const path = require("path");
const { sha256 } = require("./auth");

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,64}$/;
const ROLE_ALLOWLIST = new Set(["coach", "viewer"]);

function accountProvisioningCapability(env = process.env) {
  if (String(env.JOB_SPRINT_USERS_JSON || "").trim()) {
    return {
      enabled: false,
      reason: "users_json_takes_precedence",
      message: "当前认证使用 JOB_SPRINT_USERS_JSON，不能从页面写入账号。"
    };
  }
  const usersFile = String(env.JOB_SPRINT_USERS_FILE || "").trim();
  if (!usersFile) {
    return {
      enabled: false,
      reason: "users_file_missing",
      message: "未配置 JOB_SPRINT_USERS_FILE，邀请台账不会创建登录账号。"
    };
  }
  return {
    enabled: true,
    reason: "users_file_configured",
    message: "已启用 users file 账号开通。"
  };
}

function provisionUserAccountFromInvitation(payload, env = process.env) {
  const capability = accountProvisioningCapability(env);
  if (!capability.enabled) {
    return {
      ok: false,
      statusCode: 409,
      accountProvisioning: {
        status: "USER_ACTION_REQUIRED",
        ...capability
      }
    };
  }

  const username = text(payload, "username");
  const password = text(payload, "password");
  const validationError = validateProvisioningPayload(username, password, text(payload, "accountRole"));
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      accountProvisioning: validationError
    };
  }

  const usersFile = resolveUsersFile(env);
  if (!usersFile) {
    return {
      ok: false,
      statusCode: 409,
      accountProvisioning: {
        status: "USER_ACTION_REQUIRED",
        enabled: false,
        reason: "users_file_missing",
        message: "未配置 JOB_SPRINT_USERS_FILE，邀请台账不会创建登录账号。"
      }
    };
  }
  const existingConfig = readUsersConfig(usersFile);
  if (!existingConfig.ok) {
    return {
      ok: false,
      statusCode: 500,
      accountProvisioning: existingConfig.accountProvisioning
    };
  }

  const nextUser = userFromInvitation(payload, password);
  const currentIndex = existingConfig.users.findIndex((user) => text(user, "username") === username);
  const action = currentIndex === -1 ? "created" : "password_reset";
  const nextUsers = [...existingConfig.users];
  if (currentIndex === -1) {
    nextUsers.push(nextUser);
  } else {
    nextUsers[currentIndex] = { ...nextUsers[currentIndex], ...nextUser };
  }

  writeUsersConfig(usersFile, existingConfig.wasArray ? nextUsers : { ...existingConfig.raw, users: nextUsers });
  return {
    ok: true,
    accountProvisioning: {
      status: "PASS",
      enabled: true,
      action,
      username,
      role: nextUser.role,
      dataScope: nextUser.dataScope,
      inviteBatch: nextUser.inviteBatch,
      canLogin: true,
      message: action === "created" ? "登录账号已开通。" : "登录密码已重置。"
    }
  };
}

function updateUserAccountStatus(payload, currentUsername, env = process.env) {
  const capability = accountProvisioningCapability(env);
  if (!capability.enabled) {
    return {
      ok: false,
      statusCode: 409,
      accountAction: {
        status: "USER_ACTION_REQUIRED",
        ...capability
      }
    };
  }
  const username = text(payload, "username");
  const action = text(payload, "action");
  if (!USERNAME_PATTERN.test(username) || !["disable", "enable", "delete"].includes(action)) {
    return {
      ok: false,
      statusCode: 400,
      accountAction: {
        status: "USER_ACTION_REQUIRED",
        username,
        action,
        message: "账号动作需要有效登录名和 disable、enable 或 delete。"
      }
    };
  }
  const usersFile = resolveUsersFile(env);
  const existingConfig = readUsersConfig(usersFile);
  if (!existingConfig.ok) {
    return { ok: false, statusCode: 500, accountAction: existingConfig.accountProvisioning };
  }
  const currentIndex = existingConfig.users.findIndex((user) => text(user, "username") === username);
  if (currentIndex === -1) {
    return {
      ok: false,
      statusCode: 404,
      accountAction: {
        status: "USER_ACTION_REQUIRED",
        username,
        action,
        message: "没有找到可操作的登录账号。"
      }
    };
  }
  const target = existingConfig.users[currentIndex];
  if (text(target, "role") === "owner" || username === currentUsername) {
    return {
      ok: false,
      statusCode: 400,
      accountAction: {
        status: "USER_ACTION_REQUIRED",
        username,
        action,
        message: "owner 或当前登录账号不能在邀请后台禁用或删除。"
      }
    };
  }
  const nextUsers = [...existingConfig.users];
  if (action === "delete") {
    nextUsers.splice(currentIndex, 1);
  } else {
    nextUsers[currentIndex] = { ...target, disabled: action === "disable" };
  }
  writeUsersConfig(usersFile, existingConfig.wasArray ? nextUsers : { ...existingConfig.raw, users: nextUsers });
  return {
    ok: true,
    accountAction: {
      status: "PASS",
      enabled: true,
      username,
      action,
      disabled: action === "disable",
      removedCount: action === "delete" ? 1 : 0,
      message: accountActionMessage(action, username)
    }
  };
}

function userAccountsForManagement(env = process.env) {
  const capability = accountProvisioningCapability(env);
  if (!capability.enabled) return null;
  const usersFile = resolveUsersFile(env);
  const config = readUsersConfig(usersFile);
  if (!config.ok) return null;
  return config.users
    .filter((user) => user && typeof user === "object" && text(user, "username"))
    .map((user) => ({
      username: text(user, "username"),
      displayName: text(user, "displayName") || text(user, "username"),
      dataScope: text(user, "dataScope") || text(user, "username"),
      inviteBatch: text(user, "inviteBatch") || text(user, "invitationBatch") || "default",
      role: text(user, "role") || "coach",
      disabled: Boolean(user.disabled),
      canLogin: Boolean(!user.disabled)
    }));
}

function validateProvisioningPayload(username, password, accountRole = "") {
  if (!USERNAME_PATTERN.test(username)) {
    return {
      status: "FAIL",
      error: "invalid_username",
      message: "登录名只能包含字母、数字、点、下划线或连字符，长度 2-64。"
    };
  }
  if (password.length < 8) {
    return {
      status: "FAIL",
      error: "password_too_short",
      message: "登录密码至少 8 位。"
    };
  }
  if (accountRole === "owner") {
    return {
      status: "FAIL",
      error: "owner_account_role_forbidden",
      message: "邀请账号不能开通 owner 权限；owner 账号只能通过服务端配置。"
    };
  }
  if (accountRole && !ROLE_ALLOWLIST.has(accountRole)) {
    return {
      status: "FAIL",
      error: "invalid_account_role",
      message: "邀请账号角色只能是 coach 或 viewer。"
    };
  }
  return null;
}

function readUsersConfig(usersFile) {
  try {
    const raw = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, "utf8")) : { users: [] };
    const wasArray = Array.isArray(raw);
    const users = wasArray ? raw : raw.users;
    if (!Array.isArray(users)) {
      return {
        ok: false,
        accountProvisioning: {
          status: "FAIL",
          error: "users_file_shape_invalid",
          message: "JOB_SPRINT_USERS_FILE 必须是数组或包含 users 数组的 JSON。"
        }
      };
    }
    return {
      ok: true,
      wasArray,
      raw,
      users: users.filter((user) => user && typeof user === "object")
    };
  } catch (error) {
    return {
      ok: false,
      accountProvisioning: {
        status: "FAIL",
        error: "users_file_unreadable",
        message: error.message
      }
    };
  }
}

function writeUsersConfig(usersFile, config) {
  fs.mkdirSync(path.dirname(usersFile), { recursive: true });
  fs.writeFileSync(usersFile, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(usersFile, 0o600);
  } catch (_) {
    // Best effort on platforms without POSIX modes.
  }
}

function resolveUsersFile(env = process.env) {
  const usersFile = String(env.JOB_SPRINT_USERS_FILE || "").trim();
  return usersFile ? path.resolve(usersFile) : "";
}

function userFromInvitation(payload, password) {
  const username = text(payload, "username");
  const role = ROLE_ALLOWLIST.has(text(payload, "accountRole")) ? text(payload, "accountRole") : "coach";
  return {
    username,
    displayName: text(payload, "displayName") || username,
    role,
    dataScope: text(payload, "dataScope") || username,
    inviteBatch: text(payload, "inviteBatch") || "default",
    passwordHash: sha256(password),
    permissions: []
  };
}

function accountActionMessage(action, username) {
  if (action === "disable") return `已禁用 ${username} 的登录账号。`;
  if (action === "enable") return `已恢复 ${username} 的登录账号。`;
  return `已删除 ${username} 的登录账号。`;
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  accountProvisioningCapability,
  provisionUserAccountFromInvitation,
  readUsersConfig,
  resolveUsersFile,
  updateUserAccountStatus,
  userAccountsForManagement,
  validateProvisioningPayload,
  writeUsersConfig
};

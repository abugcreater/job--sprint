#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let effectiveEnv = process.env;
let envFileInfo = null;

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function hasFlag(name) {
  return args.includes(name);
}

function envValue(name) {
  const value = effectiveEnv[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function loadEffectiveEnv() {
  try {
    const loaded = loadDeliveryEnvFile(root, process.env, args);
    effectiveEnv = loaded.env;
    envFileInfo = loaded.info;
    return true;
  } catch (error) {
    writeReport({
      status: "FAIL",
      reason: "delivery_env_file_error",
      envFile: envFileErrorInfo(error),
      requiredInputs: [
        "Pass --delivery-env-file as a path outside this git repository.",
        "Keep secrets out of committed files."
      ]
    }, 1);
    return false;
  }
}

function writeReport(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_INVITATION_ACCOUNT_EVIDENCE");
  const withEnvFile = envFileInfo && envFileInfo.configured ? { envFile: envFileInfo, ...report } : report;
  const serialized = `${JSON.stringify(withEnvFile, null, 2)}\n`;
  if (reportPath) {
    const absoluteReportPath = path.resolve(root, reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, serialized);
  }
  process.stdout.write(serialized);
  process.exitCode = exitCode;
}

function createClient(baseUrl) {
  const cookieJar = new Map();
  function cookieHeader() {
    return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
  function storeCookies(headers) {
    const values = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
    for (const value of values) {
      const [pair] = String(value).split(";");
      const index = pair.indexOf("=");
      if (index > 0) cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  async function request(route, options = {}) {
    const headers = { ...(options.headers || {}) };
    const cookies = cookieHeader();
    if (cookies) headers.cookie = cookies;
    const response = await fetch(`${baseUrl}${route}`, {
      ...options,
      headers,
      redirect: "manual"
    });
    storeCookies(response.headers);
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, json, text, cookieConfigured: cookieJar.size > 0 };
  }
  return { request };
}

function generatedLoginText() {
  return `Codex-${crypto.randomBytes(8).toString("hex")}-2026!`;
}

function containsCredential(text, credential) {
  if (!credential) return false;
  const digest = crypto.createHash("sha256").update(credential).digest("hex");
  return String(text || "").includes(credential) || String(text || "").includes(digest);
}

async function login(client, username, password) {
  return client.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

async function main() {
  if (!loadEffectiveEnv()) return;
  const baseUrl = (
    argValue("--remote-url")
    || envValue("JOB_SPRINT_REMOTE_BASE_URL")
    || envValue("JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue("JOB_SPRINT_DELIVERY_BASE_URL")
  )?.replace(/\/+$/, "");
  const authUser = envValue("JOB_SPRINT_AUTH_USER");
  const authPassword = envValue("JOB_SPRINT_AUTH_PASSWORD") || envValue("JOB_SPRINT_AUTH_PASS");
  if (!baseUrl || !authUser || !authPassword) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      reason: !baseUrl ? "remote_base_url_missing" : "remote_auth_env_missing",
      requiredInputs: [
        "Set JOB_SPRINT_REMOTE_BASE_URL or pass --remote-url.",
        "Set JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS."
      ]
    }, 2);
    return;
  }

  if (!hasFlag("--allow-create-account")) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      baseUrl,
      reason: "remote_account_smoke_requires_explicit_flag",
      requiredInputs: [
        "Re-run with --allow-create-account after confirming the remote users file may be mutated.",
        "The smoke uses a reusable codex smoke account and does not print its generated password."
      ]
    }, 2);
    return;
  }

  const owner = createClient(baseUrl);
  const checks = [];
  const ownerLogin = await login(owner, authUser, authPassword);
  checks.push({
    id: "owner_login",
    statusCode: ownerLogin.status,
    ok: ownerLogin.status === 200,
    cookieConfigured: ownerLogin.cookieConfigured
  });
  if (ownerLogin.status !== 200 || !ownerLogin.cookieConfigured) {
    writeReport({ status: "FAIL", baseUrl, checkedAt: new Date().toISOString(), reason: "owner_login_failed", checks }, 1);
    return;
  }

  const before = await owner.request("/api/coach/invitations");
  const accountProvisioning = before.json && before.json.accountProvisioning;
  checks.push({
    id: "account_provisioning_enabled",
    statusCode: before.status,
    ok: before.status === 200 && accountProvisioning && accountProvisioning.enabled === true,
    reason: accountProvisioning && accountProvisioning.reason,
    message: accountProvisioning && accountProvisioning.message
  });
  if (before.status !== 200 || !accountProvisioning) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      baseUrl,
      checkedAt: new Date().toISOString(),
      reason: before.status === 200 ? "remote_account_provisioning_capability_missing" : "remote_invitation_api_unavailable",
      checks,
      requiredInputs: [
        "Deploy and restart the remote service with the current /api/coach/invitations implementation.",
        "Then configure remote JOB_SPRINT_USERS_FILE outside the repository before running this smoke."
      ]
    }, 2);
    return;
  }
  if (accountProvisioning.enabled !== true) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      baseUrl,
      checkedAt: new Date().toISOString(),
      reason: "remote_account_provisioning_disabled",
      checks,
      requiredInputs: [
        "Configure remote JOB_SPRINT_USERS_FILE outside the repository.",
        "Do not use JOB_SPRINT_USERS_JSON for this smoke because inline JSON is intentionally immutable from the page."
      ]
    }, 2);
    return;
  }

  const username = argValue("--username") || "codex-smoke-account";
  const loginText = generatedLoginText();
  const batchUsername = `${username}-batch`;
  const batchLoginText = generatedLoginText();
  const marker = `remote-account-smoke-${Date.now()}`;
  const invitation = {
    username,
    displayName: "Codex Remote Account Smoke",
    dataScope: username,
    inviteBatch: argValue("--invite-batch") || "remote-account-smoke",
    roleFamily: argValue("--role-family") || "backend",
    targetRole: argValue("--target-role") || "泛 IT 求职者",
    status: "invited",
    provisionAccount: true,
    accountRole: "coach",
    password: loginText,
    note: "Reusable remote users-file account smoke record."
  };
  const posted = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(invitation)
  });
  const createdInvitation = posted.json && Array.isArray(posted.json.invitations)
    ? posted.json.invitations.find((item) => item.username === username)
    : null;
  const responseLeaksCredential = containsCredential(posted.text, loginText);
  checks.push({
    id: "account_provision_post",
    statusCode: posted.status,
    ok: posted.status === 200
      && createdInvitation
      && createdInvitation.status === "active"
      && posted.json.accountProvisioning
      && posted.json.accountProvisioning.status === "PASS"
      && posted.json.accountProvisioning.canLogin === true
      && !responseLeaksCredential,
    action: posted.json && posted.json.accountProvisioning && posted.json.accountProvisioning.action,
    invitationStatus: createdInvitation && createdInvitation.status,
    responseLeaksCredential
  });

  const smokeUser = createClient(baseUrl);
  const smokeLogin = await login(smokeUser, username, loginText);
  checks.push({
    id: "smoke_user_login",
    statusCode: smokeLogin.status,
    ok: smokeLogin.status === 200,
    cookieConfigured: smokeLogin.cookieConfigured
  });

  const session = await smokeUser.request("/api/auth/session");
  checks.push({
    id: "smoke_user_session",
    statusCode: session.status,
    ok: session.status === 200
      && session.json
      && session.json.authenticated === true
      && session.json.user
      && session.json.user.username === username
      && session.json.user.dataScope === username,
    username: session.json && session.json.user && session.json.user.username,
    dataScope: session.json && session.json.user && session.json.user.dataScope
  });

  const runtimeWrite = await smokeUser.request("/api/runtime", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: {
        progress: {
          coach: {
            userProfiles: [{ id: "profile-codex-smoke", name: marker, active: true }]
          }
        },
        reviews: {},
        applications: [],
        interviewMistakes: []
      }
    })
  });
  checks.push({
    id: "smoke_user_runtime_write",
    statusCode: runtimeWrite.status,
    ok: runtimeWrite.status === 200 && runtimeWrite.text.includes(marker)
  });

  const ownerRuntime = await owner.request("/api/runtime");
  checks.push({
    id: "owner_runtime_isolated_from_smoke_user",
    statusCode: ownerRuntime.status,
    ok: ownerRuntime.status === 200 && !ownerRuntime.text.includes(marker)
  });

  const disableAccount = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-status", username, action: "disable" })
  });
  const disabledUser = disableAccount.json && Array.isArray(disableAccount.json.configuredUsers)
    ? disableAccount.json.configuredUsers.find((item) => item.username === username)
    : null;
  checks.push({
    id: "smoke_account_disabled",
    statusCode: disableAccount.status,
    ok: disableAccount.status === 200
      && disableAccount.json.accountAction
      && disableAccount.json.accountAction.status === "PASS"
      && disabledUser
      && disabledUser.disabled === true
      && disabledUser.canLogin === false,
    disabled: disabledUser && disabledUser.disabled
  });

  const disabledLogin = await login(createClient(baseUrl), username, loginText);
  checks.push({
    id: "disabled_smoke_user_login_rejected",
    statusCode: disabledLogin.status,
    ok: disabledLogin.status === 401
  });

  const enableAccount = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-status", username, action: "enable" })
  });
  checks.push({
    id: "smoke_account_enabled",
    statusCode: enableAccount.status,
    ok: enableAccount.status === 200
      && enableAccount.json.accountAction
      && enableAccount.json.accountAction.status === "PASS"
      && enableAccount.json.accountAction.disabled === false
  });

  const enabledLogin = await login(createClient(baseUrl), username, loginText);
  checks.push({
    id: "enabled_smoke_user_login",
    statusCode: enabledLogin.status,
    ok: enabledLogin.status === 200
  });

  const batchInvitation = {
    username: batchUsername,
    displayName: "Codex Remote Batch Account Smoke",
    dataScope: batchUsername,
    inviteBatch: invitation.inviteBatch,
    roleFamily: "frontend",
    targetRole: "泛 IT 求职者",
    status: "invited",
    provisionAccount: true,
    accountRole: "coach",
    password: batchLoginText,
    note: "Remote users-file batch account smoke record."
  };
  const batchPosted = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(batchInvitation)
  });
  checks.push({
    id: "batch_account_provision_post",
    statusCode: batchPosted.status,
    ok: batchPosted.status === 200
      && batchPosted.json.accountProvisioning
      && batchPosted.json.accountProvisioning.status === "PASS"
      && !containsCredential(batchPosted.text, batchLoginText)
  });

  const notificationDraft = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "notification-draft",
      usernames: [username, batchUsername],
      channel: "im",
      baseUrl
    })
  });
  const notifications = notificationDraft.json
    && notificationDraft.json.notificationAction
    && Array.isArray(notificationDraft.json.notificationAction.notifications)
    ? notificationDraft.json.notificationAction.notifications
    : [];
  checks.push({
    id: "invitation_notifications_generated",
    statusCode: notificationDraft.status,
    ok: notificationDraft.status === 200
      && notificationDraft.json.notificationAction
      && notificationDraft.json.notificationAction.status === "PASS"
      && notificationDraft.json.notificationAction.generatedCount === 2
      && notifications.every((item) => item.loginUrl === `${baseUrl}/job-sprint/react/index.html`)
      && !containsCredential(notificationDraft.text, loginText)
      && !containsCredential(notificationDraft.text, batchLoginText),
    generatedCount: notificationDraft.json && notificationDraft.json.notificationAction && notificationDraft.json.notificationAction.generatedCount
  });

  const batchDisable = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "account-batch-status",
      usernames: [username, batchUsername, authUser, "codex-missing-account"],
      action: "disable"
    })
  });
  checks.push({
    id: "batch_accounts_disabled",
    statusCode: batchDisable.status,
    ok: batchDisable.status === 200
      && batchDisable.json.accountBatchAction
      && batchDisable.json.accountBatchAction.status === "PASS"
      && batchDisable.json.accountBatchAction.affectedCount === 2
      && batchDisable.json.accountBatchAction.skippedCount >= 1,
    affectedCount: batchDisable.json && batchDisable.json.accountBatchAction && batchDisable.json.accountBatchAction.affectedCount,
    skippedCount: batchDisable.json && batchDisable.json.accountBatchAction && batchDisable.json.accountBatchAction.skippedCount
  });

  const batchDisabledPrimaryLogin = await login(createClient(baseUrl), username, loginText);
  const batchDisabledSecondaryLogin = await login(createClient(baseUrl), batchUsername, batchLoginText);
  checks.push({
    id: "batch_disabled_users_login_rejected",
    primaryStatusCode: batchDisabledPrimaryLogin.status,
    secondaryStatusCode: batchDisabledSecondaryLogin.status,
    ok: batchDisabledPrimaryLogin.status === 401 && batchDisabledSecondaryLogin.status === 401
  });

  const batchEnable = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "account-batch-status",
      usernames: [username, batchUsername],
      action: "enable"
    })
  });
  checks.push({
    id: "batch_accounts_enabled",
    statusCode: batchEnable.status,
    ok: batchEnable.status === 200
      && batchEnable.json.accountBatchAction
      && batchEnable.json.accountBatchAction.status === "PASS"
      && batchEnable.json.accountBatchAction.affectedCount === 2,
    affectedCount: batchEnable.json && batchEnable.json.accountBatchAction && batchEnable.json.accountBatchAction.affectedCount
  });

  const batchEnabledPrimaryLogin = await login(createClient(baseUrl), username, loginText);
  const batchEnabledSecondaryLogin = await login(createClient(baseUrl), batchUsername, batchLoginText);
  checks.push({
    id: "batch_enabled_users_login",
    primaryStatusCode: batchEnabledPrimaryLogin.status,
    secondaryStatusCode: batchEnabledSecondaryLogin.status,
    ok: batchEnabledPrimaryLogin.status === 200 && batchEnabledSecondaryLogin.status === 200
  });

  const deleteAccount = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-status", username, action: "delete" })
  });
  const deletedUserStillListed = deleteAccount.json && Array.isArray(deleteAccount.json.configuredUsers)
    ? deleteAccount.json.configuredUsers.some((item) => item.username === username)
    : true;
  checks.push({
    id: "smoke_account_deleted",
    statusCode: deleteAccount.status,
    ok: deleteAccount.status === 200
      && deleteAccount.json.accountAction
      && deleteAccount.json.accountAction.status === "PASS"
      && deleteAccount.json.accountAction.removedCount === 1
      && !deletedUserStillListed,
    deletedUserStillListed
  });

  const deletedLogin = await login(createClient(baseUrl), username, loginText);
  checks.push({
    id: "deleted_smoke_user_login_rejected",
    statusCode: deletedLogin.status,
    ok: deletedLogin.status === 401
  });

  const batchDelete = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "account-batch-status",
      usernames: [batchUsername],
      action: "delete"
    })
  });
  checks.push({
    id: "batch_account_deleted",
    statusCode: batchDelete.status,
    ok: batchDelete.status === 200
      && batchDelete.json.accountBatchAction
      && batchDelete.json.accountBatchAction.status === "PASS"
      && batchDelete.json.accountBatchAction.affectedCount === 1,
    affectedCount: batchDelete.json && batchDelete.json.accountBatchAction && batchDelete.json.accountBatchAction.affectedCount
  });

  const batchDeletedLogin = await login(createClient(baseUrl), batchUsername, batchLoginText);
  checks.push({
    id: "batch_deleted_user_login_rejected",
    statusCode: batchDeletedLogin.status,
    ok: batchDeletedLogin.status === 401
  });

  const ok = checks.every((check) => check.ok);
  writeReport({
    status: ok ? "PASS" : "FAIL",
    baseUrl,
    checkedAt: new Date().toISOString(),
    username,
    batchUsername,
    marker,
    note: "This smoke proves remote users-file account provisioning, copyable invitation notification drafts, plus single and batch disable/enable/delete lifecycle. It intentionally does not print generated passwords or password hashes.",
    checks
  }, ok ? 0 : 1);
}

main().catch((error) => {
  writeReport({
    status: "FAIL",
    reason: "remote_invitation_account_evidence_error",
    message: String(error && error.message ? error.message : error)
  }, 1);
});

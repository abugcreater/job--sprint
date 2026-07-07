#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let effectiveEnv = process.env;
let envFileInfo = null;
const cookieJar = new Map();

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
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_INVITATION_EVIDENCE");
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

async function request(baseUrl, route, options = {}) {
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
  return { status: response.status, json, text };
}

function scriptSources(indexHtml) {
  return [...String(indexHtml || "").matchAll(/<script[^>]+src="([^"]+\.js)"/g)]
    .map((match) => match[1]);
}

function invitationFound(response, username) {
  return Boolean(response && Array.isArray(response.invitations) && response.invitations.find((item) => item.username === username));
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

  const checks = [];
  const login = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: authUser, password: authPassword })
  });
  checks.push({ id: "login", statusCode: login.status, ok: login.status === 200, cookieConfigured: cookieJar.size > 0 });
  if (login.status !== 200 || cookieJar.size === 0) {
    writeReport({ status: "FAIL", baseUrl, checkedAt: new Date().toISOString(), reason: "login_failed", checks }, 1);
    return;
  }

  const reactIndex = await request(baseUrl, "/job-sprint/react/index.html");
  const sourcePaths = scriptSources(reactIndex.text);
  checks.push({ id: "react_index", statusCode: reactIndex.status, ok: reactIndex.status === 200, scriptCount: sourcePaths.length });
  let markerFound = false;
  let assetStatus = null;
  if (sourcePaths[0]) {
    const assetUrl = new URL(sourcePaths[0], `${baseUrl}/job-sprint/react/index.html`);
    const asset = await fetch(assetUrl, { headers: { cookie: cookieHeader() }, redirect: "manual" });
    assetStatus = asset.status;
    const assetText = await asset.text();
    markerFound = assetText.includes("/api/coach/invitations") || assetText.includes("邀请账号");
  }
  checks.push({ id: "react_asset_invitation_marker", statusCode: assetStatus, ok: markerFound });

  const before = await request(baseUrl, "/api/coach/invitations");
  checks.push({
    id: "invitations_get_before",
    statusCode: before.status,
    ok: before.status === 200 && Array.isArray(before.json && before.json.invitations),
    storage: before.json && before.json.storage,
    totalInvitations: before.json && before.json.summary && before.json.summary.totalInvitations,
    configuredUsersCount: before.json && before.json.configuredUsers && before.json.configuredUsers.length
  });

  const suffix = argValue("--username-suffix") || String(Date.now());
  const smokeUsername = argValue("--username") || `codex-smoke-${suffix}`;
  const invitation = {
    username: smokeUsername,
    displayName: `Codex Smoke ${suffix}`,
    dataScope: smokeUsername,
    inviteBatch: argValue("--invite-batch") || `remote-smoke-${suffix}`,
    templateVersion: argValue("--template-version") || "jd-focus-v1",
    roleFamily: "backend",
    targetRole: "Java 后端开发",
    status: "draft",
    note: "Remote smoke invitation created by the reusable evidence script."
  };
  const posted = await request(baseUrl, "/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(invitation)
  });
  checks.push({
    id: "invitations_post",
    statusCode: posted.status,
    ok: posted.status === 200 && invitationFound(posted.json, smokeUsername),
    storage: posted.json && posted.json.storage,
    createdUsername: smokeUsername,
    totalInvitations: posted.json && posted.json.summary && posted.json.summary.totalInvitations
  });

  const readback = await request(baseUrl, "/api/coach/invitations");
  const readbackInvitation = readback.json && Array.isArray(readback.json.invitations)
    ? readback.json.invitations.find((item) => item.username === smokeUsername)
    : null;
  checks.push({
    id: "invitations_get_readback",
    statusCode: readback.status,
    ok: readback.status === 200
      && Boolean(readbackInvitation)
      && readbackInvitation.templateVersion === invitation.templateVersion,
    storage: readback.json && readback.json.storage,
    readbackStatus: readbackInvitation && readbackInvitation.status,
    readbackTemplateVersion: readbackInvitation && readbackInvitation.templateVersion,
    summary: readback.json && readback.json.summary
  });

  const bulkUsernames = [`${smokeUsername}-bulk-a`, `${smokeUsername}-bulk-b`];
  const bulkImport = await request(baseUrl, "/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "bulk-import",
      records: [
        {
          username: bulkUsernames[0],
          displayName: `Codex Bulk A ${suffix}`,
          dataScope: bulkUsernames[0],
          inviteBatch: invitation.inviteBatch,
          templateVersion: "jd-focus-v1",
          roleFamily: "data",
          targetRole: "数据分析师",
          status: "invited",
          note: "Remote smoke bulk import record A."
        },
        {
          username: bulkUsernames[1],
          displayName: `Codex Bulk B ${suffix}`,
          dataScope: bulkUsernames[1],
          inviteBatch: invitation.inviteBatch,
          templateVersion: "role-family-v1",
          roleFamily: "frontend",
          targetRole: "前端工程师",
          status: "invited",
          note: "Remote smoke bulk import record B."
        }
      ]
    })
  });
  const importedUsers = bulkImport.json && Array.isArray(bulkImport.json.invitations)
    ? bulkUsernames.filter((username) => bulkImport.json.invitations.find((item) => item.username === username))
    : [];
  checks.push({
    id: "invitations_bulk_import",
    statusCode: bulkImport.status,
    ok: bulkImport.status === 200
      && bulkImport.json
      && bulkImport.json.importAction
      && bulkImport.json.importAction.status === "PASS"
      && bulkImport.json.importAction.importedCount === 2
      && importedUsers.length === 2,
    importedCount: bulkImport.json && bulkImport.json.importAction && bulkImport.json.importAction.importedCount,
    importedUsers
  });

  let cleanup = null;
  if (!hasFlag("--keep-smoke-draft")) {
    const batchUpdated = await request(baseUrl, "/api/coach/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation: "batch-status",
        inviteBatch: invitation.inviteBatch,
        status: "paused"
      })
    });
    const archivedInvitation = batchUpdated.json && Array.isArray(batchUpdated.json.invitations)
      ? batchUpdated.json.invitations.find((item) => item.username === smokeUsername)
      : null;
    const archivedBulkCount = batchUpdated.json && Array.isArray(batchUpdated.json.invitations)
      ? bulkUsernames.filter((username) => {
        const item = batchUpdated.json.invitations.find((invitation) => invitation.username === username);
        return item && item.status === "paused";
      }).length
      : 0;
    const deleted = await request(baseUrl, `/api/coach/invitations?username=${encodeURIComponent(smokeUsername)}`, {
      method: "DELETE"
    });
    const bulkDeletes = [];
    for (const username of bulkUsernames) {
      bulkDeletes.push(await request(baseUrl, `/api/coach/invitations?username=${encodeURIComponent(username)}`, {
        method: "DELETE"
      }));
    }
    const afterDelete = await request(baseUrl, "/api/coach/invitations");
    const deletedInvitation = afterDelete.json && Array.isArray(afterDelete.json.invitations)
      ? afterDelete.json.invitations.find((item) => item.username === smokeUsername)
      : null;
    const remainingBulkCount = afterDelete.json && Array.isArray(afterDelete.json.invitations)
      ? bulkUsernames.filter((username) => afterDelete.json.invitations.find((item) => item.username === username)).length
      : bulkUsernames.length;
    cleanup = {
      checkedAt: new Date().toISOString(),
      status: batchUpdated.status === 200
        && archivedInvitation
        && archivedInvitation.status === "paused"
        && archivedBulkCount === bulkUsernames.length
        && deleted.status === 200
        && !deletedInvitation
        && bulkDeletes.every((item) => item.status === 200)
        && remainingBulkCount === 0
        ? "PASS"
        : "FAIL",
      note: "The remote smoke invitation is first batch-paused, then deleted so smoke data does not remain in the trial ledger.",
      checks: [
        {
          id: "smoke_batch_status_paused",
          statusCode: batchUpdated.status,
          ok: batchUpdated.status === 200
            && archivedInvitation
            && archivedInvitation.status === "paused"
            && archivedBulkCount === bulkUsernames.length,
          readbackStatus: archivedInvitation && archivedInvitation.status,
          archivedBulkCount,
          affectedCount: batchUpdated.json && batchUpdated.json.batchAction && batchUpdated.json.batchAction.affectedCount
        },
        {
          id: "smoke_record_deleted",
          statusCode: deleted.status,
          ok: deleted.status === 200
            && !deletedInvitation
            && bulkDeletes.every((item) => item.status === 200)
            && remainingBulkCount === 0,
          removedCount: deleted.json && deleted.json.deletion && deleted.json.deletion.removedCount,
          bulkDeleteStatusCodes: bulkDeletes.map((item) => item.status),
          remainingBulkCount,
          totalInvitationsAfterDelete: afterDelete.json && afterDelete.json.summary && afterDelete.json.summary.totalInvitations
        }
      ]
    };
  }

  const ok = checks.every((check) => check.ok) && (!cleanup || cleanup.status === "PASS");
  writeReport({
    status: ok ? "PASS" : "FAIL",
    baseUrl,
    checkedAt: new Date().toISOString(),
    createdUsername: smokeUsername,
    checks,
    cleanup
  }, ok ? 0 : 1);
}

main().catch((error) => {
  writeReport({
    status: "FAIL",
    reason: "remote_invitation_evidence_error",
    message: String(error && error.message ? error.message : error)
  }, 1);
});

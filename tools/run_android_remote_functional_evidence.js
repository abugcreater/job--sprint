#!/usr/bin/env node
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const path = require("path");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function runOriginal(env) {
  const result = spawnSync(process.execPath, [path.join("tests", "android_webview_functional_persistence_test.js"), ...args.filter((arg) => arg !== "--allow-create-account")], {
    cwd: root,
    env,
    stdio: "inherit"
  });
  return result.status == null ? 1 : result.status;
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
    const response = await fetch(`${baseUrl}${route}`, { ...options, headers, redirect: "manual" });
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

async function login(client, username, password) {
  return client.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

function resolveBaseUrl(env) {
  const configured = argValue("--remote-url")
    || envValue(env, "JOB_SPRINT_REMOTE_BASE_URL")
    || envValue(env, "JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue(env, "JOB_SPRINT_DELIVERY_BASE_URL")
    || envValue(env, "JOB_SPRINT_ANDROID_WEBVIEW_URL")
    || envValue(env, "JOB_SPRINT_ANDROID_REMOTE_BASE_URL");
  if (!configured) return null;
  const parsed = new URL(configured);
  return parsed.origin.replace(/\/+$/, "");
}

function generatedPassword() {
  return `Codex-Android-${crypto.randomBytes(8).toString("hex")}-2026!`;
}

async function provisionTemporaryAccount(env) {
  const baseUrl = resolveBaseUrl(env);
  const ownerUser = envValue(env, "JOB_SPRINT_AUTH_USER");
  const ownerPassword = envValue(env, "JOB_SPRINT_AUTH_PASSWORD") || envValue(env, "JOB_SPRINT_AUTH_PASS");
  if (!baseUrl || !ownerUser || !ownerPassword) {
    throw Object.assign(new Error("android_remote_temp_account_inputs_missing"), { status: "USER_ACTION_REQUIRED" });
  }
  const owner = createClient(baseUrl);
  const ownerLogin = await login(owner, ownerUser, ownerPassword);
  if (ownerLogin.status !== 200 || !ownerLogin.cookieConfigured) {
    throw Object.assign(new Error("android_remote_owner_login_failed"), { status: "FAIL", statusCode: ownerLogin.status });
  }
  const capability = await owner.request("/api/coach/invitations");
  const accountProvisioning = capability.json && capability.json.accountProvisioning;
  if (capability.status !== 200 || !accountProvisioning || accountProvisioning.enabled !== true) {
    throw Object.assign(new Error("android_remote_account_provisioning_not_enabled"), { status: "USER_ACTION_REQUIRED", statusCode: capability.status, accountProvisioning });
  }
  const username = `codex-android-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const password = generatedPassword();
  const provision = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username,
      displayName: "Codex Android Remote Smoke",
      dataScope: username,
      inviteBatch: "android-remote-functional-smoke",
      roleFamily: "backend",
      targetRole: "泛 IT 求职者",
      status: "invited",
      provisionAccount: true,
      accountRole: "coach",
      password,
      note: "Temporary Android remote functional smoke account."
    })
  });
  if (provision.status !== 200 || !provision.json?.accountProvisioning || provision.json.accountProvisioning.status !== "PASS") {
    throw Object.assign(new Error("android_remote_temp_account_provision_failed"), { status: "FAIL", statusCode: provision.status });
  }
  return { owner, username, password };
}

async function cleanupTemporaryAccount(owner, username) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const account = await owner.request("/api/coach/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "account-status", username, action: "delete" })
      });
      const invitation = await owner.request(`/api/coach/invitations?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      last = { accountStatus: account.status, invitationStatus: invitation.status, attempt };
      if (account.status === 200 && account.json?.accountAction?.status === "PASS") return { ok: true, ...last };
    } catch (error) {
      last = { error: error.message || String(error), attempt };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  return { ok: false, ...last };
}

function writeSetupError(error) {
  const status = error.status || "FAIL";
  console.error(JSON.stringify({
    status,
    reason: error.message || String(error),
    statusCode: error.statusCode,
    accountProvisioning: error.accountProvisioning,
    requiredInputs: status === "USER_ACTION_REQUIRED" ? [
      "Pass --allow-create-account only after confirming the remote users file may be mutated for a temporary Android smoke account.",
      "Set remote owner credentials in the delivery env file and keep them outside the repository."
    ] : undefined
  }, null, 2));
  return status === "USER_ACTION_REQUIRED" ? 2 : 1;
}

async function main() {
  if (!argSet.has("--remote") || !argSet.has("--allow-create-account")) {
    process.exitCode = runOriginal(process.env);
    return;
  }
  let loaded;
  try {
    loaded = loadDeliveryEnvFile(root, process.env, args);
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", reason: "delivery_env_file_error", envFile: envFileErrorInfo(error) }, null, 2));
    process.exitCode = 1;
    return;
  }
  let account = null;
  let exitCode = 1;
  try {
    account = await provisionTemporaryAccount(loaded.env);
    exitCode = runOriginal({
      ...loaded.env,
      JOB_SPRINT_AUTH_USER: account.username,
      JOB_SPRINT_AUTH_PASSWORD: account.password,
      JOB_SPRINT_AUTH_PASS: account.password,
      JOB_SPRINT_ANDROID_REMOTE_TEMP_ACCOUNT: account.username
    });
  } catch (error) {
    exitCode = writeSetupError(error);
  } finally {
    if (account) {
      const cleanup = await cleanupTemporaryAccount(account.owner, account.username).catch((error) => ({ ok: false, error: error.message || String(error) }));
      if (!cleanup.ok) {
        console.error(JSON.stringify({ status: "FAIL", reason: "android_remote_temp_account_cleanup_failed", username: account.username, cleanup }, null, 2));
        if (exitCode === 0) exitCode = 1;
      }
    }
  }
  process.exitCode = exitCode;
}

main();

#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const reactRequire = createRequire(path.join(root, "apps", "react-web", "package.json"));
const { chromium } = reactRequire("playwright");
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
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_LOGIN_SWITCH_EVIDENCE");
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
  return `Codex-Ui-${crypto.randomBytes(8).toString("hex")}-2026!`;
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

async function browserLogin(page, baseUrl, username, password) {
  const nextPath = "/job-sprint/react/index.html#/coach";
  await page.goto(`${baseUrl}/job-sprint/login.html?next=${encodeURIComponent(nextPath)}`, { waitUntil: "domcontentloaded" });
  await page.locator("#loginUser").fill(username);
  await page.locator("#loginPassword").fill(password);
  await Promise.all([
    page.waitForURL(/\/job-sprint\/react\/index\.html#\/coach/, { timeout: 15000 }),
    page.locator("#loginButton").click()
  ]);
  await page.getByText("当前账号").first().waitFor({ timeout: 15000 });
}

async function browserSession(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    return {
      status: response.status,
      payload: await response.json().catch(() => ({}))
    };
  });
}

async function waitForVisibleText(page, text) {
  await page.waitForFunction((expected) => {
    return Array.from(document.querySelectorAll("body *")).some((element) => {
      const value = (element.textContent || "").trim();
      const visible = Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      return visible && value.includes(expected);
    });
  }, text, { timeout: 15000 });
}

async function cleanupAccount(owner, username) {
  return owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "account-status", username, action: "delete" })
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
      reason: "remote_login_switch_requires_explicit_account_flag",
      requiredInputs: [
        "Re-run with --allow-create-account after confirming the remote users file may be mutated.",
        "The smoke creates and deletes a temporary user, and does not print its generated password."
      ]
    }, 2);
    return;
  }

  const owner = createClient(baseUrl);
  const checks = [];
  const ownerLogin = await login(owner, authUser, authPassword);
  checks.push({
    id: "owner_api_login",
    statusCode: ownerLogin.status,
    ok: ownerLogin.status === 200,
    cookieConfigured: ownerLogin.cookieConfigured
  });
  if (ownerLogin.status !== 200 || !ownerLogin.cookieConfigured) {
    writeReport({ status: "FAIL", baseUrl, checkedAt: new Date().toISOString(), reason: "owner_api_login_failed", checks }, 1);
    return;
  }

  const before = await owner.request("/api/coach/invitations");
  const accountProvisioning = before.json && before.json.accountProvisioning;
  checks.push({
    id: "account_provisioning_enabled",
    statusCode: before.status,
    ok: before.status === 200 && accountProvisioning && accountProvisioning.enabled === true,
    reason: accountProvisioning && accountProvisioning.reason
  });
  if (before.status !== 200 || !accountProvisioning || accountProvisioning.enabled !== true) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      baseUrl,
      checkedAt: new Date().toISOString(),
      reason: "remote_account_provisioning_not_enabled",
      checks,
      requiredInputs: [
        "Configure remote JOB_SPRINT_USERS_FILE outside the repository.",
        "Do not use JOB_SPRINT_USERS_JSON for this smoke because inline JSON is intentionally immutable from the page."
      ]
    }, 2);
    return;
  }

  const username = argValue("--username") || "codex-ui-switch-smoke";
  const displayName = "Codex UI Switch Smoke";
  const password = generatedLoginText();
  const invitation = {
    username,
    displayName,
    dataScope: username,
    inviteBatch: "remote-ui-switch-smoke",
    roleFamily: "backend",
    targetRole: "泛 IT 求职者",
    status: "invited",
    provisionAccount: true,
    accountRole: "coach",
    password,
    note: "Temporary UI login switch smoke record."
  };
  const provision = await owner.request("/api/coach/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(invitation)
  });
  checks.push({
    id: "smoke_account_provisioned",
    statusCode: provision.status,
    ok: provision.status === 200
      && provision.json
      && provision.json.accountProvisioning
      && provision.json.accountProvisioning.status === "PASS"
      && !containsCredential(provision.text, password),
    responseLeaksCredential: containsCredential(provision.text, password)
  });

  const screenshotDir = path.resolve(root, argValue("--screenshots-dir") || "docs/evidence/server-remote/login-switch-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshots = {};
  let browser = null;
  let context = null;
  let browserError = null;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1365, height: 900 }, baseURL: baseUrl });
    const page = await context.newPage();

    await browserLogin(page, baseUrl, authUser, authPassword);
    await page.getByText("当前账号").first().waitFor({ timeout: 15000 });
    const ownerSession = await browserSession(page);
    const ownerVisibleName = ownerSession.payload
      && ownerSession.payload.user
      && (ownerSession.payload.user.displayName || ownerSession.payload.user.username);
    if (ownerVisibleName) {
      await waitForVisibleText(page, ownerVisibleName);
    }
    screenshots.owner = path.relative(root, path.join(screenshotDir, "owner-session.png"));
    await page.screenshot({ path: path.resolve(root, screenshots.owner), fullPage: true });
    checks.push({
      id: "owner_ui_login",
      statusCode: ownerSession.status,
      ok: ownerSession.status === 200
        && ownerSession.payload
        && ownerSession.payload.authenticated === true
        && ownerSession.payload.user
        && ownerSession.payload.user.username === authUser,
      username: ownerSession.payload && ownerSession.payload.user && ownerSession.payload.user.username
    });

    await Promise.all([
      page.waitForURL(/\/job-sprint\/login\.html/, { timeout: 15000 }),
      page.getByRole("button", { name: "退出" }).click()
    ]);
    await page.locator("#loginUser").waitFor({ timeout: 15000 });
    checks.push({
      id: "owner_ui_logout_to_login_page",
      ok: /\/job-sprint\/login\.html/.test(page.url())
    });

    await page.locator("#loginUser").fill(username);
    await page.locator("#loginPassword").fill(password);
    await Promise.all([
      page.waitForURL(/\/job-sprint\/react\/index\.html#\/coach/, { timeout: 15000 }),
      page.locator("#loginButton").click()
    ]);
    await waitForVisibleText(page, displayName);
    await waitForVisibleText(page, username);
    const smokeSession = await browserSession(page);
    screenshots.smoke = path.relative(root, path.join(screenshotDir, "smoke-session.png"));
    await page.screenshot({ path: path.resolve(root, screenshots.smoke), fullPage: true });
    checks.push({
      id: "smoke_ui_login_after_switch",
      statusCode: smokeSession.status,
      ok: smokeSession.status === 200
        && smokeSession.payload
        && smokeSession.payload.authenticated === true
        && smokeSession.payload.user
        && smokeSession.payload.user.username === username
        && smokeSession.payload.user.dataScope === username,
      username: smokeSession.payload && smokeSession.payload.user && smokeSession.payload.user.username,
      dataScope: smokeSession.payload && smokeSession.payload.user && smokeSession.payload.user.dataScope
    });
  } catch (error) {
    browserError = error;
    checks.push({
      id: "browser_ui_login_switch_flow",
      ok: false,
      message: String(error && error.message ? error.message : error)
    });
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  const cleanup = await cleanupAccount(owner, username);
  checks.push({
    id: "smoke_account_cleanup",
    statusCode: cleanup.status,
    ok: cleanup.status === 200
      && cleanup.json
      && cleanup.json.accountAction
      && cleanup.json.accountAction.status === "PASS"
  });
  const deletedLogin = await login(createClient(baseUrl), username, password);
  checks.push({
    id: "deleted_smoke_user_login_rejected",
    statusCode: deletedLogin.status,
    ok: deletedLogin.status === 401
  });

  const ok = checks.every((check) => check.ok);
  writeReport({
    status: ok ? "PASS" : "FAIL",
    baseUrl,
    checkedAt: new Date().toISOString(),
    username,
    browserError: browserError ? String(browserError && browserError.message ? browserError.message : browserError) : null,
    note: "This smoke proves UI-level owner login, logout, user switch, smoke-user session/dataScope readback, and cleanup. It intentionally does not print generated passwords or password hashes.",
    screenshots,
    checks
  }, ok ? 0 : 1);
}

main().catch((error) => {
  writeReport({
    status: "FAIL",
    reason: "remote_login_switch_evidence_error",
    message: String(error && error.message ? error.message : error)
  }, 1);
});

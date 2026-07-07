const assert = require("assert");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { addCoachSchedule, exerciseAiArtifactDrafts } = require("./android_webview_ai_artifact_flow");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("../tools/delivery_env_file");

const ROOT = path.resolve(__dirname, "..");
const reactRequire = createRequire(path.join(ROOT, "apps", "react-web", "package.json"));
const { chromium } = reactRequire("playwright");

const args = process.argv.slice(2);
const argSet = new Set(args);
let effectiveEnv = process.env;

try {
  effectiveEnv = loadDeliveryEnvFile(ROOT, process.env, args).env;
} catch (error) {
  console.error(JSON.stringify({
    status: "FAIL",
    reason: "delivery_env_file_error",
    envFile: envFileErrorInfo(error),
    requiredInputs: [
      "Pass --delivery-env-file as a path outside this git repository.",
      "Keep secrets out of committed files."
    ]
  }, null, 2));
  process.exit(1);
}

const PACKAGE_NAME = "com.kai.jobsprint";
const ACTIVITY = "com.kai.jobsprint/.MainActivity";
const CDP_PORT = Number(effectiveEnv.JOB_SPRINT_ANDROID_CDP_PORT || 9224);
const DEFAULT_WEBVIEW_URL = "file:///android_asset/react/index.html";
const REMOTE_MODE = argSet.has("--remote") || effectiveEnv.JOB_SPRINT_ANDROID_FUNCTIONAL_MODE === "remote";

function envValue(name) {
  const value = effectiveEnv[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function normalizeWebViewUrl(value) {
  if (!value) {
    return DEFAULT_WEBVIEW_URL;
  }
  const trimmed = value.trim();
  const url = new URL(trimmed);
  url.hash = "";
  url.search = "";
  if (/^https?:$/i.test(url.protocol) && (!url.pathname || url.pathname === "/")) {
    url.pathname = REMOTE_MODE ? "/job-sprint/react/index.html" : "/react/index.html";
  }
  return url.toString();
}

function resolveWebViewUrl() {
  const configured = envValue("JOB_SPRINT_ANDROID_WEBVIEW_URL")
    || envValue("JOB_SPRINT_ANDROID_REMOTE_BASE_URL")
    || envValue("JOB_SPRINT_REMOTE_BASE_URL")
    || envValue("JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue("JOB_SPRINT_DELIVERY_BASE_URL");
  if (REMOTE_MODE && !configured) {
    console.error("USER_ACTION_REQUIRED: Android remote mode requires JOB_SPRINT_ANDROID_WEBVIEW_URL, JOB_SPRINT_ANDROID_REMOTE_BASE_URL, or JOB_SPRINT_REMOTE_BASE_URL.");
    process.exit(2);
  }
  const webViewUrl = normalizeWebViewUrl(configured || DEFAULT_WEBVIEW_URL);
  if (REMOTE_MODE) {
    const parsed = new URL(webViewUrl);
    if (!["https:", "http:"].includes(parsed.protocol) || !parsed.pathname.includes("/job-sprint/")) {
      console.error(JSON.stringify({
        status: "USER_ACTION_REQUIRED",
        reason: "android_remote_url_required",
        webViewUrl,
        requiredInputs: [
          "Set JOB_SPRINT_ANDROID_WEBVIEW_URL to an HTTP or HTTPS URL under /job-sprint/.",
          "Use HTTPS for final production delivery; HTTP/IP is accepted only for basic remote functional validation."
        ]
      }, null, 2));
      process.exit(2);
    }
  }
  return webViewUrl;
}

function routeUrl(hash, searchParams = {}) {
  const url = new URL(WEBVIEW_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }
  url.hash = hash;
  return url.toString();
}

const WEBVIEW_URL = resolveWebViewUrl();
const IS_REMOTE_WEBVIEW = /^https?:\/\//i.test(WEBVIEW_URL);
const EXPECTED_REMOTE_ORIGIN = IS_REMOTE_WEBVIEW ? new URL(WEBVIEW_URL).origin : null;
const AUTH_USER = envValue("JOB_SPRINT_AUTH_USER");
const AUTH_PASSWORD = envValue("JOB_SPRINT_AUTH_PASSWORD") || envValue("JOB_SPRINT_AUTH_PASS");
const AUTH_EVIDENCE = {
  mode: IS_REMOTE_WEBVIEW ? "remote" : "local",
  authUserConfigured: Boolean(AUTH_USER),
  authPasswordConfigured: Boolean(AUTH_PASSWORD),
  loginPageSeen: false,
  loginAttempted: false,
  localTunnelBypass: null,
  sessionStates: []
};
const evidenceRoot = path.resolve(
  effectiveEnv.JOB_SPRINT_ANDROID_FUNCTIONAL_EVIDENCE_DIR
    || path.join(ROOT, "docs/evidence", IS_REMOTE_WEBVIEW ? "android-remote-functional" : "android-functional")
);
const screenshotsDir = path.join(evidenceRoot, "screenshots");
const snapshotsDir = path.join(evidenceRoot, "storage-snapshots");
const EXPECTED_STORAGE_KEYS = [
  "jobSprint.react.interviewWeakQuestions.v1",
  "jobSprint.react.learningKnowledgeMarks.v1",
  "jobSprint.react.v1"
];
const ANDROID_FLOW_LABEL = `Android功能测试${Date.now().toString(36)}`;
const ANDROID_DELAY_REASON = `${ANDROID_FLOW_LABEL} Android 延期原因`;
const ANDROID_REMEDY = `${ANDROID_FLOW_LABEL}补救动作`;
const ANDROID_AI_DRAFT_BUTTON_LABEL = "生成 AI 草稿";

async function readSessionState(page, label) {
  if (!IS_REMOTE_WEBVIEW) {
    return {
      label,
      url: page.url(),
      sessionApiAuthenticated: null,
      androidSessionCookie: null,
      skipped: "local_webview"
    };
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(async (stateLabel) => {
    const state = {
      label: stateLabel,
      url: window.location.href,
      sessionApiAuthenticated: false,
      sessionApiStatus: null,
      sessionApiAuthConfigured: null,
      sessionApiUsername: null,
      sessionApiDataScope: null,
      androidSessionCookie: null,
      error: null
    };
    const appBase = window.location.pathname.startsWith("/job-sprint/") ? "/job-sprint" : "";
    try {
      const response = await fetch(`${appBase}/api/auth/session`, { cache: "no-store" });
      state.sessionApiStatus = response.status;
      const payload = await response.json().catch(() => ({}));
      state.sessionApiAuthenticated = Boolean(payload.authenticated);
      state.sessionApiAuthConfigured = payload.authConfigured == null ? null : Boolean(payload.authConfigured);
      state.sessionApiUsername = payload.user && payload.user.username ? payload.user.username : null;
      state.sessionApiDataScope = payload.user && payload.user.dataScope ? payload.user.dataScope : null;
    } catch (error) {
      state.error = error && error.message ? error.message : String(error);
    }
    try {
      if (
        window.AndroidSessionCookies
        && typeof window.AndroidSessionCookies.hasSessionCookie === "function"
      ) {
        state.androidSessionCookie = Boolean(window.AndroidSessionCookies.hasSessionCookie());
      }
    } catch (error) {
      state.androidSessionCookie = null;
      state.androidSessionCookieError = error && error.message ? error.message : String(error);
    }
    return state;
      }, label);
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      if (!message.includes("Execution context was destroyed") || attempt === 2) {
        return {
          label,
          url: page.url(),
          sessionApiAuthenticated: false,
          sessionApiStatus: null,
          sessionApiAuthConfigured: null,
          sessionApiUsername: null,
          sessionApiDataScope: null,
          androidSessionCookie: null,
          error: message
        };
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  throw new Error("unreachable_session_state_retry");
}

for (const dir of [screenshotsDir, snapshotsDir]) {
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(snapshotsDir, { recursive: true });

function adb(args, options = {}) {
  return execFileSync("adb", args, { encoding: options.encoding || "utf8", stdio: options.stdio || ["ignore", "pipe", "pipe"] }).trim();
}

function adbQuiet(args) {
  try {
    return adb(args);
  } catch {
    return "";
  }
}

function adbBuffer(args) {
  return execFileSync("adb", args, { stdio: ["ignore", "pipe", "pipe"] });
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function summarizeStorage(raw, label, url) {
  const reactRaw = raw["jobSprint.react.v1"] || "";
  const reactState = parseJson(reactRaw, {});
  const state = reactState.state || {};
  const evidenceByTaskId = state.evidenceByTaskId || {};
  const delayRecords = Array.isArray(state.delayRecords) ? state.delayRecords : [];
  const evidenceRecords = Object.values(evidenceByTaskId).flatMap((items) => Array.isArray(items) ? items : []);
  const completed = state.completed || {};
  const coach = state.coach || {};
  const userProfiles = Array.isArray(state.userProfiles) ? state.userProfiles : Array.isArray(coach.userProfiles) ? coach.userProfiles : [];
  const knowledgeBoundaries = Array.isArray(state.knowledgeBoundaries) ? state.knowledgeBoundaries : Array.isArray(coach.knowledgeBoundaries) ? coach.knowledgeBoundaries : [];
  const coachScheduleEvents = Array.isArray(state.coachScheduleEvents) ? state.coachScheduleEvents : Array.isArray(coach.coachScheduleEvents) ? coach.coachScheduleEvents : [];
  const aiArtifacts = Array.isArray(state.aiArtifacts) ? state.aiArtifacts : Array.isArray(coach.aiArtifacts) ? coach.aiArtifacts : [];
  const llmRuns = Array.isArray(state.llmRuns) ? state.llmRuns : Array.isArray(coach.llmRuns) ? coach.llmRuns : [];
  const learningMarks = parseJson(raw["jobSprint.react.learningKnowledgeMarks.v1"], []);
  const weakMarks = parseJson(raw["jobSprint.react.interviewWeakQuestions.v1"], []);

  return {
    label,
    url,
    keys: Object.keys(raw).sort(),
    rawBytes: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Buffer.byteLength(value, "utf8")])),
    rawHashes: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, sha256(value)])),
    react: {
      version: reactState.version,
      completedCount: Object.values(completed).filter(Boolean).length,
      completedTaskIds: Object.entries(completed).filter(([, done]) => Boolean(done)).map(([taskId]) => taskId).sort(),
      evidenceCount: evidenceRecords.length,
      evidenceTypes: evidenceRecords.map((item) => item.type).sort(),
      evidenceTitles: evidenceRecords.map((item) => item.title).sort(),
      delayCount: delayRecords.length,
      delayReasons: delayRecords.map((item) => item.reason).sort(),
      profileCount: userProfiles.length,
      boundaryCount: knowledgeBoundaries.length,
      scheduleEventCount: coachScheduleEvents.length,
      aiArtifactCount: aiArtifacts.length,
      llmRunCount: llmRuns.length,
      aiArtifactStatuses: aiArtifacts.map((item) => item.status).sort(),
      llmRunStatuses: llmRuns.map((item) => item.status).sort(),
      llmRunProviders: llmRuns.map((item) => item.provider).sort(),
      profileNames: userProfiles.map((item) => item.name).sort(),
      boundaryTopics: knowledgeBoundaries.map((item) => item.topic).sort(),
      coachScheduleTitles: coachScheduleEvents.map((item) => item.title).sort(),
      lastSavedAt: state.lastSavedAt,
      syncState: state.syncState
    },
    learningMarkedCount: Array.isArray(learningMarks) ? learningMarks.length : 0,
    interviewWeakCount: Array.isArray(weakMarks) ? weakMarks.length : 0
  };
}

function assertExpectedStorage(snapshot, label) {
  const missing = EXPECTED_STORAGE_KEYS.filter((key) => !snapshot.keys.includes(key));
  assert.deepStrictEqual(missing, [], `${label} should include expected localStorage keys`);
  for (const key of EXPECTED_STORAGE_KEYS) {
    assert.ok(snapshot.rawBytes[key] > 0, `${label} should have bytes for ${key}`);
    assert.match(snapshot.rawHashes[key], /^[a-f0-9]{64}$/, `${label} should have hash for ${key}`);
  }
}

function pickExpectedKeyMetrics(snapshot) {
  return Object.fromEntries(EXPECTED_STORAGE_KEYS.map((key) => [
    key,
    {
      bytes: snapshot.rawBytes[key],
      hash: snapshot.rawHashes[key]
    }
  ]));
}

function assertSameExpectedStorage(left, right, message) {
  assert.deepStrictEqual(
    pickExpectedKeyMetrics(right),
    pickExpectedKeyMetrics(left),
    message
  );
}

function assertRemoteRestartPreservesFlow(flowSnapshot, restartSnapshot) {
  assert.ok(restartSnapshot.react.evidenceCount >= flowSnapshot.react.evidenceCount, "Remote restart should not lose evidence records");
  assert.ok(restartSnapshot.react.delayReasons.includes(ANDROID_DELAY_REASON), "Remote restart should preserve the delay record from this run");
  assert.ok(restartSnapshot.react.profileNames.includes(`${ANDROID_FLOW_LABEL}画像`), "Remote restart should preserve the profile from this run");
  assert.ok(restartSnapshot.react.boundaryTopics.some((topic) => topic.includes(`${ANDROID_FLOW_LABEL}MQ 幂等边界`)), "Remote restart should preserve the boundary from this run");
  assert.ok(restartSnapshot.react.coachScheduleTitles.includes(`${ANDROID_FLOW_LABEL}自定义日程`), "Remote restart should preserve the custom schedule from this run");
  assert.ok(restartSnapshot.react.coachScheduleTitles.includes(`${ANDROID_FLOW_LABEL}自定义日程二`), "Remote restart should preserve the second custom schedule from this run");
  assert.ok(restartSnapshot.react.aiArtifactStatuses.includes("accepted"), "Remote restart should preserve accepted AI artifacts");
  assert.ok(restartSnapshot.react.aiArtifactStatuses.includes("rejected"), "Remote restart should preserve rejected AI artifacts");
}

function isAllowedRemoteRuntimePath(pathname) {
  return pathname.includes("/job-sprint/")
    || pathname === "/login.html"
    || pathname === "/schedule.html"
    || pathname.startsWith("/react/")
    || pathname.startsWith("/assets/")
    || pathname.startsWith("/data/")
    || pathname.startsWith("/api/");
}

function assertRemoteRuntimeUrl(url, label) {
  if (!IS_REMOTE_WEBVIEW) {
    return;
  }
  assert.ok(url && !url.startsWith("file:///"), `${label} must not fall back to local Android assets in remote mode: ${url}`);
  const parsed = new URL(url);
  assert.ok(["https:", "http:"].includes(parsed.protocol), `${label} must stay on HTTP(S) remote origin in remote mode: ${url}`);
  assert.strictEqual(parsed.origin, EXPECTED_REMOTE_ORIGIN, `${label} must stay on configured remote origin`);
  assert.ok(isAllowedRemoteRuntimePath(parsed.pathname), `${label} must stay on a job-sprint runtime path: ${url}`);
}

async function assertRemoteWebViewPage(page, label) {
  if (!IS_REMOTE_WEBVIEW) {
    return;
  }
  assertRemoteRuntimeUrl(page.url(), label);
}

async function snapshotStorage(page, label) {
  await assertRemoteWebViewPage(page, `${label} page`);
  const raw = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
  const summary = summarizeStorage(raw, label, page.url());
  assertRemoteRuntimeUrl(summary.url, `${label} snapshot`);
  fs.writeFileSync(path.join(snapshotsDir, `${label}.json`), JSON.stringify(summary, null, 2));
  return summary;
}

async function screenshot(page, name) {
  const file = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, timeout: 10000 }).catch(() => null);
  return file;
}

function adbScreenshot(name) {
  const file = path.join(screenshotsDir, `${name}.png`);
  fs.writeFileSync(file, adbBuffer(["exec-out", "screencap", "-p"]));
  return file;
}

function keepDeviceAwake(enabled) {
  adbQuiet(["shell", "svc", "power", "stayon", enabled ? "usb" : "false"]);
}

function ensureDeviceInteractive() {
  adbQuiet(["shell", "input", "keyevent", "KEYCODE_WAKEUP"]);
  adbQuiet(["shell", "wm", "dismiss-keyguard"]);
  adbQuiet(["shell", "input", "keyevent", "82"]);
}

function launchApp() {
  ensureDeviceInteractive();
  adb(["shell", "am", "start", "-n", ACTIVITY, "--ez", "com.kai.jobsprint.FORCE_LOCAL_START", "true"]);
  ensureDeviceInteractive();
}

async function connectWebView() {
  const pid = adb(["shell", "pidof", PACKAGE_NAME]).replace(/\r/g, "");
  assert.ok(pid, "Android app process should be running");
  adb(["forward", `tcp:${CDP_PORT}`, `localabstract:webview_devtools_remote_${pid}`]);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  assert.ok(page, "WebView page should be available through CDP");
  if (IS_REMOTE_WEBVIEW && isLocalTunnelUrl(WEBVIEW_URL)) {
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setExtraHTTPHeaders", {
      headers: { "bypass-tunnel-reminder": "1" }
    });
    await session.send("Network.setUserAgentOverride", {
      userAgent: "JobSprintAndroidRemoteTest/1.0"
    });
    await page.setExtraHTTPHeaders({ "bypass-tunnel-reminder": "1" });
    AUTH_EVIDENCE.localTunnelBypass = {
      host: new URL(WEBVIEW_URL).hostname,
      method: "cdp_headers_and_user_agent"
    };
  }
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  return { browser, page, pid };
}

function isLocalTunnelUrl(value) {
  try {
    return new URL(value).hostname.endsWith(".loca.lt");
  } catch {
    return false;
  }
}

async function maybeBypassLocalTunnelWarning(page) {
  if (!IS_REMOTE_WEBVIEW || !isLocalTunnelUrl(WEBVIEW_URL)) {
    return;
  }
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (!bodyText.includes("You are about to visit:") && !bodyText.includes("To continue, enter the IP shown above")) {
    return;
  }
  const ipMatch = bodyText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  assert.ok(ipMatch, "localtunnel warning page should display a bypass IP");
  AUTH_EVIDENCE.localTunnelBypass = {
    host: new URL(WEBVIEW_URL).hostname,
    displayedIp: ipMatch[0],
    method: "localtunnel_continue_endpoint"
  };
  const bypassResult = await page.evaluate(async (endpoint) => {
    const form = document.querySelector("form");
    const token = form ? form.getAttribute("data-token") : "";
    if (!token) {
      return { ok: false, reason: "missing_token" };
    }
    const response = await fetch(`/continue/${token}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ endpoint }).toString(),
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (payload && payload.success) {
      window.location.reload();
    }
    return { ok: Boolean(payload && payload.success), status: response.status, payload };
  }, ipMatch[0]);
  assert.ok(bypassResult.ok, `localtunnel bypass should succeed: ${JSON.stringify(bypassResult)}`);
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function gotoWebView(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (!IS_REMOTE_WEBVIEW || !message.includes("net::ERR_ABORTED")) {
      throw error;
    }
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  }
}

async function maybeLogin(page) {
  await maybeBypassLocalTunnelWarning(page);
  AUTH_EVIDENCE.sessionStates.push(await readSessionState(page, "before-maybe-login"));
  if (!AUTH_USER || !AUTH_PASSWORD) {
    return;
  }
  const username = page.getByLabel("用户名");
  try {
    await username.waitFor({ timeout: 3000 });
  } catch {
    return;
  }
  AUTH_EVIDENCE.loginPageSeen = true;
  AUTH_EVIDENCE.loginAttempted = true;
  await username.fill(AUTH_USER);
  await page.getByLabel("密码").fill(AUTH_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/react\/index\.html#\//, { timeout: 15000 }).catch(() => {}),
    page.getByRole("button", { name: "进入工作台" }).click()
  ]);
  AUTH_EVIDENCE.sessionStates.push(await readSessionState(page, "after-login-submit"));
}

async function gotoRoute(page, hash, heading) {
  await gotoWebView(page, routeUrl(hash));
  await maybeLogin(page);
  await assertRemoteWebViewPage(page, `${hash} route`);
  await page.getByRole("heading", { name: heading, exact: true }).waitFor({ timeout: 15000 });
}

async function clickWebView(locator) {
  const target = locator.first();
  await target.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  try {
    await target.click({ timeout: 5000 });
  } catch (error) {
    if (!String(error && error.message).includes("Timeout")) {
      throw error;
    }
    await target.click({ force: true, timeout: 5000 });
  }
}

async function fillApplication(page, draft) {
  const form = page.locator("section[aria-labelledby='application-form-title']");
  await form.getByLabel("公司").fill(draft.company);
  await form.getByLabel("岗位").fill(draft.role);
  await form.getByLabel("来源").fill(draft.source);
  await form.getByLabel("薪资范围").fill(draft.salaryRange);
  await form.getByLabel("城市").fill(draft.city);
  await form.getByLabel("简历版本").fill(draft.resumeVersion);
  await form.getByLabel("JD 关键词").fill(draft.keywords);
  await form.getByLabel("状态").selectOption(draft.status);
  await form.getByLabel("沟通反馈").fill(draft.hrFeedback);
  await form.getByLabel("反馈摘要").fill(draft.notes);
}

async function fillReview(page, draft) {
  const form = page.locator("section[aria-labelledby='review-form-title']");
  await form.getByLabel("今天能讲的一个项目点是什么？").fill(draft.projectPoint);
  await form.getByLabel("今天能回答的两个面试题是什么？").fill(draft.interviewQuestions);
  await form.getByLabel("今天补强的一个知识或技能边界是什么？").fill(draft.javaPoint);
  await form.getByLabel("今天发现了哪些路径问题？").fill(draft.pathIssues);
  await form.getByLabel("今天哪些回答还容易被面试官追问穿？").fill(draft.fragileAnswers);
  await form.getByLabel("明天最优先补什么？").fill(draft.tomorrowPriority);
}

async function exerciseCoachWorkspace(page, prefix) {
  await gotoRoute(page, "/coach", "AI 教练设置");
  const profilePanel = page.locator("#coach-profile");
  await profilePanel.getByLabel("画像名称").fill(`${prefix}画像`);
  await profilePanel.getByLabel("角色族", { exact: true }).selectOption("backend");
  await profilePanel.getByLabel("目标岗位", { exact: true }).fill(`${prefix}Java 后端教练`);
  await profilePanel.getByLabel("目标等级").fill("高级");
  await profilePanel.getByLabel("目标城市").fill("杭州 上海");
  await profilePanel.getByLabel("薪资目标").fill("30-40K");
  await profilePanel.getByLabel("公司类型").fill("业务平台 / AI 工程化");
  await profilePanel.getByLabel("每日分钟").fill("75");
  await profilePanel.getByLabel("经验摘要").fill(`${prefix}经验摘要：后端主线，能讲项目边界和稳定性。`);
  await profilePanel.getByLabel("项目证据").fill(`${prefix}项目证据：搜索链路和 MQ 幂等。`);
  await profilePanel.getByLabel("不可夸大边界").fill(`${prefix}不可夸大边界：不编造大模型训练经历。`);
  await clickWebView(profilePanel.getByRole("button", { name: "保存画像" }));
  await page.getByRole("status").filter({ hasText: "画像已保存" }).waitFor();

  await page.getByLabel("知识主题").fill(`${prefix}MQ 幂等边界`);
  await page.getByLabel("掌握程度").selectOption("了解");
  await page.getByLabel("当前缺口").fill(`${prefix}当前缺口：重复消费和补偿边界还需要讲清。`);
  await page.getByLabel("已有证据").fill(`${prefix}已有证据：项目里做过消息去重。`);
  await page.getByLabel("岗位用途").fill(`${prefix}岗位用途：后端稳定性追问。`);
  await clickWebView(page.getByRole("button", { name: "新增边界" }));
  await page.getByText(`${prefix}MQ 幂等边界`).waitFor();

  await addCoachSchedule(page, clickWebView, { title: `${prefix}自定义日程`, date: "2026-07-06", start: "21:00", end: "21:30", type: "interview", reason: `${prefix}安排原因：今晚用口述验证知识边界。` });
  await addCoachSchedule(page, clickWebView, { title: `${prefix}自定义日程二`, date: "2026-07-07", start: "07:30", end: "08:00", type: "learning", reason: `${prefix}安排原因：早上补齐 MQ 可靠消息边界。` });

  await exerciseAiArtifactDrafts({ page, clickWebView, prefix, assert });

  const snapshot = await snapshotStorage(page, "01-after-coach");
  assert.ok(snapshot.react.profileNames.includes(`${prefix}画像`));
  assert.ok(snapshot.react.boundaryTopics.some((topic) => topic.includes(`${prefix}MQ 幂等边界`)));
  assert.ok(snapshot.react.coachScheduleTitles.includes(`${prefix}自定义日程`));
  assert.ok(snapshot.react.coachScheduleTitles.includes(`${prefix}自定义日程二`));
  assert.strictEqual(snapshot.react.profileCount, 1);
  assert.ok(snapshot.react.boundaryCount >= 2);
  assert.ok(snapshot.react.scheduleEventCount >= 2);
  assert.ok(snapshot.react.aiArtifactCount >= 3);
  assert.ok(snapshot.react.llmRunCount >= 1);
  assert.ok(snapshot.react.llmRunStatuses.includes("fallback") || snapshot.react.llmRunStatuses.includes("success"));
  assert.ok(snapshot.react.llmRunProviders.includes("local-fallback") || snapshot.react.llmRunProviders.includes("anthropic-compatible"));
  assert.ok(snapshot.react.aiArtifactStatuses.includes("accepted"));
  assert.ok(snapshot.react.aiArtifactStatuses.includes("rejected"));
}

async function runWebViewFlow(page) {
  await gotoWebView(page, routeUrl("/today", { reset: Date.now() }));
  await maybeLogin(page);
  await assertRemoteWebViewPage(page, "initial today route");
  await page.evaluate(() => window.localStorage.clear());
  await gotoWebView(page, routeUrl("/today", { reset: Date.now() }));
  await maybeLogin(page);
  await assertRemoteWebViewPage(page, "reset today route");
  await page.getByRole("heading", { name: "今日 AI 教练", exact: true }).waitFor({ timeout: 15000 });
  await snapshotStorage(page, "00-before");
  await clickWebView(page.getByRole("button", { name: "补学习笔记" }));
  await page.getByLabel("证据内容").fill(`${ANDROID_FLOW_LABEL}学习笔记：输入内容必须进入证据。`);
  await clickWebView(page.getByRole("button", { name: "保存证据" }));
  await page.getByText("学习笔记证据").first().waitFor();
  const cancelCompletionButton = page.getByRole("button", { name: "取消完成" });
  if (await cancelCompletionButton.count()) {
    await clickWebView(cancelCompletionButton);
    await page.getByRole("button", { name: "标记完成" }).waitFor();
  }
  await clickWebView(page.getByRole("button", { name: "标记完成" }));
  await page.getByRole("button", { name: "取消完成" }).waitFor();
  await page.getByLabel("延期分钟").fill("25");
  await page.getByLabel("延期原因").fill(ANDROID_DELAY_REASON);
  await page.getByLabel("补救动作").fill(ANDROID_REMEDY);
  await clickWebView(page.getByRole("button", { name: "登记延期" }));
  await page.getByText(`25 分钟 · ${ANDROID_DELAY_REASON}`).first().waitFor();

  await exerciseCoachWorkspace(page, ANDROID_FLOW_LABEL);

  await gotoRoute(page, "/learn", "知识边界");
  await clickWebView(page.getByRole("button", { name: /补学习笔记|再补一条/ }));
  await page.getByLabel("学习笔记内容").fill(`${ANDROID_FLOW_LABEL}学习页笔记：把知识卡变成面试证据。`);
  await clickWebView(page.getByRole("button", { name: "保存学习笔记" }));
  const unmarkKnowledgeButton = page.getByRole("button", { name: /取消重点标记/ });
  if (await unmarkKnowledgeButton.count()) {
    await clickWebView(unmarkKnowledgeButton);
    await page.getByRole("button", { name: /标记重点/ }).first().waitFor();
  }
  await clickWebView(page.getByRole("button", { name: /标记重点/ }));
  await clickWebView(page.getByRole("button", { name: "只看重点" }));
  await page.getByText(/重点 [1-9]\d* 张/).waitFor();

  await gotoRoute(page, "/interview", "面试训练");
  await clickWebView(page.getByRole("button", { name: "Java", exact: true }));
  const unmarkWeakQuestionButton = page.getByRole("button", { name: /取消薄弱题标记/ });
  if (await unmarkWeakQuestionButton.count()) {
    await clickWebView(unmarkWeakQuestionButton);
    await page.getByRole("button", { name: /标记薄弱题/ }).first().waitFor();
  }
  await clickWebView(page.getByRole("button", { name: /标记薄弱题/ }));
  await clickWebView(page.getByRole("button", { name: "只看薄弱题" }));
  await page.getByText(/薄弱 [1-9]\d* 题/).waitFor();
  await page.getByLabel("我的口述回答").fill(`${ANDROID_FLOW_LABEL}口述：结论、链路、异常、指标、复盘。`);
  await clickWebView(page.getByRole("button", { name: "AI评分并生成复盘" }));
  await page.getByLabel("AI评分结果").waitFor();
  await clickWebView(page.getByRole("button", { name: "保存口述与AI分析" }));
  await page.getByText("口述训练证据").first().waitFor();

  await gotoRoute(page, "/applications", "机会验证");
  await clickWebView(page.getByRole("button", { name: "新增机会记录" }));
  await fillApplication(page, {
    company: `${ANDROID_FLOW_LABEL}公司A`,
    role: `${ANDROID_FLOW_LABEL} Java 后端 A`,
    source: `${ANDROID_FLOW_LABEL}来源A`,
    salaryRange: "25-35K",
    city: "杭州",
    resumeVersion: "android-resume-a",
    keywords: "Java Spring",
    status: "已记录",
    hrFeedback: `${ANDROID_FLOW_LABEL} HR 反馈 A`,
    notes: `${ANDROID_FLOW_LABEL} 摘要 A`
  });
  await clickWebView(page.getByRole("button", { name: "记录机会反馈" }));
  await page.getByText(`${ANDROID_FLOW_LABEL}公司A`).first().waitFor();
  await clickWebView(page.getByRole("button", { name: "新增机会记录" }));
  await fillApplication(page, {
    company: `${ANDROID_FLOW_LABEL}公司B`,
    role: `${ANDROID_FLOW_LABEL} Java 后端 B`,
    source: `${ANDROID_FLOW_LABEL}来源B`,
    salaryRange: "30-40K",
    city: "上海",
    resumeVersion: "android-resume-b",
    keywords: "Java Redis",
    status: "约面",
    hrFeedback: `${ANDROID_FLOW_LABEL} HR 反馈 B`,
    notes: `${ANDROID_FLOW_LABEL} 摘要 B`
  });
  await clickWebView(page.getByRole("button", { name: "记录机会反馈" }));
  await clickWebView(page.getByRole("button", { name: `编辑机会记录：${ANDROID_FLOW_LABEL}公司B` }));
  await fillApplication(page, {
    company: `${ANDROID_FLOW_LABEL}公司B`,
    role: `${ANDROID_FLOW_LABEL} Java 后端 B 已编辑`,
    source: `${ANDROID_FLOW_LABEL}来源B`,
    salaryRange: "30-40K",
    city: "上海",
    resumeVersion: "android-resume-b",
    keywords: "Java Redis",
    status: "约面",
    hrFeedback: `${ANDROID_FLOW_LABEL} HR 反馈 B 已编辑`,
    notes: `${ANDROID_FLOW_LABEL} 摘要 B 已编辑`
  });
  await clickWebView(page.getByRole("button", { name: "保存机会反馈" }));
  await page.getByText(`${ANDROID_FLOW_LABEL} Java 后端 B 已编辑`).first().waitFor();
  await clickWebView(page.getByRole("button", { name: `删除机会记录：${ANDROID_FLOW_LABEL}公司A` }));
  await page.getByText(`${ANDROID_FLOW_LABEL}公司A`).waitFor({ state: "detached" });
  await clickWebView(page.getByRole("button", { name: "生成本地导出" }));
  await page.getByText(/已生成导出 \d+ 条/).waitFor();

  await gotoRoute(page, "/review", "复盘归因");
  await fillReview(page, {
    projectPoint: `${ANDROID_FLOW_LABEL}项目点A`,
    interviewQuestions: `${ANDROID_FLOW_LABEL}面试题A1；${ANDROID_FLOW_LABEL}面试题A2`,
    javaPoint: `${ANDROID_FLOW_LABEL} Java 点A`,
    pathIssues: `${ANDROID_FLOW_LABEL} 路径问题A`,
    fragileAnswers: `${ANDROID_FLOW_LABEL} 薄弱回答A`,
    tomorrowPriority: `${ANDROID_FLOW_LABEL} 明日优先A`
  });
  await clickWebView(page.getByRole("button", { name: "保存本地复盘" }));
  await page.getByText(`项目点：${ANDROID_FLOW_LABEL}项目点A`, { exact: true }).waitFor();
  await fillReview(page, {
    projectPoint: `${ANDROID_FLOW_LABEL}项目点B`,
    interviewQuestions: `${ANDROID_FLOW_LABEL}面试题B1；${ANDROID_FLOW_LABEL}面试题B2`,
    javaPoint: `${ANDROID_FLOW_LABEL} Java 点B`,
    pathIssues: `${ANDROID_FLOW_LABEL} 路径问题B`,
    fragileAnswers: `${ANDROID_FLOW_LABEL} 薄弱回答B`,
    tomorrowPriority: `${ANDROID_FLOW_LABEL} 明日优先B`
  });
  await clickWebView(page.getByRole("button", { name: "保存本地复盘" }));
  await clickWebView(page.getByRole("button", { name: `编辑复盘记录 ${ANDROID_FLOW_LABEL}项目点B` }));
  await fillReview(page, {
    projectPoint: `${ANDROID_FLOW_LABEL}项目点B 已编辑`,
    interviewQuestions: `${ANDROID_FLOW_LABEL}面试题B1；${ANDROID_FLOW_LABEL}面试题B2`,
    javaPoint: `${ANDROID_FLOW_LABEL} Java 点B`,
    pathIssues: `${ANDROID_FLOW_LABEL} 路径问题B`,
    fragileAnswers: `${ANDROID_FLOW_LABEL} 薄弱回答B`,
    tomorrowPriority: `${ANDROID_FLOW_LABEL} 明日优先B 已编辑`
  });
  await clickWebView(page.getByRole("button", { name: "更新本地复盘" }));
  await page.getByText(`项目点：${ANDROID_FLOW_LABEL}项目点B 已编辑`, { exact: true }).waitFor();
  await clickWebView(page.getByRole("button", { name: `删除复盘记录 ${ANDROID_FLOW_LABEL}项目点A` }));
  await page.getByText(`项目点：${ANDROID_FLOW_LABEL}项目点A`, { exact: true }).waitFor({ state: "detached" });
  await clickWebView(page.getByRole("button", { name: "导出当前筛选复盘 JSON" }));
  await page.locator("pre").last().waitFor();

  await gotoRoute(page, "/more", "更多入口");
  await page.getByText("已检测").waitFor();
  await page.getByLabel("导入 React 状态 JSON").waitFor();
  await clickWebView(page.getByRole("button", { name: "导出 JSON" }));
  await page.getByText("React 本地状态已导出").waitFor();
  const snapshot = await snapshotStorage(page, "01-after-webview-flow");
  assert.ok(snapshot.react.evidenceCount >= 5);
  assert.ok(snapshot.react.completedCount >= 1);
  assert.ok(snapshot.react.delayReasons.includes(ANDROID_DELAY_REASON));
  assert.strictEqual(snapshot.react.profileCount, 1);
  assert.ok(snapshot.react.boundaryCount >= 2);
  assert.ok(snapshot.react.scheduleEventCount >= 2);
  assert.ok(snapshot.react.aiArtifactCount >= 3);
  assert.ok(snapshot.react.llmRunCount >= 1);
  assert.strictEqual(snapshot.learningMarkedCount, 1);
  assert.strictEqual(snapshot.interviewWeakCount, 1);
  assertExpectedStorage(snapshot, "Android flow snapshot");
  await screenshot(page, "01-webview-more-after-flow");
  adbScreenshot("02-adb-more-after-flow");
  return snapshot;
}

async function verifyRestartReadback(flowSnapshot, initialPid) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  adb(["shell", "am", "force-stop", PACKAGE_NAME]);
  launchApp();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const { browser, page, pid } = await connectWebView();
  try {
    await gotoRoute(page, "/more", "更多入口");
    await page.getByText("已检测").waitFor();
    const snapshot = await snapshotStorage(page, "02-after-app-restart");
    assert.ok(snapshot.react.evidenceCount >= 5);
    assert.ok(snapshot.react.completedCount >= 1);
    assert.ok(snapshot.react.delayReasons.includes(ANDROID_DELAY_REASON));
    assert.strictEqual(snapshot.react.profileCount, 1);
    assert.ok(snapshot.react.boundaryCount >= 2);
    assert.ok(snapshot.react.scheduleEventCount >= 2);
    assert.ok(snapshot.react.aiArtifactCount >= 3);
    assert.ok(snapshot.react.llmRunCount >= 1);
    assert.strictEqual(snapshot.learningMarkedCount, 1);
    assert.strictEqual(snapshot.interviewWeakCount, 1);
    assert.notStrictEqual(pid, initialPid, "Android restart should use a new app process");
    assertExpectedStorage(snapshot, "Android restart snapshot");
    if (IS_REMOTE_WEBVIEW) {
      assertRemoteRestartPreservesFlow(flowSnapshot, snapshot);
    } else {
      assertSameExpectedStorage(flowSnapshot, snapshot, "Android app restart should preserve expected localStorage bytes and hashes");
    }
    await screenshot(page, "03-webview-more-after-restart");
    adbScreenshot("04-adb-more-after-restart");
    return { pid, snapshot };
  } finally {
    await browser.close();
  }
}

(async () => {
  keepDeviceAwake(true);
  try {
    const devices = adb(["devices", "-l"]);
    assert.match(devices, /device\s+usb:/, "an Android device must be connected");
    launchApp();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { browser, page, pid } = await connectWebView();
    let flowSnapshot;
    try {
      flowSnapshot = await runWebViewFlow(page);
    } finally {
      await browser.close();
    }
    const restart = await verifyRestartReadback(flowSnapshot, pid);
    const report = {
      status: "PASS",
      packageName: PACKAGE_NAME,
      mode: IS_REMOTE_WEBVIEW ? "remote" : "local",
      initialPid: pid,
      restartPid: restart.pid,
      webViewUrl: WEBVIEW_URL,
      evidenceRoot,
      screenshotsDir,
      snapshotsDir,
      expectedStorageKeys: EXPECTED_STORAGE_KEYS,
      authEvidence: AUTH_EVIDENCE,
      flowSnapshot,
      restartSnapshot: restart.snapshot
    };
    fs.writeFileSync(path.join(evidenceRoot, "android-webview-functional-persistence-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    keepDeviceAwake(false);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

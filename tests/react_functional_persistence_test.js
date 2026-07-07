const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");

const ROOT = path.resolve(__dirname, "..");
const reactRequire = createRequire(path.join(ROOT, "apps", "react-web", "package.json"));
const { chromium } = reactRequire("playwright");
const { buildReactImportRestorePayload } = require("./fixtures/react_import_restore_payload");

const TEST_USER = "functional-user";
const TEST_PASSWORD = ["functional", "password", "only"].join("-");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-functional-"));
const evidenceRoot = path.resolve(process.env.JOB_SPRINT_FUNCTIONAL_EVIDENCE_DIR || path.join(tmpDir, "evidence"));
const downloadsDir = path.join(evidenceRoot, "downloads");
const screenshotsDir = path.join(evidenceRoot, "screenshots");
const snapshotsDir = path.join(evidenceRoot, "storage-snapshots");
const persistentProfileDir = path.join(tmpDir, "chromium-profile");
const EXPECTED_STORAGE_KEYS = [
  "jobSprint.react.interviewWeakQuestions.v1",
  "jobSprint.react.learningKnowledgeMarks.v1",
  "jobSprint.react.v1"
];

for (const dir of [downloadsDir, screenshotsDir, snapshotsDir]) {
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.mkdirSync(downloadsDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(snapshotsDir, { recursive: true });
fs.writeFileSync(
  path.join(downloadsDir, "README.md"),
  [
    "# Synthetic test exports",
    "",
    "本目录只允许保存自动化功能测试生成的合成导出样本。",
    "不要把真实求职数据、真实联系方式、真实公司反馈或凭据放入本目录。"
  ].join("\n")
);

process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");
process.env.JOB_SPRINT_AUTH_USER = TEST_USER;
process.env.JOB_SPRINT_AUTH_PASSWORD = TEST_PASSWORD;
process.env.JOB_SPRINT_SESSION_SECRET = ["functional", "session", "secret", "long", "enough", "for", "tests"].join("-");

const { route } = require("../apps/server/app.js");

function startServer() {
  const server = http.createServer((req, res) => {
    route(req, res).catch((error) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
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
      aiArtifactTitles: aiArtifacts.map((item) => item.title).sort(),
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

async function snapshotStorage(page, label) {
  const raw = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
  const summary = summarizeStorage(raw, label, page.url());
  fs.writeFileSync(path.join(snapshotsDir, `${label}.json`), JSON.stringify(summary, null, 2));
  return summary;
}

async function readServerRuntime(baseUrl, cookieHeader) {
  const url = new URL("/api/runtime", baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "GET",
      headers: { cookie: cookieHeader }
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServerEvidence(page, baseUrl, evidenceType) {
  const deadline = Date.now() + 10000;
  const cookies = await page.context().cookies(baseUrl);
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  while (Date.now() < deadline) {
    const payload = await readServerRuntime(baseUrl, cookieHeader);
    const evidenceByTaskId = payload?.data?.progress?.evidenceByTaskId || {};
    const records = Object.values(evidenceByTaskId).flatMap((items) => Array.isArray(items) ? items : []);
    if (records.some((item) => item && item.type === evidenceType)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`server runtime missing evidence type: ${evidenceType}`);
}

async function waitForServerRuntimeText(page, baseUrl, { includes = [], excludes = [] }) {
  const deadline = Date.now() + 10000;
  const cookies = await page.context().cookies(baseUrl);
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  while (Date.now() < deadline) {
    const payload = await readServerRuntime(baseUrl, cookieHeader);
    const raw = JSON.stringify(payload);
    if (includes.every((text) => raw.includes(text)) && excludes.every((text) => !raw.includes(text))) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`server runtime text mismatch: includes=${includes.join(",")} excludes=${excludes.join(",")}`);
}

async function screenshot(page, name) {
  const file = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/`);
  await page.getByLabel("用户名").fill(TEST_USER);
  await page.getByLabel("密码").fill(TEST_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/react\/index\.html#\/today/),
    page.getByRole("button", { name: "进入工作台" }).click()
  ]);
}

async function gotoRoute(page, baseUrl, hash, heading) {
  await page.goto(`${baseUrl}/react/index.html#${hash}`);
  await page.getByRole("heading", { name: heading, exact: true }).waitFor({ timeout: 15000 });
}

async function saveDownload(download, filename) {
  const target = path.join(downloadsDir, filename);
  await download.saveAs(target);
  return target;
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

async function exerciseCoachWorkspace(page, baseUrl, prefix) {
  await gotoRoute(page, baseUrl, "/coach", "AI 教练设置");
  const profilePanel = page.locator("#coach-profile");
  await profilePanel.getByLabel("画像名称").fill(`${prefix}画像`);
  await profilePanel.getByLabel("角色族", { exact: true }).selectOption("backend");
  await profilePanel.getByLabel("目标岗位", { exact: true }).fill(`${prefix}Java 后端教练`);
  await profilePanel.getByLabel("目标等级").fill("高级");
  await profilePanel.getByLabel("目标城市").fill("杭州 上海");
  await profilePanel.getByLabel("薪资目标").fill("30-40K");
  await profilePanel.getByLabel("公司类型").fill("业务平台 / AI 工程化");
  await profilePanel.getByLabel("每日分钟").fill("90");
  await profilePanel.getByLabel("经验摘要").fill(`${prefix}经验摘要：后端主线，能讲项目边界、稳定性和复盘。`);
  await profilePanel.getByLabel("项目证据").fill(`${prefix}项目证据：搜索链路、MQ 幂等、异常恢复。`);
  await profilePanel.getByLabel("不可夸大边界").fill(`${prefix}不可夸大边界：不编造大模型训练经历。`);
  await profilePanel.getByRole("button", { name: "保存画像" }).click();
  await page.getByRole("status").filter({ hasText: "画像已保存" }).waitFor();
  await page.getByLabel("知识主题").fill(`${prefix}MQ 幂等边界`);
  await page.getByLabel("掌握程度").selectOption("了解");
  await page.getByLabel("当前缺口").fill(`${prefix}当前缺口：失败重试和重复消费边界还需要讲清。`);
  await page.getByLabel("已有证据").fill(`${prefix}已有证据：项目里做过消息去重和补偿。`);
  await page.getByLabel("岗位用途").fill(`${prefix}岗位用途：后端稳定性追问。`);
  await page.getByRole("button", { name: "新增边界" }).click();
  await page.getByText(`${prefix}MQ 幂等边界`).waitFor();
  await page.getByLabel("日程标题").fill(`${prefix}自定义日程`);
  await page.getByLabel("日期").fill("2026-07-06");
  await page.getByLabel("开始").fill("21:00");
  await page.getByLabel("结束").fill("21:30");
  await page.getByLabel("日程类型").selectOption("interview");
  await page.getByLabel("安排原因").fill(`${prefix}安排原因：今晚用口述验证知识边界。`);
  await page.getByRole("button", { name: "新增日程" }).click();
  await page.getByText(`${prefix}自定义日程`).waitFor();
  await page.getByRole("button", { name: "生成 AI 草稿" }).click();
  await page.getByLabel(new RegExp(`AI 草稿标题：${prefix}MQ 幂等边界 面试表达卡`)).waitFor();

  await page.getByRole("button", { name: new RegExp(`接受 AI 草稿：${prefix}MQ 幂等边界 面试表达卡`) }).click();
  await page.getByRole("status").filter({ hasText: "已接受知识卡草稿" }).waitFor();

  await page.getByLabel(new RegExp(`AI 草稿标题：今晚 .*${prefix}MQ 幂等边界`)).fill(`${prefix}AI 日程草稿 已编辑`);
  await page.getByLabel(new RegExp(`AI 草稿内容：今晚 .*${prefix}MQ 幂等边界`)).fill(`${prefix}AI 日程草稿内容：先补机制，再补项目证据。`);
  await page.getByRole("button", { name: "保存编辑" }).nth(1).click();
  await page.getByRole("button", { name: `接受 AI 草稿：${prefix}AI 日程草稿 已编辑` }).click();
  await page.getByText(`${prefix}AI 日程草稿 已编辑`).waitFor();

  await page.getByLabel(new RegExp(`拒绝原因：.*追问：${prefix}MQ 幂等边界`)).fill(`${prefix}拒绝原因：今天先不加候选题。`);
  await page.getByRole("button", { name: new RegExp(`拒绝 AI 草稿：.*追问：${prefix}MQ 幂等边界`) }).click();
  await page.getByText(`拒绝原因：${prefix}拒绝原因：今天先不加候选题。`).waitFor();

  await waitForServerRuntimeText(page, baseUrl, {
    includes: [
      `${prefix}画像`,
      `${prefix}MQ 幂等边界`,
      `${prefix}自定义日程`,
      `${prefix}AI 日程草稿 已编辑`,
      `${prefix}拒绝原因：今天先不加候选题。`
    ]
  });
  await screenshot(page, "02-coach-profile-ai-artifacts-persisted");
  const snapshot = await snapshotStorage(page, "02-after-coach");
  assert.ok(snapshot.react.profileNames.includes(`${prefix}画像`));
  assert.ok(snapshot.react.boundaryTopics.some((topic) => topic.includes(`${prefix}MQ 幂等边界`)));
  assert.ok(snapshot.react.coachScheduleTitles.includes(`${prefix}自定义日程`));
  assert.ok(snapshot.react.coachScheduleTitles.includes(`${prefix}AI 日程草稿 已编辑`));
  assert.strictEqual(snapshot.react.profileCount, 1);
  assert.ok(snapshot.react.boundaryCount >= 2);
  assert.ok(snapshot.react.scheduleEventCount >= 2);
  assert.strictEqual(snapshot.react.aiArtifactCount, 3);
  assert.ok(snapshot.react.llmRunCount >= 1);
  assert.ok(snapshot.react.llmRunStatuses.includes("fallback") || snapshot.react.llmRunStatuses.includes("success"));
  assert.ok(snapshot.react.llmRunProviders.includes("local-fallback") || snapshot.react.llmRunProviders.includes("anthropic-compatible"));
  assert.ok(snapshot.react.aiArtifactStatuses.includes("accepted"));
  assert.ok(snapshot.react.aiArtifactStatuses.includes("rejected"));
  return snapshot;
}

async function runDesktopFlow(baseUrl) {
  const context = await chromium.launchPersistentContext(persistentProfileDir, {
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 }
  });
  const page = context.pages()[0] || await context.newPage();

  await login(page, baseUrl);
  await page.evaluate(() => window.localStorage.clear());
  await gotoRoute(page, baseUrl, "/today", "今日 AI 教练");
  await snapshotStorage(page, "00-before");

  const lockedButton = page.getByRole("button", { name: "先补证据" });
  await lockedButton.waitFor();
  assert.strictEqual(await lockedButton.isDisabled(), true, "current task should be locked before evidence");
  await page.getByRole("button", { name: "补学习笔记" }).first().click();
  await page.getByLabel("证据内容").fill("功能测试学习笔记：事务边界、搜索链路和异常回滚已经整理成面试表达。");
  await page.getByRole("button", { name: "保存证据" }).click();
  await page.getByText("学习笔记证据").first().waitFor();
  await page.getByRole("button", { name: "标记完成" }).click();
  await page.getByRole("button", { name: "取消完成" }).waitFor();
  await page.getByLabel("延期分钟").fill("45");
  await page.getByLabel("延期原因").fill("功能测试延期原因");
  await page.getByLabel("补救动作").fill("功能测试补救动作");
  await page.getByRole("button", { name: "登记延期" }).click();
  await page.getByText("45 分钟 · 功能测试延期原因").waitFor();
  await waitForServerRuntimeText(page, baseUrl, { includes: ["功能测试延期原因", "功能测试补救动作"] });
  await screenshot(page, "01-today-evidence-complete");
  const todaySnapshot = await snapshotStorage(page, "01-after-today");
  assert.ok(todaySnapshot.react.evidenceTypes.includes("learning_note"));
  assert.ok(todaySnapshot.react.completedCount >= 1);
  assert.strictEqual(todaySnapshot.react.delayCount, 1);
  const coachSnapshot = await exerciseCoachWorkspace(page, baseUrl, "功能测试");
  assert.strictEqual(coachSnapshot.react.profileCount, 1);

  await gotoRoute(page, baseUrl, "/learn", "知识边界");
  await page.getByLabel("搜索知识卡").fill("Spring");
  await page.getByRole("button", { name: "清空筛选" }).click();
  await page.getByRole("button", { name: /补学习笔记|再补一条/ }).first().click();
  await page.getByLabel("学习笔记内容").fill("功能测试学习页笔记：把知识卡转成项目证据和面试追问。");
  await page.getByRole("button", { name: "保存学习笔记" }).click();
  await page.getByText(/已保存到 学习 > 学习笔记/).waitFor();
  await page.getByRole("button", { name: /标记重点/ }).first().click();
  await page.getByRole("button", { name: "只看重点" }).click();
  await page.getByText(/重点 1 张/).waitFor();
  await page.reload();
  await page.getByText(/重点 1 张/).waitFor();
  await screenshot(page, "02-learning-marked-persisted");
  const learningSnapshot = await snapshotStorage(page, "02-after-learning");
  assert.ok(learningSnapshot.react.evidenceTypes.includes("learning_note"));
  assert.strictEqual(learningSnapshot.learningMarkedCount, 1);

  await gotoRoute(page, baseUrl, "/interview", "面试训练");
  await page.getByRole("button", { name: "Java", exact: true }).click();
  await page.getByLabel("搜索候选题").fill("Spring");
  await page.getByRole("button", { name: "清空筛选" }).click();
  await page.getByRole("button", { name: /标记薄弱题/ }).first().click();
  await page.getByRole("button", { name: "只看薄弱题" }).click();
  await page.getByText(/薄弱 1 题/).waitFor();
  await page.getByLabel("我的口述回答").fill("功能测试口述：先讲结论，再讲链路、异常分支、指标和复盘动作。");
  await page.getByRole("button", { name: "AI评分并生成复盘" }).click();
  await page.getByLabel("AI评分结果").waitFor();
  await page.getByRole("button", { name: "保存口述与AI分析" }).click();
  await page.getByText("口述训练证据").first().waitFor();
  await waitForServerEvidence(page, baseUrl, "oral_score");
  await page.reload();
  await page.getByText(/薄弱 1 题/).waitFor();
  await page.getByText("口述训练证据").first().waitFor();
  await screenshot(page, "03-interview-weak-oral-persisted");
  const interviewSnapshot = await snapshotStorage(page, "03-after-interview");
  assert.ok(interviewSnapshot.react.evidenceTypes.includes("oral_score"));
  assert.strictEqual(interviewSnapshot.interviewWeakCount, 1);

  await gotoRoute(page, baseUrl, "/applications", "机会验证");
  await page.getByRole("button", { name: "新增机会记录" }).click();
  await fillApplication(page, {
    company: "功能测试公司A",
    role: "Java 后端工程师 A",
    source: "功能测试来源A",
    salaryRange: "25-35K",
    city: "杭州",
    resumeVersion: "functional-resume-a",
    keywords: "Java Spring MQ",
    status: "已记录",
    hrFeedback: "功能测试 HR 反馈 A",
    notes: "功能测试反馈摘要 A"
  });
  await page.getByRole("button", { name: "记录机会反馈" }).click();
  await page.getByText("功能测试公司A").waitFor();
  await page.getByRole("button", { name: "新增机会记录" }).click();
  await fillApplication(page, {
    company: "功能测试公司B",
    role: "Java 后端工程师 B",
    source: "功能测试来源B",
    salaryRange: "30-40K",
    city: "上海",
    resumeVersion: "functional-resume-b",
    keywords: "Java Redis 稳定性",
    status: "约面",
    hrFeedback: "功能测试 HR 反馈 B",
    notes: "功能测试反馈摘要 B"
  });
  await page.getByRole("button", { name: "记录机会反馈" }).click();
  await page.getByText("功能测试公司B").waitFor();
  await page.getByLabel("机会状态筛选").selectOption("约面");
  await page.getByText("功能测试公司B").waitFor();
  await page.getByRole("button", { name: /编辑机会记录：功能测试公司B/ }).click();
  await fillApplication(page, {
    company: "功能测试公司B",
    role: "Java 后端工程师 B 已编辑",
    source: "功能测试来源B",
    salaryRange: "30-40K",
    city: "上海",
    resumeVersion: "functional-resume-b",
    keywords: "Java Redis 稳定性",
    status: "约面",
    hrFeedback: "功能测试 HR 反馈 B 已编辑",
    notes: "功能测试反馈摘要 B 已编辑"
  });
  await page.getByRole("button", { name: "保存机会反馈" }).click();
  await page.getByText("Java 后端工程师 B 已编辑").waitFor();
  await page.getByLabel("机会状态筛选").selectOption("all");
  await page.getByRole("button", { name: /删除机会记录：功能测试公司A/ }).click();
  await page.getByText("功能测试公司A").waitFor({ state: "detached" });
  const applicationDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "生成本地导出" }).click();
  const applicationExportPath = await saveDownload(await applicationDownload, "react-applications-export.json");
  const applicationExport = JSON.parse(fs.readFileSync(applicationExportPath, "utf8"));
  assert.strictEqual(applicationExport.count, 1);
  assert.strictEqual(applicationExport.records[0].company, "功能测试公司B");
  await waitForServerRuntimeText(page, baseUrl, {
    includes: ["功能测试公司B", "Java 后端工程师 B 已编辑", "delivery_record"],
    excludes: ["功能测试公司A"]
  });
  await page.reload();
  await page.getByText("功能测试公司B").waitFor();
  assert.strictEqual(await page.getByText("功能测试公司A").count(), 0);
  await screenshot(page, "04-applications-crud-export-persisted");
  const applicationsSnapshot = await snapshotStorage(page, "04-after-applications");
  assert.ok(applicationsSnapshot.react.evidenceTypes.includes("delivery_record"));

  await gotoRoute(page, baseUrl, "/review", "复盘归因");
  await fillReview(page, {
    projectPoint: "功能测试项目点A",
    interviewQuestions: "功能测试面试题A1；功能测试面试题A2",
    javaPoint: "功能测试 Java 点A",
    pathIssues: "功能测试路径问题A",
    fragileAnswers: "功能测试薄弱回答A",
    tomorrowPriority: "功能测试明日优先A"
  });
  await page.getByRole("button", { name: "保存本地复盘" }).click();
  await page.getByText("项目点：功能测试项目点A", { exact: true }).waitFor();
  await fillReview(page, {
    projectPoint: "功能测试项目点B",
    interviewQuestions: "功能测试面试题B1；功能测试面试题B2",
    javaPoint: "功能测试 Java 点B",
    pathIssues: "功能测试路径问题B",
    fragileAnswers: "功能测试薄弱回答B",
    tomorrowPriority: "功能测试明日优先B"
  });
  await page.getByRole("button", { name: "保存本地复盘" }).click();
  await page.getByText("项目点：功能测试项目点B", { exact: true }).waitFor();
  await page.getByRole("button", { name: /编辑复盘记录 功能测试项目点B/ }).click();
  await fillReview(page, {
    projectPoint: "功能测试项目点B 已编辑",
    interviewQuestions: "功能测试面试题B1；功能测试面试题B2",
    javaPoint: "功能测试 Java 点B",
    pathIssues: "功能测试路径问题B",
    fragileAnswers: "功能测试薄弱回答B",
    tomorrowPriority: "功能测试明日优先B 已编辑"
  });
  await page.getByRole("button", { name: "更新本地复盘" }).click();
  await page.getByText("项目点：功能测试项目点B 已编辑", { exact: true }).waitFor();
  await page.getByRole("button", { name: /删除复盘记录 功能测试项目点A/ }).click();
  await page.getByText("项目点：功能测试项目点A", { exact: true }).waitFor({ state: "detached" });
  await page.getByLabel("复盘记录筛选").selectOption("has_tomorrow_priority");
  await page.getByRole("button", { name: "导出当前筛选复盘 JSON" }).click();
  const reviewPreview = await page.locator("pre").last().textContent();
  const reviewExport = JSON.parse(reviewPreview);
  assert.strictEqual(reviewExport.count, 1);
  assert.strictEqual(reviewExport.records[0].projectPoint, "功能测试项目点B 已编辑");
  fs.writeFileSync(path.join(downloadsDir, "react-review-export-preview.json"), JSON.stringify(reviewExport, null, 2));
  await waitForServerRuntimeText(page, baseUrl, {
    includes: ["功能测试项目点B 已编辑", "功能测试明日优先B 已编辑", "review"],
    excludes: ["功能测试项目点A"]
  });
  await page.reload();
  await page.getByText("项目点：功能测试项目点B 已编辑", { exact: true }).waitFor();
  assert.strictEqual(await page.getByText("项目点：功能测试项目点A", { exact: true }).count(), 0);
  await screenshot(page, "05-review-crud-export-persisted");
  const reviewSnapshot = await snapshotStorage(page, "05-after-review");
  assert.ok(reviewSnapshot.react.evidenceTypes.includes("review"));

  await gotoRoute(page, baseUrl, "/today", "今日 AI 教练");
  await page.getByText("口述训练证据").first().waitFor();
  await page.getByText("复盘证据").first().waitFor();
  await screenshot(page, "06-today-all-evidence-types");
  await gotoRoute(page, baseUrl, "/more", "更多入口");
  await page.getByText("已检测").waitFor();
  await page.getByText(/本地证据/).waitFor();
  const moreDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const moreExportPath = await saveDownload(await moreDownload, "job-sprint-react-state.json");
  const moreExport = JSON.parse(fs.readFileSync(moreExportPath, "utf8"));
  const moreEvidenceCount = Object.values(moreExport.evidenceByTaskId).flatMap((items) => items).length;
  assert.ok(moreEvidenceCount >= 5);
  assert.ok(moreExport.delayRecords.some((item) => item.reason === "功能测试延期原因"));
  assert.ok(moreExport.userProfiles.some((item) => item.name === "功能测试画像"));
  assert.ok(moreExport.knowledgeBoundaries.some((item) => item.topic.includes("功能测试MQ 幂等边界")));
  assert.ok(moreExport.coachScheduleEvents.some((item) => item.title === "功能测试AI 日程草稿 已编辑"));
  assert.ok(moreExport.aiArtifacts.some((item) => item.status === "accepted"));
  assert.ok(moreExport.aiArtifacts.some((item) => item.status === "rejected"));
  assert.ok(moreExport.llmRuns.some((item) => item.status === "fallback" || item.status === "success"));
  await screenshot(page, "07-more-export-persisted");
  const moreSnapshot = await snapshotStorage(page, "06-after-more");
  assert.ok(moreSnapshot.react.evidenceCount >= 5);
  assert.ok(moreSnapshot.react.completedCount >= 1);
  assert.ok(moreSnapshot.react.delayReasons.includes("功能测试延期原因"));
  assert.strictEqual(moreSnapshot.react.profileCount, 1);
  assert.ok(moreSnapshot.react.boundaryCount >= 2);
  assert.ok(moreSnapshot.react.scheduleEventCount >= 2);
  assert.strictEqual(moreSnapshot.react.aiArtifactCount, 3);
  assert.ok(moreSnapshot.react.llmRunCount >= 1);
  assertExpectedStorage(moreSnapshot, "desktop final snapshot");

  const desktopRawStorage = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
  await context.close();

  const reopenContext = await chromium.launchPersistentContext(persistentProfileDir, {
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 }
  });
  const reopenPage = reopenContext.pages()[0] || await reopenContext.newPage();
  await gotoRoute(reopenPage, baseUrl, "/more", "更多入口");
  await reopenPage.getByText("已检测").waitFor();
  await screenshot(reopenPage, "08-browser-restart-more-persisted");
  const reopenSnapshot = await snapshotStorage(reopenPage, "07-after-browser-restart");
  assert.ok(reopenSnapshot.react.evidenceCount >= 5);
  assert.ok(reopenSnapshot.react.completedCount >= 1);
  assert.strictEqual(reopenSnapshot.react.profileCount, 1);
  assert.ok(reopenSnapshot.react.boundaryCount >= 2);
  assert.ok(reopenSnapshot.react.scheduleEventCount >= 2);
  assert.strictEqual(reopenSnapshot.react.aiArtifactCount, 3);
  assert.ok(reopenSnapshot.react.llmRunCount >= 1);
  assert.strictEqual(reopenSnapshot.learningMarkedCount, 1);
  assert.strictEqual(reopenSnapshot.interviewWeakCount, 1);
  assert.ok(reopenSnapshot.react.delayReasons.includes("功能测试延期原因"));
  assertExpectedStorage(reopenSnapshot, "browser restart snapshot");
  assertSameExpectedStorage(moreSnapshot, reopenSnapshot, "browser restart should preserve expected localStorage bytes and hashes");
  await reopenContext.close();

  return {
    applicationExportPath,
    moreExportPath,
    finalSnapshot: moreSnapshot,
    browserRestartSnapshot: reopenSnapshot,
    rawStorage: desktopRawStorage
  };
}

async function runMobileReadback(baseUrl, rawStorage, desktopSnapshot) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  try {
    const page = await context.newPage();
    await login(page, baseUrl);
    await page.evaluate((entries) => {
      window.localStorage.clear();
      Object.entries(entries).forEach(([key, value]) => window.localStorage.setItem(key, value));
    }, rawStorage);
    await gotoRoute(page, baseUrl, "/today", "今日 AI 教练");
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem("jobSprint.react.v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const evidenceByTaskId = parsed.state?.evidenceByTaskId || {};
      const coach = parsed.state?.coach || {};
      const profiles = parsed.state?.userProfiles || coach.userProfiles || [];
      return Object.values(evidenceByTaskId).flatMap((items) => Array.isArray(items) ? items : []).length >= 5
        && Array.isArray(profiles)
        && profiles.length >= 1;
    });
    await screenshot(page, "09-mobile-today-readback");
    await gotoRoute(page, baseUrl, "/more", "更多入口");
    await page.getByText("已检测").waitFor();
    await screenshot(page, "10-mobile-more-readback");
    const snapshot = await snapshotStorage(page, "08-mobile-readback");
    assert.ok(snapshot.react.evidenceCount >= 5);
    assert.strictEqual(snapshot.react.profileCount, 1);
    assert.ok(snapshot.react.scheduleEventCount >= 2);
    assertExpectedStorage(snapshot, "mobile injected-storage snapshot");
    assertSameExpectedStorage(desktopSnapshot, snapshot, "mobile viewport should read the injected desktop storage without mutation");
    return snapshot;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runImportRestoreFlow(baseUrl) {
  const importPayloadPath = path.join(downloadsDir, "job-sprint-react-state-import.json");
  const importPayload = buildReactImportRestorePayload();
  fs.writeFileSync(importPayloadPath, JSON.stringify(importPayload, null, 2));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 }
  });
  try {
    const page = await context.newPage();
    await login(page, baseUrl);
    await gotoRoute(page, baseUrl, "/more", "更多入口");
    await page.getByLabel("导入 React 状态 JSON").setInputFiles(importPayloadPath);
    await page.getByText("React 本地状态已导入：完成 1 项，证据 1 条，延期 1 条，画像 1 个，边界反馈 0 条，AI 草稿 1 条，AI 运行 1 条").waitFor();
    await waitForServerRuntimeText(page, baseUrl, { includes: ["导入恢复证据", "导入恢复延期原因", "导入后补救动作", "导入恢复画像", "导入恢复 AI 草稿"] });
    await screenshot(page, "11-more-import-restore");
    const snapshot = await snapshotStorage(page, "09-after-more-import-restore");
    assert.ok(snapshot.react.evidenceTitles.includes("导入恢复证据"));
    assert.ok(snapshot.react.delayReasons.includes("导入恢复延期原因"));
    assert.strictEqual(snapshot.react.profileCount, 1);
    assert.strictEqual(snapshot.react.boundaryCount, 1);
    assert.strictEqual(snapshot.react.scheduleEventCount, 1);
    assert.strictEqual(snapshot.react.aiArtifactCount, 1);
    assert.strictEqual(snapshot.react.llmRunCount, 1);
    return {
      importPayloadPath,
      snapshot
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

(async () => {
  const server = await startServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const desktop = await runDesktopFlow(baseUrl);
    const mobileSnapshot = await runMobileReadback(baseUrl, desktop.rawStorage, desktop.browserRestartSnapshot);
    const importRestore = await runImportRestoreFlow(baseUrl);
    const { rawStorage, ...desktopReport } = desktop;
    void rawStorage;

    const report = {
      status: "PASS",
      baseUrl,
      runtimeDataPath: process.env.RUNTIME_DATA_PATH,
      evidenceRoot,
      screenshotsDir,
      downloadsDir,
      snapshotsDir,
      expectedStorageKeys: EXPECTED_STORAGE_KEYS,
      downloadsContainSyntheticExportsOnly: true,
      desktop: desktopReport,
      mobileSnapshot,
      importRestore
    };
    fs.writeFileSync(path.join(evidenceRoot, "react-functional-persistence-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

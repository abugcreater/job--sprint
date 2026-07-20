const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { execFileSync, spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const reactRequire = createRequire(path.join(ROOT, "apps", "react-web", "package.json"));
const { chromium } = reactRequire("playwright");

const TEST_USER = "rust-ui-user";
const TEST_PASSWORD = ["rust", "ui", "password"].join("-");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-rust-ui-"));
const dbPath = path.join(tmpDir, "runtime.sqlite");
const evidenceRoot = path.resolve(process.env.JOB_SPRINT_RUST_UI_EVIDENCE_DIR || path.join(ROOT, "docs/evidence/rust-functional"));
const screenshotsDir = path.join(evidenceRoot, "screenshots");

fs.mkdirSync(screenshotsDir, { recursive: true });

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayDateInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function requestJson(baseUrl, pathname, headers = {}) {
  const target = new URL(pathname, baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: target.hostname,
      port: target.port,
      path: target.pathname,
      method: "GET",
      headers
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, raw, json: raw ? JSON.parse(raw) : null });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`rust server exited early with code ${child.exitCode}`);
    }
    try {
      const res = await requestJson(baseUrl, "/api/health");
      if (res.status === 200 && res.json?.runtimeStorage === "sqlite") return;
    } catch (_) {
      // Keep polling while the Rust server starts.
    }
    await wait(250);
  }
  throw new Error("rust server did not become healthy");
}

function startRustServer(port) {
  const env = {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    JOB_SPRINT_RUNTIME_DB_PATH: dbPath,
    JOB_SPRINT_SESSION_SECRET: ["rust", "ui", "session", "secret", "long", "enough", "for", "tests"].join("-"),
    JOB_SPRINT_USERS_JSON: JSON.stringify({
      users: [
        {
          username: TEST_USER,
          displayName: "Rust UI User",
          role: "owner",
          dataScope: "rust-ui",
          passwordHash: sha256(TEST_PASSWORD)
        }
      ]
    }),
    JOB_SPRINT_AUTH_USER: "",
    JOB_SPRINT_AUTH_PASSWORD: "",
    JOB_SPRINT_AUTH_PASSWORD_SHA256: "",
    ANTHROPIC_BASE_URL: "",
    ANTHROPIC_AUTH_TOKEN: "",
    ANTHROPIC_MODEL: "",
    AI_PROVIDER_TIMEOUT_MS: ""
  };
  return spawn("cargo", ["run", "--quiet", "--manifest-path", "apps/rust-api/Cargo.toml"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
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

async function fillApplication(page, draft) {
  const form = page.locator("section[aria-labelledby='application-form-title']");
  await form.getByLabel("公司").fill(draft.company);
  await form.getByLabel("岗位").fill(draft.role);
  await form.getByLabel("状态").selectOption(draft.status);
  for (const details of [form.locator("details").nth(0), form.locator("details").nth(1)]) {
    if (!await details.evaluate((element) => element.open)) await details.locator("summary").click();
  }
  await form.getByLabel("来源").fill(draft.source);
  await form.getByLabel("薪资范围").fill(draft.salaryRange);
  await form.getByLabel("城市").fill(draft.city);
  await form.getByLabel("简历版本").fill(draft.resumeVersion);
  await form.getByLabel("JD 关键词").fill(draft.keywords);
  await form.getByLabel("沟通反馈").fill(draft.hrFeedback);
  await form.getByLabel("反馈摘要").fill(draft.notes);
}

async function fillReview(page, draft) {
  const form = page.locator("section[aria-labelledby='review-form-title']");
  await form.getByLabel("今天完成了什么可证明的结果？").fill(draft.projectPoint);
  await form.getByLabel("今天最大的卡点是什么？").fill(draft.pathIssues);
  await form.getByLabel("明天第一件事是什么？").fill(draft.tomorrowPriority);
  const optionalDetails = form.locator("details");
  if (!await optionalDetails.evaluate((element) => element.open)) {
    await optionalDetails.locator("summary").click();
  }
  await form.getByLabel("哪些面试题或表达已经能回答？").fill(draft.interviewQuestions);
  await form.getByLabel("今天补强了哪个知识边界？").fill(draft.javaPoint);
  await form.getByLabel("哪个回答还容易被追问？").fill(draft.fragileAnswers);
}

function waitForArtifactCount(page, minCount) {
  return page.waitForFunction(
    (count) => document.querySelectorAll('#coach-stage-advice input[aria-label^="AI 建议标题："]').length >= count,
    minCount,
    { timeout: 30000 }
  );
}

async function ensureArtifactCount(page, minCount) {
  const artifactInputs = page.locator('#coach-stage-advice input[aria-label^="AI 建议标题："]');
  if (await artifactInputs.count() >= minCount) return;
  await page.getByRole("button", { name: "生成 AI 建议" }).click();
  await waitForArtifactCount(page, minCount);
}

function artifactTypes(artifactTitles) {
  return artifactTitles.evaluateAll((inputs) => inputs.map((input) => {
    let node = input.parentElement;
    while (node && node.id !== "coach-artifacts") {
      const text = node.textContent || "";
      const type = ["knowledge_card", "interview_question", "daily_next_step"].find((candidate) => text.includes(candidate));
      if (type) return type;
      node = node.parentElement;
    }
    return "";
  }));
}

function waitForAcceptedArtifact(page, title) {
  return page.waitForFunction(
    (artifactTitle) => {
      const label = `接受 AI 建议：${artifactTitle}`;
      return [...document.querySelectorAll("#coach-stage-advice button[aria-label]")]
        .some((button) => button.getAttribute("aria-label") === label && button.disabled);
    },
    title,
    { timeout: 30000 }
  );
}

async function exerciseCoachAiDrafts(page, prefix) {
  await page.getByRole("button", { name: "生成 AI 建议" }).click();
  const artifactsPanel = page.locator("#coach-stage-advice");
  const artifactTitles = artifactsPanel.locator('input[aria-label^="AI 建议标题："]');
  const artifactBodies = artifactsPanel.locator('textarea[aria-label^="AI 建议内容："]');
  await waitForArtifactCount(page, 2);
  const types = await artifactTypes(artifactTitles);
  const knowledgeIndex = types.indexOf("knowledge_card");
  const actionIndex = types.findIndex((type, index) => type && type !== "knowledge_card" && index !== knowledgeIndex);
  assert.ok(knowledgeIndex >= 0, `AI artifacts should include a knowledge_card draft, got ${types.join(",")}`);
  assert.ok(actionIndex >= 0, `AI artifacts should include an action/interview draft, got ${types.join(",")}`);

  const knowledgeTitle = await artifactTitles.nth(knowledgeIndex).inputValue();
  await artifactsPanel.getByRole("button", { name: `接受 AI 建议：${knowledgeTitle}` }).click();
  await waitForAcceptedArtifact(page, knowledgeTitle);
  await artifactTitles.nth(actionIndex).fill(`${prefix}AI 日程草稿 已编辑`);
  await artifactBodies.nth(actionIndex).fill(`${prefix}AI 日程草稿内容：先补机制，再补项目证据。`);
  await artifactsPanel.getByRole("button", { name: "保存编辑" }).nth(actionIndex).click();
  await artifactsPanel.getByRole("button", { name: `接受 AI 建议：${prefix}AI 日程草稿 已编辑` }).click();
  await waitForAcceptedArtifact(page, `${prefix}AI 日程草稿 已编辑`);
  await ensureArtifactCount(page, 3);
}

async function exerciseCoachWorkspace(page, baseUrl, prefix) {
    await gotoRoute(page, baseUrl, "/coach", "准备工作台");
  await page.getByRole("button", { name: "改用详细画像表单" }).click();
  const profilePanel = page.getByLabel("当前准备阶段：确认求职画像");
  await profilePanel.getByLabel("画像名称").fill(`${prefix}画像`);
  await profilePanel.getByLabel("角色族", { exact: true }).selectOption("backend");
  await profilePanel.getByLabel("目标岗位", { exact: true }).fill(`${prefix}Java 后端教练`);
  await profilePanel.getByLabel("目标等级").fill("高级");
  await profilePanel.getByLabel("目标城市").fill("杭州 上海");
  await profilePanel.getByLabel("薪资目标").fill("30-40K");
  await profilePanel.getByLabel("公司类型").fill("业务平台 / AI 工程化");
  await profilePanel.getByLabel("每日分钟").fill("60");
  await profilePanel.getByLabel("经验摘要").fill(`${prefix}经验摘要：后端主线，能讲项目边界和稳定性。`);
  await profilePanel.getByLabel("项目证据").fill(`${prefix}项目证据：搜索链路和 MQ 幂等。`);
  await profilePanel.getByLabel("不可夸大边界").fill(`${prefix}不可夸大边界：不编造大模型训练经历。`);
  await profilePanel.getByRole("button", { name: "保存画像" }).click();
  await page.getByText("求职画像已保存，后续 AI 建议会引用这份画像。", { exact: true }).waitFor();

  await page.getByLabel("知识主题").fill(`${prefix}MQ 幂等边界`);
  await page.getByLabel("掌握程度").selectOption("了解");
  await page.getByLabel("当前缺口").fill(`${prefix}当前缺口：重复消费和补偿边界还需要讲清。`);
  await page.getByLabel("已有证据").fill(`${prefix}已有证据：项目里做过消息去重。`);
  await page.getByLabel("岗位用途").fill(`${prefix}岗位用途：后端稳定性追问。`);
  await page.getByRole("button", { name: "新增边界" }).click();
  await page.getByText("知识边界已保存。", { exact: true }).waitFor();

  await page.getByLabel("日程标题").fill(`${prefix}自定义日程`);
  await page.getByLabel("日期").fill(todayDateInShanghai());
  await page.getByLabel("开始").fill("21:00");
  await page.getByLabel("结束").fill("21:30");
  await page.getByLabel("日程类型").selectOption("interview");
  await page.getByLabel("安排原因").fill(`${prefix}安排原因：今晚用口述验证知识边界。`);
  await page.getByRole("button", { name: "新增日程" }).click();
  await page.getByText("自定义日程已加入今日 AI 教练。", { exact: true }).waitFor();

  await exerciseCoachAiDrafts(page, prefix);
}

async function waitForRuntimeText(baseUrl, cookieHeader, text) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const res = await requestJson(baseUrl, "/api/runtime", { cookie: cookieHeader });
    assert.strictEqual(res.status, 200, res.raw);
    if (JSON.stringify(res.json).includes(text)) return;
    await wait(200);
  }
  throw new Error(`runtime payload missing text: ${text}`);
}

function sqliteSnapshot() {
  const python = [
    "import json, sqlite3, sys",
    "conn = sqlite3.connect(sys.argv[1])",
    "cur = conn.cursor()",
    "rows = cur.execute('SELECT item_key, value FROM runtime_items WHERE scope=? ORDER BY item_key', ('rust-ui',)).fetchall()",
    "print(json.dumps({k: json.loads(v) for k, v in rows}, ensure_ascii=False))",
    "conn.close()"
  ].join("\n");
  const raw = execFileSync("python3", ["-c", python, dbPath], { encoding: "utf8" });
  return JSON.parse(raw);
}

async function runUiFlow(baseUrl) {
  const context = await chromium.launchPersistentContext(path.join(tmpDir, "chromium-profile"), {
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 }
  });
  const page = context.pages()[0] || await context.newPage();
  try {
    await login(page, baseUrl);
    await page.evaluate(() => window.localStorage.clear());

    await gotoRoute(page, baseUrl, "/today", "今日 AI 教练");
    await page.getByRole("heading", { name: /先导入真实经历/ }).waitFor();
    await exerciseCoachWorkspace(page, baseUrl, "RustSQLite");
    await gotoRoute(page, baseUrl, "/today", "今日 AI 教练");
    const lockedButton = page.getByRole("button", { name: "先补证据" });
    await lockedButton.waitFor();
    assert.strictEqual(await lockedButton.isDisabled(), true, "current task should be locked before evidence");
    await page.getByRole("button", { name: "补学习笔记" }).first().click();
    await page.getByLabel("证据内容").fill("Rust SQLite UI 测试学习笔记：输入内容必须进入证据。");
    await page.getByRole("button", { name: "保存证据" }).click();
    await page.getByText("学习笔记证据").first().waitFor();
    await page.getByRole("button", { name: "标记完成" }).click();
    await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem("jobSprint.react.v1") || "{}").state?.completed || {}).some(Boolean));
    await page.getByLabel("延期分钟").fill("35");
    await page.getByLabel("延期原因").fill("Rust SQLite 延期原因");
    await page.getByLabel("补救动作").fill("Rust SQLite 补救动作");
    await page.getByRole("button", { name: "登记延期" }).click();
    await page.getByText("35 分钟 · Rust SQLite 延期原因").waitFor();

    await gotoRoute(page, baseUrl, "/interview", "面试训练");
    await page.getByLabel("我的口述回答").fill("Rust SQLite UI 测试口述证据。");
    await page.getByRole("button", { name: "按规则自检" }).click();
    await page.getByLabel("规则自检结果").waitFor();
    await page.getByRole("button", { name: "保存口述证据" }).click();
    await page.getByText("已保存口述证据，并写入 Evidence Gate。", { exact: true }).waitFor();

    await gotoRoute(page, baseUrl, "/applications", "机会工作台");
    await page.getByRole("button", { name: "新增机会", exact: true }).click();
    await fillApplication(page, {
      company: "RustSQLite功能测试公司",
      role: "Rust SQLite Java 后端",
      source: "Rust UI 测试",
      salaryRange: "30-40K",
      city: "杭州",
      resumeVersion: "rust-ui-resume",
      keywords: "Rust SQLite React",
      status: "约面",
      hrFeedback: "Rust SQLite HR 反馈",
      notes: "Rust SQLite 摘要"
    });
    await page.getByRole("button", { name: "记录机会反馈" }).click();
    await page.getByText("RustSQLite功能测试公司").first().waitFor();

    await gotoRoute(page, baseUrl, "/review", "今日复盘");
    await fillReview(page, {
      projectPoint: "Rust SQLite UI 入库项目点",
      interviewQuestions: "Rust SQLite 题 1；Rust SQLite 题 2",
      javaPoint: "SQLite 持久化边界",
      pathIssues: "Rust UI 路径问题",
      fragileAnswers: "Rust UI 薄弱回答",
      tomorrowPriority: "继续补远端域名验收"
    });
    await page.getByRole("button", { name: "保存复盘" }).click();
    await page.getByRole("button", { name: "历史" }).click();
    await page.getByText("项目点：Rust SQLite UI 入库项目点", { exact: true }).waitFor();

    const cookies = await context.cookies(baseUrl);
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    await waitForRuntimeText(baseUrl, cookieHeader, "RustSQLite功能测试公司");
    await waitForRuntimeText(baseUrl, cookieHeader, "Rust SQLite UI 入库项目点");
    await waitForRuntimeText(baseUrl, cookieHeader, "Rust SQLite 延期原因");
    await waitForRuntimeText(baseUrl, cookieHeader, "RustSQLite画像");
    await waitForRuntimeText(baseUrl, cookieHeader, "RustSQLiteMQ 幂等边界");
    await waitForRuntimeText(baseUrl, cookieHeader, "RustSQLiteAI 日程草稿 已编辑");

    await gotoRoute(page, baseUrl, "/more", "账号与数据");
    await page.getByRole("button", { name: "备份" }).click();
    const currentReactState = await page.evaluate(() => {
      const raw = window.localStorage.getItem("jobSprint.react.v1");
      return raw ? JSON.parse(raw).state || {} : {};
    });
    const importPayloadPath = path.join(tmpDir, "rust-sqlite-react-state-import.json");
    const importPayload = {
      exportedAt: new Date().toISOString(),
      source: "jobSprint.react.v1",
      syncState: "online",
      sprint: {
        date: "2026-07-05",
        day: 5,
        totalDays: 30,
        currentTaskId: "rust-import-task"
      },
      completed: {
        ...(currentReactState.completed || {}),
        "rust-import-task": true
      },
      evidenceByTaskId: {
        ...(currentReactState.evidenceByTaskId || {}),
        "rust-import-task": [
          {
            id: "rust-import-evidence",
            taskId: "rust-import-task",
            type: "review",
            title: "Rust SQLite 导入恢复证据",
            content: "Rust SQLite 导入恢复内容",
            createdAt: new Date().toISOString(),
            verified: true
          }
        ]
      },
      delayRecords: [
        ...(Array.isArray(currentReactState.delayRecords) ? currentReactState.delayRecords : []),
        {
          id: "rust-import-delay",
          taskId: "rust-import-task",
          date: "2026-07-05",
          minutes: 45,
          reason: "Rust SQLite 导入延期原因",
          recoveryAction: "Rust SQLite 导入补救动作",
          createdAt: new Date().toISOString()
        }
      ],
      userProfiles: currentReactState.userProfiles || currentReactState.coach?.userProfiles || [],
      knowledgeBoundaries: currentReactState.knowledgeBoundaries || currentReactState.coach?.knowledgeBoundaries || [],
      coachScheduleEvents: currentReactState.coachScheduleEvents || currentReactState.coach?.coachScheduleEvents || [],
      aiArtifacts: currentReactState.aiArtifacts || currentReactState.coach?.aiArtifacts || [],
      llmRuns: currentReactState.llmRuns || currentReactState.coach?.llmRuns || []
    };
    fs.writeFileSync(importPayloadPath, JSON.stringify(importPayload, null, 2));
    await page.getByLabel("导入个人数据备份").setInputFiles(importPayloadPath);
    await page.getByText("个人数据备份已导入：完成").waitFor();
    await waitForRuntimeText(baseUrl, cookieHeader, "Rust SQLite 导入恢复证据");
    await waitForRuntimeText(baseUrl, cookieHeader, "Rust SQLite 导入延期原因");
    await waitForRuntimeText(baseUrl, cookieHeader, "RustSQLite画像");
    await page.screenshot({ path: path.join(screenshotsDir, "rust-sqlite-ui-flow.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

(async () => {
  const distIndex = path.join(ROOT, "apps/react-web/dist/index.html");
  assert.ok(fs.existsSync(distIndex), "apps/react-web/dist/index.html missing; run npm run build --prefix apps/react-web first");

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startRustServer(port);
  let stderr = "";
  server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  try {
    await waitForHealth(baseUrl, server);
    await runUiFlow(baseUrl);
    const db = sqliteSnapshot();
    for (const key of ["progress", "reviews", "applications", "interview_mistakes"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(db, key), `SQLite runtime_items missing ${key}`);
    }
    const rawDb = JSON.stringify(db);
    assert.ok(rawDb.includes("RustSQLite功能测试公司"), "SQLite applications should contain UI-created application");
    assert.ok(rawDb.includes("Rust SQLite UI 入库项目点"), "SQLite reviews should contain UI-created review");
    assert.ok(rawDb.includes("Rust SQLite UI 测试口述证据"), "SQLite interviewMistakes should contain UI-created oral evidence");
    assert.ok(rawDb.includes("learning_note"), "SQLite progress should contain today learning evidence");
    assert.ok(rawDb.includes("Rust SQLite 延期原因"), "SQLite progress should contain UI-created delay reason");
    assert.ok(rawDb.includes("RustSQLite画像"), "SQLite progress should contain UI-created coach profile");
    assert.ok(rawDb.includes("RustSQLiteMQ 幂等边界"), "SQLite progress should contain UI-created knowledge boundary");
    assert.ok(rawDb.includes("RustSQLiteAI 日程草稿 已编辑"), "SQLite progress should contain accepted AI schedule");
    assert.ok(rawDb.includes("coach-artifacts-v1"), "SQLite progress should contain AI run prompt version");
    assert.ok(rawDb.includes("Rust SQLite 导入恢复证据"), "SQLite reviews should contain imported restore evidence");
    assert.ok(rawDb.includes("Rust SQLite 导入延期原因"), "SQLite progress should contain imported delay reason");
    const llmRunCount = Array.isArray(db.progress.coach?.llmRuns) ? db.progress.coach.llmRuns.length : 0;
    assert.ok(llmRunCount >= 1, "SQLite progress should contain at least one AI run record");

    const report = {
      status: "PASS",
      baseUrl,
      dbPath,
      dbPathWasTemporary: true,
      evidenceRoot,
      runtimeItemKeys: Object.keys(db).sort(),
      progressBytes: JSON.stringify(db.progress).length,
      delayCount: Array.isArray(db.progress.delayRecords) ? db.progress.delayRecords.length : 0,
      profileCount: Array.isArray(db.progress.coach?.userProfiles) ? db.progress.coach.userProfiles.length : 0,
      boundaryCount: Array.isArray(db.progress.coach?.knowledgeBoundaries) ? db.progress.coach.knowledgeBoundaries.length : 0,
      scheduleEventCount: Array.isArray(db.progress.coach?.coachScheduleEvents) ? db.progress.coach.coachScheduleEvents.length : 0,
      aiArtifactCount: Array.isArray(db.progress.coach?.aiArtifacts) ? db.progress.coach.aiArtifacts.length : 0,
      llmRunCount,
      reviewCount: Object.keys(db.reviews).length,
      applicationCount: db.applications.length,
      interviewMistakeCount: db.interview_mistakes.length
    };
    fs.writeFileSync(path.join(evidenceRoot, "rust-sqlite-ui-persistence-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    server.kill("SIGTERM");
    await wait(500);
    if (server.exitCode === null) server.kill("SIGKILL");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

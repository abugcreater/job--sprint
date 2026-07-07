const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-smoke-"));
const TEST_USER = "test-user";
const TEST_PASSWORD = ["test", "password", "only"].join("-");
process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");
process.env.JOB_SPRINT_AUTH_USER = TEST_USER;
process.env.JOB_SPRINT_AUTH_PASSWORD = TEST_PASSWORD;
process.env.JOB_SPRINT_SESSION_SECRET = ["test", "session", "secret", "only", "long", "enough"].join("-");

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

function request(server, method, requestPath, body, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers
      }
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, raw, headers: res.headers }));
    });
    req.on("error", reject);
    if (body !== undefined) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(server) {
  const res = await request(server, "POST", "/api/auth/login", {
    username: TEST_USER,
    password: TEST_PASSWORD
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers["set-cookie"]);
  return res.headers["set-cookie"][0].split(";")[0];
}

async function getJson(server, requestPath, cookie) {
  const res = await request(server, "GET", requestPath, undefined, { cookie });
  assert.strictEqual(res.status, 200, requestPath);
  return JSON.parse(res.raw);
}

(async () => {
  const server = await startServer();
  try {
    let res = await request(server, "GET", "/");
    assert.strictEqual(res.status, 302);
    assert.match(res.headers.location, /\/login\.html/);
    assert.match(decodeURIComponent(res.headers.location), /\/react\/index\.html#\/today/);

    res = await request(server, "GET", "/schedule.html");
    assert.strictEqual(res.status, 302);
    assert.match(res.headers.location, /\/login\.html/);

    res = await request(server, "GET", "/login.html");
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /登录 AI 求职教练/);
    assert.match(res.raw, /loginForm/);

    res = await request(server, "GET", "/data/schedule.json");
    assert.strictEqual(res.status, 401);

    const cookie = await login(server);

    res = await request(server, "GET", "/", undefined, { cookie });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(decodeURIComponent(res.headers.location), "/react/index.html#/today");

    res = await request(server, "GET", "/react/index.html", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /React 版 Job Sprint/);
    assert.match(res.raw, /id="root"/);
    assert.match(res.raw, /src="\.\/assets\/index-[^"]+\.js"/);

    const reactScriptMatch = res.raw.match(/src="\.\/assets\/([^"]+\.js)"/);
    assert.ok(reactScriptMatch, "React index should reference a built JS asset");
    res = await request(server, "GET", `/react/assets/${reactScriptMatch[1]}`, undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /React/);

    res = await request(server, "GET", "/schedule.html", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /AI 求职教练/);
    assert.match(res.raw, /当前任务/);
    assert.match(res.raw, /今日/);
    assert.match(res.raw, /日程/);
    assert.match(res.raw, /知识/);
    assert.match(res.raw, /面试/);
    assert.match(res.raw, /知识库/);
    assert.match(res.raw, /机会/);
    assert.match(res.raw, /复盘/);
    assert.match(res.raw, /维护/);
    assert.match(res.raw, /设置/);
    assert.match(res.raw, /id="sectionNav"/);
    assert.match(res.raw, /今日时间线/);
    assert.match(res.raw, /维护与导出/);
    assert.match(res.raw, /计划设置/);
    assert.match(res.raw, /本地面试知识库/);
    assert.match(res.raw, /generateKbBtn/);
    assert.match(res.raw, /kbGenerateForm/);
    assert.match(res.raw, /根据我的背景生成/);
    assert.match(res.raw, /机会记录/);
    assert.match(res.raw, /证据状态/);
    assert.match(res.raw, /evidenceStatusCard/);
    assert.match(res.raw, /去复盘补证据/);
    assert.match(res.raw, /todayInterviewText/);
    assert.match(res.raw, /开始口述一题/);
    assert.match(res.raw, /coach-primary-card/);
    assert.match(res.raw, /待重练错题/);
    assert.match(res.raw, /mistakeList/);
    assert.match(res.raw, /runtimeNotice/);
    assert.match(res.raw, /applicationCards/);
    assert.match(res.raw, /application-table-wrap/);
    assert.match(res.raw, /delayImpactSummary/);
    assert.match(res.raw, /查看下一项补做/);
    const mainFilterMarkup = res.raw.match(/id="primaryFilters"[\s\S]*?<\/section>/);
    assert.ok(mainFilterMarkup);
    assert.ok(!/Android|部署|路径缺失/.test(mainFilterMarkup[0]));
    const toolsMarkup = res.raw.match(/data-view="tools"[\s\S]*?data-view="settings"/);
    assert.ok(toolsMarkup);
    assert.ok(!/工程工具/.test(toolsMarkup[0]));
    assert.match(toolsMarkup[0], /APK/);
    assert.match(toolsMarkup[0], /云端发布/);
    assert.match(toolsMarkup[0], /路径审计/);

    res = await request(server, "GET", "/assets/schedule.js");
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /loadServerRuntimeState/);
    assert.match(res.raw, /CATEGORY_META/);
    assert.match(res.raw, /NAV_META/);
    assert.match(res.raw, /function renderSectionNav/);
    assert.match(res.raw, /openTaskDetail/);
    assert.match(res.raw, /renderTaskDetailSheet/);
    assert.match(res.raw, /openKbDetail/);
    assert.match(res.raw, /renderKbDetailSheet/);
    assert.match(res.raw, /generateKnowledgeEntries/);
    assert.match(res.raw, /GENERATED_KB_KEY/);
    assert.match(res.raw, /window\.AndroidSpeech/);
    assert.match(res.raw, /APPLICATION_STATUSES/);
    assert.match(res.raw, /delayRecoverySummary/);
    assert.match(res.raw, /查看计划设置/);
    assert.match(res.raw, /localStorage fallback/);

    res = await request(server, "GET", "/assets/auth.js");
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes('next.startsWith("//")'));

    res = await request(server, "GET", "/assets/schedule.css");
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /\.status-grid/);
    assert.match(res.raw, /\.application-cards/);
    assert.match(res.raw, /\.delay-impact-card/);
    assert.match(res.raw, /\.runtime-notice/);
    assert.match(res.raw, /padding-bottom: calc\(82px \+ env\(safe-area-inset-bottom/);
    assert.match(res.raw, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(res.raw, /position: fixed/);
    assert.match(res.raw, /--shell-max:\s*1680px/);
    assert.match(res.raw, /padding-inline:\s*max\(24px,\s*calc\(\(100vw - var\(--shell-max\)\) \/ 2\)\)/);
    assert.match(res.raw, /width:\s*min\(var\(--shell-max\),\s*calc\(100% - 48px\)\)/);
    assert.match(res.raw, /\.today-ops-grid\s*\{\s*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(res.raw, /\.countdown-row\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*1fr/);
    assert.match(res.raw, /\.countdown-row \.primary-btn\s*\{\s*width:\s*100%/);
    assert.match(res.raw, /\.bottom-sheet/);
    assert.match(res.raw, /\.kb-summary/);
    assert.match(res.raw, /\.right-column\s*\{\s*display:\s*none/);

    const schedule = await getJson(server, "/data/schedule.json", cookie);
    assert.ok(Array.isArray(schedule.days));
    assert.ok(schedule.days.length >= 14);

    const kb = await getJson(server, "/data/interview_kb.json", cookie);
    assert.ok(Array.isArray(kb.entries));
    assert.ok(kb.entries.length > 0);

    const context = await getJson(server, "/data/interview_context.json", cookie);
    assert.ok(context.profile);

    res = await request(server, "POST", "/api/score-answer", {
      question: "G1 和 ZGC 的差异是什么？",
      answer: "第一，G1 以 region 分区和可预测停顿为目标；第二，ZGC 强调低停顿并发标记和并发搬迁；第三，面试要补充业务延迟、堆大小和排查证据。",
      expectedKeywords: ["G1", "ZGC", "停顿", "并发"]
    }, { cookie });
    assert.strictEqual(res.status, 200);
    const score = JSON.parse(res.raw);
    assert.ok(Number.isFinite(score.score));
    assert.ok(!res.raw.includes(process.env.ANTHROPIC_AUTH_TOKEN || "no-token"));

    res = await request(server, "GET", "/../apps/server/app.js");
    assert.strictEqual(res.status, 403);

    res = await request(server, "GET", "/job-sprint/schedule.html", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /计划设置/);

    res = await request(server, "GET", "/job-sprint/assets/schedule.js");
    assert.strictEqual(res.status, 200);

    res = await request(server, "GET", "/job-sprint/data/schedule.json", undefined, { cookie });
    assert.strictEqual(res.status, 200);

    res = await request(server, "GET", "/job-sprint/api/health");
    assert.strictEqual(res.status, 200);

    console.log("page smoke tests passed");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

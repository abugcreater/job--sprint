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
    assert.match(res.raw, /正在进入 Job Sprint/);
    assert.match(res.raw, /导入画像 -> 生成个人日历/);
    assert.match(res.raw, /旧静态日程不再作为用户入口/);
    assert.match(res.raw, /\.\/react\/index\.html#\/today/);
    assert.doesNotMatch(res.raw, /id="sectionNav"/);
    assert.doesNotMatch(res.raw, /今日时间线/);
    assert.doesNotMatch(res.raw, /本地面试知识库/);

    res = await request(server, "GET", "/assets/schedule.js");
    assert.strictEqual(res.status, 200);
    assert.match(res.raw, /CATEGORY_META/);
    assert.match(res.raw, /NAV_META/);
    assert.match(res.raw, /reactTodayPath/);
    assert.match(res.raw, /window\.location\.replace/);
    assert.doesNotMatch(res.raw, /function renderSectionNav/);
    assert.doesNotMatch(res.raw, /loadServerRuntimeState/);

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
    assert.strictEqual(schedule.days.length, 0);
    assert.match(schedule.positioning, /用户先导入画像/);

    const kb = await getJson(server, "/data/interview_kb.json", cookie);
    assert.ok(Array.isArray(kb.entries));
    assert.strictEqual(kb.entries.length, 0);
    assert.match(kb.scope, /空知识库占位/);

    const context = await getJson(server, "/data/interview_context.json", cookie);
    assert.strictEqual(context.profile, null);
    assert.ok(Array.isArray(context.questionBank));
    assert.ok(context.scoringRubric);

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
    assert.match(res.raw, /正在进入 Job Sprint/);
    assert.match(res.raw, /\.\/react\/index\.html#\/today/);

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

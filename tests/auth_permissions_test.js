const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-auth-"));
const KAI_PASSWORD = ["kai", "test", "password"].join("-");
const GUEST_PASSWORD = ["guest", "test", "password"].join("-");
const ALEX_PASSWORD = ["alex", "test", "password"].join("-");
const BEARER_TOKEN = ["opaque", "test", "token"].join("-");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

delete process.env.JOB_SPRINT_AUTH_USER;
delete process.env.JOB_SPRINT_AUTH_PASSWORD;
delete process.env.JOB_SPRINT_AUTH_PASSWORD_SHA256;
process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");
process.env.JOB_SPRINT_SESSION_SECRET = ["test", "session", "secret", "for", "multi", "user", "auth"].join("-");
process.env.JOB_SPRINT_USERS_JSON = JSON.stringify({
  users: [
    {
      username: "kai",
      displayName: "Kai",
      role: "owner",
      dataScope: "kai",
      inviteBatch: "2026-07-alpha",
      passwordHash: sha256(KAI_PASSWORD)
    },
    {
      username: "guest",
      displayName: "访客",
      role: "viewer",
      dataScope: "guest",
      passwordHash: sha256(GUEST_PASSWORD)
    },
    {
      username: "alex",
      displayName: "Alex",
      role: "coach",
      dataScope: "alex",
      inviteBatch: "2026-07-alpha",
      passwordHash: sha256(ALEX_PASSWORD)
    }
  ]
});
process.env.JOB_SPRINT_BEARER_TOKENS_JSON = JSON.stringify({
  tokens: [
    {
      label: "test automation",
      username: "kai",
      tokenHash: sha256(BEARER_TOKEN),
      permissions: ["runtime:write", "ai:use"]
    }
  ]
});

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
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers
      }
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch (_) {
          json = null;
        }
        resolve({ status: res.statusCode, raw, json, headers: res.headers });
      });
    });
    req.on("error", reject);
    if (body !== undefined) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(server, username, password) {
  const res = await request(server, "POST", "/api/auth/login", { username, password });
  assert.strictEqual(res.status, 200, res.raw);
  assert.ok(res.headers["set-cookie"]);
  return res.headers["set-cookie"][0].split(";")[0];
}

function coachRuntime({
  prefix,
  profileId,
  roleFamily,
  targetRole,
  boundaryTopic,
  scheduleTitle,
  artifactTitle,
  timestamp
}) {
  return {
    progress: {
      coach: {
        userProfiles: [{
          id: profileId,
          name: `${prefix}画像`,
          roleFamily,
          targetRole,
          targetLevel: "高级",
          cities: "杭州",
          salaryTarget: "面议",
          companyTypes: "产品型公司",
          experienceSummary: `${prefix}经验摘要`,
          projectEvidence: `${prefix}项目证据`,
          nonClaims: `${prefix}不可夸大边界`,
          dailyMinutes: 60,
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }],
        knowledgeBoundaries: [{
          id: `boundary-${profileId}`,
          profileId,
          topic: boundaryTopic,
          level: "可讲",
          gap: `${prefix}需要补齐的知识边界`,
          evidence: `${prefix}已有证据`,
          targetUse: `${targetRole} JD`,
          createdAt: timestamp,
          updatedAt: timestamp
        }],
        coachScheduleEvents: [{
          id: `event-${profileId}`,
          profileId,
          date: "2026-07-06",
          start: "20:00",
          end: "20:30",
          kind: "learning",
          title: scheduleTitle,
          reason: `${prefix}自己的日程建议`,
          evidenceRequired: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }],
        aiArtifacts: [{
          id: `artifact-${profileId}`,
          profileId,
          type: "knowledge_card",
          title: artifactTitle,
          body: `只引用${prefix}的画像和知识边界。`,
          reason: `来自${prefix}知识边界`,
          sources: [`画像：${targetRole}`, `知识边界：${boundaryTopic}`],
          confidence: "high",
          status: "draft",
          targetDate: "2026-07-06",
          createdAt: timestamp,
          updatedAt: timestamp
        }]
      },
      lastSavedAt: timestamp
    },
    reviews: {},
    applications: [],
    interviewMistakes: []
  };
}

(async () => {
  const server = await startServer();
  try {
    let res = await request(server, "GET", "/api/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.authConfigured, true);
    assert.strictEqual(res.json.userCount, 3);
    assert.strictEqual(res.json.bearerTokenCount, 1);
    assert.ok(!res.raw.includes(KAI_PASSWORD));
    assert.ok(!res.raw.includes(GUEST_PASSWORD));
    assert.ok(!res.raw.includes(BEARER_TOKEN));

    const guestCookie = await login(server, "guest", GUEST_PASSWORD);
    res = await request(server, "GET", "/api/auth/session", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.user.username, "guest");
    assert.strictEqual(res.json.user.role, "viewer");
    assert.strictEqual(res.json.user.readOnly, true);
    assert.ok(res.json.user.permissions.includes("module:today"));
    assert.ok(!res.json.user.permissions.includes("runtime:write"));

    res = await request(server, "GET", "/api/progress", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.readOnly, true);
    assert.deepStrictEqual(res.json.progress, {});

    res = await request(server, "POST", "/api/progress", { "block-1": true }, { cookie: guestCookie });
    assert.strictEqual(res.status, 403);

    res = await request(server, "POST", "/api/score-answer", {
      question: "Spring 事务传播级别？",
      answer: "先讲 REQUIRED，再讲异常回滚边界。"
    }, { cookie: guestCookie });
    assert.strictEqual(res.status, 403);

    res = await request(server, "GET", "/data/interview_context.json", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes("public-safe"));
    assert.ok(res.raw.includes("候选人"));
    assert.ok(!res.raw.includes("候选人"));
    assert.ok(!res.raw.includes("/path/to/local-user"));

    res = await request(server, "GET", "/assets/embedded-data.js", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes("public-safe"));
    assert.ok(!res.raw.includes("/path/to/local-user"));

    const alexCookie = await login(server, "alex", ALEX_PASSWORD);
    res = await request(server, "GET", "/api/auth/session", undefined, { cookie: alexCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.user.username, "alex");
    assert.strictEqual(res.json.user.role, "coach");
    assert.strictEqual(res.json.user.dataScope, "alex");
    assert.strictEqual(res.json.user.inviteBatch, "2026-07-alpha");
    assert.strictEqual(res.json.user.readOnly, false);

    res = await request(server, "POST", "/api/runtime", {
      data: coachRuntime({
        prefix: "Alex 前端",
        profileId: "profile-alex",
        roleFamily: "frontend",
        targetRole: "前端工程师",
        boundaryTopic: "前端性能边界",
        scheduleTitle: "Alex 补前端性能证据",
        artifactTitle: "Alex 前端性能表达卡",
        timestamp: "2026-07-06T10:00:00.000Z"
      })
    }, { cookie: alexCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.progress.coach.userProfiles[0].name, "Alex 前端画像");

    const kaiCookie = await login(server, "kai", KAI_PASSWORD);
    res = await request(server, "GET", "/api/auth/session", undefined, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.user.username, "kai");
    assert.strictEqual(res.json.user.readOnly, false);

    res = await request(server, "GET", "/data/interview_context.json", undefined, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes("候选人"));
    assert.ok(res.raw.includes("/path/to/local-user"));

    res = await request(server, "POST", "/api/progress", { "kai-block": true }, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.progress["kai-block"], true);

    const kaiRuntime = coachRuntime({
      prefix: "Kai 后端",
      profileId: "profile-kai",
      roleFamily: "backend",
      targetRole: "后端工程师",
      boundaryTopic: "MQ 幂等边界",
      scheduleTitle: "Kai 讲 MQ 幂等",
      artifactTitle: "Kai MQ 幂等追问",
      timestamp: "2026-07-06T10:05:00.000Z"
    });
    kaiRuntime.progress["kai-block"] = true;
    res = await request(server, "POST", "/api/runtime", { data: kaiRuntime }, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.progress.coach.userProfiles[0].name, "Kai 后端画像");

    res = await request(server, "GET", "/api/runtime", undefined, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.progress.coach.userProfiles[0].name, "Kai 后端画像");
    assert.strictEqual(res.raw.includes("Alex 前端画像"), false);
    assert.strictEqual(res.raw.includes("Alex 补前端性能证据"), false);

    res = await request(server, "GET", "/api/runtime", undefined, { cookie: alexCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.progress.coach.userProfiles[0].name, "Alex 前端画像");
    assert.strictEqual(res.json.data.progress.coach.knowledgeBoundaries[0].topic, "前端性能边界");
    assert.strictEqual(res.json.data.progress.coach.coachScheduleEvents[0].title, "Alex 补前端性能证据");
    assert.strictEqual(res.json.data.progress.coach.aiArtifacts[0].title, "Alex 前端性能表达卡");
    assert.strictEqual(res.raw.includes("Kai 后端画像"), false);
    assert.strictEqual(res.raw.includes("Kai 讲 MQ 幂等"), false);

    const envelope = JSON.parse(fs.readFileSync(process.env.RUNTIME_DATA_PATH, "utf8"));
    assert.strictEqual(envelope.users.kai.progress.coach.userProfiles[0].name, "Kai 后端画像");
    assert.strictEqual(envelope.users.alex.progress.coach.userProfiles[0].name, "Alex 前端画像");
    assert.strictEqual(JSON.stringify(envelope.users.kai).includes("Alex 前端画像"), false);
    assert.strictEqual(JSON.stringify(envelope.users.alex).includes("Kai 后端画像"), false);

    res = await request(server, "GET", "/api/coach/invitations", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 403);

    res = await request(server, "GET", "/api/coach/invitations", undefined, { cookie: alexCookie });
    assert.strictEqual(res.status, 403);

    res = await request(server, "GET", "/api/coach/invitations", undefined, {
      authorization: `Bearer ${BEARER_TOKEN}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.ok, true);

    res = await request(server, "POST", "/api/coach/invitations", {
      username: "mia",
      displayName: "Mia",
      dataScope: "mia",
      inviteBatch: "2026-07-beta",
      templateVersion: "jd-focus-v1",
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      status: "invited",
      note: "首批泛 IT 试用用户"
    }, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invitation.username, "mia");
    assert.strictEqual(res.json.invitation.inviteBatch, "2026-07-beta");
    assert.strictEqual(res.json.invitation.templateVersion, "jd-focus-v1");
    assert.strictEqual(res.json.summary.invitedCount, 1);
    assert.strictEqual(res.json.summary.templateVersionCount, 1);
    assert.strictEqual(res.json.summary.nextActionLabel, "为 active 用户开通账号、发送登录入口，并跟进首登完成率。");

    res = await request(server, "GET", "/api/coach/invitations", undefined, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invitations[0].username, "mia");
    assert.strictEqual(res.json.invitations[0].templateVersion, "jd-focus-v1");
    assert.strictEqual(res.json.configuredUsers.length, 3);
    assert.strictEqual(res.json.configuredUsers[0].inviteBatch, "2026-07-alpha");

    const invitationEnvelope = JSON.parse(fs.readFileSync(process.env.RUNTIME_DATA_PATH, "utf8"));
    assert.strictEqual(invitationEnvelope.users.kai.progress.coachInvitations[0].username, "mia");
    assert.strictEqual(invitationEnvelope.users.kai.progress.coachInvitations[0].roleFamily, "qa");
    assert.strictEqual(invitationEnvelope.users.kai.progress.coachInvitations[0].templateVersion, "jd-focus-v1");
    assert.strictEqual(JSON.stringify(invitationEnvelope.users.alex).includes("mia"), false);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "batch-status",
      inviteBatch: "2026-07-beta",
      status: "paused"
    }, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.batchAction.status, "PASS");
    assert.strictEqual(res.json.batchAction.affectedCount, 1);
    assert.strictEqual(res.json.invitations[0].status, "paused");

    res = await request(server, "DELETE", "/api/coach/invitations?username=mia", undefined, { cookie: kaiCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.deletion.status, "PASS");
    assert.strictEqual(res.json.deletion.removedCount, 1);
    assert.strictEqual(res.json.invitations.some((invitation) => invitation.username === "mia"), false);

    res = await request(server, "GET", "/api/progress", undefined, { cookie: guestCookie });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.json.progress, {});

    res = await request(server, "GET", "/api/progress", undefined, {
      authorization: `Bearer ${BEARER_TOKEN}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.progress["kai-block"], true);

    res = await request(server, "POST", "/api/progress", { "bearer-block": true }, {
      authorization: `Bearer ${BEARER_TOKEN}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.progress["bearer-block"], true);

    res = await request(server, "GET", "/api/progress", undefined, {
      authorization: "Bearer wrong-token"
    });
    assert.strictEqual(res.status, 401);

    console.log("auth permissions tests passed");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

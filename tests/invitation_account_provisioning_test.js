const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-invite-account-"));
const usersFile = path.join(tmpDir, "users.json");
const runtimePath = path.join(tmpDir, "runtime.json");
const ownerLoginText = ["Owner", "pass", "2026!"].join("-");
const firstLoginText = ["Mia", "pass", "2026!"].join("-");
const resetLoginText = ["Mia", "reset", "2026!"].join("-");
const leoLoginText = ["Leo", "pass", "2026!"].join("-");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

delete process.env.JOB_SPRINT_USERS_JSON;
delete process.env.JOB_SPRINT_AUTH_USER;
delete process.env.JOB_SPRINT_AUTH_PASSWORD;
delete process.env.JOB_SPRINT_AUTH_PASSWORD_SHA256;
process.env.RUNTIME_DATA_PATH = runtimePath;
process.env.JOB_SPRINT_USERS_FILE = usersFile;
process.env.JOB_SPRINT_SESSION_SECRET = ["invite", "account", "provisioning", "session", "secret"].join("-");
fs.writeFileSync(usersFile, JSON.stringify({
  users: [{
    username: "kai",
    displayName: "Kai",
    role: "owner",
    dataScope: "kai",
    inviteBatch: "2026-07-alpha",
    passwordHash: sha256(ownerLoginText)
  }]
}, null, 2));

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
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(server, username, password, expectedStatus = 200) {
  const res = await request(server, "POST", "/api/auth/login", { username, password });
  assert.strictEqual(res.status, expectedStatus, res.raw);
  return expectedStatus === 200 ? res.headers["set-cookie"][0].split(";")[0] : null;
}

(async () => {
  const server = await startServer();
  try {
    const ownerCookie = await login(server, "kai", ownerLoginText);
    let res = await request(server, "GET", "/api/coach/invitations", undefined, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.accountProvisioning.enabled, true);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "bulk-import",
      records: [
        {
          username: "nora",
          displayName: "Nora",
          dataScope: "nora",
          inviteBatch: "2026-07-import",
          templateVersion: "jd-focus-v1",
          roleFamily: "data",
          targetRole: "数据分析师",
          status: "invited",
          note: "批量导入试用用户"
        },
        {
          username: "dev",
          displayName: "Dev",
          dataScope: "dev",
          inviteBatch: "2026-07-import",
          templateVersion: "role-family-v1",
          roleFamily: "frontend",
          targetRole: "前端工程师",
          status: "invited"
        }
      ]
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.importAction.status, "PASS");
    assert.strictEqual(res.json.importAction.importedCount, 2);
    assert.strictEqual(res.json.summary.totalInvitations, 2);
    assert.ok(res.json.invitations.some((invitation) => invitation.username === "nora"));
    assert.ok(!res.json.configuredUsers.some((user) => user.username === "nora"));

    res = await request(server, "POST", "/api/coach/invitations", {
      username: "mia",
      displayName: "Mia",
      dataScope: "mia",
      inviteBatch: "2026-07-beta",
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      status: "invited",
      provisionAccount: true,
      accountRole: "coach",
      password: firstLoginText,
      note: "首批泛 IT 试用用户"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.invitation.status, "active");
    assert.strictEqual(res.json.accountProvisioning.status, "PASS");
    assert.strictEqual(res.json.accountProvisioning.action, "created");
    assert.strictEqual(res.json.accountProvisioning.canLogin, true);
    assert.ok(res.json.configuredUsers.some((user) => user.username === "mia"));
    assert.ok(!res.raw.includes(firstLoginText));
    assert.ok(!res.raw.includes(sha256(firstLoginText)));

    let usersConfig = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    const miaUser = usersConfig.users.find((user) => user.username === "mia");
    assert.strictEqual(miaUser.role, "coach");
    assert.strictEqual(miaUser.dataScope, "mia");
    assert.strictEqual(miaUser.passwordHash, sha256(firstLoginText));
    assert.ok(!fs.readFileSync(usersFile, "utf8").includes(firstLoginText));

    const miaCookie = await login(server, "mia", firstLoginText);
    res = await request(server, "GET", "/api/auth/session", undefined, { cookie: miaCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.user.username, "mia");
    assert.strictEqual(res.json.user.dataScope, "mia");
    assert.strictEqual(res.json.user.inviteBatch, "2026-07-beta");

    res = await request(server, "POST", "/api/runtime", {
      data: {
        progress: { coach: { userProfiles: [{ id: "profile-mia", name: "Mia 测试开发画像", active: true }] } },
        reviews: {},
        applications: [],
        interviewMistakes: []
      }
    }, { cookie: miaCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.progress.coach.userProfiles[0].name, "Mia 测试开发画像");

    res = await request(server, "GET", "/api/runtime", undefined, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.raw.includes("Mia 测试开发画像"), false);

    res = await request(server, "POST", "/api/coach/invitations", {
      username: "mia",
      displayName: "Mia",
      dataScope: "mia",
      inviteBatch: "2026-07-beta",
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      status: "active",
      provisionAccount: true,
      accountRole: "coach",
      password: resetLoginText
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountProvisioning.action, "password_reset");
    await login(server, "mia", firstLoginText, 401);
    await login(server, "mia", resetLoginText);

    usersConfig = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    assert.strictEqual(usersConfig.users.find((user) => user.username === "mia").passwordHash, sha256(resetLoginText));

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-status",
      username: "mia",
      action: "disable"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountAction.status, "PASS");
    assert.strictEqual(res.json.accountAction.disabled, true);
    assert.strictEqual(res.json.configuredUsers.find((user) => user.username === "mia").disabled, true);
    await login(server, "mia", resetLoginText, 401);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-status",
      username: "mia",
      action: "enable"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountAction.status, "PASS");
    assert.strictEqual(res.json.accountAction.disabled, false);
    await login(server, "mia", resetLoginText);

    res = await request(server, "POST", "/api/coach/invitations", {
      username: "leo",
      displayName: "Leo",
      dataScope: "leo",
      inviteBatch: "2026-07-beta",
      roleFamily: "backend",
      targetRole: "后端工程师",
      status: "invited",
      provisionAccount: true,
      accountRole: "coach",
      password: leoLoginText
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountProvisioning.action, "created");
    await login(server, "leo", leoLoginText);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "notification-draft",
      usernames: ["mia", "leo"],
      channel: "im",
      baseUrl: "https://example.test"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.notificationAction.status, "PASS");
    assert.strictEqual(res.json.notificationAction.generatedCount, 2);
    assert.strictEqual(res.json.notificationAction.notifications[0].loginUrl, "https://example.test/job-sprint/react/index.html");
    assert.match(res.json.notificationAction.notifications[0].body, /密码请通过单独安全渠道/);
    assert.ok(!res.raw.includes(resetLoginText));
    assert.ok(!res.raw.includes(leoLoginText));
    assert.ok(!res.raw.includes(sha256(resetLoginText)));
    assert.ok(!res.raw.includes(sha256(leoLoginText)));

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-batch-status",
      usernames: ["mia", "leo", "kai", "ghost"],
      action: "disable"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountBatchAction.status, "PASS");
    assert.strictEqual(res.json.accountBatchAction.affectedCount, 2);
    assert.strictEqual(res.json.accountBatchAction.skippedCount, 2);
    assert.strictEqual(res.json.configuredUsers.find((user) => user.username === "mia").disabled, true);
    assert.strictEqual(res.json.configuredUsers.find((user) => user.username === "leo").disabled, true);
    await login(server, "mia", resetLoginText, 401);
    await login(server, "leo", leoLoginText, 401);
    await login(server, "kai", ownerLoginText);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-batch-status",
      usernames: ["mia", "leo"],
      action: "enable"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountBatchAction.affectedCount, 2);
    await login(server, "mia", resetLoginText);
    await login(server, "leo", leoLoginText);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-status",
      username: "kai",
      action: "disable"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 400);
    assert.match(res.json.accountAction.message, /owner/);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-status",
      username: "mia",
      action: "delete"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountAction.status, "PASS");
    assert.strictEqual(res.json.accountAction.removedCount, 1);
    assert.strictEqual(res.json.configuredUsers.some((user) => user.username === "mia"), false);
    await login(server, "mia", resetLoginText, 401);

    res = await request(server, "POST", "/api/coach/invitations", {
      operation: "account-batch-status",
      usernames: ["leo"],
      action: "delete"
    }, { cookie: ownerCookie });
    assert.strictEqual(res.status, 200, res.raw);
    assert.strictEqual(res.json.accountBatchAction.affectedCount, 1);
    assert.strictEqual(res.json.configuredUsers.some((user) => user.username === "leo"), false);
    await login(server, "leo", leoLoginText, 401);
    console.log("invitation account provisioning tests passed");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

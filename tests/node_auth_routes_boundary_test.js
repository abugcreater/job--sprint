const assert = require("assert");
const crypto = require("crypto");
const { PassThrough } = require("stream");

const validPassword = ["correct", "password"].join("-");

process.env.JOB_SPRINT_LOGIN_RATE_LIMIT_MAX = "2";
process.env.JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS = "60000";
process.env.JOB_SPRINT_SESSION_SECRET = ["node", "auth", "routes", "session", "secret", "long", "enough"].join("-");
process.env.JOB_SPRINT_USERS_JSON = JSON.stringify({
  users: [{
    username: "kai",
    displayName: "Kai",
    role: "owner",
    dataScope: "kai",
    passwordHash: crypto.createHash("sha256").update(validPassword).digest("hex")
  }]
});

const { handleAuth, loginRateState } = require("../apps/server/auth_routes.js");

function fakeResponse() {
  return {
    status: null,
    headers: null,
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
    },
    json() {
      return JSON.parse(this.body);
    }
  };
}

function jsonRequest(method, payload, headers = {}) {
  const req = new PassThrough();
  req.method = method;
  req.headers = { "content-type": "application/json", ...headers };
  req.socket = { remoteAddress: "127.0.0.1" };
  req.end(JSON.stringify(payload));
  return req;
}

function request(method, headers = {}) {
  const req = new PassThrough();
  req.method = method;
  req.headers = headers;
  req.socket = { remoteAddress: "127.0.0.1" };
  req.end();
  return req;
}

(async () => {
  let res = fakeResponse();
  await handleAuth(jsonRequest("POST", { username: "kai", password: "wrong" }, { "x-forwarded-for": "10.0.0.1" }), res, "/api/auth/login");
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.json().error, "invalid_credentials");

  const limited = loginRateState(
    { headers: { "x-forwarded-for": "10.0.0.1" }, socket: { remoteAddress: "127.0.0.1" } },
    "kai"
  );
  assert.strictEqual(limited.limited, false);

  res = fakeResponse();
  await handleAuth(jsonRequest("POST", { username: "kai", password: validPassword }, { "x-forwarded-proto": "https" }), res, "/api/auth/login");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().authenticated, true);
  assert.ok(res.headers["set-cookie"].includes("job_sprint_session="));
  assert.ok(res.headers["set-cookie"].includes("Secure"));
  const cookie = res.headers["set-cookie"].split(";")[0];

  res = fakeResponse();
  await handleAuth(request("GET", { cookie }), res, "/api/auth/session");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().authenticated, true);
  assert.strictEqual(res.json().user.username, "kai");

  res = fakeResponse();
  await handleAuth(request("POST", { cookie }), res, "/api/auth/logout");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().authenticated, false);
  assert.ok(res.headers["set-cookie"].includes("Max-Age=0"));

  res = fakeResponse();
  await handleAuth(request("GET"), res, "/api/auth/login");
  assert.strictEqual(res.status, 405);

  console.log("node auth routes boundary tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

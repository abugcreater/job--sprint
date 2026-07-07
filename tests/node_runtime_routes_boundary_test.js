const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough } = require("stream");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-node-runtime-routes-"));
process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const runtimeRoutes = fs.readFileSync("apps/server/runtime_routes.js", "utf8");
const routes = require("../apps/server/runtime_routes.js");

assert.match(app, /require\("\.\/runtime_routes"\)/);
assert.match(app, /handleRuntime/);
assert.match(app, /handleProgress/);
assert.match(app, /handleReviews/);
assert.match(app, /handleApplications/);
assert.match(app, /handleInterviewMistakes/);

for (const handler of [
  "handleRuntime",
  "handleProgress",
  "handleReviews",
  "handleApplications",
  "handleInterviewMistakes"
]) {
  assert.doesNotMatch(app, new RegExp(`async function ${handler}\\(`));
  assert.match(runtimeRoutes, new RegExp(`async function ${handler}\\(`));
  assert.strictEqual(typeof routes[handler], "function");
}

assert.match(runtimeRoutes, /readUserRuntimeState/);
assert.match(runtimeRoutes, /writeRuntimeState/);
assert.match(runtimeRoutes, /normalizeRuntimeState/);
assert.match(runtimeRoutes, /normalizeRecord/);
assert.match(runtimeRoutes, /requireRuntimeWrite/);
assert.match(runtimeRoutes, /sendBadJson/);

assert.doesNotMatch(runtimeRoutes, /http\.createServer/);
assert.doesNotMatch(runtimeRoutes, /async function route/);
assert.doesNotMatch(runtimeRoutes, /function serveStatic/);
assert.doesNotMatch(runtimeRoutes, /function handleAuth/);
assert.doesNotMatch(runtimeRoutes, /function handleScore/);
assert.doesNotMatch(runtimeRoutes, /function handleTranscribe/);
assert.doesNotMatch(runtimeRoutes, /loadInterviewContext/);

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

function jsonRequest(method, payload) {
  const req = new PassThrough();
  req.method = method;
  req.headers = { "content-type": "application/json" };
  req.end(JSON.stringify(payload));
  return req;
}

function authState({ readOnly = false, permissions = ["runtime:write"], dataScope = "kai" } = {}) {
  return {
    userProfile: {
      username: dataScope,
      dataScope,
      readOnly,
      permissions
    }
  };
}

(async () => {
  let res = fakeResponse();
  await routes.handleRuntime(jsonRequest("POST", {
    data: {
      progress: { today: true },
      reviews: { day: { score: 4 } },
      applications: [],
      interviewMistakes: []
    }
  }), res, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().data.progress.today, true);

  res = fakeResponse();
  await routes.handleProgress(jsonRequest("POST", { progress: { remoteAcceptance: { marker: true } } }), res, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().progress.today, true);
  assert.strictEqual(res.json().progress.remoteAcceptance.marker, true);

  res = fakeResponse();
  await routes.handleRuntime(jsonRequest("POST", {
    data: {
      progress: { completed: { next: true } },
      reviews: {},
      applications: [],
      interviewMistakes: []
    }
  }), res, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().data.progress.completed.next, true);
  assert.strictEqual(res.json().data.progress.remoteAcceptance.marker, true);

  res = fakeResponse();
  await routes.handleProgress(jsonRequest("POST", { progress: { delayRecords: [{ reason: "Node route delay" }] } }), res, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().progress.delayRecords[0].reason, "Node route delay");
  assert.strictEqual(res.json().progress.remoteAcceptance.marker, true);

  res = fakeResponse();
  await routes.handleReviews(jsonRequest("POST", { reviews: { today: { summary: "Node route review" } } }), res, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().reviews.today.summary, "Node route review");

  res = fakeResponse();
  await routes.handleApplications(jsonRequest("POST", { company: "Node Runtime Routes", role: "Java Backend" }), res, "", authState());
  assert.strictEqual(res.status, 201);
  const createdApp = res.json().application;
  assert.match(createdApp.id, /^app-/);

  res = fakeResponse();
  await routes.handleApplications(jsonRequest("PUT", { role: "Senior Java Backend" }), res, createdApp.id, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().application.role, "Senior Java Backend");

  res = fakeResponse();
  await routes.handleInterviewMistakes(jsonRequest("POST", { question: "事务传播", answer: "REQUIRED" }), res, "", authState());
  assert.strictEqual(res.status, 201);
  const createdMistake = res.json().interviewMistake;
  assert.match(createdMistake.id, /^mistake-/);

  res = fakeResponse();
  await routes.handleInterviewMistakes(jsonRequest("DELETE", {}), res, createdMistake.id, authState());
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().interviewMistakes.length, 0);

  res = fakeResponse();
  await routes.handleProgress(jsonRequest("POST", { progress: { blocked: true } }), res, authState({ readOnly: true, permissions: ["runtime:read"] }));
  assert.strictEqual(res.status, 403);

  console.log("node runtime routes boundary tests passed");
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

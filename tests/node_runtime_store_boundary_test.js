const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const runtimeStore = fs.readFileSync("apps/server/runtime_store.js", "utf8");
const store = require("../apps/server/runtime_store.js");

assert.match(app, /require\("\.\/runtime_store"\)/);
assert.match(app, /writeRuntimeState/);
assert.match(app, /require\("\.\/runtime_routes"\)/);

assert.match(runtimeStore, /function runtimeDataPath\(\)/);
assert.match(runtimeStore, /function readRuntimeEnvelope\(\)/);
assert.match(runtimeStore, /function writeRuntimeEnvelope\(envelope\)/);
assert.match(runtimeStore, /function readUserRuntimeState\(authState\)/);
assert.match(runtimeStore, /function writeRuntimeState\(state, authState = null\)/);
assert.match(runtimeStore, /function normalizeRuntimeState\(parsed\)/);
assert.match(runtimeStore, /function normalizeRecord\(record, prefix\)/);
assert.match(runtimeStore, /module\.exports = \{/);

assert.doesNotMatch(app, /const DEFAULT_RUNTIME_STATE =/);
assert.doesNotMatch(app, /function runtimeDataPath\(\)/);
assert.doesNotMatch(app, /function readRuntimeEnvelope\(\)/);
assert.doesNotMatch(app, /function writeRuntimeEnvelope\(envelope\)/);
assert.doesNotMatch(app, /function readUserRuntimeState\(authState\)/);
assert.doesNotMatch(app, /function writeRuntimeState\(state, authState = null\)/);
assert.doesNotMatch(app, /function normalizeRuntimeState\(parsed\)/);
assert.doesNotMatch(app, /function normalizeRecord\(record, prefix\)/);
assert.doesNotMatch(app, /async function handleProgress\(/);
assert.doesNotMatch(app, /async function handleReviews\(/);
assert.doesNotMatch(app, /async function handleApplications\(/);
assert.doesNotMatch(app, /async function handleInterviewMistakes\(/);
assert.doesNotMatch(app, /function makeId\(prefix\)/);
assert.doesNotMatch(app, /function runtimePayload/);

assert.doesNotMatch(runtimeStore, /http\.createServer/);
assert.doesNotMatch(runtimeStore, /async function route/);
assert.doesNotMatch(runtimeStore, /function serveStatic/);
assert.doesNotMatch(runtimeStore, /function handleRuntime/);
assert.doesNotMatch(runtimeStore, /function handleScore/);
assert.doesNotMatch(runtimeStore, /function sendJson/);

const normalized = store.normalizeRuntimeState({
  progress: { day: true },
  reviews: null,
  applications: [{ id: "app-1" }],
  interviewMistakes: "bad"
});
assert.deepStrictEqual(normalized, {
  progress: { day: true },
  reviews: {},
  applications: [{ id: "app-1" }],
  interviewMistakes: []
});

const record = store.normalizeRecord({ title: "Offer follow-up" }, "app");
assert.match(record.id, /^app-/);
assert.ok(record.createdAt);

console.log("node runtime store boundary tests passed");

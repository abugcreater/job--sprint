const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const staticFiles = fs.readFileSync("apps/server/static_files.js", "utf8");
const statics = require("../apps/server/static_files.js");

assert.match(app, /require\("\.\/static_files"\)/);
assert.match(app, /normalizePathname/);
assert.match(app, /isPrivateStatic/);
assert.match(app, /isPrivateApi/);
assert.match(app, /serveStatic/);

assert.match(staticFiles, /const CONTENT_TYPES =/);
assert.match(staticFiles, /function normalizePathname\(pathname\)/);
assert.match(staticFiles, /function safePath\(urlPath\)/);
assert.match(staticFiles, /function requestBase\(pathname\)/);
assert.match(staticFiles, /function loginPathFor\(reqPathname/);
assert.match(staticFiles, /function isPrivateStatic\(pathname\)/);
assert.match(staticFiles, /function isPrivateApi\(pathname\)/);
assert.match(staticFiles, /function publicSafePath\(urlPath\)/);
assert.match(staticFiles, /function serveFile\(filePath, res\)/);
assert.match(staticFiles, /function serveStatic\(urlPath, res, authState = null\)/);
assert.match(staticFiles, /module\.exports = \{/);

assert.doesNotMatch(app, /const CONTENT_TYPES =/);
assert.doesNotMatch(app, /function mustUsePublicSafeStatic/);
assert.doesNotMatch(app, /function safePath\(urlPath\)/);
assert.doesNotMatch(app, /function requestBase\(pathname\)/);
assert.doesNotMatch(app, /function loginPathFor\(reqPathname/);
assert.doesNotMatch(app, /function isPrivateStatic\(pathname\)/);
assert.doesNotMatch(app, /function isPublicApi\(pathname\)/);
assert.doesNotMatch(app, /function isPrivateApi\(pathname\)/);
assert.doesNotMatch(app, /function publicSafePath\(urlPath\)/);
assert.doesNotMatch(app, /function serveFile\(filePath, res\)/);
assert.doesNotMatch(app, /function serveStatic\(urlPath, res/);

assert.doesNotMatch(staticFiles, /async function route/);
assert.doesNotMatch(staticFiles, /function handleRuntime/);
assert.doesNotMatch(staticFiles, /function handleAuth/);
assert.doesNotMatch(staticFiles, /function readRuntimeState/);
assert.doesNotMatch(staticFiles, /function scoreWithAnthropic/);

assert.strictEqual(statics.normalizePathname("/job-sprint"), "/");
assert.strictEqual(statics.normalizePathname("/job-sprint/react/index.html"), "/react/index.html");
assert.strictEqual(statics.normalizePathname("/api/health"), "/api/health");
assert.strictEqual(statics.requestBase("/job-sprint/react/index.html"), "/job-sprint");
assert.strictEqual(statics.requestBase("/react/index.html"), "");
assert.strictEqual(statics.isPrivateStatic("/react/index.html"), true);
assert.strictEqual(statics.isPrivateStatic("/login.html"), false);
assert.strictEqual(statics.isPublicApi("/api/auth/session"), true);
assert.strictEqual(statics.isPrivateApi("/api/runtime"), true);
assert.strictEqual(statics.isPrivateApi("/api/health"), false);
assert.strictEqual(statics.safePath("/../AGENTS.md").error, "forbidden");
assert.match(statics.loginPathFor("/job-sprint/react"), /^\/job-sprint\/login\.html\?next=/);

console.log("node static files boundary tests passed");

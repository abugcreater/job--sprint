const assert = require("assert");
const fs = require("fs");
const { PassThrough } = require("stream");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const authRoutes = fs.readFileSync("apps/server/auth_routes.js", "utf8");
const aiRoutes = fs.readFileSync("apps/server/ai_routes.js", "utf8");
const httpUtils = fs.readFileSync("apps/server/http_utils.js", "utf8");
const utils = require("../apps/server/http_utils.js");

assert.match(app, /require\("\.\/http_utils"\)/);
assert.match(app, /sendJson/);
assert.match(app, /sendRedirect/);
assert.match(authRoutes, /readBody/);
assert.match(aiRoutes, /readBody/);
assert.match(aiRoutes, /readRawBody/);
assert.match(aiRoutes, /parseMultipartAudio/);

assert.match(httpUtils, /function securityHeaders\(/);
assert.match(httpUtils, /function sendJson\(/);
assert.match(httpUtils, /function sendRedirect\(/);
assert.match(httpUtils, /function sendBadJson\(/);
assert.match(httpUtils, /function readBody\(/);
assert.match(httpUtils, /function readRawBody\(/);
assert.match(httpUtils, /function parseMultipartAudio\(/);
assert.match(httpUtils, /module\.exports = \{/);

assert.doesNotMatch(app, /function securityHeaders\(/);
assert.doesNotMatch(app, /function sendJson\(/);
assert.doesNotMatch(app, /function sendRedirect\(/);
assert.doesNotMatch(app, /function sendBadJson\(/);
assert.doesNotMatch(app, /function readBody\(/);
assert.doesNotMatch(app, /function readRawBody\(/);
assert.doesNotMatch(app, /function parseMultipartAudio\(/);
assert.doesNotMatch(app, /readBody/);
assert.doesNotMatch(app, /readRawBody/);
assert.doesNotMatch(app, /parseMultipartAudio/);
assert.doesNotMatch(app, /MAX_BODY_BYTES/);
assert.doesNotMatch(app, /MAX_TRANSCRIBE_BYTES/);

assert.doesNotMatch(httpUtils, /http\.createServer/);
assert.doesNotMatch(httpUtils, /async function route/);
assert.doesNotMatch(httpUtils, /function handleAuth/);
assert.doesNotMatch(httpUtils, /function handleRuntime/);
assert.doesNotMatch(httpUtils, /function handleScore/);
assert.doesNotMatch(httpUtils, /function requirePermission/);
assert.doesNotMatch(httpUtils, /readRuntimeState/);
assert.doesNotMatch(httpUtils, /getAuthConfig/);

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
    }
  };
}

function jsonStream(value) {
  const stream = new PassThrough();
  stream.end(value);
  return stream;
}

function multipart(audio, boundary = "----job-sprint-http-utils") {
  const head = Buffer.from([
    `--${boundary}`,
    "Content-Disposition: form-data; name=\"audio\"; filename=\"answer.webm\"",
    "Content-Type: audio/webm",
    "",
    ""
  ].join("\r\n"));
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, Buffer.from(audio), tail]),
    contentType: `multipart/form-data; boundary="${boundary}"`
  };
}

(async () => {
  const res = fakeResponse();
  utils.sendJson(res, 201, { ok: true });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
  assert.strictEqual(res.headers["cache-control"], "no-store");
  assert.deepStrictEqual(JSON.parse(res.body), { ok: true });

  const redirect = fakeResponse();
  utils.sendRedirect(redirect, "/login.html");
  assert.strictEqual(redirect.status, 302);
  assert.strictEqual(redirect.headers.location, "/login.html");

  assert.deepStrictEqual(await utils.readBody(jsonStream("{\"day\":1}")), { day: 1 });
  await assert.rejects(() => utils.readBody(jsonStream("{bad-json}")), /invalid json body/);
  await assert.rejects(() => utils.readRawBody(jsonStream(Buffer.alloc(8)), 4), (error) => error.code === "BODY_TOO_LARGE");

  const upload = multipart("fake-audio");
  const parsed = utils.parseMultipartAudio(upload.body, upload.contentType);
  assert.strictEqual(parsed.audio.toString(), "fake-audio");
  assert.strictEqual(parsed.filename, "answer.webm");
  assert.strictEqual(parsed.contentType, "audio/webm");
  assert.deepStrictEqual(utils.parseMultipartAudio(Buffer.from("x"), "multipart/form-data"), { error: "missing_boundary" });

  console.log("node http utils boundary tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

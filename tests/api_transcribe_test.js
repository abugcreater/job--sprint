const assert = require("assert");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-transcribe-"));
const TEST_USER = "voice-test-user";
const TEST_PASSWORD = ["voice", "test", "password"].join("-");
process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");
process.env.JOB_SPRINT_AUTH_USER = TEST_USER;
process.env.JOB_SPRINT_AUTH_PASSWORD = TEST_PASSWORD;
process.env.JOB_SPRINT_SESSION_SECRET = ["voice", "test", "session", "secret", "long", "enough"].join("-");
process.env.ASR_PROVIDER = "none";
process.env.ASR_MAX_AUDIO_BYTES = "1024";
process.env.ASR_AUTH_TOKEN = ["asr", "token", "that", "must", "not", "leak"].join("-");

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
      headers
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
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
      req.write(body);
    }
    req.end();
  });
}

function multipart(audio, filename = "answer.m4a") {
  const boundary = "----job-sprint-test-boundary";
  const head = Buffer.from([
    `--${boundary}`,
    `Content-Disposition: form-data; name="audio"; filename="${filename}"`,
    "Content-Type: audio/mp4",
    "",
    ""
  ].join("\r\n"));
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, Buffer.from(audio), tail]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function login(server) {
  const body = JSON.stringify({ username: TEST_USER, password: TEST_PASSWORD });
  const res = await request(server, "POST", "/api/auth/login", body, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  assert.strictEqual(res.status, 200);
  return res.headers["set-cookie"][0].split(";")[0];
}

(async () => {
  const server = await startServer();
  try {
    const upload = multipart("fake-audio");
    let res = await request(server, "POST", "/api/transcribe", upload.body, {
      "content-type": upload.contentType,
      "content-length": upload.body.length
    });
    assert.strictEqual(res.status, 401);

    const cookie = await login(server);

    res = await request(server, "POST", "/api/transcribe", Buffer.from("not multipart"), {
      cookie,
      "content-type": "application/octet-stream"
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.json.error, "malformed_upload");

    const valid = multipart("fake-audio", "../../secret.m4a");
    res = await request(server, "POST", "/api/transcribe", valid.body, {
      cookie,
      "content-type": valid.contentType,
      "content-length": valid.body.length
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.ok, false);
    assert.strictEqual(res.json.mode, "not_configured");
    assert.ok(!res.raw.includes("asr-token-that-must-not-leak"));
    assert.ok(!res.raw.includes("../../secret"));

    const tooLarge = multipart(Buffer.alloc(2048, 1));
    res = await request(server, "POST", "/api/transcribe", tooLarge.body, {
      cookie,
      "content-type": tooLarge.contentType,
      "content-length": tooLarge.body.length
    });
    assert.strictEqual(res.status, 413);
    assert.strictEqual(res.json.error, "audio_too_large");

    console.log("api transcribe tests passed");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

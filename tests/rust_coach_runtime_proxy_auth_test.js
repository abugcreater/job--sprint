#!/usr/bin/env node
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { once } = require("events");
const { spawn } = require("child_process");
const {
  classifyCoachArtifactsRuntime,
  fetchCoachArtifactsRuntime
} = require("../tools/diagnose_coach_artifacts_runtime");

const ROOT = path.resolve(__dirname, "..");
const VITE_CLI = path.join(ROOT, "apps/react-web/node_modules/vite/bin/vite.js");
const TEST_USERNAME = "rust-runtime-proxy-user";
const TEST_DATA_SCOPE = "rust-runtime-proxy-scope";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
    server.on("error", reject);
  });
}

function childOutput(child) {
  let output = "";
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-4000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return () => output;
}

function startRustRuntime(port, dbPath, credentials) {
  return spawn("cargo", ["run", "--quiet", "--manifest-path", "apps/rust-api/Cargo.toml"], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      JOB_SPRINT_RUNTIME_DB_PATH: dbPath,
      JOB_SPRINT_AUTH_DISABLED: "false",
      JOB_SPRINT_SESSION_SECRET: credentials.sessionSecret,
      JOB_SPRINT_USERS_JSON: JSON.stringify({
        users: [{
          username: TEST_USERNAME,
          displayName: "Rust Runtime Proxy User",
          role: "coach",
          dataScope: TEST_DATA_SCOPE,
          password: credentials.password
        }]
      }),
      JOB_SPRINT_USERS_FILE: "",
      JOB_SPRINT_AUTH_USER: "",
      JOB_SPRINT_AUTH_PASSWORD: "",
      JOB_SPRINT_AUTH_PASSWORD_SHA256: "",
      JOB_SPRINT_BEARER_TOKENS_JSON: "",
      JOB_SPRINT_BEARER_TOKENS_FILE: "",
      JOB_SPRINT_COOKIE_SECURE: "",
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_AUTH_TOKEN: "",
      ANTHROPIC_MODEL: "",
      AI_PROVIDER_TIMEOUT_MS: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function startViteRuntime(port, apiPort) {
  return spawn(process.execPath, [VITE_CLI, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: path.join(ROOT, "apps/react-web"),
    env: {
      ...process.env,
      VITE_JOB_SPRINT_SERVER_RUNTIME: "true",
      JOB_SPRINT_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function waitForJson(url, child, output, name, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${name}_exited_early:${child.exitCode}\n${output()}`);
    }
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (response.ok) {
        return { response, body: await response.json() };
      }
      lastError = new Error(`${name}_http_${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${name}_not_ready:${lastError ? lastError.message : "unknown"}\n${output()}`);
}

async function responseJson(url, headers = {}) {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers } });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const gracefulExit = once(child, "exit");
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    gracefulExit.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000))
  ]);
  if (!stopped && child.exitCode === null) {
    const forcedExit = once(child, "exit");
    child.kill("SIGKILL");
    await Promise.race([
      forcedExit,
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
  }
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  assert.ok(cookie.startsWith("job_sprint_session="), "login must return the session cookie");
  return cookie;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-rust-runtime-proxy-auth-"));
  const credentials = {
    password: crypto.randomBytes(24).toString("base64url"),
    sessionSecret: crypto.randomBytes(48).toString("base64url")
  };
  const rustPort = await freePort();
  const vitePort = await freePort();
  let rustRuntime;
  let viteRuntime;

  try {
    rustRuntime = startRustRuntime(rustPort, path.join(tempDir, "runtime.sqlite"), credentials);
    const rustOutput = childOutput(rustRuntime);
    const rustHealth = await waitForJson(`http://127.0.0.1:${rustPort}/api/health`, rustRuntime, rustOutput, "rust_runtime");
    assert.strictEqual(rustHealth.body.authDisabled, false);
    assert.strictEqual(rustHealth.body.authConfigured, true);
    assert.strictEqual(rustHealth.body.apiConfigured, false);
    assert.strictEqual(rustHealth.body.runtimeStorage, "sqlite");

    viteRuntime = startViteRuntime(vitePort, rustPort);
    const viteOutput = childOutput(viteRuntime);
    const proxiedHealth = await waitForJson(`http://127.0.0.1:${vitePort}/api/health`, viteRuntime, viteOutput, "vite_proxy");
    assert.strictEqual(proxiedHealth.body.authDisabled, false);
    assert.strictEqual(proxiedHealth.body.authConfigured, true);
    assert.strictEqual(proxiedHealth.body.runtimeStorage, "sqlite");

    const anonymousResponse = await fetchCoachArtifactsRuntime({
      url: `http://127.0.0.1:${vitePort}/api/coach/artifacts`
    });
    const anonymousDiagnosis = classifyCoachArtifactsRuntime(anonymousResponse);
    assert.strictEqual(anonymousDiagnosis.code, "auth_required");
    assert.strictEqual(anonymousDiagnosis.runtimeApiReachable, true);

    const login = await fetch(`http://127.0.0.1:${vitePort}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ username: TEST_USERNAME, password: credentials.password })
    });
    assert.strictEqual(login.status, 200);
    const cookie = sessionCookie(login);
    const session = await responseJson(`http://127.0.0.1:${vitePort}/api/auth/session`, { cookie });
    assert.strictEqual(session.status, 200);
    assert.strictEqual(session.body.authenticated, true);
    assert.strictEqual(session.body.user.username, TEST_USERNAME);
    assert.strictEqual(session.body.user.dataScope, TEST_DATA_SCOPE);

    const authenticatedResponse = await fetchCoachArtifactsRuntime({
      url: `http://127.0.0.1:${vitePort}/api/coach/artifacts`,
      cookie
    });
    const authenticatedDiagnosis = classifyCoachArtifactsRuntime(authenticatedResponse);
    assert.strictEqual(authenticatedDiagnosis.code, "provider_not_configured");
    assert.strictEqual(authenticatedDiagnosis.runtimeApiReachable, true);
    assert.strictEqual(authenticatedDiagnosis.schemaUsable, true);

    const runs = await responseJson(`http://127.0.0.1:${vitePort}/api/coach/llm-runs`, { cookie });
    assert.strictEqual(runs.status, 200);
    assert.ok(Array.isArray(runs.body?.runs) && runs.body.runs.length === 1, "temporary Rust runtime should read back one llm run");
    assert.strictEqual(runs.body.runs[0].provider, "local-fallback");
    assert.strictEqual(runs.body.runs[0].schemaStatus, "pass");
  } finally {
    await stop(viteRuntime);
    await stop(rustRuntime);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log("rust coach runtime proxy auth smoke passed");
}).catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});

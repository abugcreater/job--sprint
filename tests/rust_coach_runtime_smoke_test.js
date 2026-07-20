const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { once } = require("events");

const { classifyCoachArtifactsRuntime, fetchCoachArtifactsRuntime } = require("../tools/diagnose_coach_artifacts_runtime");

const ROOT = path.resolve(__dirname, "..");

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

async function responseJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function waitForHealth(baseUrl, server, stderr) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`rust coach runtime exited early (${server.exitCode}): ${stderr()}`);
    }
    try {
      const response = await responseJson(`${baseUrl}/api/health`);
      if (response.status === 200 && response.body?.runtimeStorage === "sqlite") return response.body;
    } catch (_) {
      // Rust may still be compiling or binding its temporary port.
    }
    await wait(200);
  }
  throw new Error(`rust coach runtime did not become healthy: ${stderr()}`);
}

function startRustServer(port, dbPath) {
  return spawn("cargo", ["run", "--quiet", "--manifest-path", "apps/rust-api/Cargo.toml"], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      JOB_SPRINT_RUNTIME_DB_PATH: dbPath,
      JOB_SPRINT_AUTH_DISABLED: "true",
      JOB_SPRINT_USERS_JSON: "",
      JOB_SPRINT_USERS_FILE: "",
      JOB_SPRINT_AUTH_USER: "",
      JOB_SPRINT_AUTH_PASSWORD: "",
      JOB_SPRINT_AUTH_PASSWORD_SHA256: "",
      JOB_SPRINT_BEARER_TOKENS_JSON: "",
      JOB_SPRINT_BEARER_TOKENS_FILE: "",
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_AUTH_TOKEN: "",
      ANTHROPIC_MODEL: "",
      AI_PROVIDER_TIMEOUT_MS: ""
    },
    stdio: ["ignore", "ignore", "pipe"]
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  const exited = once(server, "exit");
  server.kill("SIGTERM");
  await Promise.race([exited, wait(2_000)]);
  if (server.exitCode !== null) return;
  const forcedExit = once(server, "exit");
  server.kill("SIGKILL");
  await Promise.race([forcedExit, wait(2_000)]);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-rust-coach-runtime-"));
  const dbPath = path.join(tempDir, "runtime.sqlite");
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startRustServer(port, dbPath);
  let stderr = "";
  server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  try {
    const health = await waitForHealth(baseUrl, server, () => stderr);
    assert.strictEqual(health.authDisabled, true);
    assert.strictEqual(health.apiConfigured, false);
    assert.strictEqual(health.runtimeStorage, "sqlite");

    const runtimeResponse = await fetchCoachArtifactsRuntime({ url: `${baseUrl}/api/coach/artifacts` });
    const diagnosis = classifyCoachArtifactsRuntime(runtimeResponse);
    assert.strictEqual(diagnosis.code, "provider_not_configured");
    assert.strictEqual(diagnosis.runtimeApiReachable, true);
    assert.strictEqual(diagnosis.providerUsable, false);
    assert.strictEqual(diagnosis.schemaUsable, true);

    const artifacts = JSON.parse(runtimeResponse.bodyText);
    assert.strictEqual(artifacts.provider, "local-fallback");
    assert.strictEqual(artifacts.llmRun?.schemaStatus, "pass");
    assert.strictEqual(artifacts.llmRun?.status, "fallback");

    const runs = await responseJson(`${baseUrl}/api/coach/llm-runs`);
    assert.strictEqual(runs.status, 200);
    assert.ok(Array.isArray(runs.body?.runs) && runs.body.runs.length === 1, "temporary Rust runtime should read back one llm run");
    assert.strictEqual(runs.body.runs[0].provider, "local-fallback");
    assert.strictEqual(runs.body.runs[0].schemaStatus, "pass");

    console.log(JSON.stringify({
      status: "PASS",
      code: diagnosis.code,
      runtimeStorage: health.runtimeStorage,
      dbPathWasTemporary: true,
      llmRunCount: runs.body.runs.length
    }));
  } finally {
    await stopServer(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

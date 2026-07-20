#!/usr/bin/env node
const assert = require("assert");
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

function startNodeRuntime(port, runtimePath) {
  return spawn(process.execPath, ["apps/server/app.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      JOB_SPRINT_AUTH_DISABLED: "true",
      RUNTIME_DATA_PATH: runtimePath,
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_AUTH_TOKEN: "",
      ANTHROPIC_MODEL: ""
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

async function waitForJson(url, child, output, name) {
  const deadline = Date.now() + 20000;
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
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${name}_not_ready:${lastError ? lastError.message : "unknown"}\n${output()}`);
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

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-runtime-proxy-"));
  const nodePort = await freePort();
  const vitePort = await freePort();
  let nodeRuntime;
  let viteRuntime;

  try {
    nodeRuntime = startNodeRuntime(nodePort, path.join(tempDir, "runtime.json"));
    const nodeOutput = childOutput(nodeRuntime);
    const nodeHealth = await waitForJson(`http://127.0.0.1:${nodePort}/api/health`, nodeRuntime, nodeOutput, "node_runtime");
    assert.strictEqual(nodeHealth.body.authDisabled, true);

    viteRuntime = startViteRuntime(vitePort, nodePort);
    const viteOutput = childOutput(viteRuntime);
    const proxiedHealth = await waitForJson(`http://127.0.0.1:${vitePort}/api/health`, viteRuntime, viteOutput, "vite_proxy");
    assert.strictEqual(proxiedHealth.body.authDisabled, true);

    const rawResponse = await fetchCoachArtifactsRuntime({
      url: `http://127.0.0.1:${vitePort}/api/coach/artifacts`
    });
    const diagnosis = classifyCoachArtifactsRuntime(rawResponse);
    assert.strictEqual(diagnosis.code, "provider_not_configured");
    assert.strictEqual(diagnosis.runtimeApiReachable, true);
    assert.strictEqual(diagnosis.schemaUsable, true);
  } finally {
    await stop(viteRuntime);
    await stop(nodeRuntime);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log("local coach runtime proxy smoke passed");
}).catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});

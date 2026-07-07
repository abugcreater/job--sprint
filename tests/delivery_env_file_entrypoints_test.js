const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-env-entrypoints-"));
const missingEnvFile = path.join(tmpRoot, "missing-delivery.env");

const entrypoints = [
  {
    file: "tools/write_server_sync_evidence.js",
    args: ["tools/write_server_sync_evidence.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "sync.json")],
    output: "stdout"
  },
  {
    file: "tools/write_remote_acceptance_evidence.js",
    args: ["tools/write_remote_acceptance_evidence.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "remote.json")],
    output: "stdout"
  },
  {
    file: "tools/restart_remote_service.js",
    args: ["tools/restart_remote_service.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "restart.json")],
    output: "stdout"
  },
  {
    file: "tools/write_remote_invitation_evidence.js",
    args: ["tools/write_remote_invitation_evidence.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "remote-invitations.json")],
    output: "stdout"
  },
  {
    file: "tools/write_remote_invitation_account_evidence.js",
    args: ["tools/write_remote_invitation_account_evidence.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "remote-invitation-account.json")],
    output: "stdout"
  },
  {
    file: "tools/build_android_release_apk.js",
    args: ["tools/build_android_release_apk.js", "--delivery-env-file", missingEnvFile, "--report", path.join(tmpRoot, "android-release.json")],
    output: "stdout"
  },
  {
    file: "tests/android_webview_functional_persistence_test.js",
    args: ["tests/android_webview_functional_persistence_test.js", "--remote", "--delivery-env-file", missingEnvFile],
    output: "stderr"
  }
];

for (const entrypoint of entrypoints) {
  const source = fs.readFileSync(path.join(repoRoot, entrypoint.file), "utf8");
  assert(source.includes("loadDeliveryEnvFile"), `${entrypoint.file} should load private env files`);
  assert(source.includes("envFileErrorInfo"), `${entrypoint.file} should report env file load errors`);
  assert(source.includes("delivery_env_file_error"), `${entrypoint.file} should use a stable error reason`);
}

for (const entrypoint of entrypoints) {
  const result = spawnSync(process.execPath, entrypoint.args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      JOB_SPRINT_DELIVERY_ENV_FILE: ""
    }
  });
  assert.strictEqual(result.status, 1, `${entrypoint.file} should fail before side effects when env file is missing`);
  const raw = entrypoint.output === "stderr" ? result.stderr : result.stdout;
  const report = JSON.parse(raw.slice(raw.indexOf("{")));
  assert.strictEqual(report.status, "FAIL");
  assert.strictEqual(report.reason, "delivery_env_file_error");
  assert.strictEqual(report.envFile.loaded, false);
  assert.strictEqual(report.envFile.error, "delivery_env_file_missing");
  assert(!raw.includes("acceptance-pass"));
  assert(!raw.includes("store-pass"));
  assert(!raw.includes("key-pass"));
}

console.log(`交付 env 文件分步入口测试：${entrypoints.length} 个入口通过。`);

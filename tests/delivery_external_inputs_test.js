const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateDeliveryExternalInputs, isInsideRepository } = require("../tools/validate_delivery_external_inputs");
const { loadDeliveryEnvFile } = require("../tools/delivery_env_file");

const repoRoot = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-delivery-inputs-"));
const externalKeystore = path.join(tmpRoot, "release.jks");
fs.writeFileSync(externalKeystore, "synthetic keystore placeholder");
const externalSshKey = path.join(tmpRoot, "deploy.pem");
fs.writeFileSync(externalSshKey, "synthetic ssh private key placeholder");
const syntheticAuthValue = ["auth", "credential", "placeholder"].join("-");
const syntheticStoreValue = ["store", "credential", "placeholder"].join("-");
const syntheticKeyValue = ["key", "credential", "placeholder"].join("-");

function commandExists() {
  return true;
}

function baseEnv() {
  return {
    JOB_SPRINT_DEPLOY_HOST: "example.com",
    JOB_SPRINT_DEPLOY_USER: "deploy",
    JOB_SPRINT_DEPLOY_PATH: "/opt/job-sprint",
    JOB_SPRINT_DEPLOY_SSH_KEY: externalSshKey,
    JOB_SPRINT_REMOTE_BASE_URL: "https://example.com/job-sprint",
    JOB_SPRINT_ANDROID_WEBVIEW_URL: "https://example.com/job-sprint",
    JOB_SPRINT_AUTH_USER: "acceptance-user",
    JOB_SPRINT_AUTH_PASSWORD: syntheticAuthValue,
    JOB_SPRINT_ANDROID_KEYSTORE: externalKeystore,
    JOB_SPRINT_ANDROID_STORE_PASSWORD: syntheticStoreValue,
    JOB_SPRINT_ANDROID_KEY_ALIAS: "release",
    JOB_SPRINT_ANDROID_KEY_PASSWORD: syntheticKeyValue,
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: "ab".repeat(32),
    JOB_SPRINT_FINAL_DELIVERY_REPORT: "docs/evidence/final-delivery/final-delivery.json"
  };
}

function testMissingInputsRequireUserAction() {
  const report = validateDeliveryExternalInputs(repoRoot, {}, { commandExists: () => false, args: [] });
  assert.strictEqual(report.status, "USER_ACTION_REQUIRED");
  assert(report.checks.some((check) => check.id === "server_sync_inputs" && check.status === "USER_ACTION_REQUIRED"));
  assert(report.checks.some((check) => check.id === "android_remote_inputs" && check.status === "USER_ACTION_REQUIRED"));
  assert(report.nextActions.length >= 4);
  const nextActionText = JSON.stringify(report.nextActions);
  for (const command of [
    "write:server-sync-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env",
    "write:remote-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env",
    "test:android:remote:functional -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env",
    "build:android:release -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env",
    "final:delivery -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env"
  ]) {
    assert(nextActionText.includes(command), `delivery input next actions should mention ${command}`);
  }
}

function testCompleteInputsPassWithoutLeakingSecrets() {
  const report = validateDeliveryExternalInputs(repoRoot, baseEnv(), { commandExists, args: [] });
  assert.strictEqual(report.status, "PASS");
  const serverSync = report.checks.find((check) => check.id === "server_sync_inputs");
  assert.strictEqual(serverSync.sshKeyConfigured, true);
  assert.strictEqual(serverSync.sshKeyReadable, true);
  const serialized = JSON.stringify(report);
  assert(!serialized.includes(syntheticAuthValue));
  assert(!serialized.includes(syntheticStoreValue));
  assert(!serialized.includes(syntheticKeyValue));
}

function testMissingSshKeyRequiresUserAction() {
  const env = baseEnv();
  env.JOB_SPRINT_DEPLOY_SSH_KEY = path.join(tmpRoot, "missing.pem");
  const report = validateDeliveryExternalInputs(repoRoot, env, { commandExists, args: [] });
  const serverSync = report.checks.find((check) => check.id === "server_sync_inputs");
  assert.strictEqual(serverSync.status, "USER_ACTION_REQUIRED");
  assert.strictEqual(serverSync.sshKeyConfigured, true);
  assert.strictEqual(serverSync.sshKeyReadable, false);
}

function testHttpAndroidUrlPassesWithLimit() {
  const env = baseEnv();
  env.JOB_SPRINT_ANDROID_WEBVIEW_URL = "http://example.com/job-sprint";
  const report = validateDeliveryExternalInputs(repoRoot, env, { commandExists, args: [] });
  const android = report.checks.find((check) => check.id === "android_remote_inputs");
  assert.strictEqual(android.status, "PASS_WITH_LIMITS");
  assert.strictEqual(android.webViewUrlScheme, "http");
  assert(android.limits.includes("android_remote_url_not_https"));
}

function testRepositoryKeystoreIsRejected() {
  const repoKeystore = path.join(repoRoot, "tmp-test-release.jks");
  fs.writeFileSync(repoKeystore, "synthetic repo keystore");
  try {
    assert.strictEqual(isInsideRepository(repoRoot, repoKeystore), true);
    const env = baseEnv();
    env.JOB_SPRINT_ANDROID_KEYSTORE = repoKeystore;
    const report = validateDeliveryExternalInputs(repoRoot, env, { commandExists, args: [] });
    const formal = report.checks.find((check) => check.id === "formal_android_release_inputs");
    assert.strictEqual(formal.status, "USER_ACTION_REQUIRED");
    assert.strictEqual(formal.keystoreInsideRepository, true);
  } finally {
    fs.rmSync(repoKeystore, { force: true });
  }
}

function envFileContent(env) {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function testOutsideRepositoryEnvFileCanSupplyInputs() {
  const envFile = path.join(tmpRoot, "private-delivery.env");
  fs.writeFileSync(envFile, `${envFileContent(baseEnv())}\n`);
  const loaded = loadDeliveryEnvFile(repoRoot, {}, ["--delivery-env-file", envFile]);
  assert.strictEqual(loaded.info.loaded, true);
  assert.strictEqual(loaded.info.insideRepository, false);
  assert(loaded.info.loadedKeys.includes("JOB_SPRINT_AUTH_PASSWORD"));
  const report = validateDeliveryExternalInputs(repoRoot, loaded.env, {
    commandExists,
    args: [],
    envFileInfo: loaded.info
  });
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.envFile.loaded, true);
  const serialized = JSON.stringify(report);
  assert(serialized.includes("JOB_SPRINT_AUTH_PASSWORD"));
  assert(!serialized.includes(syntheticAuthValue));
  assert(!serialized.includes(syntheticStoreValue));
  assert(!serialized.includes(syntheticKeyValue));
}

function testRepositoryEnvFileIsRejected() {
  const repoEnvFile = path.join(repoRoot, "tmp-private-delivery.env");
  fs.writeFileSync(repoEnvFile, envFileContent(baseEnv()));
  try {
    assert.throws(
      () => loadDeliveryEnvFile(repoRoot, {}, ["--delivery-env-file", repoEnvFile]),
      (error) => error.code === "delivery_env_file_inside_repository"
    );
  } finally {
    fs.rmSync(repoEnvFile, { force: true });
  }
}

testMissingInputsRequireUserAction();
testCompleteInputsPassWithoutLeakingSecrets();
testMissingSshKeyRequiresUserAction();
testHttpAndroidUrlPassesWithLimit();
testRepositoryKeystoreIsRejected();
testOutsideRepositoryEnvFileCanSupplyInputs();
testRepositoryEnvFileIsRejected();

console.log("交付外部输入预检测试：7 项通过。");

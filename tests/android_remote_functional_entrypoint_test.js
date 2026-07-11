const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const androidTest = fs.readFileSync(path.join(root, "tests", "android_webview_functional_persistence_test.js"), "utf8");
const androidUrlConfig = fs.readFileSync(path.join(root, "tests", "android_webview_url_config.js"), "utf8");
const androidRuntime = `${androidTest}\n${androidUrlConfig}`;
const androidWrapper = fs.readFileSync(path.join(root, "tools", "run_android_remote_functional_evidence.js"), "utf8");
const deliveryGate = fs.readFileSync(path.join(root, "tools", "validate_final_delivery_readiness.js"), "utf8");
const deliveryActionCommands = fs.readFileSync(path.join(root, "tools", "delivery_action_commands.js"), "utf8");

assert.strictEqual(
  packageJson.scripts["test:android:remote:functional"],
  "node tools/run_android_remote_functional_evidence.js --remote"
);
const wrapperSyntax = spawnSync(process.execPath, ["--check", path.join(root, "tools", "run_android_remote_functional_evidence.js")], { encoding: "utf8" });
assert.strictEqual(wrapperSyntax.status, 0, wrapperSyntax.stderr || wrapperSyntax.stdout);

for (const required of [
  "argSet.has(\"--remote\")",
  "JOB_SPRINT_ANDROID_WEBVIEW_URL",
  "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
  "JOB_SPRINT_REMOTE_BASE_URL",
  "USER_ACTION_REQUIRED: Android remote mode requires",
  "android_remote_url_required",
  "HTTPS URL under /job-sprint/",
  "rejects HTTP and local fallback URLs",
  "/job-sprint/react/index.html",
  "android-remote-functional",
  "mode: IS_REMOTE_WEBVIEW ? \"remote\" : \"local\"",
  "maybeLogin(page)",
  "AUTH_EVIDENCE",
  "readSessionState(page",
  "sessionApiAuthenticated",
  "AndroidSessionCookies.hasSessionCookie",
  "authEvidence: AUTH_EVIDENCE"
]) {
  assert.ok(androidRuntime.includes(required), `Android functional test should include ${required}`);
}

assert.ok(
  deliveryActionCommands.includes("npm run test:android:remote:functional"),
  "delivery readiness should point to the Android remote functional command"
);
for (const required of [
  "--allow-create-account",
  "JOB_SPRINT_ANDROID_REMOTE_TEMP_ACCOUNT",
  "provisionTemporaryAccount",
  "cleanupTemporaryAccount",
  "account-status",
  "action: \"delete\""
]) {
  assert.ok(androidWrapper.includes(required), `Android remote wrapper should include ${required}`);
}
assert.ok(
  deliveryGate.includes("remoteAuthEvidenceIssues"),
  "delivery readiness should validate Android remote auth evidence"
);
assert.ok(
  deliveryGate.includes("session_api_authenticated_state_missing"),
  "delivery readiness should reject remote evidence without authenticated session state"
);

console.log("android remote functional entrypoint tests passed");

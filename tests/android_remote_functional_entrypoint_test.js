const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const androidTest = fs.readFileSync(path.join(root, "tests", "android_webview_functional_persistence_test.js"), "utf8");
const deliveryGate = fs.readFileSync(path.join(root, "tools", "validate_final_delivery_readiness.js"), "utf8");
const deliveryActionCommands = fs.readFileSync(path.join(root, "tools", "delivery_action_commands.js"), "utf8");

assert.strictEqual(
  packageJson.scripts["test:android:remote:functional"],
  "node tests/android_webview_functional_persistence_test.js --remote"
);

for (const required of [
  "argSet.has(\"--remote\")",
  "JOB_SPRINT_ANDROID_WEBVIEW_URL",
  "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
  "JOB_SPRINT_REMOTE_BASE_URL",
  "USER_ACTION_REQUIRED: Android remote mode requires",
  "android_remote_url_required",
  "HTTP or HTTPS URL under /job-sprint/",
  "HTTP/IP is accepted only for basic remote functional validation",
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
  assert.ok(androidTest.includes(required), `Android functional test should include ${required}`);
}

assert.ok(
  deliveryActionCommands.includes("npm run test:android:remote:functional"),
  "delivery readiness should point to the Android remote functional command"
);
assert.ok(
  deliveryGate.includes("remoteAuthEvidenceIssues"),
  "delivery readiness should validate Android remote auth evidence"
);
assert.ok(
  deliveryGate.includes("session_api_authenticated_state_missing"),
  "delivery readiness should reject remote evidence without authenticated session state"
);

console.log("android remote functional entrypoint tests passed");

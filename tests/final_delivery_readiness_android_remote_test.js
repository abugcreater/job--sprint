const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-android-remote-"));

const baseEnv = { ...process.env };
baseEnv.JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV = "1";
for (const key of [
  "JOB_SPRINT_ANDROID_KEYSTORE",
  "JOB_SPRINT_ANDROID_STORE_PASSWORD",
  "JOB_SPRINT_ANDROID_KEY_ALIAS",
  "JOB_SPRINT_ANDROID_KEY_PASSWORD",
  "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256",
  "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE",
  "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_REMOTE_BASE_URL",
  "JOB_SPRINT_PUBLIC_BASE_URL",
  "JOB_SPRINT_DELIVERY_BASE_URL",
  "JOB_SPRINT_AUTH_USER",
  "JOB_SPRINT_AUTH_PASSWORD",
  "JOB_SPRINT_AUTH_PASS"
]) {
  delete baseEnv[key];
}

function runtimeSnapshot(url, delayReasons) {
  return {
    url,
    keys: ["jobSprint.react.v1"],
    rawHashes: {
      "jobSprint.react.v1": "a".repeat(64)
    },
    react: {
      delayReasons
    }
  };
}

function authEvidence(overrides = {}) {
  return {
    mode: "remote",
    authUserConfigured: true,
    authPasswordConfigured: true,
    loginPageSeen: true,
    loginAttempted: true,
    sessionStates: [
      {
        label: "after-login-submit",
        url: "https://job-sprint.example.com/job-sprint/react/index.html#/today",
        sessionApiStatus: 200,
        sessionApiAuthenticated: true,
        sessionApiAuthConfigured: true,
        androidSessionCookie: true
      }
    ],
    ...overrides
  };
}

function writeEvidence(name, overrides = {}) {
  const webViewUrl = overrides.webViewUrl || "https://job-sprint.example.com/job-sprint/react/index.html#/more";
  const report = {
    status: "PASS",
    webViewUrl,
    authEvidence: authEvidence(),
    flowSnapshot: runtimeSnapshot(webViewUrl, ["Android remote save reason"]),
    restartSnapshot: runtimeSnapshot(webViewUrl, ["Android remote save reason"]),
    ...overrides
  };
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

function writeServerRemoteEvidence() {
  const file = path.join(tmpDir, "server-remote.json");
  fs.writeFileSync(file, JSON.stringify({
    status: "PASS",
    baseUrl: "https://job-sprint.example.com",
    outputLines: [
      "OK /api/health 200",
      "OK /api/auth/login 200",
      "OK /api/auth/session 200",
      "OK /api/progress remote save 200",
      "OK /api/progress remote readback",
      "remote HTTPS job-sprint check passed"
    ]
  }, null, 2));
  return file;
}

function runWithEvidence(file) {
  return spawnSync(process.execPath, [
    "tools/validate_final_delivery_readiness.js",
    "--allow-dirty"
  ], {
    cwd: ROOT,
    env: {
      ...baseEnv,
      JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE: file,
      JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE: writeServerRemoteEvidence()
    },
    encoding: "utf8"
  });
}

const validResult = runWithEvidence(writeEvidence("valid-android-remote.json"));
assert([1, 2].includes(validResult.status), validResult.stderr || validResult.stdout);
const validReport = JSON.parse(validResult.stdout);
const validCheck = validReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(validCheck.status, "PASS");
assert.match(validCheck.webViewUrl, /^https:\/\//);
assert.strictEqual(validCheck.authLoginAttempted, true);
assert.strictEqual(validCheck.authSessionStateCount, 1);
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(validReport.status));

const localAssetResult = runWithEvidence(writeEvidence("local-asset.json", {
  webViewUrl: "file:///android_asset/react/index.html#/more"
}));
assert.strictEqual(localAssetResult.status, 1, localAssetResult.stderr || localAssetResult.stdout);
const localAssetReport = JSON.parse(localAssetResult.stdout);
const localAssetCheck = localAssetReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(localAssetCheck.status, "FAIL");
assert.ok(localAssetCheck.issues.includes("requires_remote_https_webview_url"));
assert.ok(localAssetCheck.issues.includes("requires_job_sprint_remote_path"));

const localSnapshotResult = runWithEvidence(writeEvidence("local-snapshot.json", {
  flowSnapshot: runtimeSnapshot("file:///android_asset/react/index.html#/more", ["Android remote save reason"]),
  restartSnapshot: runtimeSnapshot("file:///android_asset/react/index.html#/more", ["Android remote save reason"])
}));
assert.strictEqual(localSnapshotResult.status, 1, localSnapshotResult.stderr || localSnapshotResult.stdout);
const localSnapshotReport = JSON.parse(localSnapshotResult.stdout);
const localSnapshotCheck = localSnapshotReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(localSnapshotCheck.status, "FAIL");
assert.ok(localSnapshotCheck.issues.includes("flow_snapshot_requires_remote_https_url"));
assert.ok(localSnapshotCheck.issues.includes("restart_snapshot_requires_remote_https_url"));

const missingProgressResult = runWithEvidence(writeEvidence("missing-progress.json", {
  restartSnapshot: runtimeSnapshot("https://job-sprint.example.com/job-sprint/react/index.html#/more", [])
}));
assert.strictEqual(missingProgressResult.status, 1, missingProgressResult.stderr || missingProgressResult.stdout);
const missingProgressReport = JSON.parse(missingProgressResult.stdout);
const missingProgressCheck = missingProgressReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(missingProgressCheck.status, "FAIL");
assert.ok(missingProgressCheck.issues.includes("restart_snapshot_missing_saved_progress"));

const missingAuthResult = runWithEvidence(writeEvidence("missing-auth.json", {
  authEvidence: undefined
}));
assert.strictEqual(missingAuthResult.status, 1, missingAuthResult.stderr || missingAuthResult.stdout);
const missingAuthReport = JSON.parse(missingAuthResult.stdout);
const missingAuthCheck = missingAuthReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(missingAuthCheck.status, "FAIL");
assert.ok(missingAuthCheck.issues.includes("remote_auth_evidence_missing"));

const missingJobSprintPathResult = runWithEvidence(writeEvidence("missing-job-sprint-path.json", {
  webViewUrl: "https://job-sprint.example.com/react/index.html#/more"
}));
assert.strictEqual(missingJobSprintPathResult.status, 1, missingJobSprintPathResult.stderr || missingJobSprintPathResult.stdout);
const missingJobSprintPathReport = JSON.parse(missingJobSprintPathResult.stdout);
const missingJobSprintPathCheck = missingJobSprintPathReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(missingJobSprintPathCheck.status, "FAIL");
assert.ok(missingJobSprintPathCheck.issues.includes("requires_job_sprint_remote_path"));

const unauthenticatedResult = runWithEvidence(writeEvidence("unauthenticated.json", {
  authEvidence: authEvidence({
    sessionStates: [
      {
        label: "before-maybe-login",
        url: "https://job-sprint.example.com/job-sprint/login.html",
        sessionApiStatus: 200,
        sessionApiAuthenticated: false,
        sessionApiAuthConfigured: true,
        androidSessionCookie: false
      }
    ]
  })
}));
assert.strictEqual(unauthenticatedResult.status, 1, unauthenticatedResult.stderr || unauthenticatedResult.stdout);
const unauthenticatedReport = JSON.parse(unauthenticatedResult.stdout);
const unauthenticatedCheck = unauthenticatedReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(unauthenticatedCheck.status, "FAIL");
assert.ok(unauthenticatedCheck.issues.includes("session_api_authenticated_state_missing"));

const localAuthStateResult = runWithEvidence(writeEvidence("local-auth-state.json", {
  authEvidence: authEvidence({
    sessionStates: [
      {
        label: "after-login-submit",
        url: "file:///android_asset/react/index.html#/today",
        sessionApiStatus: 200,
        sessionApiAuthenticated: true,
        sessionApiAuthConfigured: true,
        androidSessionCookie: true
      }
    ]
  })
}));
assert.strictEqual(localAuthStateResult.status, 1, localAuthStateResult.stderr || localAuthStateResult.stdout);
const localAuthStateReport = JSON.parse(localAuthStateResult.stdout);
const localAuthStateCheck = localAuthStateReport.checks.find((check) => check.id === "android_remote_acceptance");
assert.strictEqual(localAuthStateCheck.status, "FAIL");
assert.ok(localAuthStateCheck.issues.includes("remote_auth_session_state_url_not_remote_job_sprint"));

console.log("final delivery Android remote readiness tests passed");

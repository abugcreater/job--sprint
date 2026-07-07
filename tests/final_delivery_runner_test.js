const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const runner = fs.readFileSync("tools/run_final_delivery.js", "utf8");

assert.strictEqual(packageJson.scripts["final:delivery"], "node tools/run_final_delivery.js");
assert.strictEqual(
  packageJson.scripts["test:local-functional"],
  "npm run test:functional && npm run test:rust:functional",
  "local functional gate should exercise Web persistence and Rust/SQLite UI persistence"
);
assert.ok(
  packageJson.scripts["test:release"].includes("npm run test:local-functional"),
  "release gate should run local full functional tests before packaging"
);
assert.ok(
  packageJson.scripts["test:release"].includes("npm run build:rust:linux"),
  "release gate should rebuild the Linux Rust release binary before packaging server delivery"
);

for (const required of [
  "npm",
  "test:release",
  "write:server-sync-evidence",
  "write:remote-evidence",
  "test:android:remote:functional",
  "build:android:release",
  "validate:delivery",
  "delivery_env_file",
  "JOB_SPRINT_SERVER_SYNC_EVIDENCE",
  "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE",
  "JOB_SPRINT_FINAL_DELIVERY_REPORT",
  "JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS",
  "JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS",
  "--report",
  "--delivery-env-file",
  "--defer-final-delivery-report",
  "--defer-post-final-report-validation",
  "post_final_report_validation",
  "embeddedJsonReport(result.stdout)",
  "USER_ACTION_REQUIRED",
  "PASS_WITH_LIMITS",
  "finalDeliveryPreflight",
  "loadDeliveryEnvFile",
  "validateDeliveryExternalInputs",
  "externalInputs",
  "envFile",
  "ssh",
  "rsync",
  "adb",
  "gradle"
]) {
  assert.ok(runner.includes(required), `Final delivery runner should include ${required}`);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-final-delivery-runner-"));
const dryRunReport = path.join(tmpDir, "final-delivery.json");
const dryRun = spawnSync(process.execPath, ["tools/run_final_delivery.js", "--dry-run", "--report", dryRunReport], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JOB_SPRINT_DEPLOY_HOST: "",
    JOB_SPRINT_DEPLOY_USER: "",
    JOB_SPRINT_DEPLOY_PATH: "",
    JOB_SPRINT_REMOTE_BASE_URL: "",
    JOB_SPRINT_ANDROID_WEBVIEW_URL: "",
    JOB_SPRINT_ANDROID_REMOTE_BASE_URL: "",
    JOB_SPRINT_AUTH_USER: "",
    JOB_SPRINT_AUTH_PASSWORD: "",
    JOB_SPRINT_ANDROID_KEYSTORE: "",
    JOB_SPRINT_ANDROID_STORE_PASSWORD: "",
    JOB_SPRINT_ANDROID_KEY_ALIAS: "",
    JOB_SPRINT_ANDROID_KEY_PASSWORD: "",
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: ""
  },
  encoding: "utf8"
});

assert.strictEqual(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.status, "DRY_RUN");
assert.strictEqual(report.dryRun, true);
assert.strictEqual(report.report, dryRunReport);
assert.ok(fs.existsSync(dryRunReport), "dry-run should write a final delivery report when --report is supplied");
assert.deepStrictEqual(JSON.parse(fs.readFileSync(dryRunReport, "utf8")), report);
assert.deepStrictEqual(report.steps.map((step) => step.id), [
  "preflight",
  "release_gate",
  "server_sync_evidence",
  "server_remote_acceptance",
  "android_remote_acceptance",
  "android_formal_release",
  "final_readiness"
]);
assert.ok(report.steps.every((step) => step.status === "DRY_RUN"));
assert.ok(report.steps[0].tools.base.some((tool) => tool.command === "npm"));
assert.ok(report.steps[0].envGroups.serverSync.missing.includes("JOB_SPRINT_DEPLOY_HOST"));
assert.ok(report.steps[0].envGroups.remoteAcceptance.missing.includes("JOB_SPRINT_REMOTE_BASE_URL"));
assert.ok(report.steps[0].envGroups.remoteAcceptance.missing.includes("JOB_SPRINT_AUTH_PASSWORD"));
assert.ok(report.steps[0].envGroups.androidRemote.missing.includes("JOB_SPRINT_ANDROID_WEBVIEW_URL"));
assert.ok(report.steps[0].envGroups.androidRemote.missing.includes("JOB_SPRINT_AUTH_PASSWORD"));
assert.strictEqual(report.steps[0].externalInputs.status, "USER_ACTION_REQUIRED");
assert.ok(report.steps[0].externalInputs.checks.some((check) => check.id === "server_sync_inputs"));
assert.ok(report.steps[0].externalInputs.checks.some((check) => check.id === "android_remote_inputs"));
assert.ok(report.steps[0].externalInputs.nextActions.some((action) => action.id === "formal_android_release_inputs"));
assert.ok(report.evidenceDefaults.serverSync.endsWith("docs/evidence/server-sync/sync.json"));
assert.ok(report.evidenceDefaults.serverRemote.endsWith("docs/evidence/server-remote/acceptance.json"));
assert.ok(report.evidenceDefaults.androidRemote.endsWith("docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json"));
assert.ok(report.evidenceDefaults.androidRelease.endsWith("docs/evidence/android-release/formal-release.json"));

const fakeBin = path.join(tmpDir, "bin");
fs.mkdirSync(fakeBin, { recursive: true });
const fakeLog = path.join(tmpDir, "fake-npm-calls.jsonl");
const envKey = (...parts) => parts.join("_");
const fakeNpm = path.join(fakeBin, "npm");
fs.writeFileSync(fakeNpm, `#!/usr/bin/env node
const fs = require("fs");
const record = {
  argv: process.argv.slice(2),
  finalDeliveryInProgress: process.env.JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS || null,
  finalDeliveryPostValidationInProgress: process.env.JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS || null,
  finalDeliveryReport: process.env.JOB_SPRINT_FINAL_DELIVERY_REPORT || null
};
fs.appendFileSync(process.env.JOB_SPRINT_FAKE_NPM_LOG, JSON.stringify(record) + "\\n");
if (record.argv[0] === "run" && record.argv[1] === "validate:delivery") {
  const finalReportDeferred = record.argv.includes("--defer-final-delivery-report");
  const postValidationDeferred = record.argv.includes("--defer-post-final-report-validation");
  if (finalReportDeferred) {
    if (record.finalDeliveryInProgress !== "1" || !record.finalDeliveryReport) {
      console.error("deferred validate:delivery must run only inside final delivery runner");
      process.exit(17);
    }
  } else if (postValidationDeferred) {
    if (record.finalDeliveryPostValidationInProgress !== "1" || record.finalDeliveryInProgress === "1" || !record.finalDeliveryReport || !fs.existsSync(record.finalDeliveryReport)) {
      console.error("post validate:delivery must run after the initial final report is written");
      process.exit(18);
    }
  } else {
    if (record.finalDeliveryInProgress === "1" || !record.finalDeliveryReport || !fs.existsSync(record.finalDeliveryReport)) {
      console.error("strict validate:delivery must run after the final report is written");
      process.exit(19);
    }
  }
}
console.log(JSON.stringify({ status: "PASS" }));
`);
fs.chmodSync(fakeNpm, 0o755);
for (const command of ["ssh", "rsync", "adb", "gradle"]) {
  const file = path.join(fakeBin, command);
  fs.writeFileSync(file, "#!/bin/sh\nexit 0\n");
  fs.chmodSync(file, 0o755);
}

const fullPassReport = path.join(tmpDir, "full-pass-final-delivery.json");
const releaseKeystore = path.join(tmpDir, "release.keystore");
fs.writeFileSync(releaseKeystore, "synthetic test keystore placeholder\n");
const fullPassEnvFile = path.join(tmpDir, "private-delivery.env");
fs.writeFileSync(fullPassEnvFile, [
  "JOB_SPRINT_DEPLOY_HOST=example.internal",
  "JOB_SPRINT_DEPLOY_USER=deploy",
  "JOB_SPRINT_DEPLOY_PATH=/srv/job-sprint",
  "JOB_SPRINT_REMOTE_BASE_URL=https://job-sprint.example.com",
  "JOB_SPRINT_AUTH_USER=acceptance-user",
  "JOB_SPRINT_AUTH_PASSWORD=acceptance-pass",
  "JOB_SPRINT_ANDROID_WEBVIEW_URL=https://job-sprint.example.com",
  `JOB_SPRINT_ANDROID_KEYSTORE=${releaseKeystore}`,
  "JOB_SPRINT_ANDROID_STORE_PASSWORD=store-pass",
  "JOB_SPRINT_ANDROID_KEY_ALIAS=release",
  "JOB_SPRINT_ANDROID_KEY_PASSWORD=key-pass",
  `JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256=${"ab".repeat(32)}`
].join("\n"));
const fullPass = spawnSync(process.execPath, ["tools/run_final_delivery.js", "--delivery-env-file", fullPassEnvFile, "--report", fullPassReport], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
    JOB_SPRINT_FAKE_NPM_LOG: fakeLog,
    JOB_SPRINT_DEPLOY_HOST: "",
    JOB_SPRINT_DEPLOY_USER: "",
    JOB_SPRINT_DEPLOY_PATH: "",
    JOB_SPRINT_REMOTE_BASE_URL: "",
    JOB_SPRINT_AUTH_USER: "",
    [envKey("JOB", "SPRINT", "AUTH", "PASSWORD")]: "",
    JOB_SPRINT_ANDROID_WEBVIEW_URL: "",
    JOB_SPRINT_ANDROID_KEYSTORE: "",
    [envKey("JOB", "SPRINT", "ANDROID", "STORE", "PASSWORD")]: "",
    JOB_SPRINT_ANDROID_KEY_ALIAS: "",
    [envKey("JOB", "SPRINT", "ANDROID", "KEY", "PASSWORD")]: "",
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: ""
  },
  encoding: "utf8"
});
assert.strictEqual(fullPass.status, 0, fullPass.stderr || fullPass.stdout);
const fullPassJson = JSON.parse(fullPass.stdout);
assert.strictEqual(fullPassJson.status, "PASS");
assert.strictEqual(fullPassJson.dryRun, false);
assert.strictEqual(fullPassJson.report, fullPassReport);
assert.ok(fs.existsSync(fullPassReport), "full pass run should write final delivery report");
assert.deepStrictEqual(JSON.parse(fs.readFileSync(fullPassReport, "utf8")), fullPassJson);
assert.ok(fullPassJson.steps.every((step) => step.status === "PASS"));
assert.strictEqual(fullPassJson.steps[0].envFile.loaded, true);
assert.ok(fullPassJson.steps[0].envFile.loadedKeys.includes("JOB_SPRINT_AUTH_PASSWORD"));
assert.ok(!JSON.stringify(fullPassJson).includes("acceptance-pass"));
assert.ok(!JSON.stringify(fullPassJson).includes("store-pass"));
assert.ok(!JSON.stringify(fullPassJson).includes("key-pass"));
assert.deepStrictEqual(fullPassJson.steps.map((step) => step.id), [
  "preflight",
  "release_gate",
  "server_sync_evidence",
  "server_remote_acceptance",
  "android_remote_acceptance",
  "android_formal_release",
  "final_readiness",
  "post_final_report_validation"
]);
const finalReadinessStep = fullPassJson.steps.find((step) => step.id === "final_readiness");
assert.ok(finalReadinessStep.command.includes("--defer-final-delivery-report"));
const postValidationStep = fullPassJson.steps.find((step) => step.id === "post_final_report_validation");
assert.ok(postValidationStep.command.endsWith("npm run validate:delivery -- --defer-post-final-report-validation"));
const fakeCalls = fs.readFileSync(fakeLog, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
const validateCalls = fakeCalls.filter((call) => call.argv[0] === "run" && call.argv[1] === "validate:delivery");
assert.strictEqual(validateCalls.length, 2, "runner should validate before and after writing the final report");
assert.strictEqual(validateCalls[0].finalDeliveryInProgress, "1");
assert.strictEqual(validateCalls[0].finalDeliveryPostValidationInProgress, null);
assert.strictEqual(validateCalls[0].finalDeliveryReport, fullPassReport);
assert.ok(validateCalls[0].argv.includes("--defer-final-delivery-report"));
assert.strictEqual(validateCalls[1].finalDeliveryInProgress, null);
assert.strictEqual(validateCalls[1].finalDeliveryPostValidationInProgress, "1");
assert.strictEqual(validateCalls[1].finalDeliveryReport, fullPassReport);
assert.ok(!validateCalls[1].argv.includes("--defer-final-delivery-report"));
assert.ok(validateCalls[1].argv.includes("--defer-post-final-report-validation"));

console.log("final delivery runner tests passed");

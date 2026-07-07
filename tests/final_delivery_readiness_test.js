const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { evaluateReadiness } = require("../tools/validate_final_delivery_readiness");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-release-readiness-"));
const releaseCertSha256 = "ab".repeat(32);
const readinessTool = fs.readFileSync("tools/validate_final_delivery_readiness.js", "utf8");
const readinessArchitectureTool = fs.readFileSync("tools/delivery_readiness_architecture.js", "utf8");
const readinessFunctionalTool = fs.readFileSync("tools/delivery_readiness_functional.js", "utf8");
const readinessFeatureParityTool = fs.readFileSync("tools/delivery_readiness_feature_parity.js", "utf8");
const readinessGoalTool = fs.readFileSync("tools/delivery_readiness_goal.js", "utf8");
const readinessServerPackageTool = fs.readFileSync("tools/delivery_readiness_server_package.js", "utf8");
const productIterationWorkflowTool = fs.readFileSync("tools/validate_product_iteration_workflow.js", "utf8");
const deliveryInputsTool = fs.readFileSync("tools/validate_delivery_external_inputs.js", "utf8");
const deliveryActionCommandsTool = fs.readFileSync("tools/delivery_action_commands.js", "utf8");
const buildAndroidReleaseTool = fs.readFileSync("tools/build_android_release_apk.js", "utf8");
const buildLinuxRustBinaryTool = fs.readFileSync("tools/build_linux_rust_binary.js", "utf8");
const buildServerDeliveryTool = fs.readFileSync("tools/build_server_delivery_package.js", "utf8");
const remoteEvidenceTool = fs.readFileSync("tools/write_remote_acceptance_evidence.js", "utf8");
const serverSyncEvidenceTool = fs.readFileSync("tools/write_server_sync_evidence.js", "utf8");
const remoteHttpScript = fs.readFileSync("tools/remote_job_sprint_check.sh", "utf8");
const remoteHttpsScript = fs.readFileSync("tools/remote_https_job_sprint_check.sh", "utf8");
const fakeSensitiveValue = ["password", "that", "should", "not", "leak"].join("-");

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

for (const required of [
  "public_safe_bundle",
  "build-manifest.json",
  "sourceHashes",
  "build_public_safe_bundle.js",
  "release_gate_script",
  "test:local-functional",
  "npm run test:functional",
  "npm run test:rust:functional",
  "final_delivery_report",
  "run_final_delivery.js",
  "JOB_SPRINT_FINAL_DELIVERY_REPORT",
  "JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS",
  "JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS",
  "--defer-final-delivery-report",
  "--defer-post-final-report-validation",
  "final_delivery_report_deferred_until_runner_write",
  "env: options.env || process.env",
  "architecture_quality",
  "delivery_readiness_architecture.js",
  "validate_architecture_quality.js",
  "functional_coverage",
  "delivery_readiness_functional.js",
  "validate_functional_coverage.js",
  "feature_parity",
  "delivery_readiness_feature_parity.js",
  "validate_feature_parity.js",
  "product_iteration_workflow",
  "validate_product_iteration_workflow.js",
  "validateProductIterationWorkflow",
  "product_iteration_workflow_gate_failed",
  "product_iteration_workflow_findings_present",
  "goal_acceptance",
  "delivery_readiness_goal.js",
  "validate_goal_acceptance.js",
  "delivery_external_inputs",
  "delivery_env_file.js",
  "write_delivery_env_template.js",
  "validate_delivery_external_inputs.js",
  "delivery_action_commands",
  "post_final_report_validation",
  "server_delivery_package",
  "{ timeoutMs: 90_000, env }",
  "build_server_delivery_package.js",
  "rust_release_binary_stale",
  "newerSources",
  "Run npm run build:rust:linux before server sync.",
  "server_sync_evidence",
  "write_server_sync_evidence.js",
  "write_remote_invitation_evidence.js",
  "write_remote_invitation_account_evidence.js",
  "write_remote_login_switch_evidence.js",
  "write_remote_coach_evidence.js",
  "JOB_SPRINT_SERVER_SYNC_EVIDENCE",
  "scan_public_bundle.js",
  "formal_android_release_keystore_inside_repo",
  "public_safe_bundle_stale",
  "public_safe_android_fallback_out_of_sync",
  "Run npm run build:server-delivery",
  "Run npm run build:public-safe before server sync."
]) {
  assert.ok(readinessTool.includes(required), `Final delivery readiness should include ${required}`);
}

for (const required of [
  "serverSync: `npm run write:server-sync-evidence -- --delivery-env-file",
  "serverRemote: `npm run write:remote-evidence -- --delivery-env-file",
  "remoteInvitations: `npm run write:remote-invitation-evidence -- --delivery-env-file",
  "remoteInvitationAccount: `npm run write:remote-invitation-account-evidence -- --delivery-env-file",
  "androidRemote: `npm run test:android:remote:functional -- --delivery-env-file",
  "formalRelease: `npm run build:android:release -- --delivery-env-file",
  "finalDelivery: `npm run final:delivery -- --delivery-env-file"
]) {
  assert.ok(deliveryActionCommandsTool.includes(required), `Delivery action commands should include ${required}`);
}

for (const required of [
  "validateArchitectureQuality",
  "architecture_quality_gate_failed",
  "architecture_quality_findings_present"
]) {
  assert.ok(readinessArchitectureTool.includes(required), `Readiness architecture adapter should include ${required}`);
}

for (const required of [
  "validateFunctionalCoverage",
  "functional_coverage_gate_failed",
  "functional_coverage_findings_present"
]) {
  assert.ok(readinessFunctionalTool.includes(required), `Readiness functional adapter should include ${required}`);
}

for (const required of [
  "validateFeatureParity",
  "feature_parity_gate_failed",
  "feature_parity_findings_present"
]) {
  assert.ok(readinessFeatureParityTool.includes(required), `Readiness feature parity adapter should include ${required}`);
}

for (const required of [
  "validateGoalAcceptance",
  "goal_acceptance_gate_failed",
  "goal_acceptance_requires_external_evidence",
  "goal_acceptance_has_limits"
]) {
  assert.ok(readinessGoalTool.includes(required), `Readiness goal adapter should include ${required}`);
}

for (const required of ["validateProductIterationWorkflow", "prd_options_multiple_versions", "role_question_bank_not_proven", "remote_provider_not_configured"]) {
  assert.ok(productIterationWorkflowTool.includes(required), `Product iteration workflow tool should include ${required}`);
}

for (const required of [
  "server_delivery_package",
  "server_delivery_package_stale",
  "current_rust_release_binary_not_linux_elf",
  "delivery_rust_binary_not_linux_elf",
  "isLinuxElf"
]) {
  assert.ok(readinessServerPackageTool.includes(required), `Readiness server package adapter should include ${required}`);
}

for (const required of [
  "validateDeliveryExternalInputs",
  "server_sync_inputs",
  "android_remote_inputs",
  "formal_android_release_inputs"
]) {
  assert.ok(deliveryInputsTool.includes(required), `Delivery inputs tool should include ${required}`);
}

for (const required of [
  "argValue(\"--report\")",
  "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE",
  "apkSha256",
  "formal_android_release_keystore_inside_repo",
  "fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })",
  "fs.writeFileSync(absoluteReportPath"
]) {
  assert.ok(buildAndroidReleaseTool.includes(required), `Android release build tool should include ${required}`);
}

for (const required of [
  "server_delivery_source_binary_not_linux_elf",
  "binaryFileDescription",
  "isLinuxElf",
  "Do not package a macOS Mach-O binary",
  "Build or provide a Linux x86_64 release binary"
]) {
  assert.ok(buildServerDeliveryTool.includes(required), `Server delivery package build tool should include ${required}`);
}

for (const required of [
  "loadDeliveryEnvFile",
  "cargo build --release",
  "file target/release/job-sprint-api | grep -Eq 'ELF.*x86-64.*(Linux|GNU/Linux|SYSV)'",
  "target/release/job-sprint-api",
  "remoteBuildDir: remoteDir"
]) {
  assert.ok(buildLinuxRustBinaryTool.includes(required), `Linux Rust binary build tool should include ${required}`);
}
assert.doesNotMatch(buildLinuxRustBinaryTool, /,\s*remoteBuildDir,\s*\n/, "Linux Rust binary build report must not reference an undefined shorthand remoteBuildDir");

for (const required of [
  "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE",
  "remote_https_job_sprint_check.sh",
  "remote_job_sprint_check.sh",
  "outputLines"
]) {
  assert.ok(remoteEvidenceTool.includes(required), `Remote evidence tool should include ${required}`);
}

for (const required of [
  "server_sync_local_binary_not_linux_elf",
  "binaryFileDescription",
  "isLinuxElf",
  "Do not sync a macOS Mach-O binary",
  "protectedRsyncPaths",
  "\"/shared/***\"",
  "rsyncArgs.push(\"--exclude\", protectedPath)",
  "file ${shellQuote(`${remoteDir.replace(/\\/+$/, \"\")}/bin/job-sprint-api`)}",
  "ELF.*x86-64"
]) {
  assert.ok(serverSyncEvidenceTool.includes(required), `Server sync evidence tool should include ${required}`);
}

for (const script of [remoteHttpScript, remoteHttpsScript]) {
  assert.ok(script.includes("/api/progress"), "Remote scripts should exercise progress persistence");
  assert.ok(script.includes("remoteAcceptance"), "Remote scripts should merge a remote acceptance marker");
  assert.ok(script.includes("OK /api/progress remote save"), "Remote scripts should report progress save evidence");
  assert.ok(script.includes("OK /api/progress remote readback"), "Remote scripts should report progress readback evidence");
}

const env = { ...process.env };
for (const key of [
  "JOB_SPRINT_ANDROID_KEYSTORE",
  "JOB_SPRINT_ANDROID_STORE_PASSWORD",
  "JOB_SPRINT_ANDROID_KEY_ALIAS",
  "JOB_SPRINT_ANDROID_KEY_PASSWORD",
  "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256",
  "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE",
  "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE",
  "JOB_SPRINT_SERVER_SYNC_EVIDENCE",
  "JOB_SPRINT_FINAL_DELIVERY_REPORT",
  "JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS",
  "JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS",
  "JOB_SPRINT_DEPLOY_HOST",
  "JOB_SPRINT_DEPLOY_USER",
  "JOB_SPRINT_DEPLOY_PATH",
  "JOB_SPRINT_DEPLOY_PORT",
  "JOB_SPRINT_DEPLOY_SSH_KEY",
  "JOB_SPRINT_SSH_KEY",
  "JOB_SPRINT_ANDROID_WEBVIEW_URL",
  "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
  "JOB_SPRINT_REMOTE_BASE_URL",
  "JOB_SPRINT_PUBLIC_BASE_URL",
  "JOB_SPRINT_DELIVERY_BASE_URL",
  "JOB_SPRINT_AUTH_USER",
  "JOB_SPRINT_AUTH_PASSWORD",
  "JOB_SPRINT_AUTH_PASS"
]) {
  delete env[key];
}
env.JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV = "1";
env.JOB_SPRINT_SERVER_SYNC_EVIDENCE = path.join(tmpDir, "missing-server-sync.json");
env.JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE = path.join(tmpDir, "missing-server-remote.json");
env.JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE = path.join(tmpDir, "missing-android-remote.json");
env.JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE = path.join(tmpDir, "missing-android-release.json");
env.JOB_SPRINT_FINAL_DELIVERY_REPORT = path.join(tmpDir, "missing-final-delivery.json");

const result = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env,
  encoding: "utf8"
});

assert([1, 2].includes(result.status), result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(report.status), result.stdout);

const remote = report.checks.find((check) => check.id === "server_remote_acceptance");
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(remote.status));
assert(["remote_base_url_missing", "server_remote_acceptance_evidence_file_missing"].includes(remote.reason));
if (remote.status === "USER_ACTION_REQUIRED") {
  assert(remote.requiredInputs.some((item) => item.includes("write:remote-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env")));
} else {
  assert(remote.evidence.includes("missing-server-remote.json"));
}

const serverSyncEvidence = report.checks.find((check) => check.id === "server_sync_evidence");
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(serverSyncEvidence.status));
assert(["server_sync_evidence_missing", "server_sync_evidence_file_missing"].includes(serverSyncEvidence.reason));
if (serverSyncEvidence.status === "FAIL") {
  assert(serverSyncEvidence.evidence.includes("missing-server-sync.json"));
}

const releaseGateScript = report.checks.find((check) => check.id === "release_gate_script");
assert.strictEqual(releaseGateScript.status, "PASS");
assert.ok(releaseGateScript.localFunctional.includes("npm run test:functional"));
assert.ok(releaseGateScript.localFunctional.includes("npm run test:rust:functional"));
assert.ok(releaseGateScript.releaseGate.includes("npm run test:local-functional"));
assert.ok(releaseGateScript.releaseGate.includes("npm run build:rust:linux"));

const architectureQuality = report.checks.find((check) => check.id === "architecture_quality");
assert.strictEqual(architectureQuality.status, "PASS");
assert.ok(architectureQuality.sourceFileCount > 50);
assert.ok(architectureQuality.requiredFileCount >= 50);
assert.ok(architectureQuality.semanticBoundaryRuleCount >= 3);
assert.ok(architectureQuality.largestFiles.some((item) => item.file === "assets/schedule.js"));

const functionalCoverage = report.checks.find((check) => check.id === "functional_coverage");
assert.strictEqual(functionalCoverage.status, "PASS");
assert.strictEqual(functionalCoverage.coverageTargetCount, 4);
assert.strictEqual(functionalCoverage.evidenceReportCount, 2);

const featureParity = report.checks.find((check) => check.id === "feature_parity");
assert.strictEqual(featureParity.status, "PASS");
assert.strictEqual(featureParity.featureCount, 10);
assert.strictEqual(featureParity.passCount, 10);

const productIterationWorkflow = report.checks.find((check) => check.id === "product_iteration_workflow");
assert.ok(productIterationWorkflow, "Final delivery readiness should report product iteration workflow status");
assert.ok(["PASS", "PASS_WITH_LIMITS"].includes(productIterationWorkflow.status));
assert.ok(productIterationWorkflow.checkedDocs >= 8);
if (productIterationWorkflow.status === "PASS_WITH_LIMITS") assert.ok(productIterationWorkflow.warningCount >= 1);

const goalAcceptance = report.checks.find((check) => check.id === "goal_acceptance");
assert.strictEqual(goalAcceptance.status, "USER_ACTION_REQUIRED");
assert.strictEqual(goalAcceptance.reason, "goal_acceptance_requires_external_evidence");
assert.strictEqual(goalAcceptance.goalCount, 7);
assert.ok(goalAcceptance.passCount >= 3);

const deliveryInputs = report.checks.find((check) => check.id === "delivery_external_inputs");
assert.strictEqual(deliveryInputs.status, "USER_ACTION_REQUIRED");
assert(deliveryInputs.requiredInputs.some((item) => item.includes("JOB_SPRINT_DEPLOY_HOST")));
assert(deliveryInputs.requiredInputs.some((item) => item.includes("JOB_SPRINT_ANDROID_WEBVIEW_URL")));

const finalDeliveryReport = report.checks.find((check) => check.id === "final_delivery_report");
assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED"].includes(finalDeliveryReport.status));
assert(["final_delivery_report_not_supplied", "final_delivery_report_file_missing"].includes(finalDeliveryReport.reason));

const rustBinary = path.join(tmpDir, "fake-job-sprint-api");
const rustStaleProbe = path.join(tmpDir, "fake-main.rs");
fs.writeFileSync(rustBinary, "fake rust binary");
fs.writeFileSync(rustStaleProbe, "fn main() {}\n");
const binaryTime = new Date(Date.now() - 10000);
const staleProbeTime = new Date(binaryTime.getTime() + 5000);
fs.utimesSync(rustBinary, binaryTime, binaryTime);
fs.utimesSync(rustStaleProbe, staleProbeTime, staleProbeTime);
const staleRustReport = evaluateReadiness(env, {
  allowDirty: true,
  rustBinary,
  rustSourceFiles: [rustStaleProbe]
});
const staleRustCheck = staleRustReport.checks.find((check) => check.id === "rust_release_binary");
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(staleRustReport.status));
assert.strictEqual(staleRustCheck.status, "USER_ACTION_REQUIRED");
assert.strictEqual(staleRustCheck.reason, "rust_release_binary_stale");
assert.ok(staleRustCheck.newerSources.includes(rustStaleProbe));

const productIterationFailureReport = evaluateReadiness(env, {
  allowDirty: true,
  productIterationReport: { ok: false, status: "FAIL", findings: [{ id: "prd_options_multiple_versions" }], warnings: [], metrics: { checkedDocs: 8, warningCount: 0 } }
});
const productIterationFailureCheck = productIterationFailureReport.checks.find((check) => check.id === "product_iteration_workflow");
assert.strictEqual(productIterationFailureReport.status, "FAIL");
assert.deepStrictEqual([productIterationFailureCheck.status, productIterationFailureCheck.reason, productIterationFailureCheck.findingCount], ["FAIL", "product_iteration_workflow_findings_present", 1]);

const deferWithoutRunnerResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty",
  "--defer-final-delivery-report"
], {
  cwd: process.cwd(),
  env,
  encoding: "utf8"
});
assert([1, 2].includes(deferWithoutRunnerResult.status), deferWithoutRunnerResult.stderr || deferWithoutRunnerResult.stdout);
const deferWithoutRunnerReport = JSON.parse(deferWithoutRunnerResult.stdout);
const deferWithoutRunnerCheck = deferWithoutRunnerReport.checks.find((check) => check.id === "final_delivery_report");
assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED"].includes(deferWithoutRunnerCheck.status));
assert(["final_delivery_report_not_supplied", "final_delivery_report_file_missing"].includes(deferWithoutRunnerCheck.reason));

const deferWithoutReportPathEnv = {
  ...env,
  JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS: "1"
};
delete deferWithoutReportPathEnv.JOB_SPRINT_FINAL_DELIVERY_REPORT;
const deferWithoutReportPathResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty",
  "--defer-final-delivery-report"
], {
  cwd: process.cwd(),
  env: deferWithoutReportPathEnv,
  encoding: "utf8"
});
assert([1, 2].includes(deferWithoutReportPathResult.status), deferWithoutReportPathResult.stderr || deferWithoutReportPathResult.stdout);
const deferWithoutReportPathReport = JSON.parse(deferWithoutReportPathResult.stdout);
const deferWithoutReportPathCheck = deferWithoutReportPathReport.checks.find((check) => check.id === "final_delivery_report");
assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED"].includes(deferWithoutReportPathCheck.status));
assert(["final_delivery_report_not_supplied", "final_delivery_report_file_missing"].includes(deferWithoutReportPathCheck.reason));

const deferWithRunnerResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty",
  "--defer-final-delivery-report"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS: "1",
    JOB_SPRINT_FINAL_DELIVERY_REPORT: path.join(tmpDir, "deferred-final-delivery.json")
  },
  encoding: "utf8"
});
assert([1, 2].includes(deferWithRunnerResult.status), deferWithRunnerResult.stderr || deferWithRunnerResult.stdout);
const deferWithRunnerReport = JSON.parse(deferWithRunnerResult.stdout);
const deferWithRunnerCheck = deferWithRunnerReport.checks.find((check) => check.id === "final_delivery_report");
assert.strictEqual(deferWithRunnerCheck.status, "PASS");
assert.strictEqual(deferWithRunnerCheck.reason, "final_delivery_report_deferred_until_runner_write");

const publicSafeBundle = report.checks.find((check) => check.id === "public_safe_bundle");
assert.ok(publicSafeBundle, "Final delivery readiness should report public-safe bundle status");
assert.ok(["PASS", "USER_ACTION_REQUIRED"].includes(publicSafeBundle.status));
if (publicSafeBundle.status === "PASS") {
  assert.ok(publicSafeBundle.sourceCount > 0);
}
if (publicSafeBundle.status === "USER_ACTION_REQUIRED") {
  assert.ok([
    "public_safe_bundle_missing",
    "public_safe_bundle_manifest_missing",
    "public_safe_bundle_stale",
    "public_safe_android_fallback_out_of_sync"
  ].includes(publicSafeBundle.reason));
}

const serverDeliveryPackage = report.checks.find((check) => check.id === "server_delivery_package");
assert.ok(serverDeliveryPackage, "Final delivery readiness should report server delivery package status");
assert.ok(["PASS", "USER_ACTION_REQUIRED"].includes(serverDeliveryPackage.status));
if (serverDeliveryPackage.status === "PASS") {
  assert.ok(serverDeliveryPackage.publicSafeFileCount > 0);
  assert.match(serverDeliveryPackage.rustBinarySha256, /^[a-f0-9]{64}$/);
}
if (serverDeliveryPackage.status === "USER_ACTION_REQUIRED") {
  assert.ok([
    "server_delivery_package_missing",
    "server_delivery_package_stale"
  ].includes(serverDeliveryPackage.reason));
}

const serverDeliveryManifest = "dist/server-delivery/server-delivery-manifest.json";
if (fs.existsSync(serverDeliveryManifest)) {
  const manifestSha256 = sha256File(serverDeliveryManifest);
  const validServerSyncEvidence = writeJson("server-sync.json", {
    status: "PASS",
    syncedAt: "2026-07-05T00:00:00.000Z",
    target: {
      host: "example.internal",
      user: "deploy",
      remoteDir: "/srv/job-sprint"
    },
    localManifest: serverDeliveryManifest,
    localManifestSha256: manifestSha256,
    remoteManifest: "/srv/job-sprint/server-delivery-manifest.json",
    remoteManifestSha256: manifestSha256,
    outputLines: [
      "OK server delivery rsync",
      "OK server delivery remote manifest sha256"
    ]
  });
  const validServerSyncResult = spawnSync(process.execPath, [
    "tools/validate_final_delivery_readiness.js",
    "--allow-dirty"
  ], {
    cwd: process.cwd(),
    env: {
      ...env,
      JOB_SPRINT_SERVER_SYNC_EVIDENCE: validServerSyncEvidence
    },
    encoding: "utf8"
  });
  assert([1, 2].includes(validServerSyncResult.status), validServerSyncResult.stderr || validServerSyncResult.stdout);
  const validServerSyncReport = JSON.parse(validServerSyncResult.stdout);
  const validServerSyncCheck = validServerSyncReport.checks.find((check) => check.id === "server_sync_evidence");
  assert.strictEqual(validServerSyncCheck.status, "PASS");
  assert.strictEqual(validServerSyncCheck.manifestSha256, manifestSha256);
}

const validFinalDeliveryReport = writeJson("final-delivery.json", {
  status: "PASS",
  dryRun: false,
  generatedAt: "2026-07-05T00:00:00.000Z",
  report: "docs/evidence/final-delivery/final-delivery.json",
  evidenceDefaults: {},
  steps: [
    { id: "preflight", status: "PASS" },
    { id: "release_gate", status: "PASS" },
    { id: "server_sync_evidence", status: "PASS" },
    { id: "server_remote_acceptance", status: "PASS" },
    { id: "android_remote_acceptance", status: "PASS" },
    { id: "android_formal_release", status: "PASS" },
    { id: "final_readiness", status: "PASS" },
    { id: "post_final_report_validation", status: "PASS" }
  ]
});
const legacyFinalDeliveryReport = writeJson("final-delivery-missing-post-validation.json", {
  status: "PASS",
  dryRun: false,
  generatedAt: "2026-07-05T00:00:00.000Z",
  report: "docs/evidence/final-delivery/final-delivery.json",
  evidenceDefaults: {},
  steps: [
    { id: "preflight", status: "PASS" },
    { id: "release_gate", status: "PASS" },
    { id: "server_sync_evidence", status: "PASS" },
    { id: "server_remote_acceptance", status: "PASS" },
    { id: "android_remote_acceptance", status: "PASS" },
    { id: "android_formal_release", status: "PASS" },
    { id: "final_readiness", status: "PASS" }
  ]
});
const legacyFinalDeliveryResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_FINAL_DELIVERY_REPORT: legacyFinalDeliveryReport
  },
  encoding: "utf8"
});
assert.strictEqual(legacyFinalDeliveryResult.status, 1, legacyFinalDeliveryResult.stderr || legacyFinalDeliveryResult.stdout);
const legacyFinalDeliveryReadiness = JSON.parse(legacyFinalDeliveryResult.stdout);
const legacyFinalDeliveryCheck = legacyFinalDeliveryReadiness.checks.find((check) => check.id === "final_delivery_report");
assert.strictEqual(legacyFinalDeliveryCheck.status, "FAIL");
assert.ok(legacyFinalDeliveryCheck.issues.includes("final_delivery_report_step_post_final_report_validation_missing"));

const deferredPostValidationResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty",
  "--defer-post-final-report-validation"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS: "1",
    JOB_SPRINT_FINAL_DELIVERY_REPORT: legacyFinalDeliveryReport
  },
  encoding: "utf8"
});
assert([1, 2].includes(deferredPostValidationResult.status), deferredPostValidationResult.stderr || deferredPostValidationResult.stdout);
const deferredPostValidationReadiness = JSON.parse(deferredPostValidationResult.stdout);
const deferredPostValidationCheck = deferredPostValidationReadiness.checks.find((check) => check.id === "final_delivery_report");
assert.strictEqual(deferredPostValidationCheck.status, "PASS");

const validFinalDeliveryResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_FINAL_DELIVERY_REPORT: validFinalDeliveryReport
  },
  encoding: "utf8"
});
assert([1, 2].includes(validFinalDeliveryResult.status), validFinalDeliveryResult.stderr || validFinalDeliveryResult.stdout);
const validFinalDeliveryReadiness = JSON.parse(validFinalDeliveryResult.stdout);
const validFinalDeliveryCheck = validFinalDeliveryReadiness.checks.find((check) => check.id === "final_delivery_report");
assert.strictEqual(validFinalDeliveryCheck.status, "PASS");
assert.strictEqual(validFinalDeliveryCheck.stepCount, 8);

function writeJson(name, value) {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function remoteEvidence(overrides = {}) {
  return {
    status: "PASS",
    baseUrl: "https://job-sprint.example.com",
    script: "tools/remote_https_job_sprint_check.sh",
    checkedAt: "2026-07-05T00:00:00.000Z",
    outputLines: [
      "OK /api/health 200",
      "OK /api/auth/login 200",
      "OK /api/auth/session 200",
      "OK /api/progress remote save 200",
      "OK /api/progress remote readback",
      "remote HTTPS job-sprint check passed"
    ],
    ...overrides
  };
}

const serverEvidence = writeJson("server-remote.json", remoteEvidence());
const serverEvidenceResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE: serverEvidence
  },
  encoding: "utf8"
});
assert([1, 2].includes(serverEvidenceResult.status), serverEvidenceResult.stderr || serverEvidenceResult.stdout);
const serverEvidenceReport = JSON.parse(serverEvidenceResult.stdout);
const serverEvidenceCheck = serverEvidenceReport.checks.find((check) => check.id === "server_remote_acceptance");
assert.strictEqual(serverEvidenceCheck.status, "PASS");
assert.strictEqual(serverEvidenceCheck.baseUrl, "https://job-sprint.example.com");
assert.ok(!serverEvidenceResult.stdout.includes(fakeSensitiveValue));

const invalidServerEvidence = writeJson("server-remote-invalid.json", remoteEvidence({
  outputLines: [
    "OK /api/health 200",
    "OK /api/progress remote save 200",
    "remote HTTPS job-sprint check passed"
  ]
}));
const invalidServerEvidenceResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE: invalidServerEvidence
  },
  encoding: "utf8"
});
assert.strictEqual(invalidServerEvidenceResult.status, 1, invalidServerEvidenceResult.stderr || invalidServerEvidenceResult.stdout);
const invalidServerEvidenceReport = JSON.parse(invalidServerEvidenceResult.stdout);
const invalidServerEvidenceCheck = invalidServerEvidenceReport.checks.find((check) => check.id === "server_remote_acceptance");
assert.strictEqual(invalidServerEvidenceCheck.status, "FAIL");
assert.ok(invalidServerEvidenceCheck.issues.some((issue) => issue.includes("api_auth_login")));
assert.ok(invalidServerEvidenceCheck.issues.some((issue) => issue.includes("api_progress_remote_readback")));

const signing = report.checks.find((check) => check.id === "android_formal_signing_env");
assert.strictEqual(signing.status, "USER_ACTION_REQUIRED");
assert.ok(signing.missing.includes("JOB_SPRINT_ANDROID_KEYSTORE"));
assert(signing.requiredInputs.some((item) => item.includes("build:android:release -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env")));
assert.ok(!result.stdout.includes("password-that-should-not-leak"));

const releaseVerification = report.checks.find((check) => check.id === "android_formal_release_verification");
assert(["USER_ACTION_REQUIRED", "FAIL"].includes(releaseVerification.status));
assert(["formal_android_release_verification_evidence_missing", "formal_android_release_verification_file_missing"].includes(releaseVerification.reason));

const insideRepoKeystore = path.join(process.cwd(), "dist", "test-formal-keystore-inside-repo.jks");
fs.mkdirSync(path.dirname(insideRepoKeystore), { recursive: true });
fs.writeFileSync(insideRepoKeystore, "fake inside repo keystore");
try {
  const insideRepoSigningResult = spawnSync(process.execPath, [
    "tools/validate_final_delivery_readiness.js",
    "--allow-dirty"
  ], {
    cwd: process.cwd(),
    env: {
      ...env,
      JOB_SPRINT_ANDROID_KEYSTORE: insideRepoKeystore,
      JOB_SPRINT_ANDROID_STORE_PASSWORD: fakeSensitiveValue,
      JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint",
      JOB_SPRINT_ANDROID_KEY_PASSWORD: fakeSensitiveValue,
      JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: releaseCertSha256
    },
    encoding: "utf8"
  });
  assert([1, 2].includes(insideRepoSigningResult.status), insideRepoSigningResult.stderr || insideRepoSigningResult.stdout);
  const insideRepoSigningReport = JSON.parse(insideRepoSigningResult.stdout);
  const insideRepoSigning = insideRepoSigningReport.checks.find((check) => check.id === "android_formal_signing_env");
  assert.strictEqual(insideRepoSigning.status, "USER_ACTION_REQUIRED");
  assert.strictEqual(insideRepoSigning.reason, "formal_android_release_keystore_inside_repo");
  assert.ok(!insideRepoSigningResult.stdout.includes(fakeSensitiveValue));

  const insideRepoBuildResult = spawnSync(process.execPath, [
    "tools/build_android_release_apk.js"
  ], {
    cwd: process.cwd(),
    env: {
      ...env,
      JOB_SPRINT_ANDROID_KEYSTORE: insideRepoKeystore,
      JOB_SPRINT_ANDROID_STORE_PASSWORD: fakeSensitiveValue,
      JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint",
      JOB_SPRINT_ANDROID_KEY_PASSWORD: fakeSensitiveValue,
      JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: releaseCertSha256
    },
    encoding: "utf8"
  });
  assert([1, 2].includes(insideRepoBuildResult.status), insideRepoBuildResult.stderr || insideRepoBuildResult.stdout);
  const insideRepoBuildReport = JSON.parse(insideRepoBuildResult.stdout);
  assert.strictEqual(insideRepoBuildReport.status, "USER_ACTION_REQUIRED");
  assert.strictEqual(insideRepoBuildReport.reason, "formal_android_release_keystore_inside_repo");
  assert.ok(!insideRepoBuildResult.stdout.includes(fakeSensitiveValue));
} finally {
  fs.rmSync(insideRepoKeystore, { force: true });
}

const formalApk = path.join(tmpDir, "app-release.apk");
fs.writeFileSync(formalApk, "fake formal apk");
const formalEvidence = writeJson("formal-release.json", {
  status: "FORMAL_SIGNED",
  apk: formalApk,
  apkSha256: sha256File(formalApk),
  sizeBytes: fs.statSync(formalApk).size,
  certificateDn: "CN=Job Sprint Release",
  certSha256: releaseCertSha256,
  verifiedSchemes: ["Verified using v2 scheme (APK Signature Scheme v2): true"]
});

const formalResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_ANDROID_KEYSTORE: formalApk,
    JOB_SPRINT_ANDROID_STORE_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint",
    JOB_SPRINT_ANDROID_KEY_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: releaseCertSha256,
    JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE: formalEvidence
  },
  encoding: "utf8"
});
assert([1, 2].includes(formalResult.status), formalResult.stderr || formalResult.stdout);
const formalReport = JSON.parse(formalResult.stdout);
const formalSigning = formalReport.checks.find((check) => check.id === "android_formal_signing_env");
assert.strictEqual(formalSigning.status, "PASS");
const formalVerification = formalReport.checks.find((check) => check.id === "android_formal_release_verification");
assert.strictEqual(formalVerification.status, "PASS");
assert.strictEqual(formalVerification.certSha256, releaseCertSha256);
assert.strictEqual(formalVerification.apkSha256, sha256File(formalApk));
assert.strictEqual(formalVerification.verifiedSchemeCount, 1);
const formalCandidate = formalReport.checks.find((check) => check.id === "android_release_apk_candidate");
assert.strictEqual(formalCandidate.status, "PASS");
assert.strictEqual(formalCandidate.reason, "formal_release_verified");
assert.ok(!formalCandidate.nextAction);
assert.ok(!formalResult.stdout.includes(fakeSensitiveValue));

const hashMismatchEvidence = writeJson("formal-release-hash-mismatch.json", {
  status: "FORMAL_SIGNED",
  apk: formalApk,
  apkSha256: "cd".repeat(32),
  certSha256: releaseCertSha256,
  verifiedSchemes: ["Verified using v2 scheme (APK Signature Scheme v2): true"]
});
const hashMismatchResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_ANDROID_KEYSTORE: formalApk,
    JOB_SPRINT_ANDROID_STORE_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint",
    JOB_SPRINT_ANDROID_KEY_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: releaseCertSha256,
    JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE: hashMismatchEvidence
  },
  encoding: "utf8"
});
assert.strictEqual(hashMismatchResult.status, 1, hashMismatchResult.stderr || hashMismatchResult.stdout);
const hashMismatchReport = JSON.parse(hashMismatchResult.stdout);
const hashMismatchVerification = hashMismatchReport.checks.find((check) => check.id === "android_formal_release_verification");
assert.strictEqual(hashMismatchVerification.status, "FAIL");
assert.ok(hashMismatchVerification.issues.includes("release_report_apk_sha256_mismatch"));

const unpinnedEvidence = writeJson("signed-unpinned-release.json", {
  status: "SIGNED_UNPINNED",
  apk: formalApk,
  apkSha256: sha256File(formalApk),
  certSha256: releaseCertSha256,
  verifiedSchemes: ["Verified using v2 scheme (APK Signature Scheme v2): true"]
});
const unpinnedResult = spawnSync(process.execPath, [
  "tools/validate_final_delivery_readiness.js",
  "--allow-dirty"
], {
  cwd: process.cwd(),
  env: {
    ...env,
    JOB_SPRINT_ANDROID_KEYSTORE: formalApk,
    JOB_SPRINT_ANDROID_STORE_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint",
    JOB_SPRINT_ANDROID_KEY_PASSWORD: fakeSensitiveValue,
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: releaseCertSha256,
    JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE: unpinnedEvidence
  },
  encoding: "utf8"
});
assert.strictEqual(unpinnedResult.status, 1, unpinnedResult.stderr || unpinnedResult.stdout);
const unpinnedReport = JSON.parse(unpinnedResult.stdout);
const unpinnedVerification = unpinnedReport.checks.find((check) => check.id === "android_formal_release_verification");
assert.strictEqual(unpinnedVerification.status, "FAIL");
assert.ok(unpinnedVerification.issues.includes("release_report_status_not_formal_signed"));

console.log("final delivery readiness tests passed");

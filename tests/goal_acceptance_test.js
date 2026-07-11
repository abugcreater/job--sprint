#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { goalAcceptanceCheck } = require("../tools/delivery_readiness_goal");
const { deliveryCommands } = require("../tools/delivery_action_commands");
const { summarizeStatus, validateGoalAcceptance } = require("../tools/validate_goal_acceptance");

const repoRoot = path.resolve(__dirname, "..");

function writeFile(root, file, text) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function makeGoalFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "goal-acceptance-"));
  writeFile(root, "package.json", JSON.stringify({
    scripts: {
      "start:rust": "cargo run --manifest-path apps/rust-api/Cargo.toml",
      "build:rust": "cargo build --release --manifest-path apps/rust-api/Cargo.toml"
    }
  }, null, 2));
  writeFile(root, "apps/react-web/package.json", JSON.stringify({
    dependencies: {
      react: "^19.0.0",
      zustand: "^5.0.0"
    },
    devDependencies: {
      typescript: "^5.0.0",
      vite: "^7.0.0"
    }
  }, null, 2));
  writeFile(root, "apps/rust-api/Cargo.toml", [
    "[dependencies]",
    "axum = \"0.8\"",
    "sqlx = { version = \"0.8\", features = [\"sqlite\"] }"
  ].join("\n"));
  writeFile(root, "apps/rust-api/migrations/001_init.sql", [
    "CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY);",
    "CREATE TABLE IF NOT EXISTS runtime_items (scope TEXT, item_key TEXT, value TEXT);"
  ].join("\n"));
  writeFile(root, "apps/rust-api/src/runtime_store.rs", [
    "runtime_items progress reviews applications interview_mistakes"
  ].join("\n"));
  writeFile(root, "docs/core/06-goal-acceptance-audit.md", "P8 AST 渐进");
  writeFile(root, "docs/evidence/server-sync/sync.json", JSON.stringify({
    status: "PASS",
    target: { host: "example.internal", user: "deploy", remoteDir: "/srv/job-sprint" },
    localManifestSha256: "ab".repeat(32),
    remoteManifestSha256: "ab".repeat(32),
    outputLines: ["OK server delivery remote manifest sha256"]
  }, null, 2));
  writeFile(root, "docs/evidence/server-remote/acceptance.json", JSON.stringify({
    status: "PASS",
    baseUrl: "https://job-sprint.example.com",
    outputLines: [
      "OK /api/health 200",
      "OK /api/auth/login 200",
      "OK /api/auth/session 200",
      "OK /api/progress remote save 200",
      "OK /api/progress remote readback"
    ]
  }, null, 2));
  writeFile(root, "docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json", JSON.stringify({
    status: "PASS",
    webViewUrl: "https://job-sprint.example.com",
    authEvidence: {
      loginAttempted: true,
      sessionStates: [{ authenticated: true }]
    },
    flowSnapshot: { react: { runtimeStorageHash: "abc", delayReasons: ["delay"] } },
    restartSnapshot: { react: { runtimeStorageHash: "def", delayReasons: ["delay"] } }
  }, null, 2));
  writeFile(root, "docs/evidence/android-release/formal-release.json", JSON.stringify({
    status: "FORMAL_SIGNED",
    apkSha256: "cd".repeat(32),
    certSha256: "ef".repeat(32),
    verifiedSchemes: ["Verified using v2 scheme (APK Signature Scheme v2): true"]
  }, null, 2));
  writeFile(root, "docs/evidence/final-delivery/final-delivery.json", JSON.stringify({
    status: "PASS",
    dryRun: false,
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
  }, null, 2));
  return root;
}

function testStatusSummaryOrder() {
  assert.strictEqual(summarizeStatus([{ status: "PASS" }, { status: "PASS_WITH_LIMITS" }]), "PASS_WITH_LIMITS");
  assert.strictEqual(summarizeStatus([{ status: "PASS" }, { status: "USER_ACTION_REQUIRED" }]), "USER_ACTION_REQUIRED");
  assert.strictEqual(summarizeStatus([{ status: "USER_ACTION_REQUIRED" }, { status: "FAIL" }]), "FAIL");
}

function testFixtureWithAllExternalEvidencePassesWithLimits() {
  const report = validateGoalAcceptance(makeGoalFixture(), {
    env: {},
    featureParityReport: {
      ok: true,
      findings: [],
      metrics: { featureCount: 10, passCount: 10 }
    },
    functionalReport: {
      ok: true,
      findings: [],
      metrics: { evidenceReportCount: 2 }
    },
    architectureReport: {
      ok: true,
      findings: [],
      metrics: {
        sourceFileCount: 100,
        requiredFileCount: 58,
        semanticBoundaryRuleCount: 3
      }
    }
  });
  assert.strictEqual(report.status, "PASS_WITH_LIMITS");
  assert.strictEqual(report.metrics.goalCount, 7);
  assert.strictEqual(report.goals.find((goal) => goal.id === "server_sync_and_formal_apk").status, "PASS");
}

function testHttpServerRemoteEvidencePassesWithLimits() {
  const root = makeGoalFixture();
  writeFile(root, "docs/evidence/server-remote/acceptance.json", JSON.stringify({
    status: "PASS",
    baseUrl: "http://203.0.113.10",
    outputLines: [
      "OK /api/health 200",
      "OK /api/auth/login 200",
      "OK /api/auth/session 200",
      "OK /api/progress remote save 200",
      "OK /api/progress remote readback"
    ]
  }, null, 2));
  const report = validateGoalAcceptance(root, {
    env: {},
    featureParityReport: {
      ok: true,
      findings: [],
      metrics: { featureCount: 10, passCount: 10 }
    },
    functionalReport: {
      ok: true,
      findings: [],
      metrics: { evidenceReportCount: 2 }
    },
    architectureReport: {
      ok: true,
      findings: [],
      metrics: {
        sourceFileCount: 100,
        requiredFileCount: 58,
        semanticBoundaryRuleCount: 3
      }
    }
  });
  const deliveryGoal = report.goals.find((goal) => goal.id === "server_sync_and_formal_apk");
  assert.strictEqual(deliveryGoal.status, "PASS_WITH_LIMITS");
  assert(deliveryGoal.limits.includes("base_url_not_https"));
}

function testArchitectureGoalFailsWithoutSemanticBoundaryEvidence() {
  const report = validateGoalAcceptance(makeGoalFixture(), {
    env: {},
    featureParityReport: {
      ok: true,
      findings: [],
      metrics: { featureCount: 10, passCount: 10 }
    },
    functionalReport: {
      ok: true,
      findings: [],
      metrics: { evidenceReportCount: 2 }
    },
    architectureReport: {
      ok: true,
      findings: [],
      metrics: {
        sourceFileCount: 100,
        requiredFileCount: 58,
        semanticBoundaryRuleCount: 0
      }
    }
  });
  const architectureGoal = report.goals.find((goal) => goal.id === "architecture_p8_progressive_refactor");
  assert.strictEqual(architectureGoal.status, "FAIL");
  assert(architectureGoal.missing.includes("architecture_semantic_boundary_rules_missing"));
}

function testCurrentRepoReportsExternalDeliveryState() {
  const env = { ...process.env };
  for (const key of [
    "JOB_SPRINT_SERVER_SYNC_EVIDENCE",
    "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE",
    "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE",
    "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE",
    "JOB_SPRINT_FINAL_DELIVERY_REPORT"
  ]) {
    delete env[key];
  }
  const report = validateGoalAcceptance(repoRoot, { env });
  assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED", "FAIL"].includes(report.status), `unexpected current repo status ${report.status}`);
  assert.strictEqual(report.metrics.goalCount, 7);
  assert.strictEqual(report.goals.find((goal) => goal.id === "database_storage").status, "PASS");
  const deliveryGoal = report.goals.find((goal) => goal.id === "server_sync_and_formal_apk");
  assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED", "FAIL"].includes(deliveryGoal.status), `unexpected delivery goal status ${deliveryGoal.status}`);
  const deliveryInputs = deliveryGoal.requiredInputs.join("\n");
  assert(deliveryInputs.includes(deliveryCommands.finalDelivery), "delivery goal should mention final delivery when the final report is missing or stale");
  if (deliveryGoal.missing.some((item) => item.includes("android_remote"))) {
    assert(
      deliveryInputs.includes(deliveryCommands.androidRemote),
      "delivery goal should mention Android remote only when Android remote evidence is invalid or missing"
    );
  }
  if (deliveryGoal.status === "FAIL") {
    assert(
      deliveryGoal.missing.some((item) => item.includes("server_sync") || item.includes("server_remote") || item.includes("final_delivery")),
      "failed delivery goal should expose the invalid external evidence"
    );
  } else {
    const missingServerSync = deliveryGoal.missing.some((item) => item.includes("server_sync") || item === "evidence_missing");
    const missingServerRemote = deliveryGoal.missing.some((item) => item.includes("server_remote") || item === "evidence_missing");
    assert.strictEqual(
      deliveryInputs.includes(deliveryCommands.serverSync),
      missingServerSync,
      "delivery goal should require server sync exactly when default server sync evidence is missing or invalid"
    );
    assert.strictEqual(
      deliveryInputs.includes(deliveryCommands.serverRemote),
      missingServerRemote,
      "delivery goal should require server remote evidence exactly when default server remote evidence is missing or invalid"
    );
  }
}

function testReadinessAdapterReportsCurrentGoalState() {
  const check = goalAcceptanceCheck(repoRoot, {});
  assert.strictEqual(check.id, "goal_acceptance");
  assert(["PASS_WITH_LIMITS", "USER_ACTION_REQUIRED", "FAIL"].includes(check.status), `unexpected readiness status ${check.status}`);
  assert(["goal_acceptance_has_limits", "goal_acceptance_passed_with_limits", "goal_acceptance_requires_external_evidence", "goal_acceptance_findings_present"].includes(check.reason));
  assert.strictEqual(check.goalCount, 7);
  if (check.status === "FAIL") {
    assert(check.failingGoals.includes("server_sync_and_formal_apk"));
  }
}

testStatusSummaryOrder();
testFixtureWithAllExternalEvidencePassesWithLimits();
testHttpServerRemoteEvidencePassesWithLimits();
testArchitectureGoalFailsWithoutSemanticBoundaryEvidence();
testCurrentRepoReportsExternalDeliveryState();
testReadinessAdapterReportsCurrentGoalState();

console.log("目标验收门禁测试：6 项通过。");

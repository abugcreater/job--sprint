#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { validateFunctionalCoverage, valueAt } = require("./validate_functional_coverage");
const { validateArchitectureQuality } = require("./validate_architecture_quality");
const { validateFeatureParity } = require("./validate_feature_parity");
const { defaultDeliveryEnvFile, deliveryCommands } = require("./delivery_action_commands");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);

function readText(root, file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(root, file) {
  return JSON.parse(readText(root, file));
}

function fileExists(root, file) {
  const target = path.join(root, file);
  return fs.existsSync(target) && fs.statSync(target).isFile();
}

function envValue(env, name) {
  const value = env && env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function displayPath(root, file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function evidencePath(root, env, envName, defaultFile) {
  return envValue(env, envName) || path.join(root, defaultFile);
}

function pathFromEvidence(root, file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function parseJsonEvidence(root, env, envName, defaultFile) {
  const absolute = evidencePath(root, env, envName, defaultFile);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return {
      status: "USER_ACTION_REQUIRED",
      reason: "evidence_missing",
      evidence: pathFromEvidence(root, absolute)
    };
  }
  try {
    return {
      status: "PASS",
      evidence: pathFromEvidence(root, absolute),
      report: JSON.parse(fs.readFileSync(absolute, "utf8")),
      text: fs.readFileSync(absolute, "utf8")
    };
  } catch (error) {
    return {
      status: "FAIL",
      reason: "evidence_invalid_json",
      evidence: pathFromEvidence(root, absolute),
      error: error.message
    };
  }
}

function hasAllText(root, file, tokens) {
  if (!fileExists(root, file)) return { ok: false, missing: [`file:${file}`] };
  const text = readText(root, file);
  const missing = tokens.filter((token) => !text.includes(token));
  return { ok: missing.length === 0, missing };
}

function packageScript(root, name) {
  try {
    const packageJson = readJson(root, "package.json");
    return packageJson.scripts && packageJson.scripts[name] ? String(packageJson.scripts[name]) : "";
  } catch {
    return "";
  }
}

function pushGoal(goals, goal) {
  goals.push({
    id: goal.id,
    title: goal.title,
    status: goal.status,
    evidence: goal.evidence || [],
    missing: goal.missing || [],
    requiredInputs: goal.requiredInputs || [],
    limits: goal.limits || []
  });
}

function statusFromParts(parts) {
  if (parts.includes("FAIL")) return "FAIL";
  if (parts.includes("USER_ACTION_REQUIRED")) return "USER_ACTION_REQUIRED";
  if (parts.includes("PARTIAL")) return "PARTIAL";
  if (parts.includes("PASS_WITH_LIMITS")) return "PASS_WITH_LIMITS";
  return "PASS";
}

function summarizeStatus(goals) {
  return statusFromParts(goals.map((goal) => goal.status));
}

function evidenceTextContains(evidence, tokens) {
  if (evidence.status !== "PASS") return tokens;
  return tokens.filter((token) => !evidence.text.includes(token));
}

function validateServerSyncEvidence(root, env) {
  const evidence = parseJsonEvidence(root, env, "JOB_SPRINT_SERVER_SYNC_EVIDENCE", "docs/evidence/server-sync/sync.json");
  if (evidence.status !== "PASS") return evidence;
  const report = evidence.report;
  const issues = [];
  if (report.status !== "PASS") issues.push("status_not_pass");
  if (!report.target || !report.target.host || !report.target.user || !report.target.remoteDir) issues.push("target_missing");
  if (!report.localManifestSha256 || report.localManifestSha256 !== report.remoteManifestSha256) issues.push("manifest_sha256_mismatch");
  const missingText = evidenceTextContains(evidence, ["OK server delivery remote manifest sha256"]);
  issues.push(...missingText.map((token) => `output_missing:${token}`));
  return issues.length
    ? { status: "FAIL", reason: "server_sync_evidence_invalid", evidence: evidence.evidence, issues }
    : { status: "PASS", evidence: evidence.evidence };
}

function validateServerRemoteEvidence(root, env) {
  const evidence = parseJsonEvidence(root, env, "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE", "docs/evidence/server-remote/acceptance.json");
  if (evidence.status !== "PASS") return evidence;
  const report = evidence.report;
  const issues = [];
  if (report.status !== "PASS") issues.push("status_not_pass");
  const limits = [];
  if (!String(report.baseUrl || "").startsWith("https://")) limits.push("base_url_not_https");
  const required = [
    "OK /api/health 200",
    "OK /api/auth/login 200",
    "OK /api/auth/session 200",
    "OK /api/progress remote save",
    "OK /api/progress remote readback"
  ];
  issues.push(...evidenceTextContains(evidence, required).map((token) => `output_missing:${token}`));
  if (issues.length) {
    return { status: "FAIL", reason: "server_remote_evidence_invalid", evidence: evidence.evidence, issues };
  }
  return {
    status: limits.length ? "PASS_WITH_LIMITS" : "PASS",
    evidence: evidence.evidence,
    limits
  };
}

function snapshotHasRuntimeHash(snapshot) {
  return Boolean(
    snapshot
    && (
      (snapshot.react && typeof snapshot.react.runtimeStorageHash === "string" && snapshot.react.runtimeStorageHash)
      || (snapshot.rawHashes && typeof snapshot.rawHashes["jobSprint.react.v1"] === "string" && snapshot.rawHashes["jobSprint.react.v1"])
    )
  );
}

function snapshotHasDelay(snapshot) {
  return Boolean(snapshot && snapshot.react && Array.isArray(snapshot.react.delayReasons) && snapshot.react.delayReasons.length > 0);
}

function hasAuthenticatedSession(report) {
  const states = report && report.authEvidence && Array.isArray(report.authEvidence.sessionStates)
    ? report.authEvidence.sessionStates
    : [];
  return states.some((state) => state && (
    state.authenticated === true
    || state.sessionApiAuthenticated === true
    || state.status === 200
  ));
}

function validateAndroidRemoteEvidence(root, env) {
  const evidence = parseJsonEvidence(root, env, "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE", "docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json");
  if (evidence.status !== "PASS") return evidence;
  const report = evidence.report;
  const flow = report.flowSnapshot;
  const restart = report.restartSnapshot;
  const webViewUrl = report.webViewUrl || (flow && flow.url) || (restart && restart.url) || "";
  const issues = [];
  const limits = [];
  if (report.status !== "PASS") issues.push("status_not_pass");
  const webViewScheme = (() => {
    try {
      return new URL(String(webViewUrl)).protocol;
    } catch {
      return "";
    }
  })();
  if (webViewScheme === "http:") {
    limits.push("android_remote_http_basic_validation");
  } else if (webViewScheme !== "https:") {
    issues.push("webview_url_not_http_or_https");
  }
  if (!snapshotHasRuntimeHash(flow)) issues.push("flow_runtime_hash_missing");
  if (!snapshotHasRuntimeHash(restart)) issues.push("restart_runtime_hash_missing");
  if (!snapshotHasDelay(restart)) issues.push("restart_delay_missing");
  const authenticated = hasAuthenticatedSession(report);
  if (!report.authEvidence || (report.authEvidence.loginAttempted !== true && !authenticated)) issues.push("auth_login_or_session_missing");
  if (!authenticated) issues.push("authenticated_session_missing");
  return issues.length
    ? { status: "FAIL", reason: "android_remote_evidence_invalid", evidence: evidence.evidence, issues }
    : { status: limits.length ? "PASS_WITH_LIMITS" : "PASS", evidence: evidence.evidence, limits };
}

function validateFinalDeliveryReport(root, env) {
  if (envValue(env, "JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS") === "1") {
    return {
      status: "PASS_WITH_LIMITS",
      reason: "final_delivery_report_deferred_until_runner_write",
      evidence: envValue(env, "JOB_SPRINT_FINAL_DELIVERY_REPORT") || "docs/evidence/final-delivery/final-delivery.json"
    };
  }
  const evidence = parseJsonEvidence(root, env, "JOB_SPRINT_FINAL_DELIVERY_REPORT", "docs/evidence/final-delivery/final-delivery.json");
  if (evidence.status !== "PASS") return evidence;
  const report = evidence.report;
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const required = [
    "preflight",
    "release_gate",
    "server_sync_evidence",
    "server_remote_acceptance",
    "android_remote_acceptance",
    "android_formal_release",
    "final_readiness"
  ];
  const postValidationInProgress = envValue(env, "JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS") === "1";
  if (!postValidationInProgress) {
    required.push("post_final_report_validation");
  }
  const acceptableStepStatuses = new Set(["PASS", "PASS_WITH_LIMITS"]);
  const missing = required.filter((id) => !steps.some((step) => step.id === id && acceptableStepStatuses.has(step.status)));
  const issues = [];
  if (report.status !== "PASS" && report.status !== "PASS_WITH_LIMITS") issues.push("status_not_pass");
  if (report.dryRun === true) issues.push("dry_run_report");
  issues.push(...missing.map((id) => `step_missing_or_not_pass:${id}`));
  return issues.length
    ? { status: "FAIL", reason: "final_delivery_report_invalid", evidence: evidence.evidence, issues }
    : {
        status: report.status === "PASS_WITH_LIMITS" || postValidationInProgress ? "PASS_WITH_LIMITS" : "PASS",
        reason: postValidationInProgress ? "post_final_report_validation_in_progress" : undefined,
        evidence: evidence.evidence
      };
}

function validateFormalReleaseEvidence(root, env) {
  const evidence = parseJsonEvidence(root, env, "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE", "docs/evidence/android-release/formal-release.json");
  if (evidence.status !== "PASS") return evidence;
  const report = evidence.report;
  const issues = [];
  if (report.status !== "FORMAL_SIGNED") issues.push("status_not_formal_signed");
  if (!/^[a-f0-9]{64}$/i.test(String(report.apkSha256 || ""))) issues.push("apk_sha256_missing");
  if (!/^[a-f0-9]{64}$/i.test(String(report.certSha256 || ""))) issues.push("cert_sha256_missing");
  if (!Array.isArray(report.verifiedSchemes) || !report.verifiedSchemes.length) issues.push("verified_schemes_missing");
  return issues.length
    ? { status: "FAIL", reason: "formal_release_evidence_invalid", evidence: evidence.evidence, issues }
    : { status: "PASS", evidence: evidence.evidence };
}

function evaluateEvidence(root, options = {}) {
  const env = options.env || process.env;
  const featureParity = options.featureParityReport || validateFeatureParity(root);
  const functional = options.functionalReport || validateFunctionalCoverage(root);
  const architecture = options.architectureReport || validateArchitectureQuality(root);
  const rustSchema = hasAllText(root, "apps/rust-api/migrations/001_init.sql", [
    "CREATE TABLE IF NOT EXISTS users",
    "CREATE TABLE IF NOT EXISTS runtime_items"
  ]);
  const rustRuntime = hasAllText(root, "apps/rust-api/src/runtime_store.rs", [
    "runtime_items",
    "progress",
    "reviews",
    "applications",
    "interview_mistakes"
  ]);
  const cargo = hasAllText(root, "apps/rust-api/Cargo.toml", ["axum", "sqlx", "sqlite"]);
  const reactPackage = hasAllText(root, "apps/react-web/package.json", ["react", "typescript", "vite", "zustand"]);
  const goalAuditDoc = fileExists(root, "docs/core/06-goal-acceptance-audit.md")
    ? readText(root, "docs/core/06-goal-acceptance-audit.md")
    : "";

  return {
    featureParity,
    functional,
    architecture,
    rustSchema,
    rustRuntime,
    cargo,
    reactPackage,
    goalAuditDoc,
    serverSync: validateServerSyncEvidence(root, env),
    serverRemote: validateServerRemoteEvidence(root, env),
    androidRemote: validateAndroidRemoteEvidence(root, env),
    finalDelivery: validateFinalDeliveryReport(root, env),
    formalRelease: validateFormalReleaseEvidence(root, env)
  };
}

function validateGoalAcceptance(root = repoRoot, options = {}) {
  const evidence = evaluateEvidence(root, options);
  const goals = [];

  pushGoal(goals, {
    id: "web_android_alignment",
    title: "Web 与 Android 功能对齐",
    status: statusFromParts([
      evidence.featureParity.ok ? "PASS" : "FAIL",
      evidence.functional.ok ? "PASS" : "FAIL",
      evidence.androidRemote.status
    ]),
    evidence: [
      "validate:feature-parity",
      "validate:functional-coverage",
      "test:android:functional",
      evidence.androidRemote.evidence || "docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json"
    ],
    missing: [
      ...(evidence.featureParity.ok ? [] : evidence.featureParity.findings.map((finding) => finding.code).slice(0, 10)),
      ...(evidence.androidRemote.status === "PASS" || evidence.androidRemote.status === "PASS_WITH_LIMITS" ? [] : [evidence.androidRemote.reason || "android_remote_evidence_missing"])
    ],
    requiredInputs: evidence.androidRemote.status === "USER_ACTION_REQUIRED"
      ? [`在 ${defaultDeliveryEnvFile} 填入远端 HTTPS URL 和登录账号后运行 ${deliveryCommands.androidRemote}。`]
      : [],
    limits: Array.isArray(evidence.androidRemote.limits) ? evidence.androidRemote.limits : []
  });

  pushGoal(goals, {
    id: "database_storage",
    title: "用户、进度、复盘等数据进入数据库",
    status: statusFromParts([
      evidence.rustSchema.ok ? "PASS" : "FAIL",
      evidence.rustRuntime.ok ? "PASS" : "FAIL",
      evidence.functional.ok && valueAt(evidence.functional, "metrics.evidenceReportCount") >= 2 ? "PASS" : "FAIL"
    ]),
    evidence: [
      "apps/rust-api/migrations/001_init.sql",
      "apps/rust-api/src/runtime_store.rs",
      "docs/evidence/rust-functional/rust-sqlite-ui-persistence-report.json"
    ],
    missing: [...evidence.rustSchema.missing, ...evidence.rustRuntime.missing]
  });

  pushGoal(goals, {
    id: "full_functional_after_storage",
    title: "DB 化后的全量功能测试与入库验证",
    status: evidence.functional.ok ? "PASS" : "FAIL",
    evidence: [
      "npm run test:functional",
      "npm run test:rust:functional",
      "npm run test:android:functional",
      "npm run validate:functional-coverage"
    ],
    missing: evidence.functional.ok ? [] : evidence.functional.findings.map((finding) => finding.code).slice(0, 10)
  });

  pushGoal(goals, {
    id: "frontend_legacy_backend_rust",
    title: "前端保持原体系，后端使用 Rust",
    status: statusFromParts([
      evidence.reactPackage.ok ? "PASS" : "FAIL",
      evidence.cargo.ok ? "PASS" : "FAIL",
      packageScript(root, "start:rust").includes("cargo run") ? "PASS" : "FAIL",
      packageScript(root, "build:rust").includes("cargo build --release") ? "PASS" : "FAIL"
    ]),
    evidence: [
      "apps/react-web/package.json",
      "apps/rust-api/Cargo.toml",
      "package.json scripts start:rust/build:rust"
    ],
    missing: [...evidence.reactPackage.missing, ...evidence.cargo.missing]
  });

  const hasReviewLanguage = evidence.goalAuditDoc.includes("P8")
    && evidence.goalAuditDoc.includes("AST")
    && evidence.goalAuditDoc.includes("渐进");
  const requiredArchitectureFileCount = valueAt(evidence.architecture, "metrics.requiredFileCount") || 0;
  const semanticBoundaryRuleCount = valueAt(evidence.architecture, "metrics.semanticBoundaryRuleCount") || 0;
  pushGoal(goals, {
    id: "architecture_p8_progressive_refactor",
    title: "架构质量、技术栈与渐进式重构",
    status: statusFromParts([
      evidence.architecture.ok ? "PASS" : "FAIL",
      requiredArchitectureFileCount >= 50 ? "PASS" : "FAIL",
      semanticBoundaryRuleCount >= 3 ? "PASS" : "FAIL",
      hasReviewLanguage ? "PASS_WITH_LIMITS" : "PARTIAL"
    ]),
    evidence: [
      "npm run validate:architecture-quality",
      "validate:architecture-quality requiredFileCount",
      "validate:architecture-quality semanticBoundaryRuleCount",
      "docs/core/06-goal-acceptance-audit.md"
    ],
    limits: [
      "P8 级深度只能由架构审计和持续门禁近似证明，不能用单个脚本宣称完全达标。"
    ],
    missing: [
      ...(requiredArchitectureFileCount >= 50 ? [] : ["architecture_required_file_inventory_too_small"]),
      ...(semanticBoundaryRuleCount >= 3 ? [] : ["architecture_semantic_boundary_rules_missing"]),
      ...(hasReviewLanguage ? [] : ["goal_acceptance_audit_missing_p8_ast_progressive_review_language"])
    ]
  });

  pushGoal(goals, {
    id: "full_functional_after_refactor",
    title: "重构后的全量功能测试",
    status: statusFromParts([
      evidence.architecture.ok ? "PASS" : "FAIL",
      evidence.functional.ok ? "PASS" : "FAIL",
      evidence.androidRemote.status === "PASS" || evidence.androidRemote.status === "PASS_WITH_LIMITS" ? evidence.androidRemote.status : "PASS_WITH_LIMITS"
    ]),
    evidence: [
      "npm test",
      "npm run validate:architecture-quality",
      "npm run validate:functional-coverage"
    ],
    limits: evidence.androidRemote.status === "PASS"
      ? []
      : (Array.isArray(evidence.androidRemote.limits) && evidence.androidRemote.limits.length
        ? evidence.androidRemote.limits
        : ["远端 Android HTTPS 真机证据未完成，当前只证明本地 Android WebView。"])
  });

  pushGoal(goals, {
    id: "server_sync_and_formal_apk",
    title: "服务器同步与正式 APK",
    status: statusFromParts([
      evidence.serverSync.status,
      evidence.serverRemote.status,
      evidence.androidRemote.status,
      evidence.formalRelease.status,
      evidence.finalDelivery.status
    ]),
    evidence: [
      evidence.serverSync.evidence || "docs/evidence/server-sync/sync.json",
      evidence.serverRemote.evidence || "docs/evidence/server-remote/acceptance.json",
      evidence.androidRemote.evidence || "docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json",
      evidence.formalRelease.evidence || "docs/evidence/android-release/formal-release.json",
      evidence.finalDelivery.evidence || "docs/evidence/final-delivery/final-delivery.json"
    ],
    missing: [
      evidence.serverSync,
      evidence.serverRemote,
      evidence.androidRemote,
      evidence.formalRelease,
      evidence.finalDelivery
    ].filter((item) => item.status !== "PASS" && item.status !== "PASS_WITH_LIMITS").map((item) => item.reason || item.status),
    limits: [
      ...(Array.isArray(evidence.serverRemote.limits) ? evidence.serverRemote.limits : []),
      ...(Array.isArray(evidence.androidRemote.limits) ? evidence.androidRemote.limits : [])
    ],
    requiredInputs: [
      evidence.serverSync.status === "PASS" ? null : `在 ${defaultDeliveryEnvFile} 填入服务器 SSH 目标后运行 ${deliveryCommands.serverSync}。`,
      evidence.serverRemote.status === "PASS" || evidence.serverRemote.status === "PASS_WITH_LIMITS" ? null : `在 ${defaultDeliveryEnvFile} 填入正式远端 URL 与认证账号后运行 ${deliveryCommands.serverRemote}。`,
      evidence.androidRemote.status === "PASS" || evidence.androidRemote.status === "PASS_WITH_LIMITS" ? null : `连接 Android 真机并运行 ${deliveryCommands.androidRemote}。`,
      evidence.formalRelease.status === "PASS" ? null : `在 ${defaultDeliveryEnvFile} 填入仓库外正式 keystore、密码和证书 SHA-256 后运行 ${deliveryCommands.formalRelease}，要求报告为 FORMAL_SIGNED。`,
      evidence.finalDelivery.status === "PASS" ? null : `最后运行 ${deliveryCommands.finalDelivery}。`
    ].filter(Boolean)
  });

  const status = summarizeStatus(goals);
  return {
    status,
    goals,
    nextActions: goals
      .filter((goal) => goal.requiredInputs.length || goal.missing.length)
      .map((goal) => ({
        id: goal.id,
        status: goal.status,
        missing: goal.missing,
        requiredInputs: goal.requiredInputs
      })),
    metrics: {
      goalCount: goals.length,
      passCount: goals.filter((goal) => goal.status === "PASS").length,
      passWithLimitsCount: goals.filter((goal) => goal.status === "PASS_WITH_LIMITS").length,
      userActionRequiredCount: goals.filter((goal) => goal.status === "USER_ACTION_REQUIRED").length,
      failCount: goals.filter((goal) => goal.status === "FAIL").length
    }
  };
}

function printReport(report) {
  if (argSet.has("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const summary = `${report.metrics.passCount}/${report.metrics.goalCount}`;
  console.log(`目标验收门禁：${report.status}，已完全通过 ${summary} 项。`);
  for (const goal of report.goals) {
    console.log(`- ${goal.id}: ${goal.status}`);
  }
}

if (require.main === module) {
  const report = validateGoalAcceptance(repoRoot);
  printReport(report);
  if (report.status === "FAIL") {
    process.exitCode = 1;
  } else if (report.status === "USER_ACTION_REQUIRED" && !argSet.has("--allow-user-action")) {
    process.exitCode = 2;
  }
}

module.exports = {
  summarizeStatus,
  validateGoalAcceptance
};

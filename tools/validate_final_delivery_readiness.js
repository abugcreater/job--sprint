#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { architectureQualityCheck } = require("./delivery_readiness_architecture");
const { functionalCoverageCheck } = require("./delivery_readiness_functional");
const { featureParityCheck } = require("./delivery_readiness_feature_parity");
const { goalAcceptanceCheck } = require("./delivery_readiness_goal");
const { serverDeliveryPackageCheck } = require("./delivery_readiness_server_package");
const { deliveryExternalInputsCheck } = require("./validate_delivery_external_inputs");
const { validateProductIterationWorkflow } = require("./validate_product_iteration_workflow");
const { defaultDeliveryEnvFile, deliveryCommands } = require("./delivery_action_commands");
const { deliveryEnvFailureReport, loadReadinessEnv } = require("./delivery_readiness_env");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function relative(file) {
  return path.relative(root, file);
}

function isInsideRepository(file) {
  const rel = path.relative(root, path.resolve(root, file));
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function displayPath(file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function normalizeDigest(value) {
  return value ? String(value).replace(/[^a-fA-F0-9]/g, "").toLowerCase() : null;
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walkFiles(dir, base = dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, base, files);
    } else if (entry.name !== ".DS_Store") {
      files.push(path.relative(base, fullPath));
    }
  }
  return files;
}

function walkAbsoluteFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAbsoluteFiles(fullPath, files);
    } else if (entry.name !== ".DS_Store") {
      files.push(fullPath);
    }
  }
  return files;
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fileHashMap(dir) {
  return Object.fromEntries(walkFiles(dir)
    .sort()
    .map((relativePath) => [relativePath, fileSha256(path.join(dir, relativePath))]));
}

function mapDiff(left, right, leftLabel = "dist", rightLabel = "android_fallback") {
  const issues = [];
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of Array.from(keys).sort()) {
    if (!Object.prototype.hasOwnProperty.call(left, key)) {
      issues.push(`missing_in_${leftLabel}:${key}`);
    } else if (!Object.prototype.hasOwnProperty.call(right, key)) {
      issues.push(`missing_in_${rightLabel}:${key}`);
    } else if (left[key] !== right[key]) {
      issues.push(`hash_mismatch:${key}`);
    }
  }
  return issues;
}

function toolPath(name) {
  return path.join(root, "tools", name);
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeoutMs || 60_000
  });
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-20);
}

function gitCleanCheck(options) {
  const result = run("git", ["status", "--short"], { timeoutMs: 10_000 });
  if (result.status !== 0) {
    return {
      id: "git_clean",
      status: "FAIL",
      reason: "git_status_failed",
      outputTail: tail(`${result.stdout}\n${result.stderr}`)
    };
  }
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  if (lines.length && !options.allowDirty) {
    return {
      id: "git_clean",
      status: "FAIL",
      reason: "working_tree_dirty",
      changedCount: lines.length,
      changedFiles: lines.slice(0, 20)
    };
  }
  return {
    id: "git_clean",
    status: lines.length ? "PASS_WITH_LIMITS" : "PASS",
    changedCount: lines.length
  };
}

function requiredToolChecks() {
  const required = [
    "remote_job_sprint_check.sh",
    "remote_https_job_sprint_check.sh",
    "run_final_delivery.js",
    "write_remote_acceptance_evidence.js",
    "write_remote_invitation_evidence.js",
    "write_remote_invitation_account_evidence.js",
    "write_remote_login_switch_evidence.js",
    "write_remote_coach_evidence.js",
    "write_server_sync_evidence.js",
    "build_public_safe_bundle.js",
    "build_server_delivery_package.js",
    "scan_public_bundle.js",
    "delivery_readiness_architecture.js",
    "validate_architecture_quality.js",
    "delivery_readiness_functional.js",
    "validate_functional_coverage.js",
    "delivery_readiness_feature_parity.js",
    "validate_feature_parity.js",
    "delivery_readiness_goal.js",
    "validate_goal_acceptance.js",
    "validate_product_iteration_workflow.js",
    "delivery_env_file.js",
    "write_delivery_env_template.js",
    "validate_delivery_external_inputs.js",
    "build_android_release_apk.js"
  ];
  return required.map((name) => {
    const file = toolPath(name);
    return {
      id: `tool_${name}`,
      status: fs.existsSync(file) ? "PASS" : "FAIL",
      file: relative(file)
    };
  });
}

function releaseGateScriptCheck() {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) {
    return {
      id: "release_gate_script",
      status: "FAIL",
      reason: "package_json_missing",
      file: relative(file)
    };
  }

  let packageJson;
  try {
    packageJson = readJsonFile(file);
  } catch (error) {
    return {
      id: "release_gate_script",
      status: "FAIL",
      reason: "package_json_invalid",
      file: relative(file),
      error: error.message
    };
  }

  const scripts = packageJson.scripts || {};
  const localFunctional = String(scripts["test:local-functional"] || "");
  const releaseGate = String(scripts["test:release"] || "");
  const issues = [];

  for (const command of ["npm run test:functional", "npm run test:rust:functional"]) {
    if (!localFunctional.includes(command)) {
      issues.push(`test_local_functional_missing_${command.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}`);
    }
  }

  const requiredReleaseOrder = [
    "npm test",
    "npm run test:local-functional",
    "npm run build:rust:linux",
    "npm run build:public-safe",
    "npm run scan:public-safe",
    "npm run build:server-delivery"
  ];
  let previousIndex = -1;
  for (const command of requiredReleaseOrder) {
    const index = releaseGate.indexOf(command);
    if (index === -1) {
      issues.push(`test_release_missing_${command.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}`);
    } else if (index < previousIndex) {
      issues.push(`test_release_order_invalid_${command.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}`);
    } else {
      previousIndex = index;
    }
  }

  if (issues.length) {
    return {
      id: "release_gate_script",
      status: "FAIL",
      reason: "release_gate_script_invalid",
      file: relative(file),
      issues
    };
  }

  return {
    id: "release_gate_script",
    status: "PASS",
    file: relative(file),
    localFunctional,
    releaseGate
  };
}

function publicSafeBundleCheck() {
  const distRoot = path.join(root, "dist", "public-safe");
  const androidRoot = path.join(root, "apps", "android", "app", "src", "main", "assets", "web");
  const requiredRoots = [distRoot, androidRoot];
  const missing = requiredRoots.filter((entry) => !fs.existsSync(entry) || !fs.statSync(entry).isDirectory());
  if (missing.length) {
    return {
      id: "public_safe_bundle",
      status: "USER_ACTION_REQUIRED",
      reason: "public_safe_bundle_missing",
      missing: missing.map(displayPath),
      requiredInputs: [
        "Run npm run build:public-safe before server sync.",
        "Run npm run scan:public-safe and fix any public bundle findings."
      ]
    };
  }

  const distManifest = path.join(distRoot, "build-manifest.json");
  const androidManifest = path.join(androidRoot, "build-manifest.json");
  const missingManifests = [distManifest, androidManifest]
    .filter((entry) => !fs.existsSync(entry) || !fs.statSync(entry).isFile());
  if (missingManifests.length) {
    return {
      id: "public_safe_bundle",
      status: "USER_ACTION_REQUIRED",
      reason: "public_safe_bundle_manifest_missing",
      missing: missingManifests.map(displayPath),
      requiredInputs: [
        "Run npm run build:public-safe to regenerate the public-safe bundle manifest.",
        "Run npm run scan:public-safe and fix any public bundle findings."
      ]
    };
  }

  let manifest;
  try {
    manifest = readJsonFile(distManifest);
  } catch (error) {
    return {
      id: "public_safe_bundle",
      status: "FAIL",
      reason: "public_safe_bundle_manifest_invalid_json",
      manifest: displayPath(distManifest),
      error: error.message
    };
  }

  const sourceHashes = manifest && typeof manifest.sourceHashes === "object" ? manifest.sourceHashes : null;
  if (!sourceHashes || !Object.keys(sourceHashes).length) {
    return {
      id: "public_safe_bundle",
      status: "FAIL",
      reason: "public_safe_bundle_manifest_missing_source_hashes",
      manifest: displayPath(distManifest)
    };
  }

  const staleSources = [];
  for (const [relativePath, expectedHash] of Object.entries(sourceHashes).sort()) {
    const source = path.join(root, relativePath);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      staleSources.push(`missing_source:${relativePath}`);
    } else if (fileSha256(source) !== expectedHash) {
      staleSources.push(`source_hash_mismatch:${relativePath}`);
    }
  }
  if (staleSources.length) {
    return {
      id: "public_safe_bundle",
      status: "USER_ACTION_REQUIRED",
      reason: "public_safe_bundle_stale",
      issues: staleSources.slice(0, 20),
      requiredInputs: [
        "Run npm run build:public-safe after source/data changes.",
        "Run npm run scan:public-safe and fix any public bundle findings."
      ]
    };
  }

  const distMap = fileHashMap(distRoot);
  const androidMap = fileHashMap(androidRoot);
  const syncIssues = mapDiff(distMap, androidMap);
  if (syncIssues.length) {
    return {
      id: "public_safe_bundle",
      status: "USER_ACTION_REQUIRED",
      reason: "public_safe_android_fallback_out_of_sync",
      issues: syncIssues.slice(0, 20),
      requiredInputs: [
        "Run npm run build:public-safe to resync Android fallback assets.",
        "Run npm run scan:public-safe and fix any public bundle findings."
      ]
    };
  }

  const result = run(process.execPath, [toolPath("scan_public_bundle.js")], { timeoutMs: 60_000 });
  if (result.status !== 0) {
    return {
      id: "public_safe_bundle",
      status: "FAIL",
      reason: "public_safe_bundle_scan_failed",
      outputTail: tail(`${result.stdout}\n${result.stderr}`)
    };
  }

  return {
    id: "public_safe_bundle",
    status: "PASS",
    roots: requiredRoots.map(displayPath),
    manifest: displayPath(distManifest),
    sourceCount: Object.keys(sourceHashes).length,
    outputTail: tail(result.stdout)
  };
}

function rustReleaseCheck(options = {}) {
  const binary = path.resolve(root, options.rustBinary || path.join(root, "apps", "rust-api", "target", "release", "job-sprint-api"));
  if (!fs.existsSync(binary) || !fs.statSync(binary).isFile()) {
    return {
      id: "rust_release_binary",
      status: "USER_ACTION_REQUIRED",
      binary: displayPath(binary),
      nextAction: "Run npm run build:rust:linux before server sync."
    };
  }

  const configuredSourceFiles = options.rustSourceFiles
    ? options.rustSourceFiles.map((file) => path.resolve(root, file))
    : [
      path.join(root, "apps", "rust-api", "Cargo.toml"),
      path.join(root, "apps", "rust-api", "Cargo.lock"),
      ...walkAbsoluteFiles(path.join(root, "apps", "rust-api", "src")),
      ...walkAbsoluteFiles(path.join(root, "apps", "rust-api", "migrations"))
    ];
  const sourceFiles = configuredSourceFiles.filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  const binaryMtimeMs = fs.statSync(binary).mtimeMs;
  const newerSources = sourceFiles
    .filter((file) => fs.statSync(file).mtimeMs > binaryMtimeMs + 1000)
    .map(displayPath)
    .sort();
  if (newerSources.length) {
    return {
      id: "rust_release_binary",
      status: "USER_ACTION_REQUIRED",
      reason: "rust_release_binary_stale",
      binary: displayPath(binary),
      newerSources: newerSources.slice(0, 20),
      requiredInputs: [
        "Run npm run build:rust:linux before server sync.",
        "Run npm run build:server-delivery after rebuilding Rust."
      ]
    };
  }

  return {
    id: "rust_release_binary",
    status: "PASS",
    binary: displayPath(binary),
    sourceFileCount: sourceFiles.length,
    nextAction: null
  };
}

function serverSyncEvidencePath(env) {
  const defaultEvidence = "docs/evidence/server-sync/sync.json";
  return argValue("--server-sync-evidence")
    || envValue(env, "JOB_SPRINT_SERVER_SYNC_EVIDENCE")
    || (envValue(env, "JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV") !== "1"
      && fs.existsSync(path.join(root, defaultEvidence))
      ? defaultEvidence
      : null);
}

function serverSyncEvidenceIssues(report) {
  const issues = [];
  if (!report || typeof report !== "object") {
    return ["server_sync_evidence_not_object"];
  }
  if (report.status !== "PASS") {
    issues.push("server_sync_evidence_status_not_pass");
  }
  if (!report.target || typeof report.target !== "object") {
    issues.push("server_sync_evidence_target_missing");
  } else {
    for (const key of ["host", "user", "remoteDir"]) {
      if (!String(report.target[key] || "").trim()) {
        issues.push(`server_sync_evidence_target_${key}_missing`);
      }
    }
  }

  const localManifest = path.join(root, "dist", "server-delivery", "server-delivery-manifest.json");
  if (!fs.existsSync(localManifest) || !fs.statSync(localManifest).isFile()) {
    issues.push("server_delivery_manifest_missing");
  } else {
    const localManifestSha256 = fileSha256(localManifest);
    if (normalizeDigest(report.localManifestSha256) !== localManifestSha256) {
      issues.push("server_sync_local_manifest_sha256_mismatch");
    }
    if (normalizeDigest(report.remoteManifestSha256) !== localManifestSha256) {
      issues.push("server_sync_remote_manifest_sha256_mismatch");
    }
  }

  const outputLines = Array.isArray(report.outputLines) ? report.outputLines : [];
  for (const required of [
    /OK server delivery rsync/,
    /OK server delivery remote manifest sha256/
  ]) {
    if (!outputLines.some((line) => required.test(String(line)))) {
      issues.push(`server_sync_evidence_missing_${String(required).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}`);
    }
  }
  return issues;
}

function serverSyncEvidenceCheck(env) {
  const evidence = serverSyncEvidencePath(env);
  if (!evidence) {
    return {
      id: "server_sync_evidence",
      status: "USER_ACTION_REQUIRED",
      reason: "server_sync_evidence_missing",
      requiredInputs: [
        `Run ${deliveryCommands.serverSync}.`,
        "Set JOB_SPRINT_SERVER_SYNC_EVIDENCE or pass --server-sync-evidence <report.json>."
      ]
    };
  }

  const file = path.resolve(root, evidence);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      id: "server_sync_evidence",
      status: "FAIL",
      reason: "server_sync_evidence_file_missing",
      evidence: displayPath(file)
    };
  }

  let report;
  try {
    report = readJsonFile(file);
  } catch (error) {
    return {
      id: "server_sync_evidence",
      status: "FAIL",
      reason: "server_sync_evidence_invalid_json",
      evidence: displayPath(file),
      error: error.message
    };
  }

  const issues = serverSyncEvidenceIssues(report);
  if (issues.length) {
    return {
      id: "server_sync_evidence",
      status: "FAIL",
      reason: "server_sync_evidence_invalid",
      evidence: displayPath(file),
      issues
    };
  }

  return {
    id: "server_sync_evidence",
    status: "PASS",
    evidence: displayPath(file),
    target: report.target,
    manifestSha256: normalizeDigest(report.remoteManifestSha256)
  };
}

function finalDeliveryReportPath(env) {
  return argValue("--final-delivery-report")
    || envValue(env, "JOB_SPRINT_FINAL_DELIVERY_REPORT");
}

function finalDeliveryReportDeferred(env) {
  return argSet.has("--defer-final-delivery-report")
    && envValue(env, "JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS") === "1";
}

function finalDeliveryPostValidationDeferred(env) {
  return argSet.has("--defer-post-final-report-validation")
    && envValue(env, "JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS") === "1";
}

function finalDeliveryReportIssues(report, options = {}) {
  const issues = [];
  if (!report || typeof report !== "object") {
    return ["final_delivery_report_not_object"];
  }
  if (report.status !== "PASS" && report.status !== "PASS_WITH_LIMITS") {
    issues.push("final_delivery_report_status_not_pass");
  }
  if (report.dryRun !== false) {
    issues.push("final_delivery_report_is_dry_run_or_missing_flag");
  }
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const byId = new Map(steps.map((step) => [step && step.id, step]));
  for (const id of [
    "preflight",
    "release_gate",
    "server_sync_evidence",
    "server_remote_acceptance",
    "android_remote_acceptance",
    "android_formal_release",
    "final_readiness",
    "post_final_report_validation"
  ]) {
    const step = byId.get(id);
    if (!step) {
      if (!(id === "post_final_report_validation" && options.allowMissingPostValidation)) {
        issues.push(`final_delivery_report_step_${id}_missing`);
      }
    } else if (step.status !== "PASS" && step.status !== "PASS_WITH_LIMITS") {
      issues.push(`final_delivery_report_step_${id}_not_pass`);
    }
  }
  return issues;
}

function finalDeliveryReportCheck(env) {
  const reportPath = finalDeliveryReportPath(env);
  if (reportPath && finalDeliveryReportDeferred(env)) {
    return {
      id: "final_delivery_report",
      status: "PASS",
      reason: "final_delivery_report_deferred_until_runner_write",
      evidence: reportPath ? displayPath(path.resolve(root, reportPath)) : null,
      nextValidation: "Run npm run validate:delivery with JOB_SPRINT_FINAL_DELIVERY_REPORT after npm run final:delivery writes the report."
    };
  }

  if (!reportPath) {
    return {
      id: "final_delivery_report",
      status: "PASS_WITH_LIMITS",
      reason: "final_delivery_report_not_supplied",
      nextAction: `Run ${deliveryCommands.finalDelivery} for final handoff evidence.`
    };
  }

  const file = path.resolve(root, reportPath);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      id: "final_delivery_report",
      status: "USER_ACTION_REQUIRED",
      reason: "final_delivery_report_file_missing",
      evidence: displayPath(file),
      requiredInputs: [
        `Run ${deliveryCommands.finalDelivery}.`,
        "Set JOB_SPRINT_FINAL_DELIVERY_REPORT or pass --final-delivery-report <report.json> to validate the saved report."
      ]
    };
  }

  let report;
  try {
    report = readJsonFile(file);
  } catch (error) {
    return {
      id: "final_delivery_report",
      status: "FAIL",
      reason: "final_delivery_report_invalid_json",
      evidence: displayPath(file),
      error: error.message
    };
  }

  const issues = finalDeliveryReportIssues(report, {
    allowMissingPostValidation: finalDeliveryPostValidationDeferred(env)
  });
  if (issues.length) {
    return {
      id: "final_delivery_report",
      status: "FAIL",
      reason: "final_delivery_report_invalid",
      evidence: displayPath(file),
      issues
    };
  }

  return {
    id: "final_delivery_report",
    status: "PASS",
    evidence: displayPath(file),
    generatedAt: report.generatedAt || null,
    stepCount: Array.isArray(report.steps) ? report.steps.length : 0
  };
}

function productIterationWorkflowCheck(options = {}) {
  let report;
  try {
    report = options.productIterationReport || validateProductIterationWorkflow(root);
  } catch (error) {
    return {
      id: "product_iteration_workflow",
      status: "FAIL",
      reason: "product_iteration_workflow_gate_failed",
      error: error.message
    };
  }

  const findings = Array.isArray(report && report.findings) ? report.findings : [];
  const warnings = Array.isArray(report && report.warnings) ? report.warnings : [];
  const metrics = report && typeof report.metrics === "object" ? report.metrics : {};
  if (!report || report.ok === false || findings.length) {
    return {
      id: "product_iteration_workflow",
      status: "FAIL",
      reason: "product_iteration_workflow_findings_present",
      findingCount: findings.length,
      findings: findings.slice(0, 20)
    };
  }

  if (!["PASS", "PASS_WITH_LIMITS"].includes(report.status)) {
    return {
      id: "product_iteration_workflow",
      status: "FAIL",
      reason: "product_iteration_workflow_status_invalid",
      reportedStatus: report.status || null
    };
  }

  return {
    id: "product_iteration_workflow",
    status: report.status,
    checkedDocs: Number(metrics.checkedDocs || 0),
    warningCount: Number(metrics.warningCount || warnings.length),
    warnings: warnings.slice(0, 10)
  };
}

function androidSigningCheck(env) {
  const required = [
    "JOB_SPRINT_ANDROID_KEYSTORE",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD",
    "JOB_SPRINT_ANDROID_KEY_ALIAS",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
  ];
  const missing = required.filter((key) => !envValue(env, key));
  if (missing.length) {
    return {
      id: "android_formal_signing_env",
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_signing_env_missing",
      missing,
      requiredInputs: [
        `如无既有长期 release keystore，可先运行 ${deliveryCommands.androidSigningInit} 在仓库外生成私有签名材料并写入私有 env。`,
        `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_ANDROID_KEYSTORE、JOB_SPRINT_ANDROID_STORE_PASSWORD、JOB_SPRINT_ANDROID_KEY_ALIAS、JOB_SPRINT_ANDROID_KEY_PASSWORD、JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256 后运行 ${deliveryCommands.formalRelease}。`,
        "Store/key passwords supplied through environment or private Gradle properties.",
        "Pinned release certificate SHA-256 fingerprint."
      ]
    };
  }

  const keystore = envValue(env, "JOB_SPRINT_ANDROID_KEYSTORE");
  if (!fs.existsSync(keystore) || !fs.statSync(keystore).isFile()) {
    return {
      id: "android_formal_signing_env",
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_keystore_missing",
      keystoreConfigured: true
    };
  }
  if (isInsideRepository(keystore)) {
    return {
      id: "android_formal_signing_env",
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_keystore_inside_repo",
      keystoreConfigured: true,
      keystore: displayPath(keystore),
      requiredInputs: [
        "Move the stable private release keystore outside the git repository.",
        `Point JOB_SPRINT_ANDROID_KEYSTORE in ${defaultDeliveryEnvFile} at that external file, then run ${deliveryCommands.formalRelease}.`,
        "Keep store/key passwords outside the git repository."
      ]
    };
  }

  return {
    id: "android_formal_signing_env",
    status: "PASS",
    keystoreConfigured: true,
    releaseCertPinned: true
  };
}

function newestReleaseApkCheck(formalVerification) {
  if (formalVerification && formalVerification.status === "PASS") {
    const apk = formalVerification.apk ? path.resolve(root, formalVerification.apk) : null;
    return {
      id: "android_release_apk_candidate",
      status: "PASS",
      apk: formalVerification.apk,
      sizeBytes: apk && fs.existsSync(apk) ? fs.statSync(apk).size : null,
      reason: "formal_release_verified",
      formalEvidence: formalVerification.evidence
    };
  }
  const outputDir = path.join(root, "apps", "android", "app", "build", "outputs", "apk", "release");
  if (!fs.existsSync(outputDir)) {
    return {
      id: "android_release_apk_candidate",
      status: "USER_ACTION_REQUIRED",
      reason: "release_apk_dir_missing",
      nextAction: `Run ${deliveryCommands.formalRelease} after formal signing env is configured.`
    };
  }
  const apks = fs.readdirSync(outputDir)
    .filter((entry) => entry.endsWith(".apk"))
    .map((entry) => path.join(outputDir, entry))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!apks.length) {
    return {
      id: "android_release_apk_candidate",
      status: "USER_ACTION_REQUIRED",
      reason: "release_apk_missing",
      nextAction: `Run ${deliveryCommands.formalRelease} after formal signing env is configured.`
    };
  }
  const apk = apks[0];
  const isLocal = /signed-local/i.test(path.basename(apk));
  const isUnsigned = /unsigned/i.test(path.basename(apk));
  return {
    id: "android_release_apk_candidate",
    status: isUnsigned ? "FAIL" : isLocal ? "PASS_WITH_LIMITS" : "PASS_WITH_LIMITS",
    apk: relative(apk),
    sizeBytes: fs.statSync(apk).size,
    reason: isUnsigned ? "unsigned_apk_candidate" : isLocal ? "local_release_signed_not_formal" : "apk_requires_formal_verification",
    nextAction: `Run ${deliveryCommands.formalRelease} and require FORMAL_SIGNED before final delivery.`
  };
}

function androidReleaseVerificationEvidencePath(env) {
  const defaultEvidence = "docs/evidence/android-release/formal-release.json";
  return argValue("--android-release-evidence")
    || envValue(env, "JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE")
    || (envValue(env, "JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV") !== "1"
      && envValue(env, "JOB_SPRINT_ANDROID_KEYSTORE")
      && fs.existsSync(path.join(root, defaultEvidence))
      ? defaultEvidence
      : null);
}

function androidFormalReleaseVerificationCheck(env) {
  const evidence = androidReleaseVerificationEvidencePath(env);
  if (!evidence) {
    return {
      id: "android_formal_release_verification",
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_verification_evidence_missing",
      requiredInputs: [
        `Run ${deliveryCommands.formalRelease} with the formal signing environment configured.`,
        "Save the JSON output and set JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE or pass --android-release-evidence <report.json>.",
        "The report status must be FORMAL_SIGNED."
      ]
    };
  }

  const file = path.resolve(root, evidence);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      id: "android_formal_release_verification",
      status: "FAIL",
      reason: "formal_android_release_verification_file_missing",
      evidence: displayPath(file)
    };
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {
      id: "android_formal_release_verification",
      status: "FAIL",
      reason: "formal_android_release_verification_invalid_json",
      evidence: displayPath(file),
      error: error.message
    };
  }

  const issues = [];
  if (report.status !== "FORMAL_SIGNED") {
    issues.push("release_report_status_not_formal_signed");
  }

  const apk = report.apk ? path.resolve(root, report.apk) : null;
  let actualApkSha256 = null;
  if (!apk || !fs.existsSync(apk) || !fs.statSync(apk).isFile()) {
    issues.push("release_report_apk_missing");
  } else if (/unsigned|signed-local/i.test(path.basename(apk))) {
    issues.push("release_report_apk_not_formal_candidate");
  } else {
    actualApkSha256 = fileSha256(apk);
  }

  const reportApkSha256 = normalizeDigest(report.apkSha256);
  if (!reportApkSha256) {
    issues.push("release_report_apk_sha256_missing");
  }
  if (actualApkSha256 && reportApkSha256 && actualApkSha256 !== reportApkSha256) {
    issues.push("release_report_apk_sha256_mismatch");
  }

  const expectedSha256 = normalizeDigest(envValue(env, "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"));
  const certSha256 = normalizeDigest(report.certSha256);
  if (!certSha256) {
    issues.push("release_report_cert_sha256_missing");
  }
  if (expectedSha256 && certSha256 && certSha256 !== expectedSha256) {
    issues.push("release_report_cert_sha256_mismatch");
  }
  if (!Array.isArray(report.verifiedSchemes) || !report.verifiedSchemes.length) {
    issues.push("release_report_verified_schemes_missing");
  }

  if (issues.length) {
    return {
      id: "android_formal_release_verification",
      status: "FAIL",
      reason: "formal_android_release_verification_invalid",
      evidence: displayPath(file),
      apk: report.apk || null,
      issues
    };
  }

  return {
    id: "android_formal_release_verification",
    status: "PASS",
    evidence: displayPath(file),
    apk: displayPath(apk),
    apkSha256: actualApkSha256,
    certSha256,
    verifiedSchemeCount: report.verifiedSchemes.length
  };
}

function serverRemoteEvidencePath(env) {
  return argValue("--server-remote-evidence")
    || envValue(env, "JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE");
}

function serverRemoteEvidenceIssues(report, env) {
  const issues = [];
  if (!report || typeof report !== "object") {
    return ["server_remote_evidence_not_object"];
  }
  if (report.status !== "PASS") {
    issues.push("server_remote_evidence_status_not_pass");
  }
  if (!/^https?:\/\//i.test(String(report.baseUrl || ""))) {
    issues.push("server_remote_evidence_base_url_invalid");
  }
  const configuredBaseUrl = remoteInputs(env).baseUrl;
  if (configuredBaseUrl && report.baseUrl && configuredBaseUrl.replace(/\/+$/, "") !== report.baseUrl.replace(/\/+$/, "")) {
    issues.push("server_remote_evidence_base_url_mismatch");
  }
  const outputLines = Array.isArray(report.outputLines) ? report.outputLines : [];
  const requiredPatterns = [
    /OK \/api\/health 200/,
    /OK \/api\/auth\/login 200/,
    /OK \/api\/auth\/session 200/,
    /OK \/api\/progress remote save 200/,
    /OK \/api\/progress remote readback/,
    /remote (HTTPS )?job-sprint check passed/i
  ];
  for (const pattern of requiredPatterns) {
    if (!outputLines.some((line) => pattern.test(String(line)))) {
      issues.push(`server_remote_evidence_missing_${String(pattern).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}`);
    }
  }
  return issues;
}

function serverRemoteEvidenceCheck(env, evidence) {
  const file = path.resolve(root, evidence);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      id: "server_remote_acceptance",
      status: "FAIL",
      reason: "server_remote_acceptance_evidence_file_missing",
      evidence: displayPath(file)
    };
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {
      id: "server_remote_acceptance",
      status: "FAIL",
      reason: "server_remote_acceptance_evidence_invalid_json",
      evidence: displayPath(file),
      error: error.message
    };
  }

  const issues = serverRemoteEvidenceIssues(report, env);
  if (issues.length) {
    return {
      id: "server_remote_acceptance",
      status: "FAIL",
      reason: "server_remote_acceptance_evidence_invalid",
      evidence: displayPath(file),
      baseUrl: report && report.baseUrl ? report.baseUrl : null,
      issues
    };
  }

  return {
    id: "server_remote_acceptance",
    status: "PASS",
    evidence: displayPath(file),
    baseUrl: report.baseUrl,
    outputLineCount: Array.isArray(report.outputLines) ? report.outputLines.length : 0
  };
}

function remoteInputs(env) {
  const baseUrl = argValue("--remote-url")
    || envValue(env, "JOB_SPRINT_REMOTE_BASE_URL")
    || envValue(env, "JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue(env, "JOB_SPRINT_DELIVERY_BASE_URL");
  const user = envValue(env, "JOB_SPRINT_AUTH_USER");
  const password = envValue(env, "JOB_SPRINT_AUTH_PASSWORD") || envValue(env, "JOB_SPRINT_AUTH_PASS");
  return { baseUrl, userConfigured: Boolean(user), passwordConfigured: Boolean(password) };
}

function remoteSyncCheck(env, options) {
  const evidence = serverRemoteEvidencePath(env);
  if (evidence) {
    return serverRemoteEvidenceCheck(env, evidence);
  }

  const inputs = remoteInputs(env);
  if (!inputs.baseUrl) {
    return {
      id: "server_remote_acceptance",
      status: "USER_ACTION_REQUIRED",
      reason: "remote_base_url_missing",
      requiredInputs: [
        `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_REMOTE_BASE_URL、JOB_SPRINT_AUTH_USER、JOB_SPRINT_AUTH_PASSWORD 后运行 ${deliveryCommands.serverRemote}。`
      ]
    };
  }
  if (!inputs.userConfigured || !inputs.passwordConfigured) {
    return {
      id: "server_remote_acceptance",
      status: "USER_ACTION_REQUIRED",
      reason: "remote_auth_env_missing",
      baseUrl: inputs.baseUrl,
      userConfigured: inputs.userConfigured,
      passwordConfigured: inputs.passwordConfigured,
      requiredInputs: [
        `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_AUTH_USER、JOB_SPRINT_AUTH_PASSWORD 后运行 ${deliveryCommands.serverRemote}。`
      ]
    };
  }
  if (options.noRemoteCheck) {
    return {
      id: "server_remote_acceptance",
      status: "PASS_WITH_LIMITS",
      reason: "remote_check_skipped",
      baseUrl: inputs.baseUrl
    };
  }

  const script = inputs.baseUrl.startsWith("https://")
    ? toolPath("remote_https_job_sprint_check.sh")
    : toolPath("remote_job_sprint_check.sh");
  const result = run("bash", [script, inputs.baseUrl], { timeoutMs: 90_000, env });
  if (result.status !== 0) {
    return {
      id: "server_remote_acceptance",
      status: "FAIL",
      reason: "remote_acceptance_failed",
      baseUrl: inputs.baseUrl,
      outputTail: tail(`${result.stdout}\n${result.stderr}`)
    };
  }
  return {
    id: "server_remote_acceptance",
    status: "PASS",
    baseUrl: inputs.baseUrl,
    outputTail: tail(result.stdout)
  };
}

function androidRemoteEvidencePath(env) {
  return argValue("--android-remote-evidence")
    || envValue(env, "JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE");
}

function isHttpsUrl(value) { return /^https:\/\//i.test(String(value || "")); }
function isHttpUrl(value) { return /^http:\/\//i.test(String(value || "")); }
function isRemoteJobSprintUrl(value) { return /^https?:\/\/[^/]+\/job-sprint\//i.test(String(value || "")); }

function snapshotHasRuntimeStorage(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }
  const keys = Array.isArray(snapshot.keys) ? snapshot.keys : [];
  const hashes = snapshot.rawHashes && typeof snapshot.rawHashes === "object" ? snapshot.rawHashes : {};
  return keys.includes("jobSprint.react.v1") && /^[a-f0-9]{64}$/i.test(String(hashes["jobSprint.react.v1"] || ""));
}

function snapshotHasSavedProgress(snapshot) {
  const delayReasons = snapshot
    && snapshot.react
    && Array.isArray(snapshot.react.delayReasons)
    ? snapshot.react.delayReasons
    : [];
  return delayReasons.length > 0;
}

function remoteAuthEvidenceIssues(report) {
  const authEvidence = report && report.authEvidence;
  const issues = [];
  if (!authEvidence || typeof authEvidence !== "object") {
    return ["remote_auth_evidence_missing"];
  }
  if (authEvidence.mode !== "remote") {
    issues.push("remote_auth_evidence_not_remote_mode");
  }
  if (!authEvidence.authUserConfigured || !authEvidence.authPasswordConfigured) {
    issues.push("remote_auth_credentials_not_configured_in_test");
  }
  const states = Array.isArray(authEvidence.sessionStates) ? authEvidence.sessionStates : [];
  if (!states.some((state) => state && state.sessionApiAuthenticated === true)) {
    issues.push("session_api_authenticated_state_missing");
  }
  if (states.some((state) => state && !isRemoteJobSprintUrl(state.url))) {
    issues.push("remote_auth_session_state_url_not_remote_job_sprint");
  }
  return issues;
}

function remoteSnapshotUrlIssues(snapshot, label) {
  const url = snapshot && snapshot.url;
  const issues = [];
  if (!isHttpsUrl(url) && !isHttpUrl(url)) {
    issues.push(`${label}_snapshot_requires_remote_https_url`);
  }
  if (!isRemoteJobSprintUrl(url)) {
    issues.push(`${label}_snapshot_requires_job_sprint_remote_path`);
  }
  return issues;
}

function androidRemoteAcceptanceCheck(env) {
  const evidence = androidRemoteEvidencePath(env);
  if (!evidence) {
    return {
      id: "android_remote_acceptance",
      status: "USER_ACTION_REQUIRED",
      reason: "android_remote_acceptance_evidence_missing",
      requiredInputs: [
        `Run ${deliveryCommands.androidRemote}.`,
        "Set JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE or pass --android-remote-evidence <report.json>."
      ]
    };
  }

  const file = path.resolve(root, evidence);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      id: "android_remote_acceptance",
      status: "FAIL",
      reason: "android_remote_acceptance_evidence_file_missing",
      evidence: displayPath(file)
    };
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {
      id: "android_remote_acceptance",
      status: "FAIL",
      reason: "android_remote_acceptance_evidence_invalid_json",
      evidence: displayPath(file),
      error: error.message
    };
  }

  const flowSnapshot = report.flowSnapshot;
  const restartSnapshot = report.restartSnapshot;
  const webViewUrl = report.webViewUrl || flowSnapshot?.url || restartSnapshot?.url || null;
  const issues = [];
  const limits = [];
  const remoteUrls = [
    webViewUrl,
    flowSnapshot && flowSnapshot.url,
    restartSnapshot && restartSnapshot.url,
    ...(report.authEvidence && Array.isArray(report.authEvidence.sessionStates)
      ? report.authEvidence.sessionStates.map((state) => state && state.url)
      : [])
  ].filter(Boolean);

  if (report.status !== "PASS") {
    issues.push("report_status_not_pass");
  }
  if (!isHttpsUrl(webViewUrl)) {
    if (isHttpUrl(webViewUrl)) {
      limits.push("android_remote_http_basic_validation");
    } else {
      issues.push("requires_remote_https_webview_url");
    }
  }
  if (!isRemoteJobSprintUrl(webViewUrl)) issues.push("requires_job_sprint_remote_path");
  if (remoteUrls.some((url) => isHttpUrl(url))) limits.push("android_remote_http_url_seen");
  issues.push(...remoteSnapshotUrlIssues(flowSnapshot, "flow"));
  issues.push(...remoteSnapshotUrlIssues(restartSnapshot, "restart"));
  if (!snapshotHasRuntimeStorage(flowSnapshot)) {
    issues.push("flow_snapshot_missing_runtime_storage_hash");
  }
  if (!snapshotHasRuntimeStorage(restartSnapshot)) {
    issues.push("restart_snapshot_missing_runtime_storage_hash");
  }
  if (!snapshotHasSavedProgress(restartSnapshot)) {
    issues.push("restart_snapshot_missing_saved_progress");
  }
  issues.push(...remoteAuthEvidenceIssues(report));

  if (issues.length) {
    return {
      id: "android_remote_acceptance",
      status: "FAIL",
      reason: "android_remote_acceptance_evidence_invalid",
      evidence: displayPath(file),
      webViewUrl,
      issues
    };
  }

  return {
    id: "android_remote_acceptance",
    status: limits.length ? "PASS_WITH_LIMITS" : "PASS",
    evidence: displayPath(file),
    webViewUrl,
    limits: Array.from(new Set(limits)),
    authLoginAttempted: Boolean(report.authEvidence && report.authEvidence.loginAttempted),
    authSessionStateCount: Array.isArray(report.authEvidence && report.authEvidence.sessionStates)
      ? report.authEvidence.sessionStates.length
      : 0,
    restartDelayCount: restartSnapshot.react.delayReasons.length
  };
}

function evaluateReadiness(env = process.env, options = {}) {
  const inputArgs = options.args || args;
  const androidSigning = androidSigningCheck(env);
  const androidFormalReleaseVerification = androidFormalReleaseVerificationCheck(env);
  const checks = [
    gitCleanCheck(options),
    ...requiredToolChecks(),
    releaseGateScriptCheck(),
    architectureQualityCheck(),
    functionalCoverageCheck(),
    featureParityCheck(),
    productIterationWorkflowCheck(options),
    goalAcceptanceCheck(root, env),
    deliveryExternalInputsCheck(root, env, { args: inputArgs }),
    publicSafeBundleCheck(),
    rustReleaseCheck(options),
    serverDeliveryPackageCheck(root),
    serverSyncEvidenceCheck(env),
    finalDeliveryReportCheck(env),
    remoteSyncCheck(env, options),
    androidRemoteAcceptanceCheck(env),
    androidSigning,
    androidFormalReleaseVerification,
    newestReleaseApkCheck(androidFormalReleaseVerification)
  ];
  const hasFail = checks.some((check) => check.status === "FAIL");
  const needsUser = checks.some((check) => check.status === "USER_ACTION_REQUIRED");
  const hasLimits = checks.some((check) => check.status === "PASS_WITH_LIMITS");
  const status = hasFail ? "FAIL" : needsUser ? "USER_ACTION_REQUIRED" : hasLimits ? "PASS_WITH_LIMITS" : "PASS";
  const nextActions = checks
    .filter((check) => check.nextAction || check.requiredInputs || check.missing)
    .map((check) => ({
      id: check.id,
      reason: check.reason || null,
      nextAction: check.nextAction || null,
      missing: check.missing || null,
      requiredInputs: check.requiredInputs || null
    }));
  return { status, checks, nextActions };
}

if (require.main === module) {
  let report;
  try {
    const loaded = loadReadinessEnv(root, process.env, args);
    report = evaluateReadiness(loaded.env, {
      allowDirty: argSet.has("--allow-dirty"),
      noRemoteCheck: argSet.has("--no-remote-check"),
      args: loaded.args
    });
  } catch (error) {
    report = deliveryEnvFailureReport(error);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "FAIL") {
    process.exitCode = 1;
  } else if (report.status === "USER_ACTION_REQUIRED") {
    process.exitCode = 2;
  }
}

module.exports = {
  evaluateReadiness
};

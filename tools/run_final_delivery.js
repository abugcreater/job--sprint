#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");
const { validateDeliveryExternalInputs } = require("./validate_delivery_external_inputs");
const { runCommandWithRetries } = require("./run_command_retry");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);
const dryRun = argSet.has("--dry-run");

const evidenceDefaults = {
  serverSync: "docs/evidence/server-sync/sync.json",
  serverRemote: "docs/evidence/server-remote/acceptance.json",
  androidRemote: "docs/evidence/android-remote-functional/android-webview-functional-persistence-report.json",
  androidRelease: "docs/evidence/android-release/formal-release.json"
};

function envValue(name, env = process.env) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function hasAnyEnv(env, names) {
  return names.some((name) => Boolean(envValue(name, env)));
}

function hasAllEnv(env, names) {
  return names.every((name) => Boolean(envValue(name, env)));
}

function commandAvailable(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000
  });
  return result.status === 0 && Boolean(String(result.stdout || "").trim());
}

function envGroupStatus(env, names) {
  const configured = names.filter((name) => Boolean(envValue(name, env)));
  const missing = names.filter((name) => !envValue(name, env));
  return {
    configured,
    missing,
    ready: missing.length === 0
  };
}

function toolStatus(commands) {
  return commands.map((command) => ({
    command,
    available: commandAvailable(command)
  }));
}

function missingTools(tools) {
  return tools.filter((tool) => !tool.available).map((tool) => tool.command);
}

function finalDeliveryPreflight(env, envFileInfo = null) {
  const externalInputs = validateDeliveryExternalInputs(root, env, { args, envFileInfo });
  const envGroups = {
    serverSync: envGroupStatus(env, ["JOB_SPRINT_DEPLOY_HOST", "JOB_SPRINT_DEPLOY_USER", "JOB_SPRINT_DEPLOY_PATH"]),
    remoteAcceptance: envGroupStatus(env, ["JOB_SPRINT_AUTH_USER"]),
    androidRemote: envGroupStatus(env, ["JOB_SPRINT_AUTH_USER"]),
    formalAndroidRelease: envGroupStatus(env, [
      "JOB_SPRINT_ANDROID_KEYSTORE",
      "JOB_SPRINT_ANDROID_STORE_PASSWORD",
      "JOB_SPRINT_ANDROID_KEY_ALIAS",
      "JOB_SPRINT_ANDROID_KEY_PASSWORD",
      "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
    ])
  };
  envGroups.serverSync.sshKeyConfigured = Boolean(envValue("JOB_SPRINT_DEPLOY_SSH_KEY", env) || envValue("JOB_SPRINT_SSH_KEY", env));
  envGroups.serverSync.portConfigured = Boolean(envValue("JOB_SPRINT_DEPLOY_PORT", env));
  envGroups.remoteAcceptance.urlConfigured = hasAnyEnv(env, [
    "JOB_SPRINT_REMOTE_BASE_URL",
    "JOB_SPRINT_PUBLIC_BASE_URL",
    "JOB_SPRINT_DELIVERY_BASE_URL"
  ]);
  envGroups.remoteAcceptance.passwordConfigured = Boolean(envValue("JOB_SPRINT_AUTH_PASSWORD", env) || envValue("JOB_SPRINT_AUTH_PASS", env));
  if (!envGroups.remoteAcceptance.urlConfigured) {
    envGroups.remoteAcceptance.missing.push("JOB_SPRINT_REMOTE_BASE_URL");
  }
  if (!envGroups.remoteAcceptance.passwordConfigured) {
    envGroups.remoteAcceptance.missing.push("JOB_SPRINT_AUTH_PASSWORD");
  }
  envGroups.remoteAcceptance.ready = envGroups.remoteAcceptance.ready
    && envGroups.remoteAcceptance.urlConfigured
    && envGroups.remoteAcceptance.passwordConfigured;
  envGroups.androidRemote.urlConfigured = hasAnyEnv(env, [
    "JOB_SPRINT_ANDROID_WEBVIEW_URL",
    "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
    "JOB_SPRINT_REMOTE_BASE_URL",
    "JOB_SPRINT_PUBLIC_BASE_URL",
    "JOB_SPRINT_DELIVERY_BASE_URL"
  ]);
  envGroups.androidRemote.passwordConfigured = Boolean(envValue("JOB_SPRINT_AUTH_PASSWORD", env) || envValue("JOB_SPRINT_AUTH_PASS", env));
  if (!envGroups.androidRemote.urlConfigured) {
    envGroups.androidRemote.missing.push("JOB_SPRINT_ANDROID_WEBVIEW_URL");
  }
  if (!envGroups.androidRemote.passwordConfigured) {
    envGroups.androidRemote.missing.push("JOB_SPRINT_AUTH_PASSWORD");
  }
  envGroups.androidRemote.ready = envGroups.androidRemote.ready
    && envGroups.androidRemote.urlConfigured
    && envGroups.androidRemote.passwordConfigured;

  const baseTools = toolStatus(["npm", "node"]);
  const conditionalTools = [];
  if (envGroups.serverSync.ready) {
    conditionalTools.push(...toolStatus(["ssh", "rsync"]));
  }
  if (envGroups.androidRemote.ready) {
    conditionalTools.push(...toolStatus(["adb"]));
  }
  if (envGroups.formalAndroidRelease.ready) {
    conditionalTools.push(...toolStatus(["gradle"]));
  }

  const missingBaseTools = missingTools(baseTools);
  const missingConditionalTools = missingTools(conditionalTools);
  const status = missingBaseTools.length || missingConditionalTools.length
    ? "FAIL"
    : (dryRun ? "DRY_RUN" : "PASS");
  return reportStep("preflight", status, {
    tools: {
      base: baseTools,
      conditional: conditionalTools
    },
    externalInputs,
    envFile: envFileInfo,
    envGroups,
    missingTools: [
      ...missingBaseTools,
      ...missingConditionalTools
    ]
  });
}

function evidenceEnv(env) {
  const next = { ...env };
  if (hasAllEnv(next, ["JOB_SPRINT_DEPLOY_HOST", "JOB_SPRINT_DEPLOY_USER", "JOB_SPRINT_DEPLOY_PATH"])) {
    next.JOB_SPRINT_SERVER_SYNC_EVIDENCE = envValue("JOB_SPRINT_SERVER_SYNC_EVIDENCE", next)
      || evidenceDefaults.serverSync;
  }
  if (
    hasAnyEnv(next, ["JOB_SPRINT_REMOTE_BASE_URL", "JOB_SPRINT_PUBLIC_BASE_URL", "JOB_SPRINT_DELIVERY_BASE_URL"])
    && envValue("JOB_SPRINT_AUTH_USER", next)
    && (envValue("JOB_SPRINT_AUTH_PASSWORD", next) || envValue("JOB_SPRINT_AUTH_PASS", next))
  ) {
    next.JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE = envValue("JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE", next)
      || evidenceDefaults.serverRemote;
  }
  if (
    hasAnyEnv(next, [
      "JOB_SPRINT_ANDROID_WEBVIEW_URL",
      "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
      "JOB_SPRINT_REMOTE_BASE_URL",
      "JOB_SPRINT_PUBLIC_BASE_URL",
      "JOB_SPRINT_DELIVERY_BASE_URL"
    ])
    && envValue("JOB_SPRINT_AUTH_USER", next)
    && (envValue("JOB_SPRINT_AUTH_PASSWORD", next) || envValue("JOB_SPRINT_AUTH_PASS", next))
  ) {
    next.JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE = envValue("JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE", next)
      || evidenceDefaults.androidRemote;
  }
  if (hasAllEnv(next, [
    "JOB_SPRINT_ANDROID_KEYSTORE",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD",
    "JOB_SPRINT_ANDROID_KEY_ALIAS",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
  ])) {
    next.JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE = envValue("JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE", next)
      || evidenceDefaults.androidRelease;
  }
  return next;
}

function relative(file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function finalDeliveryReportPath(env) {
  return argValue("--report") || envValue("JOB_SPRINT_FINAL_DELIVERY_REPORT", env);
}

function resolveFinalDeliveryReport(env) {
  const reportPath = finalDeliveryReportPath(env);
  if (!reportPath) {
    return null;
  }
  const absoluteReportPath = path.resolve(root, reportPath);
  return {
    absolute: absoluteReportPath,
    display: relative(absoluteReportPath)
  };
}

function writeFinalDeliveryReport(report, destination) {
  if (!destination) {
    return;
  }
  const absoluteReportPath = destination.absolute;
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-40);
}

function embeddedJsonReport(text) {
  const value = String(text || "");
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}

function commandStatus(result) {
  if (result.status === 0) {
    const parsed = embeddedJsonReport(result.stdout) || embeddedJsonReport(result.stderr);
    if (parsed && ["PASS", "PASS_WITH_LIMITS", "USER_ACTION_REQUIRED", "FAIL"].includes(parsed.status)) {
      return parsed.status;
    }
    return "PASS";
  }
  const parsed = embeddedJsonReport(result.stdout) || embeddedJsonReport(result.stderr);
  if (parsed && ["USER_ACTION_REQUIRED", "FAIL"].includes(parsed.status)) {
    return parsed.status;
  }
  return result.status === 2 ? "USER_ACTION_REQUIRED" : "FAIL";
}

function reportStep(id, status, details = {}) {
  return { id, status, ...details };
}

function statusFromSteps(steps) {
  if (steps.some((step) => step.status === "FAIL")) {
    return "FAIL";
  }
  if (steps.some((step) => step.status === "USER_ACTION_REQUIRED")) {
    return "USER_ACTION_REQUIRED";
  }
  if (steps.some((step) => step.status === "PASS_WITH_LIMITS")) {
    return "PASS_WITH_LIMITS";
  }
  return dryRun ? "DRY_RUN" : "PASS";
}

function finalDeliveryReport(reportDestination, steps) {
  return {
    status: statusFromSteps(steps),
    dryRun,
    generatedAt: new Date().toISOString(),
    report: reportDestination ? reportDestination.display : null,
    evidenceDefaults: Object.fromEntries(Object.entries(evidenceDefaults).map(([key, file]) => [key, relative(file)])),
    steps
  };
}

function runCommand(id, command, commandArgs, env) {
  if (dryRun) {
    return reportStep(id, "DRY_RUN", {
      command: [command, ...commandArgs].join(" ")
    });
  }
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 900_000
  });
  return reportStep(id, commandStatus(result), {
    command: [command, ...commandArgs].join(" "),
    exitCode: result.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    outputTail: tail(`${result.stdout}\n${result.stderr}`)
  });
}

function missingEnvStep(id, requiredInputs) {
  return reportStep(id, dryRun ? "DRY_RUN" : "USER_ACTION_REQUIRED", { requiredInputs });
}

function existingEvidenceEnv(env) {
  const next = { ...env };
  for (const [key, file] of [
    ["JOB_SPRINT_SERVER_SYNC_EVIDENCE", evidenceDefaults.serverSync],
    ["JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE", evidenceDefaults.serverRemote],
    ["JOB_SPRINT_ANDROID_REMOTE_ACCEPTANCE_EVIDENCE", evidenceDefaults.androidRemote],
    ["JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE", evidenceDefaults.androidRelease]
  ]) {
    if (!envValue(key, next) && fs.existsSync(path.resolve(root, file))) {
      next[key] = file;
    }
  }
  return next;
}

function strictFinalReportValidationEnv(env, reportDestination) {
  const next = existingEvidenceEnv(env);
  next.JOB_SPRINT_FINAL_DELIVERY_REPORT = reportDestination.absolute;
  next.JOB_SPRINT_FINAL_DELIVERY_POST_VALIDATION_IN_PROGRESS = "1";
  delete next.JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS;
  return next;
}

function run() {
  let loaded;
  try {
    loaded = loadDeliveryEnvFile(root, process.env, args);
  } catch (error) {
    const reportDestination = resolveFinalDeliveryReport(process.env);
    const report = finalDeliveryReport(reportDestination, [
      reportStep("preflight", "FAIL", {
        envFile: envFileErrorInfo(error),
        requiredInputs: [
          "Pass --delivery-env-file as a path outside this git repository.",
          "Keep secrets out of committed files."
        ]
      })
    ]);
    writeFinalDeliveryReport(report, reportDestination);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const env = evidenceEnv(loaded.env);
  const reportDestination = resolveFinalDeliveryReport(env);
  const steps = [];

  steps.push(finalDeliveryPreflight(env, loaded.info));
  steps.push(runCommand("release_gate", "npm", ["run", "test:release"], env));

  if (hasAllEnv(env, ["JOB_SPRINT_DEPLOY_HOST", "JOB_SPRINT_DEPLOY_USER", "JOB_SPRINT_DEPLOY_PATH"])) {
    steps.push(runCommand("server_sync_evidence", "npm", ["run", "write:server-sync-evidence"], env));
  } else {
    steps.push(missingEnvStep("server_sync_evidence", [
      "Set JOB_SPRINT_DEPLOY_HOST, JOB_SPRINT_DEPLOY_USER, and JOB_SPRINT_DEPLOY_PATH.",
      "Configure SSH key/agent access outside this repository."
    ]));
  }

  if (
    hasAnyEnv(env, ["JOB_SPRINT_REMOTE_BASE_URL", "JOB_SPRINT_PUBLIC_BASE_URL", "JOB_SPRINT_DELIVERY_BASE_URL"])
    && envValue("JOB_SPRINT_AUTH_USER", env)
    && (envValue("JOB_SPRINT_AUTH_PASSWORD", env) || envValue("JOB_SPRINT_AUTH_PASS", env))
  ) {
    steps.push(runCommand("server_remote_acceptance", "npm", ["run", "write:remote-evidence"], env));
  } else {
    steps.push(missingEnvStep("server_remote_acceptance", [
      "Set JOB_SPRINT_REMOTE_BASE_URL or JOB_SPRINT_PUBLIC_BASE_URL.",
      "Set JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS."
    ]));
  }

  if (
    hasAnyEnv(env, [
      "JOB_SPRINT_ANDROID_WEBVIEW_URL",
      "JOB_SPRINT_ANDROID_REMOTE_BASE_URL",
      "JOB_SPRINT_REMOTE_BASE_URL",
      "JOB_SPRINT_PUBLIC_BASE_URL",
      "JOB_SPRINT_DELIVERY_BASE_URL"
    ])
    && envValue("JOB_SPRINT_AUTH_USER", env)
    && (envValue("JOB_SPRINT_AUTH_PASSWORD", env) || envValue("JOB_SPRINT_AUTH_PASS", env))
  ) {
    steps.push(runCommandWithRetries(runCommand, "android_remote_acceptance", "npm", ["run", "test:android:remote:functional"], env, { maxAttempts: 2 }));
  } else {
    steps.push(missingEnvStep("android_remote_acceptance", [
      "Set JOB_SPRINT_ANDROID_WEBVIEW_URL or a remote base URL.",
      "Set JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS.",
      "Connect an Android device before running the remote functional test."
    ]));
  }

  if (hasAllEnv(env, [
    "JOB_SPRINT_ANDROID_KEYSTORE",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD",
    "JOB_SPRINT_ANDROID_KEY_ALIAS",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
  ])) {
    steps.push(runCommand("android_formal_release", "npm", ["run", "build:android:release"], env));
  } else {
    steps.push(missingEnvStep("android_formal_release", [
      "Set stable formal release signing env: JOB_SPRINT_ANDROID_KEYSTORE, STORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD, and RELEASE_CERT_SHA256.",
      "Keep keystore and passwords outside the git repository."
    ]));
  }

  const readinessEnv = existingEvidenceEnv(env);
  const finalReadinessArgs = ["run", "validate:delivery"];
  if (reportDestination) {
    readinessEnv.JOB_SPRINT_FINAL_DELIVERY_REPORT = reportDestination.absolute;
    readinessEnv.JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS = "1";
    finalReadinessArgs.push("--", "--defer-final-delivery-report");
  }
  if (argSet.has("--allow-dirty")) {
    if (!finalReadinessArgs.includes("--")) finalReadinessArgs.push("--");
    finalReadinessArgs.push("--allow-dirty");
  }
  steps.push(runCommand("final_readiness", "npm", finalReadinessArgs, readinessEnv));

  let report = finalDeliveryReport(reportDestination, steps);
  writeFinalDeliveryReport(report, reportDestination);

  if (!dryRun && reportDestination && (report.status === "PASS" || report.status === "PASS_WITH_LIMITS")) {
    steps.push(runCommand(
      "post_final_report_validation",
      "npm",
      ["run", "validate:delivery", "--", "--defer-post-final-report-validation", ...(argSet.has("--allow-dirty") ? ["--allow-dirty"] : [])],
      strictFinalReportValidationEnv(env, reportDestination)
    ));
    report = finalDeliveryReport(reportDestination, steps);
    writeFinalDeliveryReport(report, reportDestination);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === "PASS" || report.status === "PASS_WITH_LIMITS" || report.status === "DRY_RUN" ? 0 : (report.status === "USER_ACTION_REQUIRED" ? 2 : 1);
}

run();

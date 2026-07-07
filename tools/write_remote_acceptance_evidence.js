#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let effectiveEnv = process.env;
let envFileInfo = null;

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function envValue(name) {
  const value = effectiveEnv[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function loadEffectiveEnv() {
  try {
    const loaded = loadDeliveryEnvFile(root, process.env, args);
    effectiveEnv = loaded.env;
    envFileInfo = loaded.info;
    return true;
  } catch (error) {
    writeReport({
      status: "FAIL",
      reason: "delivery_env_file_error",
      envFile: envFileErrorInfo(error),
      requiredInputs: [
        "Pass --delivery-env-file as a path outside this git repository.",
        "Keep secrets out of committed files."
      ]
    }, 1);
    return false;
  }
}

function relative(file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-40);
}

function writeReport(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE");
  const withEnvFile = envFileInfo && envFileInfo.configured ? { envFile: envFileInfo, ...report } : report;
  const serialized = `${JSON.stringify(withEnvFile, null, 2)}\n`;
  if (reportPath) {
    const absoluteReportPath = path.resolve(root, reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, serialized);
  }
  process.stdout.write(serialized);
  process.exitCode = exitCode;
}

if (!loadEffectiveEnv()) {
  process.exit();
}

const baseUrl = argValue("--remote-url")
  || envValue("JOB_SPRINT_REMOTE_BASE_URL")
  || envValue("JOB_SPRINT_PUBLIC_BASE_URL")
  || envValue("JOB_SPRINT_DELIVERY_BASE_URL");
const user = envValue("JOB_SPRINT_AUTH_USER");
const password = envValue("JOB_SPRINT_AUTH_PASSWORD") || envValue("JOB_SPRINT_AUTH_PASS");

if (!baseUrl || !user || !password) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: !baseUrl ? "remote_base_url_missing" : "remote_auth_env_missing",
    requiredInputs: [
      "Set JOB_SPRINT_REMOTE_BASE_URL or pass --remote-url.",
      "Set JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS for authenticated acceptance."
    ]
  }, 2);
  process.exit();
}

const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const script = normalizedBaseUrl.startsWith("https://")
  ? path.join(root, "tools", "remote_https_job_sprint_check.sh")
  : path.join(root, "tools", "remote_job_sprint_check.sh");
const result = spawnSync("bash", [script, normalizedBaseUrl], {
  cwd: root,
  env: effectiveEnv,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 90_000
});
const outputLines = tail(`${result.stdout}\n${result.stderr}`);
const status = result.status === 0 ? "PASS" : "FAIL";

writeReport({
  status,
  baseUrl: normalizedBaseUrl,
  script: relative(script),
  checkedAt: new Date().toISOString(),
  outputLines
}, status === "PASS" ? 0 : 1);

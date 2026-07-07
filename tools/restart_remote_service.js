#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
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

function expandHome(file) {
  if (!file) return null;
  if (file === "~") return os.homedir();
  if (file.startsWith("~/")) return path.join(os.homedir(), file.slice(2));
  return file;
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-40);
}

function writeReport(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_SERVICE_RESTART_EVIDENCE");
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

function run(command, commandArgs, timeoutMs = 90_000) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

if (!loadEffectiveEnv()) {
  process.exit();
}

const host = argValue("--host") || envValue("JOB_SPRINT_DEPLOY_HOST");
const user = argValue("--user") || envValue("JOB_SPRINT_DEPLOY_USER");
const remoteDir = argValue("--remote-dir") || envValue("JOB_SPRINT_DEPLOY_PATH");
const service = argValue("--service") || envValue("JOB_SPRINT_SERVICE_NAME") || "job-sprint.service";
const port = argValue("--port") || envValue("JOB_SPRINT_DEPLOY_PORT");
const identityFile = expandHome(argValue("--identity-file") || envValue("JOB_SPRINT_DEPLOY_SSH_KEY") || envValue("JOB_SPRINT_SSH_KEY"));
const missing = [];
if (!host) missing.push("JOB_SPRINT_DEPLOY_HOST");
if (!user) missing.push("JOB_SPRINT_DEPLOY_USER");
if (!remoteDir) missing.push("JOB_SPRINT_DEPLOY_PATH");

if (missing.length) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "remote_service_restart_inputs_missing",
    missing,
    requiredInputs: [
      "Set JOB_SPRINT_DEPLOY_HOST, JOB_SPRINT_DEPLOY_USER, and JOB_SPRINT_DEPLOY_PATH.",
      "Configure SSH key/agent access outside this repository.",
      "Run npm run write:server-sync-evidence before restarting the remote service."
    ]
  }, 2);
  process.exit();
}

if (identityFile && (!fs.existsSync(identityFile) || !fs.statSync(identityFile).isFile())) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "remote_service_restart_identity_file_missing",
    identityFileConfigured: true,
    requiredInputs: [
      "Set JOB_SPRINT_DEPLOY_SSH_KEY or --identity-file to a readable private key outside this repository.",
      "Configure SSH key/agent access outside this repository."
    ]
  }, 2);
  process.exit();
}

const localManifestPath = path.join(root, "dist", "server-delivery", "server-delivery-manifest.json");
const localManifestSha256 = fs.existsSync(localManifestPath) ? sha256(localManifestPath) : null;
const sshArgs = [];
if (identityFile) sshArgs.push("-i", identityFile);
if (port) sshArgs.push("-p", port);
sshArgs.push("-o", "StrictHostKeyChecking=no");
const sshTarget = `${user}@${host}`;
const remoteManifest = `${remoteDir.replace(/\/+$/, "")}/server-delivery-manifest.json`;
const remoteBinary = `${remoteDir.replace(/\/+$/, "")}/bin/job-sprint-api`;
const restartScript = [
  `test -f ${shellQuote(remoteManifest)}`,
  `test -x ${shellQuote(remoteBinary)}`,
  `sudo systemctl restart ${shellQuote(service)}`,
  "sleep 2",
  `systemctl is-active ${shellQuote(service)}`,
  `(command -v shasum >/dev/null 2>&1 && shasum -a 256 ${shellQuote(remoteManifest)} || sha256sum ${shellQuote(remoteManifest)}) | awk '{print $1}'`
].join(" && ");
const restart = run("ssh", [...sshArgs, sshTarget, restartScript]);
const outputLines = tail(`${restart.stdout}\n${restart.stderr}`);
const remoteManifestSha256 = outputLines.find((line) => /^[a-f0-9]{64}$/i.test(line)) || null;
const serviceActive = outputLines.includes("active");
const manifestMatches = localManifestSha256 ? remoteManifestSha256 === localManifestSha256 : Boolean(remoteManifestSha256);
const status = restart.status === 0 && serviceActive && manifestMatches ? "PASS" : "FAIL";

writeReport({
  status,
  checkedAt: new Date().toISOString(),
  service,
  target: {
    host,
    user,
    remoteDir,
    identityFileConfigured: Boolean(identityFile),
    portConfigured: Boolean(port)
  },
  localManifestSha256,
  remoteManifestSha256,
  outputLines: status === "PASS"
    ? [
      `systemctl restart ${service} completed successfully.`,
      `systemctl is-active ${service} returned active.`,
      "remote server-delivery manifest SHA-256 read after restart.",
      ...(remoteManifestSha256 ? [remoteManifestSha256] : [])
    ]
    : outputLines
}, status === "PASS" ? 0 : 1);

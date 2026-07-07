#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);
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

function relative(file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-60);
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeReport(report, exitCode) {
  const withEnvFile = envFileInfo && envFileInfo.configured ? { envFile: envFileInfo, ...report } : report;
  process.stdout.write(`${JSON.stringify(withEnvFile, null, 2)}\n`);
  process.exitCode = exitCode;
}

function run(command, commandArgs, timeoutMs = 120_000) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024
  });
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

function sshArgs() {
  const port = argValue("--port") || envValue("JOB_SPRINT_DEPLOY_PORT");
  const identityFile = expandHome(argValue("--identity-file") || envValue("JOB_SPRINT_DEPLOY_SSH_KEY") || envValue("JOB_SPRINT_SSH_KEY"));
  const result = [];
  if (identityFile) result.push("-i", identityFile);
  if (port) result.push("-p", port);
  result.push("-o", "StrictHostKeyChecking=no");
  return result;
}

function sshTransport() {
  const parts = ["ssh"];
  const port = argValue("--port") || envValue("JOB_SPRINT_DEPLOY_PORT");
  const identityFile = expandHome(argValue("--identity-file") || envValue("JOB_SPRINT_DEPLOY_SSH_KEY") || envValue("JOB_SPRINT_SSH_KEY"));
  if (identityFile) parts.push("-i", shellQuote(identityFile));
  if (port) parts.push("-p", shellQuote(port));
  parts.push("-o", "StrictHostKeyChecking=no");
  return parts.join(" ");
}

function binaryDescription(file) {
  const result = run("file", [file], 10_000);
  return result.status === 0 ? result.stdout.trim() : null;
}

function isLinuxElf(description) {
  return /\bELF\b/.test(String(description || ""))
    && /\bx86-64\b/.test(String(description || ""))
    && /Linux|GNU\/Linux|SYSV/.test(String(description || ""));
}

if (!loadEffectiveEnv()) {
  process.exit();
}

const host = argValue("--host") || envValue("JOB_SPRINT_DEPLOY_HOST");
const user = argValue("--user") || envValue("JOB_SPRINT_DEPLOY_USER");
const remoteDirInput = argValue("--remote-build-dir")
  || envValue("JOB_SPRINT_REMOTE_RUST_BUILD_DIR")
  || "~/.cache/job-sprint-linux-build/rust-api";
const installRemoteDeps = argSet.has("--install-remote-deps");
const localBinary = path.join(root, "apps", "rust-api", "target", "release", "job-sprint-api");
const sourceDir = path.join(root, "apps", "rust-api") + path.sep;
const missing = [];
if (!host) missing.push("JOB_SPRINT_DEPLOY_HOST");
if (!user) missing.push("JOB_SPRINT_DEPLOY_USER");
if (missing.length) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "remote_linux_build_inputs_missing",
    missing,
    requiredInputs: [
      "Set JOB_SPRINT_DEPLOY_HOST and JOB_SPRINT_DEPLOY_USER in a delivery env file.",
      "Pass --delivery-env-file /path/outside-repo/job-sprint-delivery.env."
    ]
  }, 2);
  process.exit();
}

const remoteDir = remoteDirInput.startsWith("~/")
  ? `/home/${user}/${remoteDirInput.slice(2)}`
  : remoteDirInput;
const sshTarget = `${user}@${host}`;
const mkdirResult = run("ssh", [...sshArgs(), sshTarget, `mkdir -p ${shellQuote(remoteDir)}`], 30_000);
if (mkdirResult.status !== 0) {
  writeReport({
    status: "FAIL",
    reason: "remote_linux_build_mkdir_failed",
    remoteBuildDir: remoteDir,
    outputLines: tail(`${mkdirResult.stdout}\n${mkdirResult.stderr}`)
  }, 1);
  process.exit();
}

const rsyncResult = run("rsync", [
  "-az",
  "--delete",
  "--exclude", "target",
  "-e", sshTransport(),
  sourceDir,
  `${sshTarget}:${remoteDir.replace(/\/+$/, "")}/`
], 120_000);
if (rsyncResult.status !== 0) {
  writeReport({
    status: "FAIL",
    reason: "remote_linux_build_rsync_failed",
    remoteBuildDir: remoteDir,
    outputLines: tail(`${rsyncResult.stdout}\n${rsyncResult.stderr}`)
  }, 1);
  process.exit();
}

const installMode = installRemoteDeps ? "1" : "0";
const remoteScript = `
set -euo pipefail
BUILD_DIR=${shellQuote(remoteDir)}
INSTALL_DEPS=${shellQuote(installMode)}
if [ "$INSTALL_DEPS" = "1" ]; then
  if ! command -v pkg-config >/dev/null 2>&1 || ! dpkg -s libsqlite3-dev >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl build-essential pkg-config libsqlite3-dev
  fi
  if ! command -v cargo >/dev/null 2>&1; then
    curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
  fi
fi
if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi
command -v cargo >/dev/null 2>&1 || { echo "missing cargo; rerun with --install-remote-deps" >&2; exit 42; }
command -v pkg-config >/dev/null 2>&1 || { echo "missing pkg-config; rerun with --install-remote-deps" >&2; exit 43; }
dpkg -s libsqlite3-dev >/dev/null 2>&1 || { echo "missing libsqlite3-dev; rerun with --install-remote-deps" >&2; exit 44; }
cd "$BUILD_DIR"
cargo build --release
file target/release/job-sprint-api
file target/release/job-sprint-api | grep -Eq 'ELF.*x86-64.*(Linux|GNU/Linux|SYSV)'
sha256sum target/release/job-sprint-api
`;

const buildResult = run("ssh", [...sshArgs(), sshTarget, `bash -lc ${shellQuote(remoteScript)}`], 900_000);
if (buildResult.status !== 0) {
  const buildOutput = `${buildResult.stdout}\n${buildResult.stderr}`;
  const dependencyMissing = /missing (cargo|pkg-config|libsqlite3-dev); rerun with --install-remote-deps/.test(buildOutput);
  writeReport({
    status: dependencyMissing ? "USER_ACTION_REQUIRED" : "FAIL",
    reason: "remote_linux_build_failed",
    remoteBuildDir: remoteDir,
    installRemoteDeps,
    outputLines: tail(buildOutput),
    requiredInputs: installRemoteDeps ? undefined : [
      "Rerun with --install-remote-deps to install the minimal remote Rust and SQLite build dependencies.",
      "Or preinstall cargo, pkg-config, and libsqlite3-dev on the remote host."
    ]
  }, dependencyMissing ? 2 : 1);
  process.exit();
}

fs.mkdirSync(path.dirname(localBinary), { recursive: true });
const scpResult = run("scp", [
  ...sshArgs(),
  `${sshTarget}:${remoteDir.replace(/\/+$/, "")}/target/release/job-sprint-api`,
  localBinary
], 120_000);
if (scpResult.status !== 0) {
  writeReport({
    status: "FAIL",
    reason: "remote_linux_build_download_failed",
    outputLines: tail(`${scpResult.stdout}\n${scpResult.stderr}`)
  }, 1);
  process.exit();
}
fs.chmodSync(localBinary, 0o755);

const description = binaryDescription(localBinary);
if (!isLinuxElf(description)) {
  writeReport({
    status: "FAIL",
    reason: "downloaded_binary_not_linux_elf",
    binary: relative(localBinary),
    binaryDescription: description
  }, 1);
  process.exit();
}

writeReport({
  status: "PASS",
  binary: relative(localBinary),
  binaryDescription: description,
  sha256: fileSha256(localBinary),
  remoteBuildDir: remoteDir,
  outputLines: tail(buildResult.stdout)
}, 0);

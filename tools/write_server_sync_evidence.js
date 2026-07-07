#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const packageRoot = path.join(root, "dist", "server-delivery");
const manifestPath = path.join(packageRoot, "server-delivery-manifest.json");
const packagedBinaryPath = path.join(packageRoot, "bin", "job-sprint-api");
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
  if (!file) {
    return null;
  }
  if (file === "~") {
    return os.homedir();
  }
  if (file.startsWith("~/")) {
    return path.join(os.homedir(), file.slice(2));
  }
  return file;
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

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-40);
}

function writeReport(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_SERVER_SYNC_EVIDENCE");
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

function run(command, commandArgs, timeoutMs = 120_000) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs
  });
}

function binaryFileDescription(file) {
  const result = spawnSync("file", [file], {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000
  });
  if (result.status !== 0) {
    return {
      ok: false,
      reason: "file_command_failed",
      outputLines: tail(`${result.stdout}\n${result.stderr}`)
    };
  }
  return { ok: true, description: result.stdout.trim() };
}

function isLinuxElf(description) {
  return /\bELF\b/.test(description)
    && /\bx86-64\b/.test(description)
    && /Linux|GNU\/Linux|SYSV/.test(description);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

if (!loadEffectiveEnv()) {
  process.exit();
}

const host = argValue("--host") || envValue("JOB_SPRINT_DEPLOY_HOST");
const user = argValue("--user") || envValue("JOB_SPRINT_DEPLOY_USER");
const remoteDir = argValue("--remote-dir") || envValue("JOB_SPRINT_DEPLOY_PATH");
const port = argValue("--port") || envValue("JOB_SPRINT_DEPLOY_PORT");
const identityFile = expandHome(argValue("--identity-file") || envValue("JOB_SPRINT_DEPLOY_SSH_KEY") || envValue("JOB_SPRINT_SSH_KEY"));
const sshTarget = user && host ? `${user}@${host}` : null;
const remoteManifest = remoteDir ? `${remoteDir.replace(/\/+$/, "")}/server-delivery-manifest.json` : null;
const missing = [];
if (!host) missing.push("JOB_SPRINT_DEPLOY_HOST");
if (!user) missing.push("JOB_SPRINT_DEPLOY_USER");
if (!remoteDir) missing.push("JOB_SPRINT_DEPLOY_PATH");

if (missing.length) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "server_sync_inputs_missing",
    missing,
    requiredInputs: [
      "Set JOB_SPRINT_DEPLOY_HOST, JOB_SPRINT_DEPLOY_USER, and JOB_SPRINT_DEPLOY_PATH.",
      "Configure SSH key/agent access outside this repository.",
      "Run npm run build:server-delivery before syncing."
    ]
  }, 2);
  process.exit();
}

if (identityFile && (!fs.existsSync(identityFile) || !fs.statSync(identityFile).isFile())) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "server_sync_identity_file_missing",
    identityFileConfigured: true,
    requiredInputs: [
      "Set JOB_SPRINT_DEPLOY_SSH_KEY or --identity-file to a readable private key outside this repository.",
      "Configure SSH key/agent access outside this repository."
    ]
  }, 2);
  process.exit();
}

if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "server_delivery_manifest_missing",
    missing: relative(manifestPath),
    requiredInputs: [
      "Run npm run build:server-delivery before syncing."
    ]
  }, 2);
  process.exit();
}

if (!fs.existsSync(packagedBinaryPath) || !fs.statSync(packagedBinaryPath).isFile()) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "server_delivery_binary_missing",
    missing: relative(packagedBinaryPath),
    requiredInputs: [
      "Run npm run build:server-delivery before syncing.",
      "Ensure dist/server-delivery/bin/job-sprint-api exists before server sync."
    ]
  }, 2);
  process.exit();
}

const localBinaryType = binaryFileDescription(packagedBinaryPath);
if (!localBinaryType.ok || !isLinuxElf(localBinaryType.description)) {
  writeReport({
    status: "FAIL",
    reason: "server_sync_local_binary_not_linux_elf",
    localBinary: relative(packagedBinaryPath),
    binaryDescription: localBinaryType.description || null,
    outputLines: localBinaryType.outputLines || [],
    requiredInputs: [
      "Build or provide a Linux x86_64 release binary before syncing to the Linux server.",
      "Do not sync a macOS Mach-O binary as dist/server-delivery/bin/job-sprint-api."
    ]
  }, 1);
  process.exit();
}

const sshArgs = [];
if (identityFile) sshArgs.push("-i", identityFile);
if (port) sshArgs.push("-p", port);
sshArgs.push("-o", "StrictHostKeyChecking=no");
const protectedRsyncPaths = ["/shared/***"];
const rsyncArgs = ["-az", "--delete"];
for (const protectedPath of protectedRsyncPaths) {
  rsyncArgs.push("--exclude", protectedPath);
}
const sshTransport = ["ssh"];
if (identityFile) sshTransport.push("-i", shellQuote(identityFile));
if (port) sshTransport.push("-p", shellQuote(port));
sshTransport.push("-o", "StrictHostKeyChecking=no");
if (identityFile || port) rsyncArgs.push("-e", sshTransport.join(" "));
rsyncArgs.push(`${packageRoot.replace(/\/+$/, "")}/`, `${sshTarget}:${remoteDir.replace(/\/+$/, "")}/`);

const rsync = run("rsync", rsyncArgs, 180_000);
if (rsync.status !== 0) {
  writeReport({
    status: "FAIL",
    reason: "server_sync_rsync_failed",
    target: {
      host,
      user,
      remoteDir,
      identityFileConfigured: Boolean(identityFile)
    },
    localManifest: relative(manifestPath),
    localManifestSha256: fileSha256(manifestPath),
    outputLines: tail(`${rsync.stdout}\n${rsync.stderr}`)
  }, 1);
  process.exit();
}

const verifyScript = [
  `test -f ${shellQuote(remoteManifest)}`,
  `test -x ${shellQuote(`${remoteDir.replace(/\/+$/, "")}/bin/job-sprint-api`)}`,
  `file ${shellQuote(`${remoteDir.replace(/\/+$/, "")}/bin/job-sprint-api`)}`,
  `file ${shellQuote(`${remoteDir.replace(/\/+$/, "")}/bin/job-sprint-api`)} | grep -Eq 'ELF.*x86-64.*(Linux|GNU/Linux|SYSV)'`,
  `(command -v shasum >/dev/null 2>&1 && shasum -a 256 ${shellQuote(remoteManifest)} || sha256sum ${shellQuote(remoteManifest)}) | awk '{print $1}'`
].join(" && ");
const verify = run("ssh", [...sshArgs, sshTarget, verifyScript], 120_000);
const outputLines = tail(`${rsync.stdout}\n${rsync.stderr}\n${verify.stdout}\n${verify.stderr}`);
const remoteManifestSha256 = outputLines.find((line) => /^[a-f0-9]{64}$/i.test(line)) || null;
const localManifestSha256 = fileSha256(manifestPath);

if (verify.status !== 0 || remoteManifestSha256 !== localManifestSha256) {
  writeReport({
    status: "FAIL",
    reason: verify.status !== 0 ? "server_sync_remote_verify_failed" : "server_sync_manifest_sha256_mismatch",
    target: {
      host,
      user,
      remoteDir,
      identityFileConfigured: Boolean(identityFile)
    },
    localManifest: relative(manifestPath),
    localManifestSha256,
    remoteManifestSha256,
    outputLines
  }, 1);
  process.exit();
}

writeReport({
  status: "PASS",
  syncedAt: new Date().toISOString(),
  target: {
    host,
    user,
    remoteDir,
    identityFileConfigured: Boolean(identityFile)
  },
  localPackageRoot: relative(packageRoot),
  localManifest: relative(manifestPath),
  localManifestSha256,
  remoteManifest,
  remoteManifestSha256,
  protectedRsyncPaths,
  outputLines: [
    "OK server delivery rsync",
    "OK server delivery remote manifest sha256",
    ...outputLines
  ]
}, 0);

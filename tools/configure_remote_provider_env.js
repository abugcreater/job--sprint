#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const providerKeys = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_INPUT_COST_PER_MILLION",
  "ANTHROPIC_OUTPUT_COST_PER_MILLION",
  "AI_PROVIDER_TIMEOUT_MS"
];
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
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_PROVIDER_CONFIG_EVIDENCE");
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

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: options.timeoutMs || 120_000,
    input: options.input || undefined
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
      requiredInputs: ["Pass --delivery-env-file as a path outside this git repository."]
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

function envLine(key, value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `Environment="${key}=${escaped}"`;
}

function providerConfigContent() {
  const configured = providerKeys.filter((key) => envValue(key));
  return [
    "[Service]",
    ...configured.map((key) => envLine(key, envValue(key))),
    ""
  ].join("\n");
}

if (!loadEffectiveEnv()) process.exit();

const host = argValue("--host") || envValue("JOB_SPRINT_DEPLOY_HOST");
const user = argValue("--user") || envValue("JOB_SPRINT_DEPLOY_USER");
const service = argValue("--service") || envValue("JOB_SPRINT_SERVICE_NAME") || "job-sprint.service";
const required = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"];
const missing = [];
if (!host) missing.push("JOB_SPRINT_DEPLOY_HOST");
if (!user) missing.push("JOB_SPRINT_DEPLOY_USER");
for (const key of required) {
  if (!envValue(key)) missing.push(key);
}
if (missing.length) {
  writeReport({
    status: "USER_ACTION_REQUIRED",
    reason: "remote_provider_config_inputs_missing",
    missing,
    configuredProviderKeys: providerKeys.filter((key) => envValue(key)),
    requiredInputs: [
      "Add ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN to the delivery env file outside this repository.",
      "Optionally add ANTHROPIC_MODEL, token price envs, and AI_PROVIDER_TIMEOUT_MS.",
      "Rerun npm run configure:remote-provider -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env."
    ]
  }, 2);
  process.exit();
}

const sshTarget = `${user}@${host}`;
const directory = `/etc/systemd/system/${service}.d`;
const file = `${directory}/20-ai-provider.conf`;
const mkdir = run("ssh", [...sshArgs(), sshTarget, `sudo mkdir -p ${directory}`], { timeoutMs: 30_000 });
if (mkdir.status !== 0) {
  writeReport({ status: "FAIL", reason: "remote_provider_mkdir_failed", outputLines: tail(`${mkdir.stdout}\n${mkdir.stderr}`) }, 1);
  process.exit();
}
const write = run("ssh", [...sshArgs(), sshTarget, `sudo tee ${file} >/dev/null`], {
  input: providerConfigContent(),
  timeoutMs: 30_000
});
if (write.status !== 0) {
  writeReport({ status: "FAIL", reason: "remote_provider_write_failed", outputLines: tail(`${write.stdout}\n${write.stderr}`) }, 1);
  process.exit();
}
const restart = run("ssh", [...sshArgs(), sshTarget, `sudo systemctl daemon-reload && sudo systemctl restart ${service} && sleep 2 && systemctl is-active ${service}`], { timeoutMs: 60_000 });
if (restart.status !== 0 || !String(restart.stdout).includes("active")) {
  writeReport({ status: "FAIL", reason: "remote_provider_restart_failed", outputLines: tail(`${restart.stdout}\n${restart.stderr}`) }, 1);
  process.exit();
}
const verifyScript = providerKeys.map((key) => `systemctl show ${service} -p Environment --value | tr ' ' '\\n' | grep -q '^${key}=' && echo '${key}=configured' || echo '${key}=missing'`).join("\n");
const verify = run("ssh", [...sshArgs(), sshTarget, `bash -lc ${JSON.stringify(verifyScript)}`], { timeoutMs: 30_000 });
const configuredRemoteKeys = String(verify.stdout || "")
  .split(/\r?\n/)
  .filter((line) => line.endsWith("=configured"))
  .map((line) => line.split("=")[0])
  .sort();
writeReport({
  status: "PASS",
  service,
  dropInConfigured: true,
  remoteProviderKeysConfigured: configuredRemoteKeys,
  requiredProviderKeysConfigured: required.every((key) => configuredRemoteKeys.includes(key)),
  notes: [
    "Provider values were written to a systemd drop-in without printing secrets.",
    "The service was daemon-reloaded and restarted.",
    "Run npm run write:remote-coach-evidence to verify provider behavior and llm_runs metrics."
  ]
}, 0);

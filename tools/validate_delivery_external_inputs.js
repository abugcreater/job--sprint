#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");
const { defaultDeliveryEnvFile, deliveryCommands } = require("./delivery_action_commands");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);

function argValue(name, inputArgs = args) {
  const index = inputArgs.indexOf(name);
  return index === -1 ? null : inputArgs[index + 1] || null;
}

function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function expandHome(file) {
  if (!file) return null;
  if (file === "~") return os.homedir();
  if (file.startsWith("~/")) return path.join(os.homedir(), file.slice(2));
  return file;
}

function hasAnyEnv(env, names) {
  return names.some((name) => Boolean(envValue(env, name)));
}

function commandAvailable(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000
  });
  return result.status === 0 && Boolean(String(result.stdout || "").trim());
}

function isInsideRepository(root, file) {
  const rel = path.relative(root, path.resolve(root, file));
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function displayPath(root, file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function validUrl(value) {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(String(value || ""));
}

function envGroup(env, names) {
  const configured = names.filter((name) => Boolean(envValue(env, name)));
  const missing = names.filter((name) => !envValue(env, name));
  return { configured, missing };
}

function toolGroup(names, options) {
  const commandExists = options.commandExists || commandAvailable;
  return names.map((command) => ({
    command,
    available: Boolean(commandExists(command))
  }));
}

function statusFromProblems(problems, limitOnly = false) {
  if (problems.length) {
    return limitOnly ? "PASS_WITH_LIMITS" : "USER_ACTION_REQUIRED";
  }
  return "PASS";
}

function serverSyncInputs(env, options) {
  const group = envGroup(env, ["JOB_SPRINT_DEPLOY_HOST", "JOB_SPRINT_DEPLOY_USER", "JOB_SPRINT_DEPLOY_PATH"]);
  const tools = toolGroup(["ssh", "rsync"], options);
  const missingTools = tools.filter((tool) => !tool.available).map((tool) => tool.command);
  const sshKey = expandHome(envValue(env, "JOB_SPRINT_DEPLOY_SSH_KEY") || envValue(env, "JOB_SPRINT_SSH_KEY"));
  const sshKeyMissing = sshKey && (!fs.existsSync(sshKey) || !fs.statSync(sshKey).isFile());
  const problems = [
    ...group.missing.map((name) => `missing_env:${name}`),
    ...missingTools.map((name) => `missing_tool:${name}`),
    ...(sshKeyMissing ? ["missing_ssh_key_file"] : [])
  ];
  return {
    id: "server_sync_inputs",
    status: statusFromProblems(problems),
    configured: group.configured,
    missing: group.missing,
    sshKeyConfigured: Boolean(sshKey),
    sshKeyReadable: sshKey ? !sshKeyMissing : null,
    portConfigured: Boolean(envValue(env, "JOB_SPRINT_DEPLOY_PORT")),
    tools,
    requiredInputs: problems.length
      ? [
          `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_DEPLOY_HOST、JOB_SPRINT_DEPLOY_USER、JOB_SPRINT_DEPLOY_PATH，必要时填入 JOB_SPRINT_DEPLOY_SSH_KEY/JOB_SPRINT_DEPLOY_PORT 后运行 ${deliveryCommands.serverSync}。`,
          "Make ssh and rsync available locally.",
          "Configure SSH key or agent access outside this repository."
        ]
      : []
  };
}

function remoteBaseUrl(env, inputArgs) {
  return argValue("--remote-url", inputArgs)
    || envValue(env, "JOB_SPRINT_REMOTE_BASE_URL")
    || envValue(env, "JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue(env, "JOB_SPRINT_DELIVERY_BASE_URL");
}

function serverRemoteInputs(env, inputArgs) {
  const baseUrl = remoteBaseUrl(env, inputArgs);
  const userConfigured = Boolean(envValue(env, "JOB_SPRINT_AUTH_USER"));
  const passwordConfigured = Boolean(envValue(env, "JOB_SPRINT_AUTH_PASSWORD") || envValue(env, "JOB_SPRINT_AUTH_PASS"));
  const problems = [];
  const limits = [];
  if (!baseUrl) problems.push("missing_remote_base_url");
  if (baseUrl && !validUrl(baseUrl)) problems.push("invalid_remote_base_url");
  if (baseUrl && validUrl(baseUrl) && !isHttpsUrl(baseUrl)) limits.push("remote_base_url_not_https");
  if (!userConfigured) problems.push("missing_env:JOB_SPRINT_AUTH_USER");
  if (!passwordConfigured) problems.push("missing_env:JOB_SPRINT_AUTH_PASSWORD");
  return {
    id: "server_remote_inputs",
    status: problems.length ? "USER_ACTION_REQUIRED" : limits.length ? "PASS_WITH_LIMITS" : "PASS",
    baseUrlConfigured: Boolean(baseUrl),
    baseUrlScheme: baseUrl && validUrl(baseUrl) ? new URL(baseUrl).protocol.replace(":", "") : null,
    userConfigured,
    passwordConfigured,
    limits,
    requiredInputs: problems.length
      ? [
          `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_REMOTE_BASE_URL、JOB_SPRINT_AUTH_USER、JOB_SPRINT_AUTH_PASSWORD 后运行 ${deliveryCommands.serverRemote}。`
        ]
      : []
  };
}

function androidRemoteUrl(env, inputArgs) {
  return argValue("--android-remote-url", inputArgs)
    || envValue(env, "JOB_SPRINT_ANDROID_WEBVIEW_URL")
    || envValue(env, "JOB_SPRINT_ANDROID_REMOTE_BASE_URL")
    || remoteBaseUrl(env, inputArgs);
}

function androidRemoteInputs(env, inputArgs, options) {
  const webViewUrl = androidRemoteUrl(env, inputArgs);
  const userConfigured = Boolean(envValue(env, "JOB_SPRINT_AUTH_USER"));
  const passwordConfigured = Boolean(envValue(env, "JOB_SPRINT_AUTH_PASSWORD") || envValue(env, "JOB_SPRINT_AUTH_PASS"));
  const tools = toolGroup(["adb"], options);
  const problems = [];
  const limits = [];
  if (!webViewUrl) problems.push("missing_android_remote_url");
  if (webViewUrl && !validUrl(webViewUrl)) problems.push("invalid_android_remote_url");
  if (webViewUrl && validUrl(webViewUrl) && !isHttpsUrl(webViewUrl)) limits.push("android_remote_url_not_https");
  if (!userConfigured) problems.push("missing_env:JOB_SPRINT_AUTH_USER");
  if (!passwordConfigured) problems.push("missing_env:JOB_SPRINT_AUTH_PASSWORD");
  for (const tool of tools) {
    if (!tool.available) problems.push(`missing_tool:${tool.command}`);
  }
  return {
    id: "android_remote_inputs",
    status: problems.length ? "USER_ACTION_REQUIRED" : limits.length ? "PASS_WITH_LIMITS" : "PASS",
    webViewUrlConfigured: Boolean(webViewUrl),
    webViewUrlScheme: webViewUrl && validUrl(webViewUrl) ? new URL(webViewUrl).protocol.replace(":", "") : null,
    userConfigured,
    passwordConfigured,
    tools,
    limits,
    requiredInputs: problems.length
      ? [
          `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_ANDROID_WEBVIEW_URL、JOB_SPRINT_AUTH_USER、JOB_SPRINT_AUTH_PASSWORD 后连接 Android 真机并运行 ${deliveryCommands.androidRemote}。`,
          "Make adb available locally before running the remote functional test."
        ]
      : []
  };
}

function formalAndroidReleaseInputs(root, env, options) {
  const required = [
    "JOB_SPRINT_ANDROID_KEYSTORE",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD",
    "JOB_SPRINT_ANDROID_KEY_ALIAS",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
  ];
  const group = envGroup(env, required);
  const tools = toolGroup(["gradle"], options);
  const problems = group.missing.map((name) => `missing_env:${name}`);
  const keystore = envValue(env, "JOB_SPRINT_ANDROID_KEYSTORE");
  if (keystore) {
    if (!fs.existsSync(keystore) || !fs.statSync(keystore).isFile()) {
      problems.push("formal_release_keystore_file_missing");
    } else if (isInsideRepository(root, keystore)) {
      problems.push("formal_release_keystore_inside_repo");
    }
  }
  const cert = envValue(env, "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256");
  if (cert && !/^[a-f0-9: -]{64,95}$/i.test(cert)) {
    problems.push("formal_release_cert_sha256_invalid_format");
  }
  for (const tool of tools) {
    if (!tool.available) problems.push(`missing_tool:${tool.command}`);
  }
  return {
    id: "formal_android_release_inputs",
    status: statusFromProblems(problems),
    configured: group.configured,
    missing: group.missing,
    keystoreConfigured: Boolean(keystore),
    keystoreInsideRepository: Boolean(keystore && fs.existsSync(keystore) && isInsideRepository(root, keystore)),
    keystorePath: keystore && fs.existsSync(keystore) ? displayPath(root, keystore) : null,
    releaseCertPinned: Boolean(cert),
    tools,
    requiredInputs: problems.length
      ? [
          `如无既有长期 release keystore，可先运行 ${deliveryCommands.androidSigningInit} 在仓库外生成私有签名材料并写入私有 env。`,
          `在 ${defaultDeliveryEnvFile} 填入 JOB_SPRINT_ANDROID_KEYSTORE、JOB_SPRINT_ANDROID_STORE_PASSWORD、JOB_SPRINT_ANDROID_KEY_ALIAS、JOB_SPRINT_ANDROID_KEY_PASSWORD、JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256 后运行 ${deliveryCommands.formalRelease}。`,
          "Keep the release keystore and passwords outside the git repository.",
          "Make gradle available for formal APK build."
        ]
      : []
  };
}

function finalDeliveryReportInput(env, inputArgs) {
  const report = argValue("--report", inputArgs) || envValue(env, "JOB_SPRINT_FINAL_DELIVERY_REPORT");
  return {
    id: "final_delivery_report_input",
    status: report ? "PASS" : "PASS_WITH_LIMITS",
    reportConfigured: Boolean(report),
    reportPath: report || null,
    nextAction: report ? null : `Run ${deliveryCommands.finalDelivery}.`
  };
}

function validateDeliveryExternalInputs(root = repoRoot, env = process.env, options = {}) {
  const inputArgs = options.args || args;
  const checks = [
    serverSyncInputs(env, options),
    serverRemoteInputs(env, inputArgs),
    androidRemoteInputs(env, inputArgs, options),
    formalAndroidReleaseInputs(root, env, options),
    finalDeliveryReportInput(env, inputArgs)
  ];
  const needsUser = checks.some((check) => check.status === "USER_ACTION_REQUIRED");
  const hasLimits = checks.some((check) => check.status === "PASS_WITH_LIMITS");
  return {
    status: needsUser ? "USER_ACTION_REQUIRED" : hasLimits ? "PASS_WITH_LIMITS" : "PASS",
    envFile: options.envFileInfo || null,
    checks,
    nextActions: checks
      .filter((check) => check.requiredInputs && check.requiredInputs.length || check.nextAction)
      .map((check) => ({
        id: check.id,
        status: check.status,
        requiredInputs: check.requiredInputs || null,
        nextAction: check.nextAction || null
      }))
  };
}

function deliveryExternalInputsCheck(root = repoRoot, env = process.env, options = {}) {
  const report = validateDeliveryExternalInputs(root, env, options);
  const requiredInputs = report.nextActions.length
    ? Array.from(new Set(report.nextActions.flatMap((action) => action.requiredInputs || [action.nextAction]).filter(Boolean)))
    : [];
  return {
    id: "delivery_external_inputs",
    status: report.status,
    checks: report.checks,
    requiredInputs
  };
}

function printReport(report) {
  if (argSet.has("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log(`交付外部输入预检：${report.status}`);
  if (report.envFile && report.envFile.configured) {
    console.log(`- env_file: ${report.envFile.loaded ? "loaded" : report.envFile.error}`);
  }
  for (const check of report.checks) {
    console.log(`- ${check.id}: ${check.status}`);
  }
}

if (require.main === module) {
  let loaded;
  try {
    loaded = loadDeliveryEnvFile(repoRoot, process.env, args);
  } catch (error) {
    const report = {
      status: "FAIL",
      envFile: envFileErrorInfo(error),
      checks: [],
      nextActions: [
        {
          id: "delivery_env_file",
          status: "FAIL",
          requiredInputs: [
            "Pass --delivery-env-file as a path outside this git repository.",
            "Keep secrets out of committed files."
          ],
          nextAction: null
        }
      ]
    };
    printReport(report);
    process.exitCode = 1;
    return;
  }
  const report = validateDeliveryExternalInputs(repoRoot, loaded.env, { args, envFileInfo: loaded.info });
  printReport(report);
  if (report.status === "USER_ACTION_REQUIRED" && !argSet.has("--allow-user-action")) {
    process.exitCode = 2;
  } else if (report.status === "FAIL") {
    process.exitCode = 1;
  }
}

module.exports = {
  validateDeliveryExternalInputs,
  deliveryExternalInputsCheck,
  isInsideRepository
};

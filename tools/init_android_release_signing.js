#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { defaultDeliveryEnvFile, deliveryCommands } = require("./delivery_action_commands");
const { isInsideRepository } = require("./delivery_env_file");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);
const signingKeys = [
  "JOB_SPRINT_ANDROID_KEYSTORE",
  "JOB_SPRINT_ANDROID_STORE_PASSWORD",
  "JOB_SPRINT_ANDROID_KEY_ALIAS",
  "JOB_SPRINT_ANDROID_KEY_PASSWORD",
  "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
];

function argValue(name, inputArgs = args) {
  const index = inputArgs.indexOf(name);
  return index === -1 ? null : inputArgs[index + 1] || null;
}

function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function expandHome(file) {
  if (file === "~") return os.homedir();
  if (file.startsWith("~/")) return path.join(os.homedir(), file.slice(2));
  return file;
}

function absolutePath(root, file) {
  const expanded = expandHome(file);
  return path.isAbsolute(expanded) ? expanded : path.resolve(root, expanded);
}

function defaultKeystorePath() {
  return path.join(os.homedir(), ".job-sprint", "android-release", "job-sprint-release.p12");
}

function randomSecret(randomBytes = crypto.randomBytes) {
  return randomBytes(32).toString("base64url");
}

function error(code, extra = {}) {
  const err = new Error(code);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function normalizeDigest(value) {
  return value ? value.replace(/[^a-fA-F0-9]/g, "").toLowerCase() : null;
}

function envFilePath(root, env, inputArgs) {
  return absolutePath(root, argValue("--delivery-env-file", inputArgs) || envValue(env, "JOB_SPRINT_DELIVERY_ENV_FILE") || defaultDeliveryEnvFile);
}

function keystorePath(root, env, inputArgs) {
  return absolutePath(root, argValue("--keystore", inputArgs) || envValue(env, "JOB_SPRINT_ANDROID_KEYSTORE") || defaultKeystorePath());
}

function readEnvContent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function parseEnvValue(line) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  return match ? { key: match[1], value: match[2].trim() } : null;
}

function hasNonBlankEnvValue(line) {
  const parsed = parseEnvValue(line);
  return Boolean(parsed && parsed.value);
}

function updateEnvContent(content, values, options = {}) {
  const force = Boolean(options.force);
  const lines = content ? content.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  const seen = new Set();
  const conflicts = [];
  const updated = lines.map((line) => {
    const parsed = parseEnvValue(line.trim());
    if (!parsed || !Object.prototype.hasOwnProperty.call(values, parsed.key)) return line;
    seen.add(parsed.key);
    if (!force && hasNonBlankEnvValue(line)) conflicts.push(parsed.key);
    return `${parsed.key}=${values[parsed.key]}`;
  });
  if (conflicts.length) {
    throw error("android_release_signing_env_conflict", { conflicts });
  }
  const missing = Object.keys(values).filter((key) => !seen.has(key));
  if (missing.length && updated.length) updated.push("");
  for (const key of missing) updated.push(`${key}=${values[key]}`);
  updated.push("");
  return updated.join("\n");
}

function writeSigningEnv(root, file, values, options = {}) {
  if (isInsideRepository(root, file)) {
    throw error("android_release_signing_env_inside_repository", { file });
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const next = updateEnvContent(readEnvContent(file), values, options);
  fs.writeFileSync(file, next, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function generateKeystore(root, file, alias, storePassword, keyPassword, inputArgs, options = {}) {
  const force = inputArgs.includes("--force-keystore");
  if (isInsideRepository(root, file)) {
    throw error("android_release_keystore_inside_repository", { file });
  }
  if (fs.existsSync(file) && !force) {
    throw error("android_release_keystore_exists", { file });
  }
  if (force) fs.rmSync(file, { force: true });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const dname = argValue("--dname", inputArgs) || "CN=Job Sprint Release, OU=Job Sprint, O=Job Sprint Contributors, L=Example City, ST=Example State, C=CN";
  const exec = options.execFileSync || execFileSync;
  exec("keytool", [
    "-genkeypair",
    "-v",
    "-keystore",
    file,
    "-storetype",
    "PKCS12",
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "4096",
    "-validity",
    "10000",
    "-dname",
    dname,
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-noprompt"
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  fs.chmodSync(file, 0o600);
}

function readCertificateSha256(file, alias, storePassword, options = {}) {
  const exec = options.execFileSync || execFileSync;
  const raw = exec("keytool", [
    "-list",
    "-v",
    "-keystore",
    file,
    "-storepass",
    storePassword,
    "-alias",
    alias
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const match = String(raw).match(/SHA256:\s*([A-Fa-f0-9: -]+)/);
  const certSha256 = normalizeDigest(match && match[1]);
  if (!certSha256 || certSha256.length !== 64) {
    throw error("android_release_cert_sha256_unreadable");
  }
  return certSha256;
}

function redactedReport(report) {
  const text = JSON.stringify(report);
  for (const key of signingKeys.filter((item) => item.includes("PASSWORD"))) {
    if (text.includes(key.toLowerCase())) {
      throw error("android_release_signing_report_leaked_secret_marker");
    }
  }
  return report;
}

function initAndroidReleaseSigning(root = repoRoot, env = process.env, inputArgs = args, options = {}) {
  const writeEnv = inputArgs.includes("--write-env");
  const file = envFilePath(root, env, inputArgs);
  const keystore = keystorePath(root, env, inputArgs);
  const alias = argValue("--alias", inputArgs) || envValue(env, "JOB_SPRINT_ANDROID_KEY_ALIAS") || "job-sprint-release";
  if (!writeEnv) {
    return {
      status: "USER_ACTION_REQUIRED",
      reason: "write_env_confirmation_required",
      envFile: file,
      keystore,
      alias,
      requiredInputs: [
        "Run with --write-env to create a private release keystore and write signing variables to the private env file.",
        "Keep the generated keystore and env file outside this repository.",
        "Do not rotate this keystore after distributing a release APK unless you intentionally reset upgrade compatibility."
      ],
      nextCommand: `npm run init:android-release-signing -- --delivery-env-file ${file} --write-env`
    };
  }

  if (isInsideRepository(root, file)) {
    throw error("android_release_signing_env_inside_repository", { file });
  }
  if (isInsideRepository(root, keystore)) {
    throw error("android_release_keystore_inside_repository", { file: keystore });
  }

  const storePassword = envValue(env, "JOB_SPRINT_ANDROID_STORE_PASSWORD") || randomSecret(options.randomBytes);
  const keyPassword = envValue(env, "JOB_SPRINT_ANDROID_KEY_PASSWORD") || storePassword;
  generateKeystore(root, keystore, alias, storePassword, keyPassword, inputArgs, options);
  const certSha256 = readCertificateSha256(keystore, alias, storePassword, options);
  writeSigningEnv(root, file, {
    JOB_SPRINT_ANDROID_KEYSTORE: keystore,
    JOB_SPRINT_ANDROID_STORE_PASSWORD: storePassword,
    JOB_SPRINT_ANDROID_KEY_ALIAS: alias,
    JOB_SPRINT_ANDROID_KEY_PASSWORD: keyPassword,
    JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256: certSha256
  }, { force: inputArgs.includes("--force-env") });

  return redactedReport({
    status: "PASS",
    envFile: file,
    envMode: "0600",
    keystore,
    keystoreMode: "0600",
    alias,
    certSha256,
    wroteEnv: true,
    secretValuesPrinted: false,
    nextCommands: {
      formalRelease: deliveryCommands.formalRelease,
      validateDelivery: "npm run validate:delivery"
    },
    warning: "Keep this keystore stable for future APK upgrades."
  });
}

function errorReport(err) {
  return {
    status: "FAIL",
    reason: err.code || "android_release_signing_init_failed",
    file: err.file || null,
    conflicts: err.conflicts || null,
    requiredInputs: [
      "Use paths outside the git repository.",
      "Use --force-keystore only when intentionally replacing a not-yet-distributed release key.",
      "Use --force-env only when intentionally replacing existing signing env values."
    ]
  };
}

function printReport(report) {
  if (argSet.has("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log(`Android release signing init: ${report.status}`);
  if (report.reason) console.log(`- reason: ${report.reason}`);
  if (report.envFile) console.log(`- env: ${report.envFile}`);
  if (report.keystore) console.log(`- keystore: ${report.keystore}`);
  if (report.alias) console.log(`- alias: ${report.alias}`);
  if (report.certSha256) console.log(`- certSha256: ${report.certSha256}`);
  if (report.nextCommand) console.log(`- next: ${report.nextCommand}`);
  if (report.nextCommands) {
    console.log(`- next: ${report.nextCommands.formalRelease}`);
    console.log(`- verify: ${report.nextCommands.validateDelivery}`);
  }
}

if (require.main === module) {
  try {
    printReport(initAndroidReleaseSigning(repoRoot, process.env, args));
  } catch (err) {
    printReport(errorReport(err));
    process.exitCode = 1;
  }
}

module.exports = {
  defaultKeystorePath,
  initAndroidReleaseSigning,
  updateEnvContent
};

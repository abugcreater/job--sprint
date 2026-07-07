#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { isInsideRepository } = require("./delivery_env_file");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);
const defaultOutput = "~/.job-sprint/job-sprint-delivery.env";

const deliveryEnvKeys = [
  "JOB_SPRINT_DEPLOY_HOST",
  "JOB_SPRINT_DEPLOY_USER",
  "JOB_SPRINT_DEPLOY_PATH",
  "JOB_SPRINT_DEPLOY_SSH_KEY",
  "JOB_SPRINT_DEPLOY_PORT",
  "JOB_SPRINT_REMOTE_BASE_URL",
  "JOB_SPRINT_USERS_FILE",
  "JOB_SPRINT_AUTH_USER",
  "JOB_SPRINT_AUTH_PASSWORD",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_INPUT_COST_PER_MILLION",
  "ANTHROPIC_OUTPUT_COST_PER_MILLION",
  "AI_PROVIDER_TIMEOUT_MS",
  "JOB_SPRINT_ANDROID_WEBVIEW_URL",
  "JOB_SPRINT_ANDROID_KEYSTORE",
  "JOB_SPRINT_ANDROID_STORE_PASSWORD",
  "JOB_SPRINT_ANDROID_KEY_ALIAS",
  "JOB_SPRINT_ANDROID_KEY_PASSWORD",
  "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256",
  "JOB_SPRINT_FINAL_DELIVERY_REPORT"
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
  if (file === "~") {
    return os.homedir();
  }
  if (file.startsWith("~/")) {
    return path.join(os.homedir(), file.slice(2));
  }
  return file;
}

function deliveryEnvTemplatePath(root = repoRoot, env = process.env, inputArgs = args) {
  const output = argValue("--output", inputArgs)
    || envValue(env, "JOB_SPRINT_DELIVERY_ENV_TEMPLATE")
    || defaultOutput;
  const expanded = expandHome(output);
  return path.isAbsolute(expanded) ? expanded : path.resolve(root, expanded);
}

function deliveryEnvTemplateContent() {
  return [
    "# Job Sprint private delivery env",
    "# Keep this file outside the git repository. Do not commit real secrets.",
    "# Fill values before running final delivery.",
    "",
    "# Server sync target",
    "JOB_SPRINT_DEPLOY_HOST=",
    "JOB_SPRINT_DEPLOY_USER=",
    "JOB_SPRINT_DEPLOY_PATH=",
    "JOB_SPRINT_DEPLOY_SSH_KEY=",
    "JOB_SPRINT_DEPLOY_PORT=",
    "",
    "# Remote acceptance target and auth",
    "JOB_SPRINT_REMOTE_BASE_URL=",
    "JOB_SPRINT_USERS_FILE=",
    "JOB_SPRINT_AUTH_USER=",
    "JOB_SPRINT_AUTH_PASSWORD=",
    "",
    "# Optional AI provider for real remote coach generation",
    "ANTHROPIC_BASE_URL=",
    "ANTHROPIC_AUTH_TOKEN=",
    "ANTHROPIC_MODEL=",
    "ANTHROPIC_INPUT_COST_PER_MILLION=",
    "ANTHROPIC_OUTPUT_COST_PER_MILLION=",
    "AI_PROVIDER_TIMEOUT_MS=",
    "",
    "# Android remote WebView acceptance",
    "JOB_SPRINT_ANDROID_WEBVIEW_URL=",
    "",
    "# Formal Android release signing. Keystore must stay outside this repository.",
    "JOB_SPRINT_ANDROID_KEYSTORE=",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD=",
    "JOB_SPRINT_ANDROID_KEY_ALIAS=",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD=",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256=",
    "",
    "# Unified final delivery report",
    "JOB_SPRINT_FINAL_DELIVERY_REPORT=docs/evidence/final-delivery/final-delivery.json",
    ""
  ].join("\n");
}

function existingDeliveryEnvKeys(content) {
  const keys = new Set();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function deliveryEnvTemplateValue(key) {
  return key === "JOB_SPRINT_FINAL_DELIVERY_REPORT"
    ? "docs/evidence/final-delivery/final-delivery.json"
    : "";
}

function missingDeliveryEnvKeys(content) {
  const existing = existingDeliveryEnvKeys(content);
  return deliveryEnvKeys.filter((key) => !existing.has(key));
}

function mergeMissingDeliveryEnvTemplateContent(content) {
  const missing = missingDeliveryEnvKeys(content);
  if (!missing.length) {
    return { content, missing };
  }
  const base = content.endsWith("\n") ? content : `${content}\n`;
  const addition = [
    "",
    "# Missing Job Sprint delivery env keys added by init:delivery-env --merge-missing",
    ...missing.map((key) => `${key}=${deliveryEnvTemplateValue(key)}`),
    ""
  ].join("\n");
  return {
    content: `${base}${addition}`,
    missing
  };
}

function templateError(code, extra = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function fileMode(file) {
  return (fs.statSync(file).mode & 0o777).toString(8).padStart(4, "0");
}

function writeDeliveryEnvTemplate(root = repoRoot, env = process.env, inputArgs = args) {
  const output = deliveryEnvTemplatePath(root, env, inputArgs);
  const force = inputArgs.includes("--force");
  const mergeMissing = inputArgs.includes("--merge-missing");
  if (isInsideRepository(root, output)) {
    throw templateError("delivery_env_template_inside_repository", { output });
  }
  const existed = fs.existsSync(output);
  if (existed && mergeMissing && !force) {
    const current = fs.readFileSync(output, "utf8");
    const merged = mergeMissingDeliveryEnvTemplateContent(current);
    if (merged.missing.length) {
      fs.writeFileSync(output, merged.content, { encoding: "utf8", mode: 0o600 });
      fs.chmodSync(output, 0o600);
    }
    return {
      status: "PASS",
      output,
      existed: true,
      overwritten: false,
      merged: true,
      addedKeys: merged.missing,
      mode: fileMode(output),
      keyCount: deliveryEnvKeys.length,
      keys: [...deliveryEnvKeys],
      note: merged.missing.length ? "missing_keys_appended" : "no_missing_keys",
      nextCommand: `npm run final:delivery -- --delivery-env-file ${output} --report docs/evidence/final-delivery/final-delivery.json`
    };
  }
  if (existed && !force) {
    return {
      status: "PASS_WITH_LIMITS",
      output,
      existed: true,
      overwritten: false,
      mode: fileMode(output),
      keyCount: deliveryEnvKeys.length,
      keys: [...deliveryEnvKeys],
      note: "existing_file_left_unchanged",
      nextCommand: `npm run final:delivery -- --delivery-env-file ${output} --report docs/evidence/final-delivery/final-delivery.json`
    };
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, deliveryEnvTemplateContent(), {
    encoding: "utf8",
    flag: force ? "w" : "wx",
    mode: 0o600
  });
  fs.chmodSync(output, 0o600);
  return {
    status: "PASS",
    output,
    overwritten: existed,
    mode: "0600",
    keyCount: deliveryEnvKeys.length,
    keys: [...deliveryEnvKeys],
    nextCommand: `npm run final:delivery -- --delivery-env-file ${output} --report docs/evidence/final-delivery/final-delivery.json`
  };
}

function errorReport(error) {
  return {
    status: "FAIL",
    error: error.code || "delivery_env_template_error",
    output: error.output || null,
    requiredInputs: ["Pass --output as a path outside this git repository."]
  };
}

function printReport(report) {
  if (argSet.has("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log(`交付 env 模板：${report.status}`);
  if (report.output) {
    console.log(`- output: ${report.output}`);
  }
  if (report.mode) {
    console.log(`- mode: ${report.mode}`);
  }
  if (report.keyCount) {
    console.log(`- keys: ${report.keyCount}`);
  }
  if (Array.isArray(report.addedKeys)) {
    console.log(`- addedKeys: ${report.addedKeys.length}`);
  }
  if (report.nextCommand) {
    console.log(`- next: ${report.nextCommand}`);
  }
  if (report.note) {
    console.log(`- note: ${report.note}`);
  }
  if (report.error) {
    console.log(`- error: ${report.error}`);
  }
}

if (require.main === module) {
  try {
    printReport(writeDeliveryEnvTemplate(repoRoot, process.env, args));
  } catch (error) {
    const report = errorReport(error);
    printReport(report);
    process.exitCode = 1;
  }
}

module.exports = {
  deliveryEnvKeys,
  deliveryEnvTemplateContent,
  deliveryEnvTemplatePath,
  existingDeliveryEnvKeys,
  mergeMissingDeliveryEnvTemplateContent,
  missingDeliveryEnvKeys,
  writeDeliveryEnvTemplate
};

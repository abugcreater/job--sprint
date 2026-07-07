const fs = require("fs");
const { defaultDeliveryEnvFile } = require("./delivery_action_commands");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function hasExplicitEnvFile(inputArgs = [], env = process.env) {
  return inputArgs.includes("--delivery-env-file")
    || inputArgs.includes("--env-file")
    || Boolean(envValue(env, "JOB_SPRINT_DELIVERY_ENV_FILE"));
}

function defaultEnvArgs(inputArgs = [], env = process.env) {
  if (
    envValue(env, "JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV") === "1"
    || hasExplicitEnvFile(inputArgs, env)
    || !fs.existsSync(defaultDeliveryEnvFile)
  ) {
    return inputArgs;
  }
  return [...inputArgs, "--delivery-env-file", defaultDeliveryEnvFile];
}

function deliveryEnvFailureReport(error) {
  const check = {
    id: "delivery_env_file",
    status: "FAIL",
    reason: "delivery_env_file_error",
    envFile: envFileErrorInfo(error),
    requiredInputs: [
      `Fix ${defaultDeliveryEnvFile} or pass --delivery-env-file as a path outside this git repository.`,
      "Keep secrets out of committed files."
    ]
  };
  return {
    status: "FAIL",
    checks: [check],
    nextActions: [{
      id: check.id,
      reason: check.reason,
      nextAction: null,
      missing: null,
      requiredInputs: check.requiredInputs
    }]
  };
}

function loadReadinessEnv(root, env = process.env, inputArgs = []) {
  const args = defaultEnvArgs(inputArgs, env);
  const loaded = loadDeliveryEnvFile(root, env, args);
  return {
    args,
    env: loaded.env,
    info: loaded.info
  };
}

module.exports = {
  deliveryEnvFailureReport,
  loadReadinessEnv
};

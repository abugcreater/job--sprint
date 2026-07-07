const fs = require("fs");
const os = require("os");
const path = require("path");

function argValue(name, inputArgs = []) {
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

function isInsideRepository(root, file) {
  const rel = path.relative(root, path.resolve(file));
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function deliveryEnvFilePath(root, env = process.env, inputArgs = []) {
  const file = argValue("--delivery-env-file", inputArgs)
    || argValue("--env-file", inputArgs)
    || envValue(env, "JOB_SPRINT_DELIVERY_ENV_FILE");
  if (!file) {
    return null;
  }
  const expanded = expandHome(file);
  return path.isAbsolute(expanded) ? expanded : path.resolve(root, expanded);
}

function stripInlineComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === "\"" || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : quote || char;
    }
    if (!quote && char === "#" && /\s/.test(value[index - 1] || "")) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return stripInlineComment(trimmed).trim();
}

function parseDeliveryEnvFile(content) {
  const parsed = {};
  const errors = [];
  for (const [zeroIndex, rawLine] of content.split(/\r?\n/).entries()) {
    const lineNumber = zeroIndex + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      errors.push({ line: lineNumber, reason: "invalid_key_value_line" });
      continue;
    }
    parsed[match[1]] = unquote(match[2]);
  }
  if (errors.length) {
    const error = new Error("delivery_env_file_parse_error");
    error.code = "delivery_env_file_parse_error";
    error.errors = errors;
    throw error;
  }
  return parsed;
}

function mergeEnvFileValues(env, parsed) {
  const next = { ...env };
  for (const [key, value] of Object.entries(parsed)) {
    if (!envValue(next, key)) {
      next[key] = value;
    }
  }
  return next;
}

function loadDeliveryEnvFile(root, env = process.env, inputArgs = []) {
  const file = deliveryEnvFilePath(root, env, inputArgs);
  if (!file) {
    return {
      env,
      info: {
        configured: false,
        loaded: false,
        loadedKeys: []
      }
    };
  }
  if (isInsideRepository(root, file)) {
    const error = new Error("delivery_env_file_inside_repository");
    error.code = "delivery_env_file_inside_repository";
    throw error;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const error = new Error("delivery_env_file_missing");
    error.code = "delivery_env_file_missing";
    throw error;
  }
  const parsed = parseDeliveryEnvFile(fs.readFileSync(file, "utf8"));
  return {
    env: mergeEnvFileValues(env, parsed),
    info: {
      configured: true,
      loaded: true,
      insideRepository: false,
      keyCount: Object.keys(parsed).length,
      loadedKeys: Object.keys(parsed).sort()
    }
  };
}

function envFileErrorInfo(error) {
  return {
    configured: true,
    loaded: false,
    error: error.code || "delivery_env_file_error",
    parseErrors: error.errors || null
  };
}

module.exports = {
  deliveryEnvFilePath,
  envFileErrorInfo,
  isInsideRepository,
  loadDeliveryEnvFile,
  parseDeliveryEnvFile
};

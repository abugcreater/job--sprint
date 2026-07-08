const fs = require("fs");
const path = require("path");
const { getAuthConfig } = require("./auth");

function runtimeDataPath() {
  return process.env.RUNTIME_DATA_PATH || path.join(__dirname, "data", "runtime.json");
}

function readRuntimeState() {
  return readUserRuntimeState();
}

function defaultRuntimeState() {
  return {
    progress: {},
    reviews: {},
    applications: [],
    interviewMistakes: []
  };
}

function normalizeRuntimeState(parsed) {
  return {
    progress: parsed && parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
    reviews: parsed && parsed.reviews && typeof parsed.reviews === "object" ? parsed.reviews : {},
    applications: parsed && Array.isArray(parsed.applications) ? parsed.applications : [],
    interviewMistakes: parsed && Array.isArray(parsed.interviewMistakes) ? parsed.interviewMistakes : []
  };
}

function emptyRuntimeEnvelope() {
  return { schemaVersion: 2, users: {}, updatedAt: null };
}

function readRuntimeEnvelope() {
  const filePath = runtimeDataPath();
  if (!fs.existsSync(filePath)) {
    return emptyRuntimeEnvelope();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && parsed.schemaVersion === 2 && parsed.users && typeof parsed.users === "object") {
      return {
        schemaVersion: 2,
        users: Object.fromEntries(Object.entries(parsed.users).map(([scope, state]) => [scope, normalizeRuntimeState(state)])),
        updatedAt: parsed.updatedAt || null
      };
    }
    return emptyRuntimeEnvelope();
  } catch (_) {
    return emptyRuntimeEnvelope();
  }
}

function writeRuntimeEnvelope(envelope) {
  const filePath = runtimeDataPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify({
    schemaVersion: 2,
    users: envelope.users || {},
    updatedAt: new Date().toISOString()
  }, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function userDataScope(authState) {
  if (authState && authState.userProfile && authState.userProfile.dataScope) {
    return authState.userProfile.dataScope;
  }
  return getAuthConfig().dataOwner || "anonymous-local";
}

function readUserRuntimeState(authState) {
  const envelope = readRuntimeEnvelope();
  const scope = userDataScope(authState);
  return envelope.users[scope] ? normalizeRuntimeState(envelope.users[scope]) : defaultRuntimeState();
}

function writeRuntimeState(state, authState = null) {
  const envelope = readRuntimeEnvelope();
  const scope = userDataScope(authState);
  envelope.users[scope] = normalizeRuntimeState(state);
  writeRuntimeEnvelope(envelope);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRecord(record, prefix) {
  return {
    ...record,
    id: record.id || makeId(prefix),
    createdAt: record.createdAt || new Date().toISOString()
  };
}

module.exports = {
  defaultRuntimeState,
  emptyRuntimeEnvelope,
  normalizeRecord,
  normalizeRuntimeState,
  readRuntimeEnvelope,
  readRuntimeState,
  readUserRuntimeState,
  runtimeDataPath,
  userDataScope,
  writeRuntimeEnvelope,
  writeRuntimeState
};

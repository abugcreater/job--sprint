const { hasPermission } = require("./auth");
const {
  normalizeRecord,
  normalizeRuntimeState,
  readUserRuntimeState,
  writeRuntimeState
} = require("./runtime_store");
const {
  readBody,
  sendBadJson,
  sendJson
} = require("./http_utils");

function requireRuntimeWrite(req, res, authState) {
  if (hasPermission(authState, "runtime:write")) {
    return true;
  }
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "当前账号没有访问该功能的权限。"
  });
  return false;
}

async function readJsonBody(req, res) {
  try {
    return await readBody(req);
  } catch (error) {
    sendBadJson(res, error);
    return null;
  }
}

async function handleRuntime(req, res, authState) {
  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      data: state
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    const data = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
    const existing = readUserRuntimeState(authState);
    const state = normalizeRuntimeState(data || {});
    state.progress = mergeProgress(existing.progress, state.progress);
    writeRuntimeState(state, authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      data: state
    });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

async function handleProgress(req, res, authState) {
  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, progress: state.progress });
    return;
  }

  if (req.method === "POST") {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    const state = readUserRuntimeState(authState);
    const incomingProgress = payload.progress && typeof payload.progress === "object" ? payload.progress : payload;
    state.progress = mergeProgress(state.progress, incomingProgress);
    writeRuntimeState(state, authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, progress: state.progress });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function mergeProgress(existing, incoming) {
  return {
    ...(existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {}),
    ...(incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {})
  };
}

async function handleReviews(req, res, authState) {
  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, reviews: state.reviews });
    return;
  }

  if (req.method === "POST") {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    const state = readUserRuntimeState(authState);
    state.reviews = payload.reviews && typeof payload.reviews === "object" ? payload.reviews : payload;
    writeRuntimeState(state, authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, reviews: state.reviews });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

async function handleApplications(req, res, id, authState) {
  const state = readUserRuntimeState(authState);
  if (req.method === "GET" && !id) {
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, applications: state.applications });
    return;
  }

  if (req.method === "POST" && !id) {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    if (Array.isArray(payload.applications)) {
      state.applications = payload.applications
        .filter((item) => item && typeof item === "object")
        .map((item) => normalizeRecord(item, "app"));
      writeRuntimeState(state, authState);
      sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, applications: state.applications });
      return;
    }

    const record = normalizeRecord(payload, "app");
    state.applications.push(record);
    writeRuntimeState(state, authState);
    sendJson(res, 201, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, application: record, applications: state.applications });
    return;
  }

  if (req.method === "PUT" && id) {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    const index = state.applications.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "application_not_found" });
      return;
    }
    state.applications[index] = { ...state.applications[index], ...payload, id };
    writeRuntimeState(state, authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, application: state.applications[index] });
    return;
  }

  if (req.method === "DELETE" && id) {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const next = state.applications.filter((item) => item.id !== id);
    if (next.length === state.applications.length) {
      sendJson(res, 404, { error: "application_not_found" });
      return;
    }
    state.applications = next;
    writeRuntimeState(state, authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, applications: state.applications });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

async function handleInterviewMistakes(req, res, id, authState) {
  const state = readUserRuntimeState(authState);
  if (req.method === "GET" && !id) {
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, interviewMistakes: state.interviewMistakes });
    return;
  }

  if (req.method === "POST" && !id) {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const payload = await readJsonBody(req, res);
    if (!payload) return;

    if (Array.isArray(payload.interviewMistakes)) {
      state.interviewMistakes = payload.interviewMistakes
        .filter((item) => item && typeof item === "object")
        .map((item) => normalizeRecord(item, "mistake"));
      writeRuntimeState(state, authState);
      sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, interviewMistakes: state.interviewMistakes });
      return;
    }

    const record = normalizeRecord(payload, "mistake");
    state.interviewMistakes.unshift(record);
    writeRuntimeState(state, authState);
    sendJson(res, 201, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, interviewMistake: record, interviewMistakes: state.interviewMistakes });
    return;
  }

  if (req.method === "DELETE" && id) {
    if (!requireRuntimeWrite(req, res, authState)) return;
    const next = state.interviewMistakes.filter((item) => item.id !== id);
    if (next.length === state.interviewMistakes.length) {
      sendJson(res, 404, { error: "interview_mistake_not_found" });
      return;
    }
    state.interviewMistakes = next;
    writeRuntimeState(state, authState);
    sendJson(res, 200, { ok: true, storage: "server-json", readOnly: authState.userProfile.readOnly, interviewMistakes: state.interviewMistakes });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

module.exports = {
  handleApplications,
  handleInterviewMistakes,
  handleProgress,
  handleReviews,
  handleRuntime,
  requireRuntimeWrite
};

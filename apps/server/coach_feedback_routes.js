const { hasPermission } = require("./auth");
const {
  readUserRuntimeState,
  writeRuntimeState
} = require("./runtime_store");
const {
  readBody,
  sendBadJson,
  sendJson
} = require("./http_utils");
const { normalizeFeedbackList, summarizeFeedback } = require("./coach_feedback_summary");
const { handleCoachInvitations } = require("./coach_invitations_routes");
const { handleCoachOnboardingEvents, handleCoachOnboardingReport } = require("./coach_onboarding_events_routes");
const { handleCoachBoundaryFeedback } = require("./coach_boundary_feedback_routes");
const { handleCoachOutcomes } = require("./coach_outcomes_routes");

function requireCoachFeedbackPermission(res, authState) {
  if (hasPermission(authState, "ai:use")) {
    return true;
  }
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "当前账号没有访问该功能的权限。"
  });
  return false;
}

async function handleCoachFeedback(req, res, authState) {
  if (!requireCoachFeedbackPermission(res, authState)) return;

  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    const feedback = normalizeFeedbackList(state.progress?.coachFeedback || state.progress?.coach?.feedback);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      feedback,
      summary: summarizeFeedback(feedback)
    });
    return;
  }

  if (req.method === "POST") {
    let payload;
    try {
      payload = await readBody(req);
    } catch (error) {
      sendBadJson(res, error);
      return;
    }
    const feedback = coachFeedbackFromPayload(payload);
    if (feedback.error) {
      sendJson(res, 400, feedback);
      return;
    }

    const state = readUserRuntimeState(authState);
    const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
    const feedbackList = normalizeFeedbackList(progress.coachFeedback || progress.coach?.feedback);
    const nextList = [feedback, ...feedbackList.filter((item) => item.id !== feedback.id)].slice(0, 100);
    state.progress = {
      ...progress,
      coachFeedback: nextList
    };
    writeRuntimeState(state, authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      feedback,
      summary: summarizeFeedback(nextList)
    });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function coachFeedbackFromPayload(payload) {
  const artifactId = text(payload, "artifactId");
  const decision = text(payload, "decision");
  if (!artifactId) {
    return requiredError("artifactId");
  }
  if (!decision) {
    return requiredError("decision");
  }
  if (!["accepted", "rejected"].includes(decision)) {
    return {
      ok: false,
      error: "invalid_feedback_decision",
      message: "AI 草稿反馈只能是 accepted 或 rejected。"
    };
  }
  return {
    id: text(payload, "id") || `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    profileId: text(payload, "profileId"),
    artifactId,
    llmRunId: text(payload, "llmRunId"),
    artifactType: text(payload, "artifactType") || "unknown",
    decision,
    reason: text(payload, "reason"),
    title: text(payload, "title"),
    createdAt: new Date().toISOString()
  };
}

function requiredError(field) {
  return {
    ok: false,
    error: `${field}_required`,
    message: "AI 草稿反馈缺少必要字段。"
  };
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  coachFeedbackFromPayload,
  handleCoachBoundaryFeedback,
  handleCoachFeedback,
  handleCoachInvitations,
  handleCoachOnboardingEvents,
  handleCoachOnboardingReport,
  handleCoachOutcomes,
  normalizeFeedbackList,
  summarizeFeedback
};

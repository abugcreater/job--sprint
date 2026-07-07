const { hasPermission } = require("./auth");
const { readBody, sendBadJson, sendJson } = require("./http_utils");
const { readUserRuntimeState, writeRuntimeState } = require("./runtime_store");

function requireBoundaryFeedbackPermission(res, authState) {
  if (hasPermission(authState, "ai:use")) return true;
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "当前账号没有访问该功能的权限。"
  });
  return false;
}

async function handleCoachBoundaryFeedback(req, res, authState) {
  if (!requireBoundaryFeedbackPermission(res, authState)) return;

  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    const feedback = feedbackFromProgress(state.progress);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      feedback,
      summary: summarizeBoundaryFeedback(feedback)
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
    const feedback = boundaryFeedbackFromPayload(payload);
    if (feedback.error) {
      sendJson(res, 400, feedback);
      return;
    }

    const state = readUserRuntimeState(authState);
    const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
    const feedbackList = feedbackFromProgress(progress);
    const nextList = [feedback, ...feedbackList.filter((item) => item.id !== feedback.id)].slice(0, 200);
    state.progress = {
      ...progress,
      coachBoundaryFeedback: nextList,
      coach: {
        ...(progress.coach && typeof progress.coach === "object" ? progress.coach : {}),
        boundarySuggestionFeedback: nextList
      }
    };
    writeRuntimeState(state, authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      feedback,
      summary: summarizeBoundaryFeedback(nextList)
    });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function feedbackFromProgress(progress) {
  if (!progress || typeof progress !== "object") return [];
  return normalizeBoundaryFeedbackList(
    progress.coachBoundaryFeedback
    || progress.coach?.boundarySuggestionFeedback
    || progress.boundarySuggestionFeedback
  );
}

function boundaryFeedbackFromPayload(payload) {
  const suggestionId = text(payload, "suggestionId");
  const topic = text(payload, "topic");
  const decision = text(payload, "decision");
  if (!suggestionId) return requiredError("suggestionId");
  if (!topic) return requiredError("topic");
  if (!decision) return requiredError("decision");
  if (!["accepted", "rejected", "needs_revision"].includes(decision)) {
    return {
      ok: false,
      error: "invalid_boundary_feedback_decision",
      message: "边界候选反馈只能是 accepted、rejected 或 needs_revision。"
    };
  }
  return {
    id: text(payload, "id") || `boundary-feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    profileId: text(payload, "profileId"),
    suggestionId,
    topic,
    decision,
    reason: text(payload, "reason") || defaultReason(decision),
    sourceSummary: text(payload, "sourceSummary"),
    sourceConfidence: text(payload, "sourceConfidence"),
    sourceProvider: text(payload, "sourceProvider"),
    sourcePromptVersion: text(payload, "sourcePromptVersion"),
    sourceInputHash: text(payload, "sourceInputHash"),
    createdAt: text(payload, "createdAt") || new Date().toISOString()
  };
}

function normalizeBoundaryFeedbackList(value) {
  return Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === "object" && item.suggestionId && item.topic && item.decision)
      .map((item) => boundaryFeedbackFromPayload(item))
      .filter((item) => !item.error)
    : [];
}

function summarizeBoundaryFeedback(feedbackList) {
  const feedback = normalizeBoundaryFeedbackList(feedbackList);
  const acceptedCount = feedback.filter((item) => item.decision === "accepted").length;
  const rejected = feedback.filter((item) => item.decision === "rejected");
  const revisions = feedback.filter((item) => item.decision === "needs_revision");
  const needsCalibration = rejected.length + revisions.length;
  const revisionRate = feedback.length ? Math.round((needsCalibration / feedback.length) * 100) : 0;
  const recentReasons = [...rejected, ...revisions]
    .map((item) => text(item, "reason"))
    .filter(Boolean)
    .slice(0, 5);
  const topTopics = topCalibrationTopics([...rejected, ...revisions]);
  return {
    totalCount: feedback.length,
    acceptedCount,
    rejectedCount: rejected.length,
    revisionCount: revisions.length,
    revisionRate,
    revisionRateLabel: feedback.length ? `${revisionRate}%` : "暂无",
    topTopics,
    recentReasons,
    nextExtractionHint: nextExtractionHint(feedback.length, acceptedCount, needsCalibration, recentReasons, topTopics)
  };
}

function topCalibrationTopics(records) {
  const counts = records.reduce((result, item) => {
    const topic = item.topic || "unknown";
    result[topic] = (result[topic] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic, "zh-Hans-CN"))
    .slice(0, 3);
}

function nextExtractionHint(totalCount, acceptedCount, needsCalibration, recentReasons, topTopics) {
  if (!totalCount) return "先采纳、修订或拒绝至少一条候选边界，系统才知道边界提取质量。";
  if (needsCalibration > acceptedCount) {
    const topicHint = topTopics[0] ? `，重点校准「${topTopics[0].topic}」` : "";
    const reasonHint = recentReasons[0] ? `，最近原因：${recentReasons[0]}` : "";
    return `候选边界需要校准，下一轮应更贴近岗位素材和已有证据${topicHint}${reasonHint}。`;
  }
  return "候选边界已有采纳记录，下一轮可以继续沿用当前素材结构。";
}

function defaultReason(decision) {
  if (decision === "accepted") return "已采纳";
  if (decision === "needs_revision") return "需要人工修订后再保存";
  return "不适合当前知识边界";
}

function requiredError(field) {
  return {
    ok: false,
    error: `${field}_required`,
    message: "边界候选反馈缺少必要字段。"
  };
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim().replace(/\s+/g, " ") : "";
}

module.exports = {
  boundaryFeedbackFromPayload,
  handleCoachBoundaryFeedback,
  normalizeBoundaryFeedbackList,
  summarizeBoundaryFeedback
};

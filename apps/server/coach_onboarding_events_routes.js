const { hasPermission } = require("./auth");
const {
  readRuntimeEnvelope,
  readUserRuntimeState,
  writeRuntimeState
} = require("./runtime_store");
const {
  readBody,
  sendBadJson,
  sendJson
} = require("./http_utils");

const STEP_IDS = new Set(["account_scope", "profile_template", "material_boundary", "first_schedule", "ai_review", "complete"]);

function requireCoachOnboardingPermission(res, authState) {
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

async function handleCoachOnboardingEvents(req, res, authState) {
  if (!requireCoachOnboardingPermission(res, authState)) return;

  if (req.method === "GET") {
    const state = readUserRuntimeState(authState);
    const events = normalizeOnboardingEvents(state.progress?.coachOnboardingEvents || state.progress?.coach?.onboardingEvents);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      events,
      summary: summarizeOnboardingEvents(events)
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
    const event = onboardingEventFromPayload(payload);
    if (event.error) {
      sendJson(res, 400, event);
      return;
    }

    const state = readUserRuntimeState(authState);
    const progress = state.progress && typeof state.progress === "object" ? state.progress : {};
    const events = normalizeOnboardingEvents(progress.coachOnboardingEvents || progress.coach?.onboardingEvents);
    const nextEvents = [event, ...events.filter((item) => item.id !== event.id)].slice(0, 100);
    state.progress = {
      ...progress,
      coachOnboardingEvents: nextEvents
    };
    writeRuntimeState(state, authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      event,
      summary: summarizeOnboardingEvents(nextEvents)
    });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

async function handleCoachOnboardingReport(req, res, authState) {
  if (!requireCoachOnboardingPermission(res, authState)) return;
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  const envelope = readRuntimeEnvelope();
  const users = visibleInviteUsers(authState);
  const rows = users.map((user) => {
    const state = envelope.users?.[user.dataScope] || {};
    const events = normalizeOnboardingEvents(state.progress?.coachOnboardingEvents || state.progress?.coach?.onboardingEvents);
    const summary = summarizeOnboardingEvents(events);
    return {
      username: user.username,
      displayName: user.displayName || user.username,
      dataScope: user.dataScope,
      inviteBatch: user.inviteBatch || "default",
      latestEvent: events[0] || null,
      summary
    };
  });
  sendJson(res, 200, {
    ok: true,
    storage: "server-json",
    readOnly: authState.userProfile.readOnly,
    summary: summarizeInviteReport(rows),
    batches: summarizeInviteBatches(rows),
    users: rows
  });
}

function onboardingEventFromPayload(payload) {
  const stepId = text(payload, "stepId");
  if (!stepId) return requiredError("stepId");
  if (!STEP_IDS.has(stepId)) {
    return {
      ok: false,
      error: "invalid_step_id",
      message: "首登观察事件的 stepId 不在允许范围内。"
    };
  }
  const progressLabel = text(payload, "progressLabel");
  if (!progressLabel) return requiredError("progressLabel");
  const completionRate = numberInRange(payload, "completionRate", 0, 100);
  if (completionRate === null) {
    return {
      ok: false,
      error: "completionRate_required",
      message: "首登观察事件缺少有效完成率。"
    };
  }
  const dropOffLabel = text(payload, "dropOffLabel");
  if (!dropOffLabel) return requiredError("dropOffLabel");
  const riskLabel = text(payload, "riskLabel");
  if (!riskLabel) return requiredError("riskLabel");
  const nextActionLabel = text(payload, "nextActionLabel");
  if (!nextActionLabel) return requiredError("nextActionLabel");

  return {
    id: text(payload, "id") || `onboarding-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    profileId: text(payload, "profileId"),
    stepId,
    stepLabel: text(payload, "stepLabel") || dropOffLabel,
    progressLabel,
    completionRate,
    completionRateLabel: text(payload, "completionRateLabel") || `${completionRate}%`,
    dropOffLabel,
    riskLabel,
    nextActionLabel,
    source: text(payload, "source") || "react-first-login",
    createdAt: new Date().toISOString()
  };
}

function normalizeOnboardingEvents(value) {
  return Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === "object" && STEP_IDS.has(text(item, "stepId")))
      .map((item) => {
        const completionRate = numberInRange(item, "completionRate", 0, 100);
        const dropOffLabel = text(item, "dropOffLabel") || "未知放弃点";
        return {
          id: text(item, "id") || `onboarding-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          profileId: text(item, "profileId"),
          stepId: text(item, "stepId"),
          stepLabel: text(item, "stepLabel") || dropOffLabel,
          progressLabel: text(item, "progressLabel") || "0/5",
          completionRate: completionRate ?? 0,
          completionRateLabel: text(item, "completionRateLabel") || `${completionRate ?? 0}%`,
          dropOffLabel,
          riskLabel: text(item, "riskLabel") || "未知风险",
          nextActionLabel: text(item, "nextActionLabel") || "继续首登",
          source: text(item, "source") || "react-first-login",
          createdAt: text(item, "createdAt") || new Date().toISOString()
        };
      })
    : [];
}

function summarizeOnboardingEvents(events) {
  const normalized = normalizeOnboardingEvents(events);
  const latest = normalized[0];
  if (!latest) {
    return {
      eventCount: 0,
      latestCompletionRate: 0,
      latestCompletionRateLabel: "暂无",
      latestDropOffLabel: "暂无",
      latestRiskLabel: "暂无",
      highestRiskLabel: "暂无",
      nextActionLabel: "等待首登观察",
      firstLoginStatus: "等待首登"
    };
  }
  return {
    eventCount: normalized.length,
    latestCompletionRate: latest.completionRate,
    latestCompletionRateLabel: latest.completionRateLabel,
    latestDropOffLabel: latest.dropOffLabel,
    latestRiskLabel: latest.riskLabel,
    highestRiskLabel: highestRiskLabel(normalized),
    nextActionLabel: latest.nextActionLabel,
    firstLoginStatus: latest.completionRate >= 100 ? "首登完成" : "首登进行中"
  };
}

function summarizeInviteReport(rows) {
  const totalUsers = rows.length;
  const startedCount = rows.filter((row) => row.summary.eventCount > 0).length;
  const completedCount = rows.filter((row) => row.summary.latestCompletionRate >= 100).length;
  const completionRate = totalUsers ? Math.round((completedCount / totalUsers) * 100) : 0;
  return {
    totalUsers,
    startedCount,
    completedCount,
    completionRate,
    completionRateLabel: totalUsers ? `${completionRate}%` : "暂无",
    topDropOffs: topDropOffs(rows),
    highestRiskLabel: highestRiskLabel(rows.map((row) => ({ riskLabel: row.summary.highestRiskLabel })))
  };
}

function summarizeInviteBatches(rows) {
  const groups = rows.reduce((map, row) => {
    const batch = row.inviteBatch || "default";
    map[batch] = map[batch] || [];
    map[batch].push(row);
    return map;
  }, {});
  return Object.entries(groups).map(([inviteBatch, batchRows]) => {
    const summary = summarizeInviteReport(batchRows);
    return {
      inviteBatch,
      ...summary,
      topDropOffLabel: summary.topDropOffs[0]?.label || "暂无"
    };
  }).sort((a, b) => a.inviteBatch.localeCompare(b.inviteBatch, "zh-Hans-CN"));
}

function topDropOffs(rows) {
  const counts = rows.reduce((map, row) => {
    const label = row.summary.latestDropOffLabel;
    if (!label || label === "暂无" || label === "无放弃点") return map;
    map[label] = (map[label] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"))
    .slice(0, 5);
}

function visibleInviteUsers(authState) {
  const users = Array.isArray(authState.config?.users) ? authState.config.users : [];
  const normalized = users.map((user) => ({
    username: user.username,
    displayName: user.displayName || user.username,
    dataScope: user.dataScope || user.username,
    inviteBatch: user.inviteBatch || "default"
  })).filter((user) => user.username && user.dataScope);
  if (hasPermission(authState, "*")) return normalized;
  const scope = authState.userProfile?.dataScope;
  return normalized.filter((user) => user.dataScope === scope);
}

function highestRiskLabel(events) {
  const ranked = events
    .map((item) => ({ label: item.riskLabel, rank: riskRank(item.riskLabel) }))
    .sort((left, right) => right.rank - left.rank);
  return ranked[0]?.label || "暂无";
}

function riskRank(label) {
  if (label.includes("高")) return 3;
  if (label.includes("中")) return 2;
  if (label.includes("低")) return 1;
  return 0;
}

function requiredError(field) {
  return {
    ok: false,
    error: `${field}_required`,
    message: "首登观察事件缺少必要字段。"
  };
}

function numberInRange(source, field, min, max) {
  const raw = source && source[field];
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  handleCoachOnboardingEvents,
  handleCoachOnboardingReport,
  normalizeOnboardingEvents,
  onboardingEventFromPayload,
  summarizeInviteReport,
  summarizeOnboardingEvents
};

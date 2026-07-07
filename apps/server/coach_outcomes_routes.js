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

function requireCoachOutcomePermission(res, authState, permission = "ai:use") {
  if (hasPermission(authState, permission)) return true;
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "当前账号没有访问该功能的权限。"
  });
  return false;
}

async function handleCoachOutcomes(req, res, authState) {
  if (!requireCoachOutcomePermission(res, authState)) return;
  const query = new URL(req.url || "/", "http://localhost").searchParams;
  const state = readUserRuntimeState(authState);

  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      outcome: buildCoachOutcomeReport(state, { date: query.get("date") }),
      snapshots: normalizeOutcomeSnapshots(state.progress?.coachOutcomeSnapshots)
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireCoachOutcomePermission(res, authState, "runtime:write")) return;
    let payload = {};
    try {
      payload = await readBody(req);
    } catch (error) {
      sendBadJson(res, error);
      return;
    }
    const report = buildCoachOutcomeReport(state, { date: text(payload, "date") || query.get("date") });
    const snapshot = {
      ...report,
      id: text(payload, "id") || `coach-outcome-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString()
    };
    const progress = objectOrEmpty(state.progress);
    const snapshots = [snapshot, ...normalizeOutcomeSnapshots(progress.coachOutcomeSnapshots)].slice(0, 20);
    state.progress = {
      ...progress,
      coachOutcomeSnapshots: snapshots
    };
    writeRuntimeState(state, authState);
    sendJson(res, 200, {
      ok: true,
      storage: "server-json",
      readOnly: authState.userProfile.readOnly,
      outcome: snapshot,
      snapshots
    });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function buildCoachOutcomeReport(state, options = {}) {
  const progress = objectOrEmpty(state?.progress);
  const coach = objectOrEmpty(progress.coach);
  const completed = booleanMap(progress.completed);
  const evidence = weeklyEvidence(progress.evidenceByTaskId, options.date || progress.lastSavedAt);
  const delays = weeklyDelays(progress.delayRecords, evidence.window);
  const feedback = normalizeFeedbackList(progress.coachFeedback || coach.feedback);
  const feedbackSummary = summarizeFeedback(feedback);
  const acceptedSchedule = acceptedScheduleOutcome(coach.coachScheduleEvents, completed, evidence.window);
  const evidenceTypeCounts = countEvidenceTypes(evidence.records);
  const effectiveActionCount = new Set(
    evidence.records
      .filter((item) => item.verified && completed[item.taskId])
      .map((item) => item.taskId)
  ).size;
  const interviewReview = interviewReviewOutcome(coach.coachScheduleEvents, completed, evidence.records, evidence.window);
  const score = outcomeScore({
    evidenceCount: evidence.records.length,
    effectiveActionCount,
    acceptedScheduleRate: acceptedSchedule.rate,
    interviewReviewRate: interviewReview.rate,
    feedbackReviewedCount: feedbackSummary.reviewedCount
  });

  return {
    schemaVersion: "coach-outcome-report-v1",
    attributionLevel: "server-weekly-runtime",
    generatedAt: new Date().toISOString(),
    startDate: evidence.window.startDate,
    endDate: evidence.window.endDate,
    dateRangeLabel: `${evidence.window.startDate} 至 ${evidence.window.endDate}`,
    score,
    scoreLabel: scoreLabel(score),
    summary: `服务端周结果归因 ${score}/100，${scoreLabel(score)}。`,
    metrics: {
      evidenceCount: evidence.records.length,
      verifiedEvidenceCount: evidence.records.filter((item) => item.verified).length,
      completedTaskCount: Object.values(completed).filter(Boolean).length,
      effectiveActionCount,
      delayCount: delays.length,
      feedbackReviewedCount: feedbackSummary.reviewedCount,
      acceptedScheduleCount: acceptedSchedule.total,
      acceptedScheduleCompletedCount: acceptedSchedule.completed,
      acceptedScheduleCompletionRate: acceptedSchedule.rate,
      acceptedScheduleCompletionRateLabel: acceptedSchedule.label,
      interviewReviewTotalCount: interviewReview.total,
      interviewReviewCompletedCount: interviewReview.completed,
      interviewReviewRate: interviewReview.rate,
      interviewReviewRateLabel: interviewReview.label,
      evidenceTypeCounts
    },
    signals: buildSignals(evidenceTypeCounts, effectiveActionCount, acceptedSchedule, feedbackSummary),
    risks: buildRisks(evidenceTypeCounts, delays.length, acceptedSchedule, interviewReview),
    nextWeekFocus: buildNextWeekFocus(evidenceTypeCounts, acceptedSchedule, interviewReview)
  };
}

function weeklyEvidence(evidenceByTaskId, requestedDate) {
  const end = parseDateOnly(requestedDate) || new Date();
  const start = addDays(end, -6);
  return {
    window: { start, end, startDate: formatDate(start), endDate: formatDate(end) },
    records: Object.entries(objectOrEmpty(evidenceByTaskId))
      .flatMap(([taskId, records]) => Array.isArray(records) ? records.map((record) => normalizeEvidence(taskId, record)) : [])
      .filter((record) => record && isInsideWindow(record.createdAt, start, end))
  };
}

function weeklyDelays(delayRecords, window) {
  return Array.isArray(delayRecords)
    ? delayRecords.filter((item) => isInsideWindow(text(item, "createdAt") || text(item, "date"), window.start, window.end))
    : [];
}

function acceptedScheduleOutcome(events, completed, window) {
  const accepted = Array.isArray(events)
    ? events.filter((event) => text(event, "acceptedFromArtifactId") && isInsideWindow(text(event, "date"), window.start, window.end))
    : [];
  const done = accepted.filter((event) => completed[`coach-event-${text(event, "id")}`]).length;
  const rate = accepted.length ? Math.round((done / accepted.length) * 100) : 0;
  return {
    total: accepted.length,
    completed: done,
    rate,
    label: accepted.length ? `${rate}%` : "暂无"
  };
}

function interviewReviewOutcome(events, completed, evidenceRecords, window) {
  const interviewEvents = Array.isArray(events)
    ? events.filter((event) => text(event, "kind") === "interview" && isInsideWindow(text(event, "date"), window.start, window.end))
    : [];
  const evidenceTaskIds = new Set(evidenceRecords
    .filter((item) => item.verified && ["interview_answer", "oral_score", "review"].includes(item.type))
    .map((item) => item.taskId));
  const done = interviewEvents.filter((event) => {
    const taskId = `coach-event-${text(event, "id")}`;
    return completed[taskId] || evidenceTaskIds.has(taskId);
  }).length;
  const rate = interviewEvents.length ? Math.round((done / interviewEvents.length) * 100) : 0;
  return {
    total: interviewEvents.length,
    completed: done,
    rate,
    label: interviewEvents.length ? `${rate}%` : "暂无"
  };
}

function buildSignals(typeCounts, effectiveActionCount, acceptedSchedule, feedbackSummary) {
  return [
    effectiveActionCount ? `本周有 ${effectiveActionCount} 个完成任务带验证证据。` : "",
    acceptedSchedule.total ? `AI 采纳日程完成 ${acceptedSchedule.label}。` : "",
    feedbackSummary.reviewedCount ? `AI 草稿反馈 ${feedbackSummary.reviewedCount} 条，贴合度 ${feedbackSummary.qualityLabel}。` : "",
    typeCounts.delivery_record ? `机会/JD/投递反馈 ${typeCounts.delivery_record} 条。` : ""
  ].filter(Boolean).slice(0, 4);
}

function buildRisks(typeCounts, delayCount, acceptedSchedule, interviewReview) {
  return [
    !typeCounts.review ? "缺少复盘证据，服务端无法判断动作是否改变结果。" : "",
    !typeCounts.delivery_record ? "缺少机会反馈，学习动作和真实岗位要求仍可能脱节。" : "",
    acceptedSchedule.total && acceptedSchedule.rate < 60 ? "AI 采纳日程完成率低于 60%，建议粒度需要收窄。" : "",
    interviewReview.total && interviewReview.rate < 60 ? "面试题复盘率低于 60%，表达提升不可稳定验证。" : "",
    delayCount ? `本周有 ${delayCount} 条延期，需要调整任务颗粒度。` : ""
  ].filter(Boolean).slice(0, 5);
}

function buildNextWeekFocus(typeCounts, acceptedSchedule, interviewReview) {
  return [
    !typeCounts.delivery_record ? "至少记录一条机会/JD/HR 反馈，校准知识边界。" : "",
    !typeCounts.review ? "每天收尾补一条复盘证据，先写事实再写欠缺。" : "",
    acceptedSchedule.total && acceptedSchedule.rate < 60 ? "下一轮 AI 日程建议只保留一条当天可完成动作。" : "",
    interviewReview.total && interviewReview.rate < 60 ? "补一轮 60 秒回答和复盘证据。" : "",
    "保留已产生验证证据的动作，下周只扩一个新变量。"
  ].filter(Boolean).slice(0, 4);
}

function outcomeScore({ evidenceCount, effectiveActionCount, acceptedScheduleRate, interviewReviewRate, feedbackReviewedCount }) {
  return Math.min(100,
    Math.min(25, evidenceCount * 5)
    + Math.min(25, effectiveActionCount * 10)
    + (acceptedScheduleRate ? Math.min(20, Math.round(acceptedScheduleRate / 5)) : 0)
    + (interviewReviewRate ? Math.min(15, Math.round(interviewReviewRate / 7)) : 0)
    + (feedbackReviewedCount ? 15 : 0)
  );
}

function scoreLabel(score) {
  if (score >= 80) return "推进稳定";
  if (score >= 60) return "闭环成形";
  if (score >= 40) return "局部有效";
  return "证据不足";
}

function countEvidenceTypes(records) {
  return records.reduce((counts, record) => {
    counts[record.type] = (counts[record.type] || 0) + 1;
    return counts;
  }, {
    review: 0,
    oral_score: 0,
    interview_answer: 0,
    delivery_record: 0,
    learning_note: 0
  });
}

function normalizeEvidence(taskId, record) {
  if (!record || typeof record !== "object") return null;
  return {
    id: text(record, "id"),
    taskId: text(record, "taskId") || taskId,
    type: text(record, "type"),
    title: text(record, "title"),
    content: text(record, "content"),
    createdAt: text(record, "createdAt"),
    verified: Boolean(record.verified)
  };
}

function normalizeOutcomeSnapshots(value) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && item.schemaVersion === "coach-outcome-report-v1").slice(0, 20)
    : [];
}

function booleanMap(value) {
  return Object.fromEntries(Object.entries(objectOrEmpty(value)).filter(([, done]) => typeof done === "boolean"));
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

function parseDateOnly(value) {
  const textValue = typeof value === "string" && value.trim() ? value.trim().slice(0, 10) : "";
  const date = textValue ? new Date(`${textValue}T00:00:00+08:00`) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function isInsideWindow(value, start, end) {
  const raw = typeof value === "string" && value.length === 10 ? `${value}T12:00:00+08:00` : value;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return false;
  const endExclusive = addDays(end, 1);
  return date.getTime() >= start.getTime() && date.getTime() < endExclusive.getTime();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = {
  buildCoachOutcomeReport,
  handleCoachOutcomes,
  normalizeOutcomeSnapshots
};

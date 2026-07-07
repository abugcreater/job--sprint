const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough } = require("stream");

delete process.env.ANTHROPIC_BASE_URL;
delete process.env.ANTHROPIC_AUTH_TOKEN;
delete process.env.JOB_SPRINT_USERS_FILE;
process.env.ASR_PROVIDER = "none";
process.env.ASR_MAX_AUDIO_BYTES = "1024";
process.env.RUNTIME_DATA_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-ai-feedback-")), "runtime.json");
process.env.JOB_SPRINT_SESSION_SECRET = ["node", "ai", "routes", "boundary", "session", "secret"].join("-");
process.env.JOB_SPRINT_USERS_JSON = JSON.stringify({
  users: [
    {
      username: "kai",
      displayName: "Kai",
      role: "owner",
      dataScope: "kai",
      inviteBatch: "2026-07-alpha",
      passwordHash: "00".repeat(32)
    },
    {
      username: "alex",
      displayName: "Alex",
      role: "coach",
      dataScope: "alex",
      inviteBatch: "2026-07-alpha",
      passwordHash: "11".repeat(32)
    }
  ]
});

const app = fs.readFileSync("apps/server/app.js", "utf8");
const aiRoutes = fs.readFileSync("apps/server/ai_routes.js", "utf8");
const { handleGenerateBoundarySuggestions, handleGenerateCoachArtifacts, handleGenerateKb, handleScore, handleTranscribe } = require("../apps/server/ai_routes.js");
const { handleCoachBoundaryFeedback } = require("../apps/server/coach_boundary_feedback_routes.js");
const { handleCoachFeedback, handleCoachInvitations, handleCoachOnboardingReport, handleCoachOutcomes } = require("../apps/server/coach_feedback_routes.js");
const { handleCoachOnboardingEvents } = require("../apps/server/coach_onboarding_events_routes.js");
const { readUserRuntimeState, writeRuntimeState } = require("../apps/server/runtime_store.js");
const coachFeedbackRoutes = fs.readFileSync("apps/server/coach_feedback_routes.js", "utf8");
const coachFeedbackSummary = fs.readFileSync("apps/server/coach_feedback_summary.js", "utf8");
const coachOutcomesRoutes = fs.readFileSync("apps/server/coach_outcomes_routes.js", "utf8");
const coachBoundaryFeedbackRoutes = fs.readFileSync("apps/server/coach_boundary_feedback_routes.js", "utf8");
const coachInvitationsRoutes = fs.readFileSync("apps/server/coach_invitations_routes.js", "utf8");
const coachInvitationImportRoutes = fs.readFileSync("apps/server/coach_invitation_import_routes.js", "utf8");
const coachInvitationNotifications = fs.readFileSync("apps/server/coach_invitation_notifications.js", "utf8");
const authAccountBatchStore = fs.readFileSync("apps/server/auth_account_batch_store.js", "utf8");
const coachOnboardingEventsRoutes = fs.readFileSync("apps/server/coach_onboarding_events_routes.js", "utf8");

assert.match(app, /require\("\.\/ai_routes"\)/);
assert.match(app, /handleGenerateCoachArtifacts/);
assert.match(app, /handleGenerateBoundarySuggestions/);
assert.match(app, /handleScore/);
assert.match(app, /handleGenerateKb/);
assert.match(app, /handleTranscribe/);
assert.match(app, /handleCoachFeedback/);
assert.match(app, /handleCoachOutcomes/);
assert.match(app, /handleCoachBoundaryFeedback/);
assert.match(app, /handleCoachInvitations/);
assert.match(app, /handleCoachOnboardingEvents/);
assert.match(app, /handleCoachOnboardingReport/);
assert.match(app, /pathname === "\/api\/coach\/feedback"/);
assert.match(app, /pathname === "\/api\/coach\/outcomes"/);
assert.match(app, /pathname === "\/api\/coach\/boundary-feedback"/);
assert.match(app, /pathname === "\/api\/coach\/invitations"/);
assert.match(app, /pathname === "\/api\/coach\/onboarding-events"/);
assert.match(app, /pathname === "\/api\/coach\/onboarding-report"/);
assert.match(app, /pathname === "\/api\/coach\/boundary-suggestions"/);
assert.doesNotMatch(app, /async function handleScore\(/);
assert.doesNotMatch(app, /async function handleGenerateKb\(/);
assert.doesNotMatch(app, /async function handleTranscribe\(/);
assert.doesNotMatch(app, /function loadInterviewContext\(/);
assert.doesNotMatch(app, /function requirePermission\(/);
assert.doesNotMatch(app, /parseMultipartAudio/);
assert.doesNotMatch(app, /maxTranscribeBytes/);

assert.match(aiRoutes, /async function handleScore\(/);
assert.match(aiRoutes, /async function handleGenerateKb\(/);
assert.match(aiRoutes, /async function handleGenerateCoachArtifacts\(/);
assert.match(aiRoutes, /async function handleGenerateBoundarySuggestions\(/);
assert.match(aiRoutes, /async function handleTranscribe\(/);
assert.match(aiRoutes, /function loadInterviewContext\(/);
assert.match(aiRoutes, /function requirePermission\(/);
assert.match(aiRoutes, /generateCoachArtifactsWithAnthropic/);
assert.match(aiRoutes, /localGenerateCoachArtifacts/);
assert.match(aiRoutes, /generateBoundarySuggestionsWithAnthropic/);
assert.match(aiRoutes, /localGenerateBoundarySuggestions/);
assert.match(aiRoutes, /generateKbWithAnthropic/);
assert.match(aiRoutes, /scoreWithAnthropic/);
assert.match(aiRoutes, /parseMultipartAudio/);
assert.match(aiRoutes, /maxTranscribeBytes/);
assert.match(aiRoutes, /module\.exports = \{/);
assert.doesNotMatch(aiRoutes, /http\.createServer/);
assert.doesNotMatch(aiRoutes, /async function route/);
assert.doesNotMatch(aiRoutes, /readRuntimeState/);
assert.doesNotMatch(aiRoutes, /writeRuntimeState/);
assert.doesNotMatch(aiRoutes, /serveStatic/);
assert.match(coachFeedbackSummary, /function summarizeFeedback\(/);
assert.match(coachFeedbackSummary, /function nextPromptHint\(/);
assert.match(coachOutcomesRoutes, /function buildCoachOutcomeReport\(/);
assert.match(coachOutcomesRoutes, /server-weekly-runtime/);
assert.match(coachOutcomesRoutes, /coachOutcomeSnapshots/);
assert.match(coachBoundaryFeedbackRoutes, /function summarizeBoundaryFeedback\(/);
assert.match(coachBoundaryFeedbackRoutes, /function topCalibrationTopics\(/);
assert.match(coachBoundaryFeedbackRoutes, /handleCoachBoundaryFeedback/);
assert.match(coachFeedbackRoutes, /handleCoachInvitations/);
assert.match(coachInvitationsRoutes, /function summarizeInvitations\(/);
assert.match(coachInvitationsRoutes, /function invitationFromPayload\(/);
assert.match(coachInvitationsRoutes, /function updateInvitationBatchStatus\(/);
assert.match(coachInvitationsRoutes, /function deleteInvitation\(/);
assert.match(coachInvitationImportRoutes, /function bulkImportInvitations\(/);
assert.match(coachInvitationImportRoutes, /writeRuntimeEnvelope/);
assert.match(coachInvitationsRoutes, /updateUserAccountStatus/);
assert.match(coachInvitationsRoutes, /updateUserAccountBatchStatus/);
assert.match(coachInvitationsRoutes, /userAccountsForManagement/);
assert.match(coachInvitationsRoutes, /operation === "account-status"/);
assert.match(coachInvitationsRoutes, /operation === "account-batch-status"/);
assert.match(coachInvitationsRoutes, /operation === "notification-draft"/);
assert.match(coachInvitationsRoutes, /operation === "bulk-import"/);
assert.match(coachInvitationsRoutes, /templateVersion/);
assert.match(coachInvitationNotifications, /function buildInvitationNotificationAction/);
assert.match(coachInvitationNotifications, /密码请通过单独安全渠道/);
assert.doesNotMatch(coachInvitationNotifications, /writeRuntimeEnvelope/);
assert.doesNotMatch(coachInvitationNotifications, /writeUsersConfig/);
assert.match(authAccountBatchStore, /function updateUserAccountBatchStatus/);
assert.match(authAccountBatchStore, /writeUsersConfig/);
assert.match(authAccountBatchStore, /protected_account/);
assert.match(coachOnboardingEventsRoutes, /function summarizeOnboardingEvents\(/);
assert.match(coachOnboardingEventsRoutes, /function summarizeInviteReport\(/);
assert.match(coachOnboardingEventsRoutes, /function highestRiskLabel\(/);
assert.doesNotMatch(app, /function summarizeFeedback\(/);
assert.doesNotMatch(app, /function buildCoachOutcomeReport\(/);
assert.doesNotMatch(app, /function summarizeBoundaryFeedback\(/);
assert.doesNotMatch(app, /function summarizeInvitations\(/);
assert.doesNotMatch(app, /function summarizeOnboardingEvents\(/);

const ownerAuth = { userProfile: { permissions: ["ai:use"] } };
const viewerAuth = { userProfile: { permissions: [] } };
const ownerReportAuth = {
  userProfile: { username: "kai", displayName: "Kai", dataScope: "kai", inviteBatch: "2026-07-alpha", permissions: ["*"], readOnly: false },
  config: {
    users: [
      { username: "kai", displayName: "Kai", dataScope: "kai", inviteBatch: "2026-07-alpha" },
      { username: "alex", displayName: "Alex", dataScope: "alex", inviteBatch: "2026-07-alpha" }
    ]
  }
};
const alexReportAuth = {
  userProfile: { username: "alex", displayName: "Alex", dataScope: "alex", inviteBatch: "2026-07-alpha", permissions: ["ai:use"], readOnly: false },
  config: ownerReportAuth.config
};

function fakeResponse() {
  return {
    status: null,
    headers: null,
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
    },
    json() {
      return JSON.parse(this.body);
    }
  };
}

function request(method, body, headers = {}) {
  const req = new PassThrough();
  req.method = method;
  req.headers = headers;
  req.socket = { remoteAddress: "127.0.0.1" };
  if (body !== undefined) {
    req.end(body);
  } else {
    req.end();
  }
  return req;
}

function jsonRequest(method, payload) {
  return request(method, JSON.stringify(payload), { "content-type": "application/json" });
}

function multipart(audio) {
  const boundary = "----job-sprint-ai-routes-boundary";
  const head = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="audio"; filename="answer.m4a"',
    "Content-Type: audio/mp4",
    "",
    ""
  ].join("\r\n"));
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, Buffer.from(audio)]).length
      ? Buffer.concat([head, Buffer.from(audio), tail])
      : Buffer.concat([head, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

(async () => {
  let res = fakeResponse();
  await handleScore(jsonRequest("POST", {
    question: "Spring 事务传播？",
    answer: "先讲 REQUIRED，再讲回滚边界。"
  }), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleScore(jsonRequest("POST", { question: "Spring 事务传播？" }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "question and answer are required");

  res = fakeResponse();
  await handleScore(jsonRequest("POST", {
    question: "Redis 和 MQ 的边界？",
    answer: "首先说明 Redis 缓存边界，其次说明 MQ 异步链路，最后给出排查证据。",
    expectedKeywords: ["Redis", "MQ", "边界"]
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().provider, "local-fallback");
  assert.ok(res.json().score > 50);

  res = fakeResponse();
  await handleGenerateKb(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 405);

  res = fakeResponse();
  await handleGenerateKb(jsonRequest("POST", { topic: "JVM 调优" }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().provider, "local-fallback");
  assert.ok(res.json().entries.length >= 2);

  res = fakeResponse();
  await handleGenerateCoachArtifacts(jsonRequest("POST", {
    profile: { id: "profile-viewer", targetRole: "前端工程师" }
  }), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleGenerateCoachArtifacts(jsonRequest("GET", {}), res, ownerAuth);
  assert.strictEqual(res.status, 405);

  res = fakeResponse();
  await handleGenerateCoachArtifacts(jsonRequest("POST", { knowledgeBoundaries: [] }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "profile_required");

  res = fakeResponse();
  await handleGenerateCoachArtifacts(jsonRequest("POST", {
    profile: { id: "profile-kai", targetRole: "后端工程师", roleFamily: "backend", dailyMinutes: 60 },
    knowledgeBoundaries: [{ topic: "MQ 幂等", level: "了解", gap: "缺少故障证据" }],
    sprint: { date: "2026-07-06", currentTask: { title: "补 MQ 幂等证据" } }
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().provider, "local-fallback");
  assert.strictEqual(res.json().promptVersion, "coach-artifacts-v1");
  assert.strictEqual(res.json().schemaVersion, "coach-artifact-list-v1");
  assert.match(res.json().inputSummaryHash, /^[a-f0-9]{16}$/);
  assert.strictEqual(res.json().artifacts.length, 3);
  assert.strictEqual(res.json().artifacts[0].profileId, "profile-kai");
  assert.strictEqual(res.json().artifacts[0].status, "draft");

  res = fakeResponse();
  await handleGenerateBoundarySuggestions(jsonRequest("POST", {
    profile: { id: "profile-viewer", targetRole: "实施顾问" },
    text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。"
  }), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleGenerateBoundarySuggestions(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 405);

  res = fakeResponse();
  await handleGenerateBoundarySuggestions(jsonRequest("POST", { text: "太短" }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "profile_required");

  res = fakeResponse();
  await handleGenerateBoundarySuggestions(jsonRequest("POST", {
    profile: { id: "profile-impl", targetRole: "实施顾问", roleFamily: "implementation" },
    knowledgeBoundaries: [{ topic: "Redis" }],
    text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().provider, "local-fallback");
  assert.strictEqual(res.json().promptVersion, "coach-boundary-suggestions-v1");
  assert.ok(res.json().suggestions.some((item) => item.topic === "MQ"));
  assert.ok(res.json().suggestions.every((item) => item.topic !== "Redis"));

  res = fakeResponse();
  await handleCoachFeedback(jsonRequest("GET", {}), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleCoachFeedback(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.json().feedback, []);
  assert.strictEqual(res.json().summary.reviewedCount, 0);
  assert.strictEqual(res.json().summary.acceptanceRateLabel, "暂无");

  res = fakeResponse();
  await handleCoachFeedback(jsonRequest("POST", { artifactId: "artifact-1", decision: "maybe" }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "invalid_feedback_decision");

  res = fakeResponse();
  await handleCoachFeedback(jsonRequest("POST", {
    profileId: "profile-kai",
    artifactId: "artifact-1",
    llmRunId: "llm-run-1",
    artifactType: "knowledge_card",
    decision: "accepted",
    title: "MQ 幂等知识卡"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().feedback.profileId, "profile-kai");
  assert.strictEqual(res.json().feedback.decision, "accepted");
  assert.strictEqual(res.json().summary.reviewedCount, 1);
  assert.strictEqual(res.json().summary.acceptanceRateLabel, "100%");

  res = fakeResponse();
  await handleCoachFeedback(jsonRequest("POST", {
    profileId: "profile-kai",
    artifactId: "artifact-2",
    llmRunId: "llm-run-1",
    artifactType: "schedule_suggestion",
    decision: "rejected",
    reason: "今天不需要新增日程",
    title: "补 MQ 幂等练习"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().feedback.decision, "rejected");
  assert.strictEqual(res.json().summary.reviewedCount, 2);
  assert.strictEqual(res.json().summary.acceptanceRateLabel, "50%");

  res = fakeResponse();
  await handleCoachFeedback(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().feedback.length, 2);
  assert.strictEqual(res.json().feedback[1].artifactId, "artifact-1");
  assert.strictEqual(res.json().feedback[1].llmRunId, "llm-run-1");
  assert.strictEqual(res.json().summary.topRejectedTypes[0].label, "日程建议");
  assert.deepStrictEqual(res.json().summary.recentRejectionReasons, ["今天不需要新增日程"]);
  assert.match(res.json().summary.nextPromptHint, /少生成日程建议类低贴合建议/);

  writeRuntimeState({
    progress: {
      completed: {
        "coach-event-event-ai-1": true,
        "manual-review-task": true
      },
      evidenceByTaskId: {
        "coach-event-event-ai-1": [{
          id: "evidence-ai-1",
          taskId: "coach-event-event-ai-1",
          type: "interview_answer",
          title: "AI 采纳日程复盘",
          content: "围绕 MQ 故障恢复完成一次 60 秒回答。",
          createdAt: "2026-07-06T21:00:00+08:00",
          verified: true
        }],
        "manual-review-task": [{
          id: "evidence-review-1",
          taskId: "manual-review-task",
          type: "review",
          title: "周复盘",
          content: "路径问题：AI 建议需要更小颗粒度。",
          createdAt: "2026-07-06T22:00:00+08:00",
          verified: true
        }]
      },
      delayRecords: [{
        id: "delay-1",
        taskId: "manual-review-task",
        date: "2026-07-06",
        minutes: 30,
        reason: "面试加时",
        recoveryAction: "压缩复盘范围",
        createdAt: "2026-07-06T19:00:00+08:00"
      }],
      coachFeedback: [{
        id: "feedback-schedule-accepted",
        profileId: "profile-kai",
        artifactId: "artifact-schedule-1",
        artifactType: "schedule_suggestion",
        decision: "accepted",
        title: "补 MQ 故障恢复回答",
        createdAt: "2026-07-06T18:00:00+08:00"
      }],
      coach: {
        coachScheduleEvents: [{
          id: "event-ai-1",
          profileId: "profile-kai",
          date: "2026-07-06",
          start: "20:00",
          end: "20:30",
          kind: "interview",
          title: "补 MQ 故障恢复回答",
          reason: "AI 建议采纳",
          evidenceRequired: true,
          acceptedFromArtifactId: "artifact-schedule-1",
          createdAt: "2026-07-06T18:00:00+08:00",
          updatedAt: "2026-07-06T18:00:00+08:00"
        }]
      }
    },
    reviews: {},
    applications: [],
    interviewMistakes: []
  }, ownerReportAuth);

  res = fakeResponse();
  const outcomeGet = request("GET");
  outcomeGet.url = "/api/coach/outcomes?date=2026-07-06";
  await handleCoachOutcomes(outcomeGet, res, viewerAuth);
  assert.strictEqual(res.status, 403);

  res = fakeResponse();
  const outcomeRead = request("GET");
  outcomeRead.url = "/api/coach/outcomes?date=2026-07-06";
  await handleCoachOutcomes(outcomeRead, res, ownerReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().outcome.attributionLevel, "server-weekly-runtime");
  assert.strictEqual(res.json().outcome.metrics.effectiveActionCount, 2);
  assert.strictEqual(res.json().outcome.metrics.acceptedScheduleCompletionRateLabel, "100%");
  assert.strictEqual(res.json().outcome.metrics.interviewReviewRateLabel, "100%");
  assert.strictEqual(res.json().outcome.metrics.delayCount, 1);

  res = fakeResponse();
  await handleCoachOutcomes(jsonRequest("POST", { date: "2026-07-06" }), res, ownerReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().snapshots.length, 1);
  assert.strictEqual(res.json().outcome.schemaVersion, "coach-outcome-report-v1");
  assert.strictEqual(readUserRuntimeState(ownerReportAuth).progress.coachOutcomeSnapshots[0].metrics.effectiveActionCount, 2);

  res = fakeResponse();
  await handleCoachBoundaryFeedback(request("GET"), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleCoachBoundaryFeedback(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.json().feedback, []);
  assert.strictEqual(res.json().summary.totalCount, 0);
  assert.strictEqual(res.json().summary.revisionRateLabel, "暂无");

  res = fakeResponse();
  await handleCoachBoundaryFeedback(jsonRequest("POST", {
    suggestionId: "boundary-suggestion-1",
    topic: "MQ",
    decision: "maybe"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "invalid_boundary_feedback_decision");

  res = fakeResponse();
  await handleCoachBoundaryFeedback(jsonRequest("POST", {
    profileId: "profile-kai",
    suggestionId: "boundary-suggestion-1",
    topic: "MQ",
    decision: "rejected",
    reason: "已有更准确材料",
    sourceProvider: "local-fallback",
    sourcePromptVersion: "coach-boundary-suggestions-v1",
    sourceInputHash: "hash-mq"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().feedback.profileId, "profile-kai");
  assert.strictEqual(res.json().feedback.decision, "rejected");
  assert.strictEqual(res.json().summary.totalCount, 1);
  assert.strictEqual(res.json().summary.revisionRateLabel, "100%");
  assert.strictEqual(res.json().summary.topTopics[0].topic, "MQ");

  res = fakeResponse();
  await handleCoachBoundaryFeedback(jsonRequest("POST", {
    profileId: "profile-kai",
    suggestionId: "boundary-suggestion-2",
    topic: "Redis",
    decision: "needs_revision",
    reason: "需要拆成缓存击穿和数据一致性"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().summary.revisionCount, 1);
  assert.match(res.json().summary.nextExtractionHint, /候选边界需要校准/);

  res = fakeResponse();
  await handleCoachBoundaryFeedback(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().feedback.length, 2);
  assert.strictEqual(res.json().feedback[1].suggestionId, "boundary-suggestion-1");
  assert.deepStrictEqual([...res.json().summary.recentReasons].sort(), ["已有更准确材料", "需要拆成缓存击穿和数据一致性"].sort());

  res = fakeResponse();
  await handleCoachOnboardingEvents(jsonRequest("GET", {}), res, viewerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleCoachOnboardingEvents(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.json().events, []);
  assert.strictEqual(res.json().summary.eventCount, 0);
  assert.strictEqual(res.json().summary.firstLoginStatus, "等待首登");

  res = fakeResponse();
  await handleCoachOnboardingEvents(jsonRequest("POST", {
    stepId: "missing-step",
    progressLabel: "1/5",
    completionRate: 20,
    dropOffLabel: "首登画像模板",
    riskLabel: "高风险",
    nextActionLabel: "进入首登模板"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "invalid_step_id");

  res = fakeResponse();
  await handleCoachOnboardingEvents(jsonRequest("POST", {
    profileId: "profile-kai",
    stepId: "profile_template",
    stepLabel: "首登画像模板",
    progressLabel: "1/5",
    completionRate: 20,
    completionRateLabel: "20%",
    dropOffLabel: "首登画像模板",
    riskLabel: "高风险",
    nextActionLabel: "进入首登模板",
    source: "react-first-login"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().event.profileId, "profile-kai");
  assert.strictEqual(res.json().event.stepId, "profile_template");
  assert.strictEqual(res.json().summary.latestCompletionRateLabel, "20%");
  assert.strictEqual(res.json().summary.highestRiskLabel, "高风险");
  assert.strictEqual(res.json().summary.firstLoginStatus, "首登进行中");

  res = fakeResponse();
  await handleCoachOnboardingEvents(jsonRequest("POST", {
    profileId: "profile-kai",
    stepId: "complete",
    stepLabel: "首登完成",
    progressLabel: "5/5",
    completionRate: 100,
    dropOffLabel: "无放弃点",
    riskLabel: "无风险",
    nextActionLabel: "进入日常迭代"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().summary.eventCount, 2);
  assert.strictEqual(res.json().summary.latestCompletionRateLabel, "100%");
  assert.strictEqual(res.json().summary.latestDropOffLabel, "无放弃点");
  assert.strictEqual(res.json().summary.highestRiskLabel, "高风险");
  assert.strictEqual(res.json().summary.firstLoginStatus, "首登完成");

  res = fakeResponse();
  await handleCoachOnboardingEvents(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().events.length, 2);
  assert.strictEqual(res.json().events[0].stepId, "complete");
  assert.strictEqual(res.json().events[1].stepId, "profile_template");

  res = fakeResponse();
  await handleCoachOnboardingEvents(jsonRequest("POST", {
    profileId: "profile-alex",
    stepId: "material_boundary",
    stepLabel: "批量素材与边界",
    progressLabel: "2/5",
    completionRate: 40,
    dropOffLabel: "批量素材与边界",
    riskLabel: "中风险",
    nextActionLabel: "导入素材"
  }), res, alexReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().event.profileId, "profile-alex");

  res = fakeResponse();
  await handleCoachOnboardingReport(request("GET"), res, ownerReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().summary.totalUsers, 2);
  assert.strictEqual(res.json().summary.startedCount, 2);
  assert.strictEqual(res.json().summary.completedCount, 1);
  assert.strictEqual(res.json().summary.completionRateLabel, "50%");
  assert.strictEqual(res.json().summary.topDropOffs[0].label, "批量素材与边界");
  assert.strictEqual(res.json().batches[0].inviteBatch, "2026-07-alpha");
  assert.strictEqual(res.json().batches[0].topDropOffLabel, "批量素材与边界");
  assert.strictEqual(res.json().users.find((user) => user.username === "alex").summary.latestCompletionRateLabel, "40%");

  res = fakeResponse();
  await handleCoachOnboardingReport(request("GET"), res, alexReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().summary.totalUsers, 1);
  assert.strictEqual(res.json().users[0].username, "alex");

  res = fakeResponse();
  await handleCoachInvitations(request("GET"), res, ownerAuth);
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.json().error, "forbidden");

  res = fakeResponse();
  await handleCoachInvitations(jsonRequest("POST", {
    username: "mia",
    displayName: "Mia",
    dataScope: "mia",
    inviteBatch: "2026-07-beta",
    roleFamily: "qa",
    targetRole: "测试开发工程师",
    status: "invited",
    note: "首批外部试用"
  }), res, ownerReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().invitation.username, "mia");
  assert.strictEqual(res.json().invitation.inviteBatch, "2026-07-beta");
  assert.strictEqual(res.json().summary.totalInvitations, 1);
  assert.strictEqual(res.json().summary.invitedCount, 1);

  res = fakeResponse();
  await handleCoachInvitations(request("GET"), res, ownerReportAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().invitations[0].username, "mia");
  assert.strictEqual(res.json().configuredUsers.length, 2);
  assert.strictEqual(res.json().configuredUsers[0].inviteBatch, "2026-07-alpha");
  assert.strictEqual(res.json().summary.nextActionLabel, "为 active 用户开通账号、发送登录入口，并跟进首登完成率。");
  assert.strictEqual(res.json().accountProvisioning.enabled, false);

  res = fakeResponse();
  await handleTranscribe(request("POST", Buffer.from("not multipart"), {
    "content-type": "application/octet-stream"
  }), res, ownerAuth);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json().error, "malformed_upload");

  const upload = multipart("fake-audio");
  res = fakeResponse();
  await handleTranscribe(request("POST", upload.body, {
    "content-type": upload.contentType,
    "content-length": upload.body.length
  }), res, ownerAuth);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json().mode, "not_configured");
  assert.strictEqual(res.json().audioBytes, Buffer.byteLength("fake-audio"));

  process.env.ASR_MAX_AUDIO_BYTES = "64";
  const tooLarge = multipart(Buffer.alloc(128, 1));
  res = fakeResponse();
  await handleTranscribe(request("POST", tooLarge.body, {
    "content-type": tooLarge.contentType,
    "content-length": tooLarge.body.length
  }), res, ownerAuth);
  assert.strictEqual(res.status, 413);
  assert.strictEqual(res.json().error, "audio_too_large");

  console.log("node ai routes boundary tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

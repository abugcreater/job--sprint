const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-runtime-"));
const TEST_USER = "test-user";
const TEST_PASSWORD = ["test", "password", "only"].join("-");
const BAD_LOGIN_VALUE = ["wrong", "password"].join("-");
process.env.RUNTIME_DATA_PATH = path.join(tmpDir, "runtime.json");
process.env.ANTHROPIC_AUTH_TOKEN = "test-token-that-must-not-leak";
process.env.AI_PROVIDER_TIMEOUT_MS = "50";
process.env.JOB_SPRINT_AUTH_USER = TEST_USER;
process.env.JOB_SPRINT_AUTH_PASSWORD = TEST_PASSWORD;
process.env.JOB_SPRINT_SESSION_SECRET = ["test", "session", "secret", "only", "long", "enough"].join("-");

const { route } = require("../apps/server/app.js");

function startServer() {
  const server = http.createServer((req, res) => {
    route(req, res).catch((error) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function startHangingProvider() {
  const server = http.createServer(() => {});
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function startBoundaryProvider() {
  const server = http.createServer((req, res) => {
    const text = JSON.stringify({
      inputSummaryHash: "provider-boundary-1",
      suggestions: [
        {
          topic: "Redis",
          level: "可讲",
          gap: "已有主题，应被服务端过滤。",
          evidence: "JD 提到 Redis。",
          targetUse: "用于过滤验证",
          sourceSummary: "Redis 已存在。",
          confidence: "high"
        },
        {
          topic: "RAG",
          level: "了解",
          gap: "补齐检索召回、上下文拼接和幻觉边界。",
          evidence: "JD 要求 RAG 和 Agent 项目经验。",
          targetUse: "Java + AI 工程化岗位：用于回答 RAG 追问",
          sourceSummary: "JD 要求 RAG、Agent、Java 工程化。",
          confidence: "high"
        }
      ]
    });
    const body = JSON.stringify({
      content: [{ type: "text", text }],
      usage: { input_tokens: 12, output_tokens: 34 }
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function request(server, method, requestPath, body, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers
      }
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch (_) {
          json = null;
        }
        resolve({ status: res.statusCode, raw, json, headers: res.headers });
      });
    });
    req.on("error", reject);
    if (body !== undefined) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(server) {
  const res = await request(server, "POST", "/api/auth/login", {
    username: TEST_USER,
    password: TEST_PASSWORD
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers["set-cookie"]);
  const rawCookie = res.headers["set-cookie"][0];
  assert.match(rawCookie, /HttpOnly/);
  assert.match(rawCookie, /SameSite=Lax/);
  assert.match(rawCookie, /Max-Age=/);
  return rawCookie.split(";")[0];
}

(async () => {
  const server = await startServer();
  try {
    let res = await request(server, "GET", "/api/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.authConfigured, true);
    assert.ok(!res.raw.includes("test-token-that-must-not-leak"));

    res = await request(server, "GET", "/api/progress");
    assert.strictEqual(res.status, 401);

    res = await request(server, "POST", "/api/generate-kb", { topic: "JVM G1/ZGC" });
    assert.strictEqual(res.status, 401);
    res = await request(server, "POST", "/api/coach/artifacts", {
      profile: { id: "profile-kai", targetRole: "后端工程师" }
    });
    assert.strictEqual(res.status, 401);
    res = await request(server, "POST", "/api/coach/boundary-suggestions", {
      profile: { id: "profile-kai", targetRole: "后端工程师" },
      text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复。"
    });
    assert.strictEqual(res.status, 401);
    res = await request(server, "POST", "/api/coach/feedback", {
      artifactId: "artifact-unauthorized",
      decision: "accepted"
    });
    assert.strictEqual(res.status, 401);
    res = await request(server, "POST", "/api/coach/boundary-feedback", {
      suggestionId: "boundary-unauthorized",
      topic: "MQ",
      decision: "accepted"
    });
    assert.strictEqual(res.status, 401);

    let cookie = await login(server);
    res = await request(server, "GET", "/api/auth/session", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.authenticated, true);

    res = await request(server, "POST", "/api/auth/login", {
      username: TEST_USER,
      password: TEST_PASSWORD
    }, { "x-forwarded-proto": "https" });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers["set-cookie"][0], /Secure/);

    for (let i = 0; i < 8; i += 1) {
      res = await request(server, "POST", "/api/auth/login", {
        username: "rate-limited-user",
        password: BAD_LOGIN_VALUE
      });
      assert.strictEqual(res.status, 401);
    }
    res = await request(server, "POST", "/api/auth/login", {
      username: "rate-limited-user",
      password: BAD_LOGIN_VALUE
    });
    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json.error, "too_many_login_attempts");
    assert.ok(res.headers["retry-after"]);

    res = await request(server, "POST", "/api/progress", { "block-1": true }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.progress["block-1"], true);
    res = await request(server, "GET", "/api/progress", undefined, { cookie });
    assert.strictEqual(res.json.progress["block-1"], true);

    res = await request(server, "POST", "/api/runtime", {
      data: {
        progress: {
          completed: { "runtime-sync": true },
          evidenceByTaskId: {
            "runtime-sync": [{ id: "ev-1", title: "runtime proof", content: "saved", type: "review" }]
          },
          lastSavedAt: "2026-07-05T08:00:00.000Z"
        },
        reviews: { "2026-07-05": { projectPoint: "Node runtime bridge" } },
        applications: [{ id: "runtime-app", company: "Runtime DB", role: "Rust API" }],
        interviewMistakes: [{ id: "runtime-mistake", question: "SQLite WAL?", score: 71 }]
      }
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.storage, "server-json");
    assert.strictEqual(res.json.data.progress.completed["runtime-sync"], true);
    res = await request(server, "GET", "/api/runtime", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.data.reviews["2026-07-05"].projectPoint, "Node runtime bridge");
    assert.strictEqual(res.json.data.applications[0].id, "runtime-app");
    assert.strictEqual(res.json.data.interviewMistakes[0].id, "runtime-mistake");
    res = await request(server, "POST", "/api/applications", { applications: [] }, { cookie });
    assert.strictEqual(res.status, 200);
    res = await request(server, "POST", "/api/interview-mistakes", { interviewMistakes: [] }, { cookie });
    assert.strictEqual(res.status, 200);

    res = await request(server, "POST", "/api/generate-kb", {
      topic: "Spring 事务传播级别",
      currentTask: {
        title: "Spring 事务与搜索链路边界",
        javaMapping: "Spring AOP、事务传播、外部依赖边界"
      }
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.json.entries));
    assert.ok(res.json.entries.length >= 1);
    assert.ok(res.json.entries.every((entry) => entry.interviewQuestion && entry.javaMapping));
    assert.ok(!res.raw.includes("test-token-that-must-not-leak"));

    res = await request(server, "POST", "/api/coach/artifacts", {
      profile: { id: "profile-kai", targetRole: "后端工程师", roleFamily: "backend", dailyMinutes: 60 },
      knowledgeBoundaries: [{ topic: "MQ 幂等", level: "了解", gap: "缺少故障证据" }],
      opportunitySignals: [{
        company: "杭研平台",
        role: "高级 Java 后端",
        status: "约面",
        keywords: ["MQ", "Redis", "稳定性"],
        feedback: "面试官关注故障恢复"
      }],
      sprint: { date: "2026-07-06", currentTask: { title: "补 MQ 幂等证据" } }
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.provider, "local-fallback");
    assert.strictEqual(res.json.promptVersion, "coach-artifacts-v1");
    assert.strictEqual(res.json.schemaVersion, "coach-artifact-list-v1");
    assert.match(res.json.inputSummaryHash, /^[a-f0-9]{16}$/);
    assert.strictEqual(res.json.artifacts.length, 3);
    assert.strictEqual(res.json.artifacts[0].profileId, "profile-kai");
    assert.strictEqual(res.json.artifacts[0].status, "draft");
    assert.ok(res.json.artifacts[0].sources.some((source) => source.includes("MQ 幂等")));
    assert.ok(res.json.artifacts[0].sources.some((source) => source.includes("角色视角：服务链路")));
    assert.ok(res.json.artifacts[0].sources.some((source) => source.includes("机会：杭研平台-高级 Java 后端")));
    assert.match(res.json.artifacts[0].body, /接口\/任务链路/);
    assert.match(res.json.artifacts[0].reason, /面试官关注故障恢复/);
    const coachArtifactId = res.json.artifacts[0].id;

    res = await request(server, "POST", "/api/coach/boundary-suggestions", {
      profile: { id: "profile-impl", targetRole: "实施顾问", roleFamily: "implementation" },
      knowledgeBoundaries: [{ topic: "Redis" }],
      text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。"
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.provider, "local-fallback");
    assert.strictEqual(res.json.promptVersion, "coach-boundary-suggestions-v1");
    assert.strictEqual(res.json.schemaVersion, "coach-boundary-suggestion-list-v1");
    assert.match(res.json.inputSummaryHash, /^[a-f0-9]{16}$/);
    assert.ok(res.json.suggestions.some((item) => item.topic === "MQ"));
    assert.ok(res.json.suggestions.some((item) => item.topic === "稳定性"));
    assert.ok(res.json.suggestions.every((item) => item.topic !== "Redis"));

    const boundaryProvider = await startBoundaryProvider();
    try {
      const { port: boundaryProviderPort } = boundaryProvider.address();
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${boundaryProviderPort}`;
      process.env.ANTHROPIC_MODEL = "mock-boundary-model";
      res = await request(server, "POST", "/api/coach/boundary-suggestions", {
        profile: { id: "profile-ai", targetRole: "Java + AI 工程化", roleFamily: "backend" },
        knowledgeBoundaries: [{ topic: "Redis" }],
        text: "JD 要求 RAG、Agent、Java 工程化，面试反馈需要说明检索召回和幻觉边界。"
      }, { cookie });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.provider, "anthropic-compatible");
      assert.strictEqual(res.json.model, "mock-boundary-model");
      assert.strictEqual(res.json.inputSummaryHash, "provider-boundary-1");
      assert.ok(res.json.suggestions.some((item) => item.topic === "RAG"));
      assert.ok(res.json.suggestions.every((item) => item.topic !== "Redis"));
      assert.match(res.json.suggestions[0].sourceSummary, /JD/);
    } finally {
      delete process.env.ANTHROPIC_BASE_URL;
      delete process.env.ANTHROPIC_MODEL;
      boundaryProvider.close();
    }

    res = await request(server, "POST", "/api/coach/feedback", {
      profileId: "profile-kai",
      artifactId: coachArtifactId,
      llmRunId: "llm-run-node-test",
      artifactType: "knowledge_card",
      decision: "rejected",
      reason: "需要更贴近项目证据",
      title: "MQ 幂等知识卡"
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.storage, "server-json");
    assert.strictEqual(res.json.feedback.decision, "rejected");
    assert.strictEqual(res.json.feedback.artifactId, coachArtifactId);
    assert.strictEqual(res.json.summary.reviewedCount, 1);
    assert.strictEqual(res.json.summary.acceptanceRateLabel, "0%");
    res = await request(server, "GET", "/api/coach/feedback", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.feedback.length, 1);
    assert.strictEqual(res.json.feedback[0].reason, "需要更贴近项目证据");
    assert.strictEqual(res.json.summary.rejectedCount, 1);
    assert.strictEqual(res.json.summary.qualityLabel, "偏离目标");
    assert.strictEqual(res.json.summary.topRejectedTypes[0].label, "知识卡");
    assert.strictEqual(res.json.summary.recentRejectionReasons[0], "需要更贴近项目证据");
    res = await request(server, "GET", "/api/runtime", undefined, { cookie });
    assert.strictEqual(res.json.data.progress.coachFeedback[0].artifactId, coachArtifactId);

    res = await request(server, "POST", "/api/runtime", {
      data: {
        progress: {
          completed: {
            "coach-event-event-ai-runtime": true,
            "manual-review-runtime": true
          },
          evidenceByTaskId: {
            "coach-event-event-ai-runtime": [{
              id: "runtime-evidence-interview",
              taskId: "coach-event-event-ai-runtime",
              type: "interview_answer",
              title: "远端周归因面试证据",
              content: "围绕 MQ 故障恢复完成回答。",
              createdAt: "2026-07-06T21:00:00+08:00",
              verified: true
            }],
            "manual-review-runtime": [{
              id: "runtime-evidence-review",
              taskId: "manual-review-runtime",
              type: "review",
              title: "远端周归因复盘",
              content: "路径问题：AI 建议颗粒度偏大。",
              createdAt: "2026-07-06T22:00:00+08:00",
              verified: true
            }]
          },
          delayRecords: [{
            id: "runtime-delay-1",
            taskId: "manual-review-runtime",
            date: "2026-07-06",
            minutes: 30,
            reason: "临时面试加时",
            recoveryAction: "压缩复盘范围",
            createdAt: "2026-07-06T19:00:00+08:00"
          }],
          coach: {
            coachScheduleEvents: [{
              id: "event-ai-runtime",
              profileId: "profile-kai",
              date: "2026-07-06",
              start: "20:00",
              end: "20:30",
              kind: "interview",
              title: "补 MQ 故障恢复回答",
              reason: "AI 日程建议",
              evidenceRequired: true,
              acceptedFromArtifactId: "artifact-schedule-runtime",
              createdAt: "2026-07-06T18:00:00+08:00",
              updatedAt: "2026-07-06T18:00:00+08:00"
            }]
          }
        },
        reviews: {},
        applications: [],
        interviewMistakes: []
      }
    }, { cookie });
    assert.strictEqual(res.status, 200);
    res = await request(server, "GET", "/api/coach/outcomes?date=2026-07-06", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.outcome.attributionLevel, "server-weekly-runtime");
    assert.strictEqual(res.json.outcome.metrics.effectiveActionCount, 2);
    assert.strictEqual(res.json.outcome.metrics.acceptedScheduleCompletionRateLabel, "100%");
    assert.strictEqual(res.json.outcome.metrics.interviewReviewRateLabel, "100%");
    assert.strictEqual(res.json.outcome.metrics.delayCount, 1);
    res = await request(server, "POST", "/api/coach/outcomes", { date: "2026-07-06" }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.outcome.schemaVersion, "coach-outcome-report-v1");
    assert.strictEqual(res.json.snapshots.length, 1);
    res = await request(server, "GET", "/api/runtime", undefined, { cookie });
    assert.strictEqual(res.json.data.progress.coachOutcomeSnapshots[0].metrics.effectiveActionCount, 2);

    res = await request(server, "POST", "/api/coach/boundary-feedback", {
      profileId: "profile-kai",
      suggestionId: "boundary-suggestion-mq",
      topic: "MQ",
      decision: "needs_revision",
      reason: "要按故障恢复和补偿链路拆开",
      sourceSummary: "JD 要求 MQ、Redis、稳定性。",
      sourceConfidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1",
      sourceInputHash: "boundary-hash-mq"
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.storage, "server-json");
    assert.strictEqual(res.json.feedback.decision, "needs_revision");
    assert.strictEqual(res.json.feedback.topic, "MQ");
    assert.strictEqual(res.json.summary.totalCount, 1);
    assert.strictEqual(res.json.summary.revisionRateLabel, "100%");
    assert.strictEqual(res.json.summary.topTopics[0].topic, "MQ");
    res = await request(server, "GET", "/api/coach/boundary-feedback", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.feedback.length, 1);
    assert.strictEqual(res.json.feedback[0].sourcePromptVersion, "coach-boundary-suggestions-v1");
    assert.match(res.json.summary.nextExtractionHint, /候选边界需要校准/);
    res = await request(server, "GET", "/api/runtime", undefined, { cookie });
    assert.strictEqual(res.json.data.progress.coach.boundarySuggestionFeedback[0].suggestionId, "boundary-suggestion-mq");

    res = await request(server, "POST", "/api/coach/onboarding-events", {
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
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.storage, "server-json");
    assert.strictEqual(res.json.event.profileId, "profile-kai");
    assert.strictEqual(res.json.event.stepId, "profile_template");
    assert.strictEqual(res.json.summary.latestCompletionRateLabel, "20%");
    assert.strictEqual(res.json.summary.highestRiskLabel, "高风险");
    res = await request(server, "GET", "/api/coach/onboarding-events", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.events.length, 1);
    assert.strictEqual(res.json.events[0].dropOffLabel, "首登画像模板");
    assert.strictEqual(res.json.summary.firstLoginStatus, "首登进行中");
    res = await request(server, "GET", "/api/coach/onboarding-report", undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.summary.totalUsers, 1);
    assert.strictEqual(res.json.summary.startedCount, 1);
    assert.strictEqual(res.json.summary.completedCount, 0);
    assert.strictEqual(res.json.batches[0].inviteBatch, "default");
    assert.strictEqual(res.json.batches[0].topDropOffLabel, "首登画像模板");
    res = await request(server, "GET", "/api/runtime", undefined, { cookie });
    assert.strictEqual(res.json.data.progress.coachOnboardingEvents[0].stepId, "profile_template");

    const hangingProvider = await startHangingProvider();
    try {
      const { port: providerPort } = hangingProvider.address();
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${providerPort}`;
      res = await request(server, "POST", "/api/generate-kb", {
        topic: "AI provider timeout"
      }, { cookie });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.provider, "local-fallback");
      assert.strictEqual(res.json.warning, "ai_generation_fallback");
      assert.ok(Array.isArray(res.json.entries));
      assert.ok(res.json.entries.length >= 1);

      res = await request(server, "POST", "/api/coach/artifacts", {
        profile: { id: "profile-kai", targetRole: "后端工程师", roleFamily: "backend" },
        knowledgeBoundaries: [{ topic: "Redis 热点", level: "了解", gap: "缺少指标" }],
        sprint: { date: "2026-07-06" }
      }, { cookie });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.provider, "local-fallback");
      assert.strictEqual(res.json.warning, "ai_generation_fallback");
      assert.strictEqual(res.json.promptVersion, "coach-artifacts-v1");
      assert.ok(Array.isArray(res.json.artifacts));
      assert.ok(res.json.artifacts.length >= 1);

      res = await request(server, "POST", "/api/coach/boundary-suggestions", {
        profile: { id: "profile-kai", targetRole: "后端工程师", roleFamily: "backend" },
        text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复。"
      }, { cookie });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.provider, "local-fallback");
      assert.strictEqual(res.json.warning, "ai_generation_fallback");
      assert.ok(Array.isArray(res.json.suggestions));
      assert.ok(res.json.suggestions.length >= 1);
    } finally {
      delete process.env.ANTHROPIC_BASE_URL;
      hangingProvider.close();
    }

    res = await request(server, "POST", "/api/reviews", {
      "2026-07-01": { projectPoint: "API runtime" }
    }, { cookie });
    assert.strictEqual(res.status, 200);
    res = await request(server, "GET", "/api/reviews", undefined, { cookie });
    assert.strictEqual(res.json.reviews["2026-07-01"].projectPoint, "API runtime");

    res = await request(server, "POST", "/api/applications", {
      company: "测试公司",
      role: "高级 Java 后端",
      status: "待投递"
    }, { cookie });
    assert.strictEqual(res.status, 201);
    const applicationId = res.json.application.id;
    res = await request(server, "PUT", `/api/applications/${applicationId}`, { status: "已沟通" }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.application.status, "已沟通");
    res = await request(server, "DELETE", `/api/applications/${applicationId}`, undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.applications.length, 0);
    res = await request(server, "POST", "/api/applications", {
      applications: [
        { id: "offline-app", company: "离线补录公司", role: "Java + AI 工程化" }
      ]
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.applications.length, 1);
    assert.strictEqual(res.json.applications[0].id, "offline-app");

    res = await request(server, "POST", "/api/interview-mistakes", {
      question: "G1 和 ZGC 区别？",
      score: 62
    }, { cookie });
    assert.strictEqual(res.status, 201);
    const mistakeId = res.json.interviewMistake.id;
    res = await request(server, "GET", "/api/interview-mistakes", undefined, { cookie });
    assert.strictEqual(res.json.interviewMistakes.length, 1);
    res = await request(server, "DELETE", `/api/interview-mistakes/${mistakeId}`, undefined, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.interviewMistakes.length, 0);
    res = await request(server, "POST", "/api/interview-mistakes", {
      interviewMistakes: [
        { id: "offline-mistake", question: "Spring 事务传播级别？", score: 58 }
      ]
    }, { cookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.interviewMistakes.length, 1);
    assert.strictEqual(res.json.interviewMistakes[0].id, "offline-mistake");

    res = await request(server, "POST", "/api/progress", "{bad json", { cookie });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.json.error, "bad_json");

    res = await request(server, "POST", "/api/auth/logout", {}, { cookie });
    assert.strictEqual(res.status, 200);
    cookie = res.headers["set-cookie"][0].split(";")[0];
    res = await request(server, "GET", "/api/progress", undefined, { cookie });
    assert.strictEqual(res.status, 401);

    res = await request(server, "GET", "/apps/server/app.js");
    assert.strictEqual(res.status, 403);
    res = await request(server, "GET", "/tools/health_check.sh");
    assert.strictEqual(res.status, 403);
    res = await request(server, "GET", "/docs/core/01-project-background.md");
    assert.strictEqual(res.status, 403);
    res = await request(server, "GET", "/.env");
    assert.strictEqual(res.status, 403);

    console.log("api runtime tests passed");
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

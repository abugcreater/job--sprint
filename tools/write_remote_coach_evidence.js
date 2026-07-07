#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let effectiveEnv = process.env;
let envFileInfo = null;
const cookieJar = new Map();

function argValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function envValue(name) {
  const value = effectiveEnv[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function loadEffectiveEnv() {
  try {
    const loaded = loadDeliveryEnvFile(root, process.env, args);
    effectiveEnv = loaded.env;
    envFileInfo = loaded.info;
    return true;
  } catch (error) {
    writeReport({
      status: "FAIL",
      reason: "delivery_env_file_error",
      envFile: envFileErrorInfo(error),
      requiredInputs: ["Pass --delivery-env-file as a path outside this git repository."]
    }, 1);
    return false;
  }
}

function writeReport(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_REMOTE_COACH_EVIDENCE");
  const withEnvFile = envFileInfo && envFileInfo.configured ? { envFile: envFileInfo, ...report } : report;
  const serialized = `${JSON.stringify(withEnvFile, null, 2)}\n`;
  if (reportPath) {
    const absoluteReportPath = path.resolve(root, reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, serialized);
  }
  process.stdout.write(serialized);
  process.exitCode = exitCode;
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function storeCookies(headers) {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const [pair] = String(value).split(";");
    const index = pair.indexOf("=");
    if (index > 0) cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function requestJson(baseUrl, method, route, body) {
  const headers = { "content-type": "application/json" };
  const cookies = cookieHeader();
  if (cookies) headers.cookie = cookies;
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
  });
  storeCookies(response.headers);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text: text.slice(0, 240) };
}

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function normalizedText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function countSignals(text, signals) {
  const source = normalizedText(text).toLowerCase();
  return signals.filter((signal) => source.includes(String(signal).toLowerCase())).length;
}

function hasArtifactIntent(artifacts, intentPattern) {
  return artifacts.some((artifact) => {
    const joined = [artifact.type, artifact.title, artifact.body, artifact.reason]
      .map(normalizedText)
      .filter(Boolean)
      .join(" ");
    return intentPattern.test(joined);
  });
}

function previewArtifacts(artifacts) {
  return artifacts.slice(0, 5).map((artifact) => ({
    type: artifact.type,
    title: normalizedText(artifact.title).slice(0, 80),
    body: normalizedText(artifact.body).slice(0, 120),
    reason: normalizedText(artifact.reason).slice(0, 120)
  }));
}

async function main() {
  if (!loadEffectiveEnv()) return;
  const baseUrl = (
    argValue("--remote-url")
    || envValue("JOB_SPRINT_REMOTE_BASE_URL")
    || envValue("JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue("JOB_SPRINT_DELIVERY_BASE_URL")
  )?.replace(/\/+$/, "");
  const username = envValue("JOB_SPRINT_AUTH_USER");
  const password = envValue("JOB_SPRINT_AUTH_PASSWORD") || envValue("JOB_SPRINT_AUTH_PASS");
  if (!baseUrl || !username || !password) {
    writeReport({
      status: "USER_ACTION_REQUIRED",
      reason: !baseUrl ? "remote_base_url_missing" : "remote_auth_env_missing",
      requiredInputs: [
        "Set JOB_SPRINT_REMOTE_BASE_URL or pass --remote-url.",
        "Set JOB_SPRINT_AUTH_USER and JOB_SPRINT_AUTH_PASSWORD/JOB_SPRINT_AUTH_PASS."
      ]
    }, 2);
    return;
  }

  const health = await requestJson(baseUrl, "GET", "/api/health");
  const login = await requestJson(baseUrl, "POST", "/api/auth/login", { username, password });
  const coach = await requestJson(baseUrl, "POST", "/api/coach/artifacts", {
    profile: {
      id: "remote-coach-smoke",
      targetRole: "泛 IT 求职者",
      roleFamily: "other",
      dailyMinutes: 45
    },
    knowledgeBoundaries: [
      { topic: "远端 AI 教练证据链路", level: "了解", gap: "需要证明服务端已加载新 schema" }
    ],
    opportunitySignals: [{
      id: "remote-jd-insight-smoke",
      company: "远端平台",
      role: "高级 Java 后端",
      status: "约面",
      keywords: ["MQ", "Redis", "稳定性"],
      tags: ["Spring"],
      feedback: "面试官关注故障恢复",
      notes: "补线上恢复证据"
    }],
    sprint: { date: "2026-07-06", currentTask: { title: "远端 coach smoke" } }
  });
  const runs = await requestJson(baseUrl, "GET", "/api/coach/llm-runs");
  const artifacts = Array.isArray(coach.json && coach.json.artifacts) ? coach.json.artifacts : [];
  const firstArtifact = artifacts[0] || null;
  const llmRun = coach.json && coach.json.llmRun ? coach.json.llmRun : {};
  const feedbackPost = firstArtifact ? await requestJson(baseUrl, "POST", "/api/coach/feedback", {
    profileId: "remote-coach-smoke",
    artifactId: firstArtifact.id,
    llmRunId: llmRun.id,
    artifactType: firstArtifact.type || "knowledge_card",
    decision: "rejected",
    reason: "远端 smoke 需要证明 summary 聚合",
    title: firstArtifact.title || "远端 coach smoke"
  }) : { status: 0, json: null };
  const feedbackReadback = await requestJson(baseUrl, "GET", "/api/coach/feedback");
  const outcomeReadback = await requestJson(baseUrl, "GET", "/api/coach/outcomes?date=2026-07-07");
  const outcomeSnapshot = await requestJson(baseUrl, "POST", "/api/coach/outcomes", {
    date: "2026-07-07",
    id: `remote-coach-outcome-smoke-${Date.now()}`
  });
  const runFields = {
    model: hasOwn(llmRun, "model"),
    inputTokens: hasOwn(llmRun, "inputTokens"),
    outputTokens: hasOwn(llmRun, "outputTokens"),
    latencyMs: hasOwn(llmRun, "latencyMs"),
    estimatedCostUsd: hasOwn(llmRun, "estimatedCostUsd")
  };
  const runId = llmRun.id || null;
  const readbackRuns = Array.isArray(runs.json && runs.json.runs) ? runs.json.runs : [];
  const matchingRun = readbackRuns.find((run) => run.id === runId);
  const readbackFeedback = Array.isArray(feedbackReadback.json && feedbackReadback.json.feedback) ? feedbackReadback.json.feedback : [];
  const matchingFeedback = firstArtifact ? readbackFeedback.find((item) => item.artifactId === firstArtifact.id) : null;
  const feedbackSummary = feedbackReadback.json && feedbackReadback.json.summary ? feedbackReadback.json.summary : {};
  const outcome = outcomeSnapshot.json && outcomeSnapshot.json.outcome
    ? outcomeSnapshot.json.outcome
    : outcomeReadback.json && outcomeReadback.json.outcome;
  const outcomeMetrics = outcome && outcome.metrics ? outcome.metrics : {};
  const outcomeSnapshots = Array.isArray(outcomeSnapshot.json && outcomeSnapshot.json.snapshots)
    ? outcomeSnapshot.json.snapshots
    : [];
  const artifactText = artifacts.map((artifact) => [
    artifact.title,
    artifact.body,
    artifact.reason,
    ...(Array.isArray(artifact.sources) ? artifact.sources : [])
  ].filter(Boolean).join(" ")).join(" ");
  const fallbackJdInsights = {
    summary: artifactText.includes("JD解析：硬技能 MQ、Redis、稳定性"),
    evidence: artifactText.includes("证据要求「准备故障恢复案例、影响范围、定位链路和复盘动作」"),
    question: artifactText.includes("JD 解析题「你如何在 MQ 场景处理故障恢复？」")
  };
  const fallbackRoleQuestionBank = {
    followUpLabel: artifactText.includes("追问库："),
    roleSpecificQuestion: artifactText.includes("目标岗位 JD")
  };
  const providerName = normalizedText(coach.json && coach.json.provider);
  const realProviderActive = Boolean(providerName && providerName !== "local-fallback");
  const providerSemanticChecks = {
    llmRunSucceeded: llmRun.status === "success" && llmRun.schemaStatus === "pass",
    artifactSchemaReturned: artifacts.length >= 1 && artifacts.every((artifact) => artifact && artifact.type && artifact.title && artifact.body),
    opportunitySignalsReferenced: countSignals(artifactText, ["MQ", "Redis", "稳定性", "故障", "恢复", "Java", "后端"]) >= 2,
    coachActionIntentPresent: hasArtifactIntent(artifacts, /证据|日程|练习|复盘|推进|补强|准备/),
    interviewQuestionIntentPresent: hasArtifactIntent(artifacts, /interview_question|面试|候选题|追问|问题|回答/)
  };
  const jdInsights = realProviderActive ? {
    providerSemantic: providerSemanticChecks.llmRunSucceeded
      && providerSemanticChecks.artifactSchemaReturned
      && providerSemanticChecks.opportunitySignalsReferenced
      && providerSemanticChecks.coachActionIntentPresent
  } : fallbackJdInsights;
  const roleQuestionBank = realProviderActive ? {
    providerSemantic: providerSemanticChecks.llmRunSucceeded
      && providerSemanticChecks.artifactSchemaReturned
      && providerSemanticChecks.interviewQuestionIntentPresent
  } : fallbackRoleQuestionBank;
  const checks = [
    ["health_ok", health.status === 200 && health.json && health.json.ok === true],
    ["login_ok", login.status === 200],
    ["coach_ok", coach.status === 200],
    ["llm_run_present", Boolean(runId)],
    ["llm_run_metric_fields_present", Object.values(runFields).every(Boolean)],
    ["llm_runs_readback", Boolean(matchingRun)],
    ["jd_insights_present", Object.values(jdInsights).every(Boolean)],
    ["role_question_bank_present", Object.values(roleQuestionBank).every(Boolean)],
    ["feedback_post_ok", feedbackPost.status === 200],
    ["feedback_readback", Boolean(matchingFeedback)],
    ["feedback_summary_present", Number(feedbackSummary.reviewedCount || 0) >= 1 && Array.isArray(feedbackSummary.recentRejectionReasons)],
    ["outcome_get_ok", outcomeReadback.status === 200],
    ["outcome_post_ok", outcomeSnapshot.status === 200],
    ["outcome_schema_present", outcome && outcome.schemaVersion === "coach-outcome-report-v1" && outcome.attributionLevel === "server-weekly-runtime"],
    ["outcome_metrics_present", ["effectiveActionCount", "delayCount", "acceptedScheduleCompletionRateLabel", "interviewReviewRateLabel"].every((field) => hasOwn(outcomeMetrics, field))],
    ["outcome_snapshot_readback", Boolean(outcome && outcomeSnapshots.some((snapshot) => snapshot && snapshot.id === outcome.id))]
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([id]) => id);
  writeReport({
    status: failed.length ? "FAIL" : "PASS",
    baseUrl,
    checkedAt: new Date().toISOString(),
    failed,
    health: {
      apiConfigured: Boolean(health.json && health.json.apiConfigured),
      modelConfigured: Boolean(health.json && health.json.model)
    },
    coach: {
      provider: providerName || (coach.json && coach.json.provider),
      model: coach.json && coach.json.model,
      warning: coach.json && coach.json.warning,
      artifactCount: artifacts.length,
      jdInsights,
      roleQuestionBank,
      fallbackMarkerChecks: {
        jdInsights: fallbackJdInsights,
        roleQuestionBank: fallbackRoleQuestionBank
      },
      providerSemanticChecks,
      artifactPreview: previewArtifacts(artifacts),
      llmRunStatus: llmRun.status,
      llmRunSchemaStatus: llmRun.schemaStatus,
      llmRunMetricFields: runFields
    },
    llmRuns: {
      status: runs.status,
      readbackCount: readbackRuns.length,
      matchingRunFound: Boolean(matchingRun),
      matchingRunProvider: matchingRun && matchingRun.provider,
      matchingRunMetricFields: matchingRun ? {
        model: hasOwn(matchingRun, "model"),
        inputTokens: hasOwn(matchingRun, "inputTokens"),
        outputTokens: hasOwn(matchingRun, "outputTokens"),
        latencyMs: hasOwn(matchingRun, "latencyMs"),
        estimatedCostUsd: hasOwn(matchingRun, "estimatedCostUsd")
      } : null
    },
    feedback: {
      postStatus: feedbackPost.status,
      readbackStatus: feedbackReadback.status,
      readbackCount: readbackFeedback.length,
      matchingFeedbackFound: Boolean(matchingFeedback),
      summary: {
        reviewedCount: feedbackSummary.reviewedCount,
        acceptedCount: feedbackSummary.acceptedCount,
        rejectedCount: feedbackSummary.rejectedCount,
        acceptanceRateLabel: feedbackSummary.acceptanceRateLabel,
        qualityLabel: feedbackSummary.qualityLabel,
        recentRejectionReasons: feedbackSummary.recentRejectionReasons,
        nextPromptHint: feedbackSummary.nextPromptHint
      }
    },
    outcomes: {
      getStatus: outcomeReadback.status,
      postStatus: outcomeSnapshot.status,
      snapshotCount: outcomeSnapshots.length,
      matchingSnapshotFound: outcomeSnapshots.some((snapshot) => snapshot && snapshot.id === (outcome && outcome.id)),
      schemaVersion: outcome && outcome.schemaVersion,
      attributionLevel: outcome && outcome.attributionLevel,
      score: outcome && outcome.score,
      metrics: {
        evidenceCount: outcomeMetrics.evidenceCount,
        effectiveActionCount: outcomeMetrics.effectiveActionCount,
        delayCount: outcomeMetrics.delayCount,
        acceptedScheduleCompletionRateLabel: outcomeMetrics.acceptedScheduleCompletionRateLabel,
        interviewReviewRateLabel: outcomeMetrics.interviewReviewRateLabel
      }
    }
  }, failed.length ? 1 : 0);
}

main().catch((error) => {
  writeReport({
    status: "FAIL",
    reason: "remote_coach_evidence_error",
    message: String(error && error.message ? error.message : error)
  }, 1);
});

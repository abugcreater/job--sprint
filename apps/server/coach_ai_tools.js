const crypto = require("crypto");
const { extractJson, fetchWithTimeout } = require("./ai_tools");
const { coachOpportunityContext } = require("./coach_opportunity_signals");
const { roleFamilyLabel, roleFamilyPlaybookFor, roleFamilyQuestionBank } = require("./coach_role_playbook");

const ARTIFACT_TYPES = new Set(["knowledge_card", "schedule_suggestion", "interview_question", "daily_next_step"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);
const PROMPT_VERSION = "coach-artifacts-v1";
const SCHEMA_VERSION = "coach-artifact-list-v1";

function localGenerateCoachArtifacts(payload) {
  const context = coachContext(payload);
  if (!context.profile) {
    return responseEnvelope("local-fallback", context, []);
  }
  const primaryBoundary = weakestBoundary(context.boundaries);
  if (!primaryBoundary) {
    const label = roleFamilyLabel(context.profile.roleFamily);
    const playbook = context.rolePlaybook;
    return responseEnvelope("local-fallback", context, [
        normalizeCoachArtifact({
          profileId: context.profile.id,
          type: "daily_next_step",
          title: `先补一条${label}知识边界`,
          body: `unknown：当前没有可引用的知识边界。请先录入一个围绕「${playbook.lens}」的主题，再生成个性化建议。`,
          reason: `缺少知识边界，不能生成${label}个性化 AI 建议；后续需要能引用${playbook.evidence}。`,
          sources: context.sources.concat("知识边界：unknown"),
          confidence: "low",
          targetDate: context.targetDate
        }, 0, "generated-local", context)
      ]);
  }

  const target = context.profile.targetRole || roleFamilyLabel(context.profile.roleFamily);
  const sources = context.sources.concat(`知识边界：${primaryBoundary.topic}(${primaryBoundary.level || "unknown"})`);
  const minutes = Math.min(Number(context.profile.dailyMinutes) || 45, 60);
  const playbook = context.rolePlaybook;
  const roleQuestions = roleFamilyQuestionBank(playbook, primaryBoundary.topic, context.opportunity.focusLabel);
  return responseEnvelope("local-fallback", context, [
      normalizeCoachArtifact({
          profileId: context.profile.id,
          type: "knowledge_card",
          title: `${primaryBoundary.topic} 面试表达卡`,
          body: `围绕「${primaryBoundary.topic}」补一张知识卡：按「${playbook.answerFrame}」组织回答，用「${playbook.evidence}」做证据，最后列出还不能夸大的部分。${context.opportunity.focusLabel ? `补充 JD 焦点「${context.opportunity.focusLabel}」下的候选追问。` : ""}${context.opportunity.knowledgeHint}`,
          reason: `该主题当前为「${primaryBoundary.level || "unknown"}」，薄弱点是「${primaryBoundary.gap || "未写明"}」；角色视角是「${playbook.lens}」。${context.opportunity.reasonHint}`,
        sources,
        confidence: primaryBoundary.level === "可面试追问" ? "medium" : "high",
        targetDate: context.targetDate
      }, 0, "generated-local", context),
      normalizeCoachArtifact({
        profileId: context.profile.id,
        type: "schedule_suggestion",
        title: `今晚 ${minutes} 分钟补 ${primaryBoundary.topic}`,
        body: `建议新增一条 ${minutes} 分钟知识任务，聚焦「${playbook.scheduleFocus}」，产出一段可面试回答和一条 Evidence Gate 证据。${context.opportunity.focusLabel ? `练习目标收敛到「${context.opportunity.focusLabel}」。` : ""}${context.opportunity.scheduleHint}`,
        reason: `目标岗位「${target}」需要能解释「${primaryBoundary.targetUse || primaryBoundary.topic}」，并补齐${playbook.evidence}。${context.opportunity.reasonHint}`,
        sources,
        confidence: "high",
        targetDate: context.targetDate
      }, 1, "generated-local", context),
      normalizeCoachArtifact({
        profileId: context.profile.id,
        type: "interview_question",
        title: `${target} 追问：${primaryBoundary.topic}`,
        body: `候选题：${context.opportunity.focusQuestionHint}${roleQuestions[0]} 追问库：${roleQuestions.slice(1).join("；")}`,
        reason: `从知识边界「${primaryBoundary.topic}」、目标岗位「${target}」、机会信号和角色题卡库生成，并按「${playbook.answerFrame}」检查表达。${context.opportunity.reasonHint}`,
        sources,
        confidence: "medium",
        targetDate: context.targetDate
      }, 2, "generated-local", context)
  ]);
}

async function generateCoachArtifactsWithAnthropic(payload) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }
  const context = coachContext(payload);
  if (!context.profile) {
    return null;
  }
  const endpoint = new URL("/v1/messages", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const system = [
    "你是泛 IT 求职者的 AI 求职教练。",
    "你必须根据用户画像、知识边界、已有日程、岗位机会/JD信号和今日任务生成建议。",
    "建议只能是草稿，不能直接修改正式日程或编造用户没有提供的经历。",
    "如果缺少知识边界，只能输出 unknown 或追问，不要假装知道。",
    "只输出 JSON，不要 Markdown。"
  ].join("\n");
  const user = {
    task: "generate_job_coach_artifacts",
    productRule: "输出必须进入 AI 草稿区，由用户接受或拒绝后才影响正式计划。",
    profile: context.profile,
    rolePlaybook: context.rolePlaybook,
    knowledgeBoundaries: context.boundaries,
    scheduleEvents: context.scheduleEvents,
    opportunitySignals: context.opportunity.promptSignals,
    sprint: context.sprintSummary,
    outputSchema: {
      artifacts: [
        {
          type: "knowledge_card | schedule_suggestion | interview_question | daily_next_step",
          title: "草稿标题",
          body: "可直接展示给用户的建议内容",
          reason: "为什么给这条建议，必须引用事实或边界",
          sources: ["画像/知识边界/日程/今日任务来源"],
          confidence: "low | medium | high",
          targetDate: "YYYY-MM-DD"
        }
      ]
    }
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": token,
      "authorization": `Bearer ${token}`,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 1600,
      temperature: 0.25,
      system,
      messages: [{ role: "user", content: JSON.stringify(user) }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`coach artifact api http ${response.status}: ${errorText.slice(0, 240)}`);
  }
  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map((item) => item.text || "").join("\n")
    : data.completion || data.text || "";
  const parsed = extractJson(text);
  const artifacts = parsed && Array.isArray(parsed.artifacts) ? parsed.artifacts : [];
  if (!artifacts.length) {
    throw new Error("coach artifact api returned no artifacts");
  }
  return responseEnvelope("anthropic-compatible", context, artifacts.slice(0, 6).map((artifact, index) => normalizeCoachArtifact(artifact, index, "generated-ai", context)), {
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
  });
}

function responseEnvelope(provider, context, artifacts, extra = {}) {
  return {
    provider,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    inputSummaryHash: context.inputSummaryHash,
    artifacts,
    ...extra
  };
}

function normalizeCoachArtifact(entry, index, source, context) {
  const now = new Date().toISOString();
  const type = ARTIFACT_TYPES.has(entry.type) ? entry.type : "daily_next_step";
  const confidence = CONFIDENCE.has(entry.confidence) ? entry.confidence : "medium";
  return {
    id: entry.id || `artifact-${type}-${Date.now()}-${index}-${crypto.randomBytes(3).toString("hex")}`,
    profileId: String(entry.profileId || context.profile?.id || ""),
    type,
    title: clip(entry.title || `AI 建议 ${index + 1}`, 90),
    body: clip(entry.body || "请先补充画像、知识边界或日程上下文。", 1200),
    reason: clip(entry.reason || "来自 AI 教练上下文。", 320),
    sources: Array.isArray(entry.sources) ? entry.sources.slice(0, 8).map((item) => clip(item, 120)) : context.sources,
    confidence,
    status: "draft",
    targetDate: clip(entry.targetDate || context.targetDate, 20),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    sourceType: source
  };
}

function coachContext(payload = {}) {
  const profile = payload.profile && typeof payload.profile === "object" ? payload.profile : null;
  const boundaries = Array.isArray(payload.knowledgeBoundaries) ? payload.knowledgeBoundaries.filter(Boolean).slice(0, 20) : [];
  const scheduleEvents = Array.isArray(payload.scheduleEvents) ? payload.scheduleEvents.filter(Boolean).slice(0, 20) : [];
  const sprint = payload.sprint && typeof payload.sprint === "object" ? payload.sprint : {};
  const targetDate = String(payload.targetDate || sprint.date || new Date().toISOString().slice(0, 10));
  const currentTask = sprint.currentTask && typeof sprint.currentTask === "object" ? sprint.currentTask : null;
  const rolePlaybook = profile ? roleFamilyPlaybookFor(profile.roleFamily) : roleFamilyPlaybookFor("other");
  const opportunity = coachOpportunityContext(payload);
  const sources = [
    profile ? `画像：${profile.targetRole || profile.name || roleFamilyLabel(profile.roleFamily)}` : "画像：unknown",
    `角色视角：${rolePlaybook.lens}`,
    profile && profile.cities ? `城市：${profile.cities}` : "",
    currentTask && currentTask.title ? `当前任务：${currentTask.title}` : "",
    ...opportunity.sources
  ].filter(Boolean);
  return {
    profile,
    boundaries,
    scheduleEvents,
    targetDate,
    rolePlaybook,
    opportunity,
    sources,
    inputSummaryHash: hashSummary({
      profileId: profile?.id,
      targetRole: profile?.targetRole,
      roleFamily: profile?.roleFamily,
      roleLens: rolePlaybook.lens,
      boundaryTopics: boundaries.map((item) => item.topic || item.id || "unknown").slice(0, 10),
      scheduleTitles: scheduleEvents.map((item) => item.title || item.id || "unknown").slice(0, 10),
      opportunitySignals: opportunity.hashParts,
      targetDate
    }),
    sprintSummary: {
      date: targetDate,
      currentTask,
      taskCount: Array.isArray(sprint.tasks) ? sprint.tasks.length : 0
    }
  };
}

function hashSummary(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function weakestBoundary(boundaries) {
  const order = { "陌生": 0, "了解": 1, "可讲": 2, "可实战": 3, "可面试追问": 4 };
  return [...boundaries].sort((a, b) => (order[a.level] ?? 99) - (order[b.level] ?? 99) || String(a.updatedAt || "").localeCompare(String(b.updatedAt || "")))[0];
}

function clip(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

module.exports = {
  generateCoachArtifactsWithAnthropic,
  localGenerateCoachArtifacts,
  normalizeCoachArtifact
};

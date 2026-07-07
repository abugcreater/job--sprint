const crypto = require("crypto");
const { extractJson, fetchWithTimeout } = require("./ai_tools");

const PROMPT_VERSION = "coach-boundary-suggestions-v1";
const SCHEMA_VERSION = "coach-boundary-suggestion-list-v1";
const LEVELS = new Set(["陌生", "了解", "可讲", "可实战", "可面试追问"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);

function localGenerateBoundarySuggestions(payload = {}) {
  const profile = payload.profile && typeof payload.profile === "object" ? payload.profile : null;
  const text = clip(payload.text || payload.sourceText, 2000);
  if (!profile || !profile.id) return errorPayload("profile_required", "请先保存一个目标画像，再提取知识边界。");
  if (text.length < 12) return errorPayload("source_text_required", "请粘贴 JD、简历片段或面试反馈。");
  const existing = new Set((Array.isArray(payload.knowledgeBoundaries) ? payload.knowledgeBoundaries : []).map((item) => clip(item.topic, 80).toLowerCase()));
  const suggestions = extractTopics(text, profile.roleFamily).filter((topic) => !existing.has(topic.toLowerCase())).slice(0, 4).map((topic, index) => ({
    id: `boundary-suggestion-${Date.now()}-${index}-${crypto.randomBytes(2).toString("hex")}`,
    topic,
    level: inferLevel(text),
    gap: inferGap(text, topic),
    evidence: inferEvidence(text, topic),
    targetUse: `${clip(profile.targetRole, 80) || "目标岗位"}：${inferTargetUse(text, topic)}`,
    sourceSummary: text.slice(0, 120),
    confidence: index === 0 ? "high" : "medium"
  }));
  return {
    provider: "local-fallback",
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    inputSummaryHash: hashSummary({ profileId: profile.id, roleFamily: profile.roleFamily, targetRole: profile.targetRole, text, suggestions: suggestions.map((item) => item.topic) }),
    suggestions
  };
}

async function generateBoundarySuggestionsWithAnthropic(payload = {}) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!baseUrl || !token) return null;
  const context = boundaryContext(payload);
  if (!context.profile || context.text.length < 12) return null;
  const endpoint = new URL("/v1/messages", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const system = [
    "你是泛 IT 求职者的 AI 求职教练和知识边界审计官。",
    "你只能从用户提供的 JD、简历片段或面试反馈中提取候选知识边界。",
    "输出是待用户确认的候选项，不能直接写入正式知识边界，也不能编造没有来源的主题。",
    "每一条必须写清来源片段、缺口、用途和置信度。",
    "只输出 JSON，不要 Markdown。"
  ].join("\n");
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
      max_tokens: 1100,
      temperature: 0.15,
      system,
      messages: [{ role: "user", content: JSON.stringify({
        task: "suggest_job_coach_knowledge_boundaries",
        productRule: "候选项必须先进入草稿区，由用户采纳或拒绝后才写入正式知识边界。",
        profile: context.profile,
        existingTopics: [...context.existing],
        sourceText: context.text,
        outputSchema: {
          suggestions: [{
            topic: "主题名",
            level: "陌生 | 了解 | 可讲 | 可实战 | 可面试追问",
            gap: "缺口说明",
            evidence: "来源片段或需要补的证据",
            targetUse: "用于什么岗位/JD/面试表达",
            sourceSummary: "不超过 120 字的来源摘要",
            confidence: "low | medium | high"
          }]
        }
      }) }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`boundary suggestion api http ${response.status}: ${errorText.slice(0, 240)}`);
  }
  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map((item) => item.text || "").join("\n")
    : data.completion || data.text || "";
  const parsed = extractJson(text);
  const entries = parsed && Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions = entries.map((entry, index) => normalizeBoundarySuggestion(entry, index, context)).filter(Boolean).slice(0, 4);
  if (!suggestions.length) throw new Error("boundary suggestion api returned no suggestions");
  return {
    provider: "anthropic-compatible",
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    inputSummaryHash: parsed.inputSummaryHash || hashSummary({ profileId: context.profile.id, text: context.text, suggestions: suggestions.map((item) => item.topic) }),
    suggestions
  };
}

function boundaryContext(payload = {}) {
  const profile = payload.profile && typeof payload.profile === "object" ? payload.profile : null;
  const text = clip(payload.text || payload.sourceText, 2000);
  const existing = new Set((Array.isArray(payload.knowledgeBoundaries) ? payload.knowledgeBoundaries : []).map((item) => clip(item.topic, 80).toLowerCase()));
  return { profile, text, existing };
}

function normalizeBoundarySuggestion(entry = {}, index, context) {
  const topic = clip(entry.topic, 80);
  if (!topic || context.existing.has(topic.toLowerCase())) return null;
  const targetRole = clip(context.profile.targetRole, 80) || "目标岗位";
  return {
    id: entry.id || `boundary-suggestion-${Date.now()}-${index}-${crypto.randomBytes(2).toString("hex")}`,
    topic,
    level: LEVELS.has(entry.level) ? entry.level : inferLevel(context.text),
    gap: clip(entry.gap || inferGap(context.text, topic), 220),
    evidence: clip(entry.evidence || inferEvidence(context.text, topic), 220),
    targetUse: clip(entry.targetUse || `${targetRole}：${inferTargetUse(context.text, topic)}`, 180),
    sourceSummary: clip(entry.sourceSummary || context.text.slice(0, 120), 120),
    confidence: CONFIDENCE.has(entry.confidence) ? entry.confidence : "medium"
  };
}

const ROLE_TOPICS = {
  backend: ["MQ", "Redis", "Spring", "JVM", "事务", "稳定性", "高并发", "缓存", "分布式"],
  frontend: ["性能", "组件", "状态管理", "工程化", "首屏", "发布", "兼容性"],
  qa: ["接口自动化", "测试分层", "质量指标", "稳定性", "缺陷归因", "Mock"],
  ops: ["监控", "告警", "发布", "回滚", "故障恢复", "容量", "变更"],
  data: ["指标口径", "数据链路", "血缘", "质量校验", "报表", "治理"],
  mobile: ["性能", "崩溃率", "生命周期", "灰度", "兼容性", "端上体验"],
  product: ["用户问题", "指标", "需求取舍", "上线复盘", "增长", "留存"],
  project: ["里程碑", "风险台账", "跨团队协作", "验收", "资源协调"],
  implementation: ["客户现场", "配置交付", "问题闭环", "验收", "SOP"],
  support: ["工单", "排查路径", "客户沟通", "知识沉淀", "日志"],
  other: ["目标岗位", "项目证据", "风险边界", "交付场景"]
};

const COMMON_TOPICS = ["MQ", "Redis", "Spring", "JVM", "事务", "稳定性", "高并发", "缓存", "分布式", "RAG", "Agent", "AI", "K8s", "Docker", "MySQL", "Dubbo"];

function extractTopics(text, roleFamily = "other") {
  const lexicon = [...(ROLE_TOPICS[roleFamily] || ROLE_TOPICS.other), ...COMMON_TOPICS, ...ROLE_TOPICS.other];
  const hits = lexicon.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  return hits.length ? [...new Set(hits)] : [text.slice(0, 18).replace(/[，。；,.].*$/, "") || "目标岗位知识边界"];
}

function inferLevel(text) {
  if (/不了解|陌生|没做过|不会/.test(text)) return "陌生";
  if (/可落地|实战|线上|主导/.test(text)) return "可讲";
  return "了解";
}

function inferGap(text, topic) {
  if (/故障|恢复|排查|稳定性/.test(text)) return `围绕「${topic}」补齐故障场景、恢复动作和线上证据。`;
  if (/指标|量化|数据|报表/.test(text)) return `围绕「${topic}」补齐指标口径、前后变化和可验证证据。`;
  return `围绕「${topic}」补齐机制、边界、项目证据和不能夸大的部分。`;
}

function inferEvidence(text, topic) {
  const match = text.match(/(项目|系统|平台|链路|报表|复盘|工单|日志)[^。；;]{0,24}/);
  return match ? `${match[0]}，需整理为「${topic}」证据。` : `待补充「${topic}」相关项目、笔记或复盘证据。`;
}

function inferTargetUse(text, topic) {
  if (/JD|岗位|招聘|职责/.test(text)) return `用于匹配 JD 中的「${topic}」要求`;
  if (/面试|追问|反馈/.test(text)) return `用于回答面试追问中的「${topic}」问题`;
  return `用于目标岗位下的「${topic}」表达`;
}

function errorPayload(error, message) {
  return { ok: false, error, message, provider: "local-fallback", promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION, suggestions: [] };
}

function hashSummary(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function clip(value, limit) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

module.exports = {
  generateBoundarySuggestionsWithAnthropic,
  localGenerateBoundarySuggestions
};

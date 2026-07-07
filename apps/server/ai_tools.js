const crypto = require("crypto");

function aiProviderTimeoutMs() {
  return Number(process.env.AI_PROVIDER_TIMEOUT_MS || 30 * 1000);
}

function localScore({ question, answer, expectedKeywords = [] }) {
  const normalized = String(answer || "").toLowerCase();
  const matched = expectedKeywords.filter((keyword) => normalized.includes(String(keyword).toLowerCase()));
  const lengthScore = Math.min(30, Math.floor(String(answer || "").trim().length / 12));
  const keywordScore = expectedKeywords.length
    ? Math.round((matched.length / expectedKeywords.length) * 45)
    : 20;
  const structureScore = /第一|第二|第三|首先|其次|最后|边界|风险|排查|证据/.test(answer || "") ? 15 : 5;
  const score = Math.max(10, Math.min(82, lengthScore + keywordScore + structureScore));
  const missing = expectedKeywords.filter((keyword) => !matched.includes(keyword));
  return {
    provider: "local-fallback",
    score,
    level: score >= 75 ? "可用，但还要压实证据" : score >= 55 ? "基本能接，需要补链路" : "容易被追问击穿",
    strengths: matched.length ? [`已覆盖关键词：${matched.join("、")}`] : ["至少完成了第一版回答"],
    weaknesses: missing.slice(0, 5).map((keyword) => `缺少关键词或证据：${keyword}`),
    rewrite: `建议按“背景 -> 我的职责 -> 关键链路 -> 异常/边界 -> Java 映射”重答：${question}`,
    followUp: "请补充一个真实项目证据：文件、链路、指标或排查命令任选一个。",
    raw: null
  };
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = aiProviderTimeoutMs()) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`ai provider timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function scoreWithAnthropic(payload, context) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }

  const endpoint = new URL("/v1/messages", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const questionContext = {
    candidateTarget: context.profile.target,
    strengths: context.profile.strengths,
    boundaries: context.profile.boundaries,
    jdSignals: context.jdSignals.map((signal) => ({
      source: signal.source,
      signals: signal.signals,
      lastChecked: signal.lastChecked
    })),
    currentTask: payload.currentTask || null,
    question: payload.question,
    expectedKeywords: payload.expectedKeywords || []
  };

  const system = [
    "你是严格的高级 Java 后端面试官、AI 应用工程化导师和简历边界审计官。",
    "候选人主身份是高级 Java 后端，不是算法岗。",
    "评分必须严厉但可执行，必须指出是否过度包装 AI。",
    "只输出 JSON，不要 Markdown。"
  ].join("\n");

  const user = {
    task: "score_interview_answer",
    rubric: context.scoringRubric,
    context: questionContext,
    answer: payload.answer,
    outputSchema: {
      provider: "anthropic-compatible",
      score: "0-100 number",
      level: "一句话评级",
      strengths: ["具体优点"],
      weaknesses: ["具体缺陷"],
      rewrite: "更稳妥的 60-90 秒回答",
      followUp: "下一追问"
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
      max_tokens: 900,
      temperature: 0.2,
      system,
      messages: [
        {
          role: "user",
          content: JSON.stringify(user)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`scoring api http ${response.status}: ${errorText.slice(0, 240)}`);
  }

  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map((item) => item.text || "").join("\n")
    : data.completion || data.text || "";
  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error("scoring api returned non-json content");
  }
  return {
    provider: "anthropic-compatible",
    score: Number(parsed.score) || 0,
    level: parsed.level || "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    rewrite: parsed.rewrite || "",
    followUp: parsed.followUp || "",
    raw: null
  };
}

function normalizeKbEntry(entry, index, source) {
  const now = new Date().toISOString();
  const safeCategory = String(entry.category || "AI 生成面试题").slice(0, 48);
  const safeTitle = String(entry.title || entry.interviewQuestion || `动态面试题 ${index + 1}`).slice(0, 80);
  const safeQuestion = String(entry.interviewQuestion || safeTitle).slice(0, 180);
  return {
    id: entry.id || `generated-${Date.now()}-${index}-${crypto.randomBytes(3).toString("hex")}`,
    category: safeCategory,
    title: safeTitle,
    sourceType: source,
    generatedAt: entry.generatedAt || now,
    publicSummary: String(entry.publicSummary || "围绕候选人高级 Java 后端主线生成的动态面试准备条目。").slice(0, 260),
    interviewQuestion: safeQuestion,
    answer60s: String(entry.answer60s || "按背景、职责、链路、异常分支、Java 映射和边界六步回答。").slice(0, 900),
    answer3min: String(entry.answer3min || entry.answer60s || "先讲真实项目链路，再讲技术机制和生产化边界。").slice(0, 1800),
    javaMapping: String(entry.javaMapping || "高级 Java 后端、复杂业务链路、稳定性治理").slice(0, 180),
    projectEvidence: String(entry.projectEvidence || "绑定真实搜索链路、SOF/Dubbo、Spring/JVM/MQ/Redis 或 AI 工程化增强项目证据。").slice(0, 260),
    risk: String(entry.risk || "不要把团队成果、AI demo 或生产化设想说成个人已完整落地。").slice(0, 260),
    doNotSay: Array.isArray(entry.doNotSay) ? entry.doNotSay.slice(0, 5).map((item) => String(item).slice(0, 80)) : ["我是算法岗", "我训练过大模型"],
    safeWording: Array.isArray(entry.safeWording) ? entry.safeWording.slice(0, 5).map((item) => String(item).slice(0, 100)) : ["主身份是高级 Java 后端，AI 是工程化增强方向"]
  };
}

function localGenerateKb(payload, context) {
  const topic = String(payload.topic || "").trim() || "当前任务";
  const currentTitle = payload.currentTask && payload.currentTask.title ? payload.currentTask.title : topic;
  const javaMapping = payload.currentTask && payload.currentTask.javaMapping
    ? payload.currentTask.javaMapping
    : "高级 Java 后端、复杂业务链路、稳定性治理";
  const base = [
    {
      category: "动态生成 · Java 项目深挖",
      title: `${topic}：项目链路追问`,
      publicSummary: "根据你的高级 Java 后端背景生成，要求回答真实职责、链路证据、异常分支和边界。",
      interviewQuestion: `围绕“${currentTitle}”，请讲清你的职责边界、核心链路、异常分支和可证明证据。`,
      answer60s: `我会先把这个问题落到高级 Java 后端主线：背景是 ${topic}，我的回答按职责边界、入口链路、关键依赖、异常兜底、观测证据和不能夸大的边界展开。重点不是罗列技术名词，而是证明我能把复杂业务链路拆清楚，并用日志、指标、压测或排查路径支撑。`,
      answer3min: "三分钟回答可以按：1. 业务背景和个人负责边界；2. 请求入口、服务编排、下游依赖、缓存/MQ/DB 的数据流；3. 异常场景，如超时、重试、幂等、降级、缓存未命中、消息重复；4. 线上如何观测和复盘；5. 哪些是生产化升级或团队协作部分。",
      javaMapping,
      projectEvidence: "优先绑定 SOF/Dubbo 搜索链路、Spring 事务、JVM 排查、MQ/Redis 缓存治理或脱敏项目材料。",
      risk: "不要把只看过的材料说成自己独立落地；不要从 Java 主线滑到模型算法。",
      doNotSay: ["这个项目主要是模型能力", "全链路都是我一个人负责"],
      safeWording: ["我负责边界清晰模块，并参与链路治理", "AI 只是后端工程化增强，不是算法平台"]
    },
    {
      category: "动态生成 · Java 机制追问",
      title: `${topic}：机制与故障追问`,
      publicSummary: "把面试官可能追问的 Java 机制、线上故障和生产化边界提前拆出来。",
      interviewQuestion: `如果“${currentTitle}”在线上出现超时、缓存未命中或消息堆积，你如何定位和止血？`,
      answer60s: "我会先按影响面确认是单接口、单机器、单下游还是全局，再看 QPS、错误率、P99、线程池、GC、慢 SQL、Redis latency、MQ lag 和下游耗时。止血上先限流、降级、扩容、切流或暂停非核心任务，根因上再补日志、指标、告警和复盘。",
      answer3min: "展开时要给出证据顺序：入口日志和 traceId、APM 指标、线程池队列、GC log/JFR/jcmd、数据库慢 SQL、Redis key/TTL/热点、MQ ack/retry/DLQ/lag。最后讲复盘动作：补监控、补压测、补幂等和降级预案。",
      javaMapping: "JVM、Spring、MySQL、Redis、MQ、稳定性治理",
      projectEvidence: "可映射真实搜索链路的缓存/MQ/Redis 排查口径，以及 AI 服务化项目的 health check、metrics、logging 设计。",
      risk: "只说重启服务或加机器，会显得排查深度不足。",
      doNotSay: ["直接重启就行", "Redis/MQ 天然保证一致"],
      safeWording: ["先止血，再按证据链定位根因，最后补治理闭环"]
    }
  ];
  return {
    provider: "local-fallback",
    entries: base.map((entry, index) => normalizeKbEntry(entry, index, "generated-local"))
  };
}

async function generateKbWithAnthropic(payload, context) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }
  const endpoint = new URL("/v1/messages", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const topic = String(payload.topic || "").trim() || "当前任务";
  const system = [
    "你是严格的高级 Java 后端面试官和知识库审计官。",
    "候选人主身份是高级 Java 后端，方向是复杂业务链路、搜索/交易链路、稳定性治理和 AI 应用工程化增强。",
    "生成内容必须服务 Java 后端面试，不要把学习重点转成 Python、算法训练、SFT、RL 或纯大数据。",
    "只输出 JSON，不要 Markdown。"
  ].join("\n");
  const user = {
    task: "generate_interview_kb_entries",
    topic,
    candidateProfile: context.profile,
    jdSignals: context.jdSignals,
    currentTask: payload.currentTask || null,
    requirements: [
      "生成 2 到 4 个知识库条目",
      "每个条目必须包含真实项目证据、Java 映射、风险边界、不能说和安全表达",
      "问题要贴合高级 Java 后端，不要变成算法岗或 Python 项目讲解",
      "回答要能用于 60 秒口述和 3 分钟深挖"
    ],
    outputSchema: {
      entries: [
        {
          category: "分类",
          title: "标题",
          publicSummary: "概览",
          interviewQuestion: "面试问题",
          answer60s: "60 秒回答",
          answer3min: "3 分钟回答",
          javaMapping: "Java 映射",
          projectEvidence: "项目证据",
          risk: "追问风险",
          doNotSay: ["不能说"],
          safeWording: ["安全表达"]
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
      max_tokens: 1800,
      temperature: 0.35,
      system,
      messages: [{ role: "user", content: JSON.stringify(user) }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`kb generation api http ${response.status}: ${errorText.slice(0, 240)}`);
  }
  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map((item) => item.text || "").join("\n")
    : data.completion || data.text || "";
  const parsed = extractJson(text);
  const entries = parsed && Array.isArray(parsed.entries) ? parsed.entries : [];
  if (entries.length === 0) {
    throw new Error("kb generation api returned no entries");
  }
  return {
    provider: "anthropic-compatible",
    entries: entries.slice(0, 4).map((entry, index) => normalizeKbEntry(entry, index, "generated-ai"))
  };
}

module.exports = {
  extractJson,
  fetchWithTimeout,
  generateKbWithAnthropic,
  localGenerateKb,
  localScore,
  normalizeKbEntry,
  scoreWithAnthropic
};

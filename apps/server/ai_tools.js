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
    rewrite: `建议按“背景 -> 我的职责 -> 关键链路 -> 异常/边界 -> 岗位能力映射”重答：${question}`,
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
    "你是严格的求职面试官、AI 应用工程化导师和简历边界审计官。",
    "候选人的主身份必须来自当前画像和题目上下文，不能套用默认岗位。",
    "评分必须严厉但可执行，必须指出是否过度包装经历或 AI。",
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
    publicSummary: String(entry.publicSummary || "围绕当前求职画像生成的动态面试准备条目。").slice(0, 260),
    interviewQuestion: safeQuestion,
    answer60s: String(entry.answer60s || "按背景、职责、链路、异常分支、岗位能力映射和边界六步回答。").slice(0, 900),
    answer3min: String(entry.answer3min || entry.answer60s || "先讲真实项目链路，再讲技术机制和生产化边界。").slice(0, 1800),
    javaMapping: String(entry.javaMapping || "当前画像目标岗位、真实经历、可验证能力边界").slice(0, 180),
    projectEvidence: String(entry.projectEvidence || "绑定当前用户自己的真实项目、文件、指标、输出或复盘证据。").slice(0, 260),
    risk: String(entry.risk || "不要把团队成果、示例 demo 或生产化设想说成个人已完整落地。").slice(0, 260),
    doNotSay: Array.isArray(entry.doNotSay) ? entry.doNotSay.slice(0, 5).map((item) => String(item).slice(0, 80)) : ["我做过未被画像证明的经历", "我能独立负责未验证的大型平台"],
    safeWording: Array.isArray(entry.safeWording) ? entry.safeWording.slice(0, 5).map((item) => String(item).slice(0, 100)) : ["以当前画像为准，只讲能证明的经历和边界"]
  };
}

function localGenerateKb(payload, context) {
  const topic = String(payload.topic || "").trim() || "当前任务";
  const currentTitle = payload.currentTask && payload.currentTask.title ? payload.currentTask.title : topic;
  const javaMapping = payload.currentTask && payload.currentTask.javaMapping
    ? payload.currentTask.javaMapping
    : "当前画像目标岗位、真实经历、可验证能力边界";
  const base = [
    {
      category: "动态生成 · 项目深挖",
      title: `${topic}：项目链路追问`,
      publicSummary: "根据当前画像生成，要求回答真实职责、链路证据、异常分支和边界。",
      interviewQuestion: `围绕“${currentTitle}”，请讲清你的职责边界、核心链路、异常分支和可证明证据。`,
      answer60s: `我会先把这个问题落到当前目标岗位：背景是 ${topic}，我的回答按职责边界、关键链路、关键依赖、异常兜底、可验证证据和不能夸大的边界展开。重点不是罗列技术名词，而是证明我能把真实经历拆清楚，并用文件、指标、输出或复盘路径支撑。`,
      answer3min: "三分钟回答可以按：1. 业务背景和个人负责边界；2. 入口、流程、依赖和结果；3. 异常场景、失败恢复和边界；4. 如何观测、验证和复盘；5. 哪些是生产化升级或团队协作部分。",
      javaMapping,
      projectEvidence: "优先绑定当前用户自己的项目文件、过程记录、结果指标、反馈或复盘材料。",
      risk: "不要把只看过的材料说成自己独立落地；不要把未验证能力说成已上线成果。",
      doNotSay: ["全链路都是我一个人负责", "我做过未被画像证明的经历"],
      safeWording: ["我负责边界清晰的部分，并能说明协作边界", "AI 只作为工具或工程化增强，不替代真实经历"]
    },
    {
      category: "动态生成 · 机制追问",
      title: `${topic}：机制与故障追问`,
      publicSummary: "把面试官可能追问的机制、故障和生产化边界提前拆出来。",
      interviewQuestion: `如果“${currentTitle}”出现失败、延期、质量问题或结果不稳定，你如何定位和补救？`,
      answer60s: "我会先按影响面确认是单点问题、流程问题、外部依赖还是全局问题，再看输入、过程、输出、日志、指标和用户反馈。止血上先降级、回滚、补偿或暂停非核心动作，根因上再补记录、验证、监控和复盘。",
      answer3min: "展开时要给出证据顺序：入口记录、过程日志、关键指标、用户反馈、外部依赖、失败样本和复盘结论。最后讲复盘动作：补检查清单、补验证样例、补监控或补协作机制。",
      javaMapping: "当前岗位能力、故障定位、复盘治理、证据闭环",
      projectEvidence: "可映射当前画像中的真实项目、工作记录、交付结果和复盘材料。",
      risk: "只说经验感受，不讲证据顺序，会显得排查深度不足。",
      doNotSay: ["直接重试就行", "没有证据但我肯定能解决"],
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
    "你是严格的求职面试官和知识库审计官。",
    "候选人的主身份必须来自当前画像、JD 和当前任务。",
    "生成内容必须服务当前用户的目标岗位，不要套用默认岗位或旧示例经历。",
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
      "每个条目必须包含真实项目证据、岗位能力映射、风险边界、不能说和安全表达",
      "问题要贴合当前用户画像，不要变成默认岗位题库",
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
          javaMapping: "岗位能力映射",
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

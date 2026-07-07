import type { KnowledgeBoundaryDraft } from "./coachAdapter";
import type { ProfileRoleFamily, UserProfile } from "../types/sprint";

const PROMPT_VERSION = "coach-boundary-suggestions-v1";

export interface BoundarySuggestionDraft extends KnowledgeBoundaryDraft {
  id: string;
  sourceSummary: string;
  confidence: "low" | "medium" | "high";
}

export function generateBoundarySuggestionsFromText({
  text,
  profile,
  existingTopics = []
}: {
  text: string;
  profile?: Pick<UserProfile, "targetRole" | "roleFamily">;
  existingTopics?: string[];
}): BoundarySuggestionDraft[] {
  const cleaned = clean(text);
  if (cleaned.length < 12) return [];
  const existing = new Set(existingTopics.map((topic) => clean(topic).toLowerCase()));
  const inputSummaryHash = hashSummary(`${profile?.targetRole || ""}|${profile?.roleFamily || "other"}|${cleaned}`);
  return extractTopics(cleaned, profile?.roleFamily).filter((topic) => !existing.has(topic.toLowerCase())).slice(0, 4).map((topic, index) => ({
    id: `suggested-boundary-${Date.now()}-${index}`,
    topic,
    level: inferLevel(cleaned),
    gap: inferGap(cleaned, topic),
    evidence: inferEvidence(cleaned, topic),
    targetUse: `${profile?.targetRole || "目标岗位"}：${inferTargetUse(cleaned, topic)}`,
    sourceSummary: summarizeSource(cleaned),
    confidence: index === 0 ? "high" : "medium",
    sourceConfidence: index === 0 ? "high" : "medium",
    sourceProvider: "local-fallback",
    sourcePromptVersion: PROMPT_VERSION,
    sourceInputHash: inputSummaryHash
  }));
}

const ROLE_TOPICS: Record<ProfileRoleFamily, string[]> = {
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

function extractTopics(text: string, roleFamily: ProfileRoleFamily = "other"): string[] {
  const lexicon = [...ROLE_TOPICS[roleFamily], ...COMMON_TOPICS, ...ROLE_TOPICS.other];
  const hits = lexicon.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  if (hits.length) return [...new Set(hits)];
  return [text.slice(0, 18).replace(/[，。；,.].*$/, "") || "目标岗位知识边界"];
}

function inferLevel(text: string): KnowledgeBoundaryDraft["level"] {
  if (/不了解|陌生|没做过|不会/.test(text)) return "陌生";
  if (/可落地|实战|线上|主导/.test(text)) return "可讲";
  return "了解";
}

function inferGap(text: string, topic: string): string {
  if (/故障|恢复|排查|稳定性/.test(text)) return `围绕「${topic}」补齐故障场景、恢复动作和线上证据。`;
  if (/指标|量化|数据|报表/.test(text)) return `围绕「${topic}」补齐指标口径、前后变化和可验证证据。`;
  return `围绕「${topic}」补齐机制、边界、项目证据和不能夸大的部分。`;
}

function inferEvidence(text: string, topic: string): string {
  const evidenceHint = text.match(/(项目|系统|平台|链路|报表|复盘|工单|日志)[^。；;]{0,24}/)?.[0];
  return evidenceHint ? `${evidenceHint}，需整理为「${topic}」证据。` : `待补充「${topic}」相关项目、笔记或复盘证据。`;
}

function inferTargetUse(text: string, topic: string): string {
  if (/JD|岗位|招聘|职责/.test(text)) return `用于匹配 JD 中的「${topic}」要求`;
  if (/面试|追问|反馈/.test(text)) return `用于回答面试追问中的「${topic}」问题`;
  return `用于目标岗位下的「${topic}」表达`;
}

function summarizeSource(text: string): string {
  return text.slice(0, 120);
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hashSummary(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

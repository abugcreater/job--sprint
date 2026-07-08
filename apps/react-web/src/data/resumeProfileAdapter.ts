import type { ProfileDraft } from "./coachAdapter";
import { createProfileDraft } from "./coachAdapter";
import { generateBoundarySuggestionsFromText, type BoundarySuggestionDraft } from "./boundarySuggestionAdapter";
import type { ProfileRoleFamily } from "../types/sprint";

export interface ResumeProfilePreview {
  draft: ProfileDraft;
  boundarySuggestions: BoundarySuggestionDraft[];
  summary: string;
  highlights: string[];
  warnings: string[];
}

const roleHints: Array<{ roleFamily: ProfileRoleFamily; keywords: RegExp; targetRole: string }> = [
  { roleFamily: "qa", keywords: /测试开发|测试|自动化测试|质量|用例|接口测试|性能测试|Selenium|pytest/i, targetRole: "测试开发工程师" },
  { roleFamily: "product", keywords: /产品经理|需求|增长|用户研究|PRD|竞品/i, targetRole: "产品经理" },
  { roleFamily: "project", keywords: /项目经理|PMO|交付管理|里程碑|资源协调/i, targetRole: "项目经理" },
  { roleFamily: "implementation", keywords: /实施|交付|客户现场|配置|上线验收/i, targetRole: "实施工程师" },
  { roleFamily: "support", keywords: /技术支持|售后|工单|客户问题|排障/i, targetRole: "技术支持工程师" },
  { roleFamily: "ops", keywords: /运维|SRE|DevOps|Kubernetes|监控|告警|发布|容器/i, targetRole: "运维工程师" },
  { roleFamily: "data", keywords: /数据|ETL|数仓|报表|指标|SQL|Flink|Spark/i, targetRole: "数据工程师" },
  { roleFamily: "mobile", keywords: /Android|iOS|移动端|Kotlin|Swift|Flutter|React Native/i, targetRole: "移动端工程师" },
  { roleFamily: "frontend", keywords: /前端|React|Vue|TypeScript|小程序|组件|首屏/i, targetRole: "前端工程师" },
  { roleFamily: "backend", keywords: /后端|Java|Spring|微服务|分布式|Redis|MQ|Go|服务端/i, targetRole: "后端工程师" }
];

const cityPattern = /(杭州|上海|苏州|南京|宁波|北京|深圳|广州|成都|武汉|远程)/g;

export function buildResumeProfilePreview(text: string, current?: ProfileDraft): ResumeProfilePreview {
  const normalized = normalizeText(text);
  const base = createProfileDraft(current ? draftToProfileLike(current) : undefined);
  const role = inferRole(normalized, base.roleFamily);
  const targetRole = inferTargetRole(normalized) || base.targetRole || role.targetRole;
  const experienceSummary = summarizeExperience(normalized) || base.experienceSummary;
  const projectEvidence = summarizeProjectEvidence(normalized) || base.projectEvidence;
  const cities = inferCities(normalized) || base.cities;
  const salaryTarget = inferLabeledValue(normalized, ["期望薪资", "薪资目标", "薪资"]) || base.salaryTarget;
  const targetLevel = inferTargetLevel(normalized) || base.targetLevel;
  const companyTypes = inferLabeledValue(normalized, ["期望公司", "公司类型", "目标公司"]) || base.companyTypes;
  const draft: ProfileDraft = {
    ...base,
    name: base.name && base.name !== "我的求职画像" ? base.name : targetRole ? `${targetRole}求职画像` : "我的求职画像",
    roleFamily: role.roleFamily,
    targetRole,
    targetLevel,
    cities,
    salaryTarget,
    companyTypes,
    experienceSummary,
    projectEvidence,
    nonClaims: base.nonClaims || "不包装未实际主导的项目、指标、线上结果或不熟悉技术。",
    dailyMinutes: base.dailyMinutes || "60"
  };
  const boundarySuggestions = normalized.length >= 12
    ? generateBoundarySuggestionsFromText({
        text: normalized,
        profile: { targetRole: draft.targetRole, roleFamily: draft.roleFamily },
        existingTopics: []
      }).slice(0, 5)
    : [];
  const highlights = [
    targetRole ? `目标岗位：${targetRole}` : "",
    role.roleFamily ? `角色方向：${role.label}` : "",
    cities ? `目标城市：${cities}` : "",
    projectEvidence ? "已识别项目证据" : "",
    boundarySuggestions.length ? `识别 ${boundarySuggestions.length} 个知识边界候选` : ""
  ].filter(Boolean);
  const warnings = [
    !targetRole ? "未识别到明确目标岗位，请手动补充。" : "",
    !experienceSummary ? "未识别到经验摘要，请手动补充。" : "",
    !projectEvidence ? "未识别到可讲项目证据，请手动补充。" : ""
  ].filter(Boolean);

  return {
    draft,
    boundarySuggestions,
    summary: highlights.length ? highlights.join(" · ") : "已读取素材，请确认画像字段。",
    highlights,
    warnings
  };
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function inferRole(text: string, fallback: ProfileRoleFamily): { roleFamily: ProfileRoleFamily; targetRole: string; label: string } {
  const matched = roleHints.find((hint) => hint.keywords.test(text));
  const roleFamily = matched?.roleFamily ?? fallback ?? "other";
  return {
    roleFamily,
    targetRole: matched?.targetRole ?? "IT 岗位",
    label: roleLabel(roleFamily)
  };
}

function inferTargetRole(text: string): string {
  const labeled = inferLabeledValue(text, ["求职意向", "目标岗位", "应聘岗位", "期望岗位"]);
  if (labeled) return trimRole(labeled);
  const roleLine = lines(text).find((line) => /(工程师|开发|测试|产品经理|项目经理|运维|实施|技术支持|数据分析师|数据工程师)/.test(line));
  return roleLine ? trimRole(roleLine) : "";
}

function inferCities(text: string): string {
  return Array.from(new Set(text.match(cityPattern) ?? [])).slice(0, 4).join("、");
}

function inferTargetLevel(text: string): string {
  const labeled = inferLabeledValue(text, ["目标等级", "职级", "级别"]);
  if (labeled) return labeled;
  const level = text.match(/(高级|资深|专家|中级|P[5-9]|T[5-9]|[1-9]\s*年)/);
  return level?.[1]?.replace(/\s+/g, "") ?? "";
}

function inferLabeledValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:：]\\s*([^\\n；;]+)`));
    if (match?.[1]) return cleanValue(match[1]);
  }
  return "";
}

function summarizeExperience(text: string): string {
  const picked = lines(text).filter((line) => /(年|经验|负责|主导|参与|熟悉|掌握|擅长)/.test(line));
  return compact(picked, 3, 220);
}

function summarizeProjectEvidence(text: string): string {
  const picked = lines(text).filter((line) => /(项目|系统|平台|负责|主导|指标|QPS|TPS|性能|稳定性|自动化|上线|优化|报表)/i.test(line));
  return compact(picked, 5, 320);
}

function lines(text: string): string[] {
  return text.split(/\n|；|;/).map(cleanValue).filter((line) => line.length >= 2);
}

function compact(values: string[], limit: number, maxLength: number): string {
  const content = Array.from(new Set(values)).slice(0, limit).join("；");
  return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
}

function trimRole(value: string): string {
  return cleanValue(value).replace(/^意向岗位[:：]?/, "").slice(0, 32);
}

function cleanValue(value: string): string {
  return value.replace(/^\s*(?:[-*•]\s*|\d+[.、)]\s*)/, "").replace(/\s+/g, " ").trim();
}

function roleLabel(roleFamily: ProfileRoleFamily): string {
  return {
    backend: "后端",
    frontend: "前端",
    qa: "测试",
    ops: "运维",
    data: "数据",
    mobile: "移动端",
    product: "产品",
    project: "项目管理",
    implementation: "实施",
    support: "技术支持",
    other: "其它 IT"
  }[roleFamily];
}

function draftToProfileLike(draft: ProfileDraft) {
  return {
    id: draft.id ?? "draft-profile",
    name: draft.name,
    roleFamily: draft.roleFamily,
    targetRole: draft.targetRole,
    targetLevel: draft.targetLevel,
    cities: draft.cities,
    salaryTarget: draft.salaryTarget,
    companyTypes: draft.companyTypes,
    experienceSummary: draft.experienceSummary,
    projectEvidence: draft.projectEvidence,
    nonClaims: draft.nonClaims,
    dailyMinutes: Number(draft.dailyMinutes) || 60,
    active: true,
    createdAt: "",
    updatedAt: ""
  };
}

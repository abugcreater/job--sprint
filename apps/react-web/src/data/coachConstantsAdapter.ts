import type { CoachScheduleEventKind, KnowledgeBoundaryLevel, ProfileRoleFamily } from "../types/sprint";

export const profileRoleFamilies: Array<{ value: ProfileRoleFamily; label: string }> = [
  { value: "backend", label: "后端" },
  { value: "frontend", label: "前端" },
  { value: "qa", label: "测试" },
  { value: "ops", label: "运维" },
  { value: "data", label: "数据" },
  { value: "mobile", label: "移动端" },
  { value: "product", label: "产品" },
  { value: "project", label: "项目" },
  { value: "implementation", label: "实施" },
  { value: "support", label: "技术支持" },
  { value: "other", label: "其它 IT" }
];

export const knowledgeBoundaryLevels: KnowledgeBoundaryLevel[] = ["陌生", "了解", "可讲", "可实战", "可面试追问"];

export const coachEventKinds: Array<{ value: CoachScheduleEventKind; label: string }> = [
  { value: "learning", label: "知识任务" },
  { value: "interview", label: "面试训练" },
  { value: "opportunity", label: "机会跟进" },
  { value: "review", label: "复盘任务" },
  { value: "recovery", label: "低状态兜底" }
];

export function roleFamilyLabel(value: ProfileRoleFamily): string {
  return profileRoleFamilies.find((item) => item.value === value)?.label ?? "泛 IT";
}

import type { ProfileRoleFamily } from "../types/sprint";

export interface CoachOnboardingTemplate {
  id: ProfileRoleFamily;
  label: string;
  roleFamily: ProfileRoleFamily;
  targetRole: string;
  nonClaims: string;
}

export const coachOnboardingTemplates: CoachOnboardingTemplate[] = [
  template("backend", "后端求职者", "后端工程师"),
  template("frontend", "前端求职者", "前端工程师"),
  template("qa", "测试求职者", "测试开发工程师"),
  template("ops", "运维求职者", "运维工程师"),
  template("data", "数据求职者", "数据工程师"),
  template("mobile", "移动端求职者", "移动端工程师"),
  template("product", "产品求职者", "产品经理"),
  template("project", "项目求职者", "项目经理"),
  template("implementation", "实施求职者", "实施工程师"),
  template("support", "技术支持求职者", "技术支持工程师"),
  template("other", "其它 IT 求职者", "IT 岗位")
];

function template(roleFamily: ProfileRoleFamily, label: string, targetRole: string): CoachOnboardingTemplate {
  return {
    id: roleFamily,
    label,
    roleFamily,
    targetRole,
    nonClaims: "不包装未实际主导的项目、指标、线上结果或不熟悉技术。"
  };
}

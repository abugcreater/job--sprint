import type { ProfileRoleFamily } from "../types/sprint";

export interface CoachOnboardingTemplate {
  id: ProfileRoleFamily;
  label: string;
  roleFamily: ProfileRoleFamily;
  targetRole: string;
  nonClaims: string;
  sourceText: string;
}

export const coachOnboardingTemplates: CoachOnboardingTemplate[] = [
  template("backend", "后端求职者", "后端工程师", "接口设计、数据库、缓存、消息队列、稳定性、高并发、分布式"),
  template("frontend", "前端求职者", "前端工程师", "性能、组件、状态管理、工程化、首屏、发布、兼容性"),
  template("qa", "测试求职者", "测试开发工程师", "接口自动化、测试分层、质量指标、稳定性、缺陷归因、Mock"),
  template("ops", "运维求职者", "运维工程师", "监控、告警、发布、回滚、故障恢复、容量、变更"),
  template("data", "数据求职者", "数据工程师", "指标口径、数据链路、血缘、质量校验、报表、治理"),
  template("mobile", "移动端求职者", "移动端工程师", "性能、崩溃率、生命周期、灰度、兼容性、端上体验"),
  template("product", "产品求职者", "产品经理", "用户问题、指标、需求取舍、上线复盘、增长、留存"),
  template("project", "项目求职者", "项目经理", "里程碑、风险台账、跨团队协作、验收、资源协调"),
  template("implementation", "实施求职者", "实施工程师", "客户现场、配置交付、问题闭环、验收、SOP"),
  template("support", "技术支持求职者", "技术支持工程师", "工单、排查路径、客户沟通、知识沉淀、日志"),
  template("other", "其它 IT 求职者", "IT 岗位", "目标岗位、项目证据、风险边界、交付场景")
];

function template(roleFamily: ProfileRoleFamily, label: string, targetRole: string, sourceText: string): CoachOnboardingTemplate {
  return {
    id: roleFamily,
    label,
    roleFamily,
    targetRole,
    nonClaims: "不包装未实际主导的项目、指标、线上结果或不熟悉技术。",
    sourceText: `建档模板关键词：${sourceText}。请结合真实 JD、简历或面试反馈替换和补充。`
  };
}

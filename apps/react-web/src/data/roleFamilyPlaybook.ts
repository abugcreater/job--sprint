import type { ProfileRoleFamily } from "../types/sprint";

export interface RoleFamilyPlaybook {
  lens: string;
  evidence: string;
  answerFrame: string;
  scheduleFocus: string;
  interviewPrompt: string;
  questionBank: string[];
}

const roleFamilyPlaybooks: Record<ProfileRoleFamily, RoleFamilyPlaybook> = {
  backend: {
    lens: "服务链路、数据一致性、稳定性治理",
    evidence: "接口/任务链路、监控指标、故障复盘或容量数据",
    answerFrame: "机制、边界、失败场景、监控指标",
    scheduleFocus: "链路机制和线上证据",
    interviewPrompt: "请结合项目经历说明 {topic} 在服务链路中的机制、边界、失败场景和监控指标。",
    questionBank: ["{focus} 出现异常时，你如何定位、止血、补偿和复盘？", "{topic} 和上下游系统的边界、幂等和监控指标分别是什么？"]
  },
  frontend: {
    lens: "交互状态、性能体验、工程化协作",
    evidence: "页面状态、性能指标、组件边界或发布回滚记录",
    answerFrame: "用户场景、状态流、性能取舍、可观测结果",
    scheduleFocus: "用户路径、状态流和性能证据",
    interviewPrompt: "请结合项目经历说明 {topic} 对用户路径、状态流、性能体验和发布验证的影响。",
    questionBank: ["{focus} 影响用户体验时，你如何定位状态、性能和回滚边界？", "{topic} 如何在组件边界、数据流和埋点指标里落地？"]
  },
  qa: {
    lens: "测试策略、质量风险、自动化覆盖",
    evidence: "测试矩阵、缺陷归因、自动化覆盖或稳定性数据",
    answerFrame: "风险识别、用例分层、自动化收益、质量指标",
    scheduleFocus: "测试分层和缺陷归因证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的风险识别、用例分层、自动化覆盖和质量指标。",
    questionBank: ["{focus} 风险出现时，你如何设计分层用例和回归策略？", "{topic} 的自动化收益、缺陷归因和质量指标如何证明？"]
  },
  ops: {
    lens: "发布变更、监控告警、故障恢复",
    evidence: "发布记录、告警指标、应急流程或复盘报告",
    answerFrame: "变更路径、监控信号、回滚策略、恢复时间",
    scheduleFocus: "变更链路和故障恢复证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的变更路径、监控信号、回滚策略和恢复时间。",
    questionBank: ["{focus} 发生时，你如何判断影响面、触发告警和组织恢复？", "{topic} 的发布、回滚、容量和应急预案如何设计？"]
  },
  data: {
    lens: "指标口径、数据链路、治理质量",
    evidence: "指标定义、血缘链路、校验规则或质量报表",
    answerFrame: "口径边界、链路依赖、质量校验、业务解释",
    scheduleFocus: "指标口径和数据质量证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的口径边界、链路依赖、质量校验和业务解释。",
    questionBank: ["{focus} 导致指标异常时，你如何追踪血缘、校验口径和解释业务影响？", "{topic} 的数据质量、延迟和治理责任如何界定？"]
  },
  mobile: {
    lens: "端上体验、兼容性、性能与发布",
    evidence: "机型覆盖、性能数据、崩溃率或灰度记录",
    answerFrame: "端场景、生命周期、性能取舍、灰度验证",
    scheduleFocus: "端上场景和灰度验证证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的端上场景、生命周期、性能取舍和灰度验证。",
    questionBank: ["{focus} 在端上出现时，你如何排查机型、系统版本和生命周期问题？", "{topic} 如何做灰度、崩溃监控和性能回归验证？"]
  },
  product: {
    lens: "用户问题、需求取舍、指标闭环",
    evidence: "用户访谈、需求文档、指标看板或上线复盘",
    answerFrame: "用户问题、方案取舍、指标变化、风险控制",
    scheduleFocus: "用户问题和指标闭环证据",
    interviewPrompt: "请结合项目经历说明 {topic} 背后的用户问题、方案取舍、指标变化和风险控制。",
    questionBank: ["{focus} 暴露后，你如何重新判断用户问题、优先级和指标风险？", "{topic} 的需求取舍、上线验证和复盘动作是什么？"]
  },
  project: {
    lens: "交付节奏、风险同步、跨团队协作",
    evidence: "里程碑、风险台账、会议纪要或交付验收",
    answerFrame: "目标拆解、风险暴露、资源协调、验收结果",
    scheduleFocus: "里程碑和风险同步证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的目标拆解、风险暴露、资源协调和验收结果。",
    questionBank: ["{focus} 影响交付时，你如何暴露风险、协调资源和重排里程碑？", "{topic} 的验收标准、依赖关系和复盘证据是什么？"]
  },
  implementation: {
    lens: "客户场景、配置交付、问题闭环",
    evidence: "配置清单、现场问题、验收单或客户反馈",
    answerFrame: "客户背景、配置边界、问题处理、验收证据",
    scheduleFocus: "客户场景和验收证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的客户背景、配置边界、问题处理和验收证据。",
    questionBank: ["{focus} 在客户现场出现时，你如何定位配置边界和推进闭环？", "{topic} 的交付清单、验收证据和客户沟通边界是什么？"]
  },
  support: {
    lens: "问题定位、客户沟通、知识沉淀",
    evidence: "工单、日志截图、SOP 或知识库条目",
    answerFrame: "现象复述、排查路径、沟通边界、沉淀复用",
    scheduleFocus: "排查路径和知识沉淀证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的现象复述、排查路径、客户沟通边界和沉淀复用。",
    questionBank: ["{focus} 被用户反馈时，你如何复述现象、缩小范围和同步预期？", "{topic} 如何沉淀 SOP、知识库和可复用排查脚本？"]
  },
  other: {
    lens: "目标岗位关键场景、交付证据、风险边界",
    evidence: "岗位 JD、项目材料、演示记录或复盘文档",
    answerFrame: "场景、职责、证据、边界",
    scheduleFocus: "目标岗位关键场景和交付证据",
    interviewPrompt: "请结合项目经历说明 {topic} 的场景、职责、证据和边界。",
    questionBank: ["{focus} 出现问题时，你承担的职责、边界和证据是什么？", "{topic} 如何和目标岗位 JD、项目材料、演示结果对应？"]
  }
};

export function roleFamilyPlaybookFor(value: ProfileRoleFamily): RoleFamilyPlaybook {
  return roleFamilyPlaybooks[value] ?? roleFamilyPlaybooks.other;
}

export function roleFamilyQuestionBank(playbook: RoleFamilyPlaybook, topic: string, focus = ""): string[] {
  const replacement = focus || topic;
  return [playbook.interviewPrompt, ...playbook.questionBank]
    .map((prompt) => replaceToken(replaceToken(prompt, "{topic}", topic), "{focus}", replacement))
    .slice(0, 3);
}

function replaceToken(value: string, token: string, replacement: string): string {
  return value.split(token).join(replacement);
}

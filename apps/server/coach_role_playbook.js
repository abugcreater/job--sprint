const ROLE_LABELS = {
  backend: "后端",
  frontend: "前端",
  qa: "测试",
  ops: "运维",
  data: "数据",
  mobile: "移动端",
  product: "产品",
  project: "项目",
  implementation: "实施",
  support: "技术支持",
  other: "泛 IT"
};

const PLAYBOOKS = {
  backend: playbook("服务链路、数据一致性、稳定性治理", "接口/任务链路、监控指标、故障复盘或容量数据", "机制、边界、失败场景、监控指标", "链路机制和线上证据", "请结合项目经历说明 {topic} 在服务链路中的机制、边界、失败场景和监控指标。", ["{focus} 出现异常时，你如何定位、止血、补偿和复盘？", "{topic} 和上下游系统的边界、幂等和监控指标分别是什么？"]),
  frontend: playbook("交互状态、性能体验、工程化协作", "页面状态、性能指标、组件边界或发布回滚记录", "用户场景、状态流、性能取舍、可观测结果", "用户路径、状态流和性能证据", "请结合项目经历说明 {topic} 对用户路径、状态流、性能体验和发布验证的影响。", ["{focus} 影响用户体验时，你如何定位状态、性能和回滚边界？", "{topic} 如何在组件边界、数据流和埋点指标里落地？"]),
  qa: playbook("测试策略、质量风险、自动化覆盖", "测试矩阵、缺陷归因、自动化覆盖或稳定性数据", "风险识别、用例分层、自动化收益、质量指标", "测试分层和缺陷归因证据", "请结合项目经历说明 {topic} 的风险识别、用例分层、自动化覆盖和质量指标。", ["{focus} 风险出现时，你如何设计分层用例和回归策略？", "{topic} 的自动化收益、缺陷归因和质量指标如何证明？"]),
  ops: playbook("发布变更、监控告警、故障恢复", "发布记录、告警指标、应急流程或复盘报告", "变更路径、监控信号、回滚策略、恢复时间", "变更链路和故障恢复证据", "请结合项目经历说明 {topic} 的变更路径、监控信号、回滚策略和恢复时间。", ["{focus} 发生时，你如何判断影响面、触发告警和组织恢复？", "{topic} 的发布、回滚、容量和应急预案如何设计？"]),
  data: playbook("指标口径、数据链路、治理质量", "指标定义、血缘链路、校验规则或质量报表", "口径边界、链路依赖、质量校验、业务解释", "指标口径和数据质量证据", "请结合项目经历说明 {topic} 的口径边界、链路依赖、质量校验和业务解释。", ["{focus} 导致指标异常时，你如何追踪血缘、校验口径和解释业务影响？", "{topic} 的数据质量、延迟和治理责任如何界定？"]),
  mobile: playbook("端上体验、兼容性、性能与发布", "机型覆盖、性能数据、崩溃率或灰度记录", "端场景、生命周期、性能取舍、灰度验证", "端上场景和灰度验证证据", "请结合项目经历说明 {topic} 的端上场景、生命周期、性能取舍和灰度验证。", ["{focus} 在端上出现时，你如何排查机型、系统版本和生命周期问题？", "{topic} 如何做灰度、崩溃监控和性能回归验证？"]),
  product: playbook("用户问题、需求取舍、指标闭环", "用户访谈、需求文档、指标看板或上线复盘", "用户问题、方案取舍、指标变化、风险控制", "用户问题和指标闭环证据", "请结合项目经历说明 {topic} 背后的用户问题、方案取舍、指标变化和风险控制。", ["{focus} 暴露后，你如何重新判断用户问题、优先级和指标风险？", "{topic} 的需求取舍、上线验证和复盘动作是什么？"]),
  project: playbook("交付节奏、风险同步、跨团队协作", "里程碑、风险台账、会议纪要或交付验收", "目标拆解、风险暴露、资源协调、验收结果", "里程碑和风险同步证据", "请结合项目经历说明 {topic} 的目标拆解、风险暴露、资源协调和验收结果。", ["{focus} 影响交付时，你如何暴露风险、协调资源和重排里程碑？", "{topic} 的验收标准、依赖关系和复盘证据是什么？"]),
  implementation: playbook("客户场景、配置交付、问题闭环", "配置清单、现场问题、验收单或客户反馈", "客户背景、配置边界、问题处理、验收证据", "客户场景和验收证据", "请结合项目经历说明 {topic} 的客户背景、配置边界、问题处理和验收证据。", ["{focus} 在客户现场出现时，你如何定位配置边界和推进闭环？", "{topic} 的交付清单、验收证据和客户沟通边界是什么？"]),
  support: playbook("问题定位、客户沟通、知识沉淀", "工单、日志截图、SOP 或知识库条目", "现象复述、排查路径、沟通边界、沉淀复用", "排查路径和知识沉淀证据", "请结合项目经历说明 {topic} 的现象复述、排查路径、客户沟通边界和沉淀复用。", ["{focus} 被用户反馈时，你如何复述现象、缩小范围和同步预期？", "{topic} 如何沉淀 SOP、知识库和可复用排查脚本？"]),
  other: playbook("目标岗位关键场景、交付证据、风险边界", "岗位 JD、项目材料、演示记录或复盘文档", "场景、职责、证据、边界", "目标岗位关键场景和交付证据", "请结合项目经历说明 {topic} 的场景、职责、证据和边界。", ["{focus} 出现问题时，你承担的职责、边界和证据是什么？", "{topic} 如何和目标岗位 JD、项目材料、演示结果对应？"])
};

function playbook(lens, evidence, answerFrame, scheduleFocus, interviewPrompt, questionBank = []) {
  return { lens, evidence, answerFrame, scheduleFocus, interviewPrompt, questionBank };
}

function roleFamilyLabel(value) {
  return ROLE_LABELS[value] || ROLE_LABELS.other;
}

function roleFamilyPlaybookFor(value) {
  return PLAYBOOKS[value] || PLAYBOOKS.other;
}

function roleFamilyQuestionBank(playbook, topic, focus = "") {
  const replacement = focus || topic;
  return [playbook.interviewPrompt].concat(playbook.questionBank || [])
    .map((prompt) => prompt.replaceAll("{topic}", topic).replaceAll("{focus}", replacement))
    .slice(0, 3);
}

module.exports = {
  PLAYBOOKS,
  roleFamilyLabel,
  roleFamilyPlaybookFor,
  roleFamilyQuestionBank
};

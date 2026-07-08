#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const aiRoot = process.env.JOB_SPRINT_AI_PROJECT_ROOT || "/path/to/sample-ai-project";
const resumeRoot = process.env.JOB_SPRINT_RESUME_ROOT || "/path/to/resume-materials";
const xmindRoot = process.env.JOB_SPRINT_XMIND_ROOT || "/path/to/learning-materials";
const jdRoot = process.env.JOB_SPRINT_JD_KNOWLEDGE_ROOT || "/path/to/jd-knowledge-base";
const companyEvidenceRoot = process.env.JOB_SPRINT_COMPANY_EVIDENCE_ROOT || "/path/to/company-evidence";
const projectRoot = process.env.JOB_SPRINT_PROJECT_ROOT || "/path/to/job-sprint-coach";

const roots = {
  scheduleRoot: projectRoot,
  aiProjectRoot: aiRoot,
  resumeRoot,
  xmindRoot,
  jdKnowledgeRoot: jdRoot,
  companyEvidenceRoot
};

function exists(p) {
  return fs.existsSync(p);
}

function weekday(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Singapore",
    weekday: "short"
  }).format(new Date(`${date}T08:00:00+08:00`));
}

function ref(root, relativePath, label, usage) {
  const absolutePath = path.join(root, relativePath);
  const ok = exists(absolutePath);
  const rootName = Object.entries(roots).find(([, value]) => value === root)?.[0] || "externalRoot";
  return {
    label,
    usage,
    rootName,
    root,
    relativePath,
    path: relativePath,
    absolutePath,
    exists: ok,
    status: ok ? "ok" : "missing",
    openCommand: ok ? `open ${JSON.stringify(absolutePath)}` : "",
    codeCommand: ok ? `code ${JSON.stringify(absolutePath)}` : "",
    viewCommand: ok ? `sed -n '1,220p' ${JSON.stringify(absolutePath)}` : ""
  };
}

function cmd(label, command, workingDirectory = aiRoot) {
  return {
    label,
    command,
    workingDirectory,
    cwd: workingDirectory,
    copyCommand: `cd ${JSON.stringify(workingDirectory)} && ${command}`
  };
}

const refs = {
  readme: ref(aiRoot, "README.md", "AI 工程化项目 README", "项目总览、边界和运行入口"),
  playbook: ref(aiRoot, "学习与面试作战手册.md", "学习与面试作战手册", "项目讲稿、面试口径、边界说明"),
  roadmap: ref(aiRoot, "docs/quasi-production-roadmap.md", "准生产路线图", "当前实现与生产化升级差距"),
  cloudArch: ref(aiRoot, "docs/cloud-service-architecture.md", "云服务架构说明", "部署、服务化和云端边界"),
  api: ref(aiRoot, "src/replay/api.py", "api.py", "FastAPI 服务入口、健康检查、接口编排"),
  auth: ref(aiRoot, "src/replay/auth.py", "auth.py", "API Key / 用户鉴权 / 权限边界"),
  obs: ref(aiRoot, "src/replay/observability.py", "observability.py", "日志、request-id、metrics"),
  xiaohui: ref(aiRoot, "src/replay/xiaohui_agent.py", "xiaohui_agent.py", "供小慧 Agent 主逻辑、Skill 路由、工具调用"),
  roundtrip: ref(aiRoot, "src/replay/roundtrip_langchain.py", "roundtrip_langchain.py", "往返政策解析、结构化输出、复杂业务 workflow"),
  roundtripSample: ref(aiRoot, "data/roundtrip_sample.md", "roundtrip_sample.md", "往返政策解析样例输入"),
  supplierRules: ref(aiRoot, "data/knowledge/供应商规则.md", "供应商规则知识库", "供小慧 Agent/RAG 检索样例知识"),
  xiaohuiSession: ref(aiRoot, "outputs/xiaohui_session.jsonl", "供小慧会话输出", "演示 Agent 执行结果与证据"),
  roundtripOutput: ref(aiRoot, "outputs/roundtrip/run_summary.md", "往返解析输出摘要", "解析结果证据"),
  testsApi: ref(aiRoot, "tests/test_api.py", "API 测试", "本地接口测试与演示证据"),
  dockerfile: ref(aiRoot, "Dockerfile", "Dockerfile", "容器化部署证据"),
  compose: ref(aiRoot, "docker-compose.yml", "docker-compose.yml", "本地编排与部署说明"),
  ci: ref(aiRoot, ".github/workflows/ci.yml", "GitHub Actions CI", "CI 验证链路"),
  resumeHangzhou: ref(resumeRoot, "主投简历/候选人-杭州主投版简历-高级Java后端-项目指标增强版.md", "杭州主投简历", "简历 bullet 和项目边界"),
  talkPack: ref(resumeRoot, "面试训练/候选人-快速再就业面试话术包.md", "快速再就业面试话术包", "60 秒/3 分钟主线"),
  riskLine: ref(resumeRoot, "面试训练/简历风险点与追问防线.md", "简历风险点与追问防线", "不能夸大的边界"),
  deepQuestions: ref(resumeRoot, "面试训练/候选人-高级Java深挖题库与备选面试准备清单.md", "高级 Java 深挖题库", "JVM/Spring/MQ/Redis/MySQL 追问"),
  startHere: ref(resumeRoot, "面试训练/START_HERE.md", "面试训练 START_HERE", "材料入口和复习顺序"),
  aiEnhanceRoute: ref(resumeRoot, "长期AI增强/候选人-AI应用工程化知识补充路线.md", "AI 应用工程化知识补充路线", "AI 增强方向的学习边界"),
  jdMatrix: ref(jdRoot, "docs/jd/target-jd-matrix.md", "目标 JD 矩阵", "岗位关键词和 JD 对齐"),
  ragCalibration: ref(jdRoot, "docs/learning/llm-rag-transition-calibration.md", "RAG 转型校准", "RAG 学习边界与岗位匹配"),
  aiDashboardBoundary: ref(jdRoot, "docs/architecture/agent-delivery-dashboard-architecture-and-data-boundary.md", "Agent 数据边界文档", "AI 应用工程化边界"),
  searchFlow: ref(companyEvidenceRoot, "search_interface_data_flow.md", "搜索接口数据流脱敏材料", "复杂搜索链路抽象口径"),
  searchBlackholeMetric: ref(companyEvidenceRoot, "搜索指标/searchblackhole技术指标.md", "searchblackhole 技术指标脱敏锚点", "缓存/MQ/Redis 经验抽象"),
  xmindPriorityNav: ref(xmindRoot, "00_先读我_面试学习优先级导航.md", "面试学习优先级导航", "先学真实项目/SOF/Dubbo 搜索链路，再补 AI/RAG"),
  sofDubboXmind: ref(xmindRoot, "21_SOFDubbo项目技术栈与搜索链路.xmind", "SOF/Dubbo 项目技术栈 XMind", "searchfrontapi/visearch/SOF/Dubbo/网关/中间件边界"),
  sofDubboMd: ref(xmindRoot, "SOFDubbo项目技术栈-学习面试重构版.md", "SOF/Dubbo 项目学习面试文档", "真实项目技术栈、搜索链路和面试话术"),
  sofDubboReport: ref(xmindRoot, "sof_dubbo_project_stack_supplement_report_2026-07-01.md", "SOF/Dubbo 补充报告", "基于真实工程复核后的技术栈边界"),
  jdGuard: ref(xmindRoot, "20_JD面经对齐护栏.xmind", "JD 面经对齐护栏", "JD 关键词与面经对齐"),
  agentXmind: ref(xmindRoot, "13_AIAgent工程化后端设计.xmind", "AI Agent 工程化 XMind", "Agent/Tool/Skill/Function Calling 后端映射"),
  ragXmind: ref(xmindRoot, "14_RAG检索生成工程化.xmind", "RAG 工程化 XMind", "RAG、检索、citation、no-answer"),
  jvmXmind: ref(xmindRoot, "03_JVM体系与线上排查.xmind", "JVM 体系与线上排查 XMind", "G1/ZGC/JFR/jcmd/GC log"),
  springXmind: ref(xmindRoot, "04_SpringBoot工程入口与运行链路.xmind", "SpringBoot 工程入口 XMind", "Spring MVC、事务、异常、Actuator"),
  mysqlXmind: ref(xmindRoot, "05_MySQL索引事务与高可用.xmind", "MySQL XMind", "索引、MVCC、锁、慢 SQL"),
  redisXmind: ref(xmindRoot, "06_Redis缓存与分布式锁治理.xmind", "Redis XMind", "缓存一致性、热点、分布式锁"),
  mqXmind: ref(xmindRoot, "18_MQ三件套原理对比.xmind", "MQ 三件套 XMind", "RabbitMQ/RocketMQ/Kafka 对比"),
  stabilityXmind: ref(xmindRoot, "12_稳定性治理与可观测性压测.xmind", "稳定性治理 XMind", "限流、熔断、降级、指标、压测"),
  asyncXmind: ref(xmindRoot, "11_异步任务与外部依赖治理.xmind", "异步任务 XMind", "异步任务、外部依赖、任务恢复"),
  androidDoc: ref(projectRoot, "docs/core/03-technical-architecture.md", "技术架构与 Android 边界", "Android WebView、本地 assets、发布边界"),
  deployDoc: ref(projectRoot, "docs/core/04-acceptance-and-risk.md", "验收与风险", "部署、发布和回滚风险口径")
};

function summarizePaths(mustRead) {
  const missing = mustRead.filter((item) => !item.exists);
  return {
    absolutePaths: mustRead.map((item) => item.absolutePath),
    relativePaths: mustRead.map((item) => `${item.root} :: ${item.relativePath}`),
    pathStatus: missing.length === 0 ? "all-ok" : (missing.length === mustRead.length ? "missing" : "partial-missing"),
    openCommands: mustRead.filter((item) => item.openCommand).map((item) => item.openCommand),
    fallback: missing.length === 0 ? "路径已校验，可直接复制打开命令。" : `缺失 ${missing.length} 个路径；先使用已存在文件完成当天产出，再在 docs/core/04-acceptance-and-risk.md 查看替代方案。`
  };
}

function block(date, start, end, category, title, description, mustRead, commands, deliverables, interviewQuestions, javaMapping, acceptance, risk) {
  const pathInfo = summarizePaths(mustRead);
  return {
    id: `${date}-${start.replace(":", "")}-${category}`,
    start,
    end,
    category,
    title,
    description,
    cwd: commands[0] ? commands[0].workingDirectory : (mustRead[0] ? mustRead[0].root : projectRoot),
    mustRead,
    sourceFiles: mustRead,
    artifacts: deliverables.map((item, index) => ({
      label: item,
      status: "virtual",
      artifactKey: `${date}-${start.replace(":", "")}-artifact-${index + 1}`,
      storage: "localStorage 或本地 Markdown 手工沉淀",
      note: "这是当天需要产出的内容，不是预先存在的文件。"
    })),
    commands,
    deliverables,
    interviewQuestions,
    javaMapping,
    acceptance,
    risk,
    ...pathInfo
  };
}

const daySpecs = [
  {
    date: "2026-07-01",
    theme: "真实项目技术栈、SOF/Dubbo 搜索链路与学习优先级",
    goal: "先按最新知识图谱确认主线：真实 Java 项目和搜索链路优先，AI/RAG 作为后续增强",
    risk: "一开始就讲 LLM/Agent 会被追问击穿，必须先把自己的 Java 项目链路讲稳",
    javaFocus: "SOF/Dubbo、Spring MVC、网关入口、搜索链路边界",
    blocks: [
      block("2026-07-01", "09:30", "11:30", "project", "真实项目知识图谱总览", "先读优先级导航和 SOF/Dubbo 项目技术栈，确认两周学习顺序和真实项目边界。", [refs.xmindPriorityNav, refs.sofDubboMd, refs.sofDubboReport, refs.sofDubboXmind], [], ["写出 P0/P1/P2 学习顺序", "列出 searchfrontapi/visearch/SOF/Dubbo 边界", "标记 5 个不确定点"], ["你真实项目的主链路是什么？", "为什么第一阶段不先讲 AI Agent？"], "真实项目优先、SOF/Dubbo、搜索链路边界", "能说清先学真实项目，再用 AI 项目增强，而不是裸转 AI", "把 AI 学习排到第一天会导致主线失焦"),
      block("2026-07-01", "11:30", "12:00", "interview", "低压口述：主线定位", "用 60 秒说清主身份是高级 Java 后端，核心证据来自真实搜索链路，AI 只是增强。", [refs.talkPack, refs.riskLine, refs.xmindPriorityNav], [], ["60 秒主线定位文字稿"], ["你是不是要裸转 AI？", "你最强的 Java 项目证据是什么？"], "Java 主线 + AI 工程化增强", "不说训练模型，不把 demo 说成生产平台", "主线定位含糊会影响简历投递"),
      block("2026-07-01", "14:00", "16:00", "java", "搜索服务入口与 SOF/Dubbo 映射", "把真实项目链路拆成入口、网关、业务编排、Dubbo/DSF 调用、下游依赖和返回。", [refs.sofDubboMd, refs.sofDubboReport, refs.searchFlow, refs.springXmind], [], ["HTTP/SOF Gateway -> Controller -> Pipeline/Pipe -> DSF/Dubbo -> Response 链路图"], ["SOF/Dubbo 在你项目里解决什么问题？", "Spring MVC 和 SOF 网关边界怎么讲？"], "Spring MVC、SOF Gateway、Dubbo/DSF、Pipeline/Pipe", "能把真实项目入口链路用 Java 后端语言讲清", "只讲框架名不讲链路会显得空泛"),
      block("2026-07-01", "16:00", "17:00", "java", "搜索链路证据与边界", "整理可公开讲的搜索链路证据，区分个人负责、团队协作和不能公开的内部细节。", [refs.searchFlow, refs.searchBlackholeMetric, refs.riskLine], [], ["搜索链路证据表 v0", "不能夸大的边界清单"], ["哪些是你独立负责？", "哪些只能脱敏抽象讲？"], "复杂业务链路、缓存/MQ、稳定性治理、边界表达", "每个亮点都有路径或脱敏证据锚点", "把团队整体成果写成个人独立完成"),
      block("2026-07-01", "20:30", "21:30", "interview", "低压问答：真实项目 3 问", "第一天只练真实项目低压问答，不进入 LLM/Agent 高压追问。", [refs.sofDubboMd, refs.deepQuestions, refs.riskLine], [], ["真实项目 3 问回答 v0", "追问卡点清单"], ["项目入口链路怎么走？", "缓存查不到怎么排查？", "你如何证明稳定性治理能力？"], "搜索链路、Redis/MQ、排查证据", "能回答 3 个问题且承认边界", "一开始背 AI 概念会掩盖真实优势"),
      block("2026-07-01", "21:30", "22:30", "delivery", "项目证据表 v0", "建立证据维度：文件、链路、命令、指标、边界、面试话术。", [refs.sofDubboMd, refs.searchFlow, refs.searchBlackholeMetric], [], ["真实项目证据表 v0"], ["简历 bullet 背后有什么证据？"], "简历表达必须有代码/文档/脱敏材料证据", "每条亮点至少绑定一个路径、材料或可复述链路", "没有证据的亮点不能进简历"),
      block("2026-07-01", "22:30", "23:00", "review", "当日复盘", "记录真实项目链路、路径问题、Java 映射和明日补救项。", [refs.xmindPriorityNav], [], ["当日复盘"], ["明天最优先补什么？"], "复盘闭环", "完成页面复盘 6 问", "复盘只写感受不写产出")
    ]
  },
  {
    date: "2026-07-02",
    theme: "真实项目硬点：Spring/JVM/MQ/Redis 与搜索链路排查",
    goal: "把面试高频硬点落到真实项目，不只背八股",
    risk: "只背技术点不绑定真实链路，面试官会认为项目深度不足",
    javaFocus: "Spring 事务、JVM、MQ、Redis、缓存一致性与故障排查",
    blocks: [
      block("2026-07-02", "09:30", "11:30", "java", "Spring 事务与搜索链路边界", "复习事务传播、自调用失效、异常回滚，再映射到搜索链路中哪些场景不能滥用事务。", [refs.springXmind, refs.sofDubboMd, refs.deepQuestions], [], ["Spring 事务传播回答卡", "真实链路中事务边界说明"], ["Spring 事务传播级别有哪些？", "为什么搜索链路不能用大事务包住所有调用？"], "Spring AOP、事务传播、外部依赖边界", "能说 REQUIRED/REQUIRES_NEW/NESTED 和失效场景", "只背传播级别不讲链路边界"),
      block("2026-07-02", "11:30", "12:00", "interview", "口述：事务失效", "用 60 秒讲事务失效和搜索链路里的事务边界。", [refs.springXmind, refs.riskLine], [], ["事务失效 60 秒回答"], ["@Transactional 为什么会失效？"], "代理、自调用、异常、异步线程", "不卡住并能补一个真实场景", "只说注解名"),
      block("2026-07-02", "14:00", "16:00", "java", "JVM G1/ZGC 与线上抖动排查", "补齐 G1/ZGC、JFR、jcmd、GC log，并和 P99 抖动排查绑定。", [refs.jvmXmind, refs.deepQuestions, refs.stabilityXmind], [], ["G1/ZGC 对比卡", "P99 抖动排查步骤"], ["G1 和 ZGC 的底层差异是什么？", "接口 P99 抖动你怎么排？"], "JVM、GC、JFR、jcmd、线程池、外部依赖", "能从证据链而不是名词回答 JVM 问题", "JVM 只讲线上治理不讲基础会被问穿"),
      block("2026-07-02", "16:00", "17:00", "java", "MQ/Redis 缓存查不到排查", "按 MQ 消费、消息解析、航线映射、Key、Redis、TTL、查询接口顺序讲。", [refs.mqXmind, refs.redisXmind, refs.searchBlackholeMetric], [], ["缓存查不到排查链路图"], ["缓存查不到怎么排查？", "如何处理 MQ 重复和乱序？"], "MQ 消费、Redis Key、TTL、幂等、观测", "能按写链路和读链路两边排查", "只说 Redis get/set"),
      block("2026-07-02", "20:30", "21:30", "interview", "压力小面：Spring/JVM/MQ 三连", "围绕真实项目做 3 个硬点追问，记录错题和修正答案。", [refs.deepQuestions, refs.sofDubboMd, refs.riskLine], [], ["Spring/JVM/MQ 错题清单"], ["事务为什么失效？", "G1/ZGC 怎么选？", "MQ 如何保证不丢不重？"], "Java 硬点 + 真实项目证据", "每题都有机制、场景、边界", "只背八股不落项目"),
      block("2026-07-02", "21:30", "22:30", "delivery", "简历项目证据补强", "把真实项目硬点转成简历可写 bullet 和证据表。", [refs.resumeHangzhou, refs.sofDubboMd, refs.searchFlow], [], ["简历项目 bullet v0", "硬点证据表"], ["这条 bullet 的证据是什么？"], "真实项目证据驱动简历", "每条 bullet 不夸大且可追问", "简历写过度会被追问击穿"),
      block("2026-07-02", "22:30", "23:00", "review", "当日复盘", "复盘 Spring/JVM/MQ 卡点和明日 AI 项目衔接。", [refs.xmindPriorityNav], [], ["当日复盘"], ["明天如何把 AI 项目接到 Java 主线？"], "复盘闭环", "完成页面复盘 6 问", "错题不沉淀")
    ]
  },
  {
    date: "2026-07-03",
    theme: "AI 工程化项目接入：服务化、鉴权、RAG/Agent 边界",
    goal: "在真实 Java 主线已建立后，再学习 AI/RAG/Agent 的后端工程化表达",
    risk: "AI 项目不能讲成算法岗，也不能把 Python demo 夸成生产平台",
    javaFocus: "Spring Boot 服务化、鉴权、观测、RAG/Agent 边界",
    blocks: [
      block("2026-07-03", "09:30", "11:30", "project", "AI 工程化项目总览与边界", "阅读 AI 工程化项目 README、作战手册和路线图，只确认服务化、鉴权、观测和生产化边界，不做算法岗包装。", [refs.readme, refs.playbook, refs.roadmap], [], ["写出 3 分钟 AI 增强项目介绍 v0", "列出不能夸大的边界", "列出可映射到 Java 后端的 3 个工程点"], ["这个项目解决什么业务问题？", "为什么它不是简单套 API？"], "服务化入口、业务链路拆解、工程边界表达", "能不看稿讲清项目背景、核心链路、AI 工程化边界", "容易把项目讲成 AI 玩具"),
      block("2026-07-03", "11:30", "12:00", "interview", "口述：AI 只是增强", "用 60 秒说清 Java 主线和 AI 工程化增强之间的关系。", [refs.riskLine, refs.aiEnhanceRoute], [], ["AI 增强 60 秒回答"], ["为什么 AI 工程化项目能服务高级 Java 后端求职？"], "Java 主线 + AI 工程化增强", "先讲服务化、鉴权、观测，再讲 RAG/Agent", "一上来讲模型会偏岗"),
      block("2026-07-03", "14:00", "16:00", "java", "Spring Boot 服务化与鉴权映射", "按 Java 后端视角设计 AI 能力接入层：Controller、Filter、安全上下文、全局异常、Actuator、Micrometer 和 MDC。", [refs.springXmind, refs.sofDubboMd, refs.stabilityXmind, refs.deepQuestions], [], ["HTTP -> Auth -> Biz -> Metrics -> Response 的 Spring Boot 设计图"], ["AI 能力为什么要后端服务化？", "API Key 为什么不能放前端？"], "Spring MVC、Filter、Controller、全局异常、Actuator、MDC", "能把 AI 能力接入讲成 Java/Spring 后端设计", "只讲模型接口会偏离高级 Java 岗"),
      block("2026-07-03", "16:00", "17:00", "agent", "供小慧 Agent/RAG 入门", "先看供小慧 Agent 和供应商规则的工程边界，不要求吃透所有 Agent 概念。", [refs.supplierRules, refs.agentXmind, refs.ragXmind, refs.aiDashboardBoundary], [], ["供小慧 Agent 三句话说明", "RAG 当前实现 vs 生产升级对照表"], ["供小慧 Agent 当前到底做了什么？", "RAG 为什么不能完全消灭幻觉？"], "策略路由、工具边界、知识库检索、后端编排", "能说清它是受控工具编排，不是万能 Agent", "把规则路由吹成完整 Agent 平台"),
      block("2026-07-03", "20:30", "21:30", "resume", "可投简历 v0 + JD 采样", "写可投简历 v0，把真实项目放主段，AI 增强项目作为工程化补充。", [refs.resumeHangzhou, refs.riskLine, refs.jdMatrix, refs.readme], [], ["可投简历 v0 项目段落", "3 条 JD 关键词记录", "评分记录"], ["这个 AI 工程化项目怎么证明 Java 后端能力？", "哪些不能写？"], "复杂业务 workflow、服务化、鉴权、观测、AI 增强", "bullet 克制、可证明、不夸大，且绑定 JD 关键词", "把生产化设想写成已实现"),
      block("2026-07-03", "21:30", "22:30", "delivery", "补项目证据：真实项目 + AI 增强", "把真实搜索链路、AI 服务化、供小慧/RAG 证据绑定路径和命令。", [refs.sofDubboMd, refs.searchFlow, refs.readme, refs.aiDashboardBoundary], [], ["项目证据表 v1"], ["简历里的 AI 增强证据是什么？"], "证据链", "证据表路径完整，主次清楚", "路径不清导致复习低效"),
      block("2026-07-03", "22:30", "23:00", "review", "当日复盘", "复盘 Java 主线与 AI 增强的边界。", [refs.playbook], [], ["当日复盘"], ["明天第一次项目模拟要补什么？"], "复盘闭环", "完成页面复盘 6 问", "概念混淆")
    ]
  }
];

const moreSpecs = [
  ["2026-07-04", "供小慧 Agent 第一轮项目模拟", "把供小慧 Agent、RAG、往返解析合成 3 分钟项目故事", "Agent 与 RAG 讲散，无法回到 Java 后端", "策略模式、工具执行器、接口编排", "agent", [refs.supplierRules, refs.agentXmind, refs.ragXmind], []],
  ["2026-07-05", "API 服务化、Observability、项目讲稿 v0", "把服务化、鉴权、metrics、logging 和项目讲稿打通", "讲得像 demo，没有服务治理", "Actuator、Micrometer、TraceId、结构化日志", "project", [refs.cloudArch, refs.roadmap, refs.springXmind, refs.stabilityXmind], []],
  ["2026-07-06", "异步任务、MQ、幂等补偿、低风险投递", "建立异步任务生产化方案并启动低风险投递", "只画 MQ 架构，不讲幂等和失败恢复", "MQ 可靠消息、幂等消费、补偿重试", "java", [refs.asyncXmind, refs.mqXmind, refs.resumeHangzhou], []],
  ["2026-07-07", "JVM/JDK17/21、线上问题治理", "补齐 JVM 面试硬点，映射到线上稳定性", "AI 项目能讲但 JVM 被问穿", "G1/ZGC/JFR/jcmd/GC log/虚拟线程", "java", [refs.jvmXmind, refs.deepQuestions], []],
  ["2026-07-08", "Spring 事务、MySQL、Redis", "补齐 Spring 事务传播和数据库缓存高频追问", "事务/MVCC/Redis 一问就散", "Spring 事务、MVCC、索引、缓存一致性", "java", [refs.springXmind, refs.mysqlXmind, refs.redisXmind], []],
  ["2026-07-09", "MQ 三件套、稳定性治理、简历 v1", "把 RabbitMQ/RocketMQ/Kafka 和稳定性治理落到项目回答", "只背 MQ 对比，不会结合项目", "ACK、重试、DLQ、顺序、事务、限流熔断", "java", [refs.mqXmind, refs.stabilityXmind, refs.resumeHangzhou], []],
  ["2026-07-10", "部署与可演示、Docker/CI、压力面试", "补云端部署、Docker/CI 和可演示证据", "部署说不清，server-ready 和 production 混说", "Docker、CI、Nginx、health check、日志", "deployment", [refs.dockerfile, refs.compose, refs.ci, refs.deployDoc], []],
  ["2026-07-11", "Android APK、移动端语音、PWA", "尝试 APK/WebView，确认安卓端口述训练路径", "APK 做不成却假装成功", "WebView、HTTPS、PWA、网络错误兜底", "android", [refs.androidDoc, refs.deployDoc], []],
  ["2026-07-12", "综合项目演示、30 个追问", "把项目、Java、AI 工程化合成一轮完整面试", "追问清单没有证据支撑", "项目证据、错题、JD 对齐", "interview", [refs.deepQuestions, refs.jdGuard, refs.riskLine], []],
  ["2026-07-13", "正式投递前压力模拟、JD 对齐", "按 JD 做正式投递相关压力复盘和简历微调", "投递前仍不知道 JD 命中点", "JD 关键词 -> 简历版本 -> 项目证据", "resume", [refs.jdGuard, refs.resumeHangzhou, refs.talkPack], []],
  ["2026-07-14", "正式密集投递、反馈闭环、下一周计划", "启动正式密集投递并建立反馈闭环", "投递后没有记录和复盘", "投递反馈驱动复习", "resume", [refs.resumeHangzhou, refs.talkPack, refs.riskLine], []]
];

for (const [date, theme, goal, risk, javaFocus, primaryCategory, readList, commandList] of moreSpecs) {
  daySpecs.push({
    date,
    theme,
    goal,
    risk,
    javaFocus,
    blocks: [
      block(date, "09:30", "11:30", primaryCategory, `${theme}：主线深挖`, `围绕 ${theme} 做代码/文档/命令级复现，产出可面试证据。`, readList, commandList, [`${theme} 证据条目`, "一张链路图或对照表"], ["这个任务和高级 Java 后端有什么关系？", "当前实现和生产化升级差距是什么？"], javaFocus, "有路径、有产出、有 60 秒回答", risk),
      block(date, "11:30", "12:00", "interview", "上午口述总结", "把上午内容压缩成 60 秒回答。", readList.slice(0, 2), [], ["60 秒回答"], ["请用 60 秒讲清上午主题。"], javaFocus, "不卡住，能讲边界", "口述不练就无法面试输出"),
      block(date, "14:00", "16:00", "java", "Java 后端专题映射", `复习 ${javaFocus}，并映射到真实项目和 AI 工程化项目。`, readList.concat([refs.deepQuestions]).slice(0, 4), [], ["Java 专题回答卡", "项目映射表"], ["面试官追问底层机制怎么答？", "线上故障怎么排查？"], javaFocus, "至少完成 2 个机制 + 1 个故障场景", "只背八股不讲场景"),
      block(date, "16:00", "17:00", "interview", "错题补强", "整理当天最容易被追问穿的问题。", [refs.deepQuestions, refs.riskLine], [], ["错题清单"], ["今天最薄弱的问题是什么？"], "错题闭环", "形成修正动作", "错题不复盘"),
      block(date, "20:30", "21:30", "interview", date >= "2026-07-13" ? "正式投递前压力复盘" : (date >= "2026-07-10" ? "压力模拟面试" : "互动评分训练"), "项目 + Java + 工程化混合追问，记录评分和下一追问。", [refs.talkPack, refs.deepQuestions, refs.jdGuard, refs.jdMatrix], [], ["面试评分记录", "下一追问"], ["如果明天约面，最可能先问什么？", "你的项目证据是什么？"], "项目主线 + Java 硬点 + JD 命中", "完成一次评分并修正回答", "不做压力训练"),
      block(date, "21:30", "22:30", date >= "2026-07-13" ? "resume" : "delivery", date >= "2026-07-13" ? "正式投递相关动作" : "证据/简历/投递闭环", date >= "2026-07-13" ? "正式投递、记录 JD 关键词和反馈状态。" : "更新证据表、简历 bullet 或低风险投递记录。", [refs.resumeHangzhou, refs.riskLine], [], [date >= "2026-07-13" ? "正式投递记录" : "证据表更新", "简历/投递记录更新"], ["这条简历表达的证据是什么？"], "JD 关键词 -> 项目证据 -> 简历版本", "记录完整，不投不匹配岗位", "投递无反馈闭环"),
      block(date, "22:30", "23:00", "review", "当日复盘", "完成复盘 6 问，标记路径问题和明日优先级。", [refs.playbook], [], ["当日复盘"], ["明天最优先补什么？"], "复盘闭环", "页面复盘已保存", "复盘流于形式")
    ]
  });
}

const categories = {
  project: "项目深挖",
  agent: "供小慧 Agent",
  rag: "RAG",
  java: "Java 补强",
  interview: "面试训练",
  resume: "简历投递",
  delivery: "项目证据",
  review: "复盘",
  deployment: "部署",
  android: "Android APK",
  rest: "休息缓冲"
};

const schedule = {
  timezone: "Asia/Singapore",
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  version: "optimized-fulltime-with-path-audit-v1",
  projectName: "供应商运营 AI 助手工程化与政策解析服务化建设",
  projectRoot: aiRoot,
  roots,
  positioning: "高级 Java 后端 + AI 应用工程化增强；不包装为算法岗或模型训练岗",
  categories,
  pathAuditPolicy: "所有任务 mustRead 均使用结构化路径对象，包含 root、relativePath、absolutePath、exists、openCommand。",
  days: daySpecs.map((day, index) => ({
    date: day.date,
    weekday: weekday(day.date),
    dayIndex: index + 1,
    theme: day.theme,
    goal: day.goal,
    risk: day.risk,
    javaFocus: day.javaFocus,
    blocks: day.blocks,
    dailyDeliverables: [
      "一个可讲项目点",
      "两个面试题回答",
      "一个 Java 后端知识点",
      "当天路径问题记录",
      "一条证据/简历/投递更新"
    ],
    mustAnswer: day.blocks.flatMap((item) => item.interviewQuestions).slice(0, 3)
  }))
};

const kbEntries = [
  {
    id: "kb-profile-001",
    category: "个人背景",
    title: "高级 Java 后端主身份",
    sourceType: "resume",
    sourceRefs: [{ label: "杭州主投简历", path: refs.resumeHangzhou.absolutePath, safeToShow: false }],
    publicSummary: "9 年 Java 后端经验，主线是复杂业务链路、高并发 I/O、缓存/MQ、异步执行和稳定性治理。AI 只是应用工程化增强方向。",
    interviewQuestion: "请做一个 60 秒自我介绍。",
    answer60s: "我有 9 年 Java 后端经验，主线是复杂业务链路、高并发 I/O、缓存/MQ、异步执行和线上稳定性治理。近阶段聚焦搜索交易链路治理和两个边界清晰的 0 到 1 服务交付。现在求职主身份仍是高级 Java 后端，AI/RAG/Agent 作为企业应用工程化增强，不包装成算法岗。",
    answer3min: "可以按早期政务/物联网/教育业务系统、中期云课堂微服务和近期搜索交易链路三段讲。重点落到复杂链路、外部依赖、缓存、MQ、异步、Trace、指标和线上排查，而不是泛泛说会很多技术。",
    javaMapping: "复杂业务后端、搜索/交易链路、稳定性治理",
    projectEvidence: "简历材料、面试话术包、项目证据表",
    risk: "把 AI 放在开场会削弱 Java 主线。",
    doNotSay: ["我是 AI Agent 专家", "我训练过大模型"],
    safeWording: ["AI 是长期增强方向，短期主身份是高级 Java 后端"]
  },
  {
    id: "kb-company-summary-001",
    category: "过往公司经历抽象总结",
    title: "过往公司搜索交易链路抽象讲法",
    sourceType: "derived",
    sourceRefs: [
      { label: "搜索接口数据流脱敏材料", path: refs.searchFlow.absolutePath, safeToShow: false },
      { label: "searchblackhole 技术指标脱敏锚点", path: refs.searchBlackholeMetric.absolutePath, safeToShow: false }
    ],
    publicSummary: "可公开讲成：围绕国际机票搜索、报价、缓存、异步消费和链路稳定性做后端治理，重点是复杂业务链路、外部依赖、缓存/MQ、指标和排查。",
    interviewQuestion: "你在过往公司最能体现高级 Java 后端能力的项目是什么？",
    answer60s: "我会选搜索/报价链路相关治理来讲，因为它覆盖入口参数、下游供应商或服务依赖、缓存、MQ 异步、Redis 查询、指标监控和故障排查。我的表达重点不是公司内部系统名，而是复杂链路里如何保证可观测、可降级和可复盘。",
    answer3min: "按搜索入口、业务编排、缓存构建、消息消费、异常兜底、指标监控和复盘治理展开。能讲清自己负责的边界、参与协作的部分、以及不能公开的内部细节。",
    javaMapping: "复杂搜索链路、MQ/Redis、稳定性治理、故障排查",
    projectEvidence: "只保留脱敏材料路径锚点，不公开内部接口、客户数据或监控截图。",
    risk: "把团队整体能力写成个人独立完成。",
    doNotSay: ["内部接口名", "客户数据", "线上完整指标截图"],
    safeWording: ["围绕搜索交易链路参与治理并负责边界清晰模块"]
  },
  {
    id: "kb-java-map-001",
    category: "高级 Java 后端能力",
    title: "高级 Java 后端能力地图",
    sourceType: "derived",
    sourceRefs: [{ label: "高级 Java 深挖题库", path: refs.deepQuestions.absolutePath, safeToShow: false }],
    publicSummary: "高级 Java 后端不只是 CRUD，要能讲复杂业务建模、并发异步、事务一致性、缓存/MQ、JVM 排查、稳定性和工程治理。",
    interviewQuestion: "你和普通 Java CRUD 开发最大的区别是什么？",
    answer60s: "普通 CRUD 更偏接口和表操作，我的优势在复杂链路：能把业务状态、异步消息、缓存一致性、外部依赖、监控指标和故障排查放在一起设计。遇到问题不是只看代码，而是从入口、链路、数据、消息、缓存、JVM 和下游依赖建立证据链。",
    answer3min: "用一个搜索/缓存/MQ 类项目讲职责边界，再补 JVM、Spring 事务、Redis、MQ 和可观测的具体追问准备。",
    javaMapping: "复杂业务后端、架构治理、线上稳定性",
    projectEvidence: "简历项目、题库、同程脱敏材料、AI 工程化项目证据表。",
    risk: "只说技术栈不说复杂度。",
    doNotSay: ["我什么都懂", "我是全链路架构负责人"],
    safeWording: ["我更适合复杂业务后端和稳定性治理方向"]
  },
  {
    id: "kb-order-search-001",
    category: "订单/交易/支付/搜索/供应商运营相关经验",
    title: "搜索/交易/供应商运营的统一讲法",
    sourceType: "derived",
    sourceRefs: [{ label: "AI 工程化项目 README", path: refs.readme.absolutePath, safeToShow: true }],
    publicSummary: "把搜索交易链路经验和供应商运营 AI 项目统一成：复杂规则、外部依赖、状态、证据、审计和稳定性。",
    interviewQuestion: "为什么供应商运营 AI 项目和交易/搜索后端有关？",
    answer60s: "它们的共同点不是模型，而是复杂规则和链路治理。搜索/交易链路要处理参数、规则、外部依赖、缓存和异常；供应商运营 AI 项目也要把知识、工具、权限、审计和失败兜底放进受控后端链路里。",
    answer3min: "用 Java 后端语言讲：Controller 接入、Auth 鉴权、Service 编排、Tool Client 调用、任务状态、MQ 异步、DB 审计、Metrics 观测和降级。",
    javaMapping: "交易链路设计、供应商规则、外部依赖治理",
    projectEvidence: "AI 项目本地代码 + 同程脱敏项目经验。",
    risk: "把 AI 项目讲得脱离岗位主线。",
    doNotSay: ["这是算法平台"],
    safeWording: ["这是复杂业务后端能力的 AI 应用增强案例"]
  },
  {
    id: "kb-stability-001",
    category: "稳定性治理经验",
    title: "稳定性治理面试口径",
    sourceType: "derived",
    sourceRefs: [{ label: "稳定性治理 XMind", path: refs.stabilityXmind.absolutePath, safeToShow: false }],
    publicSummary: "稳定性治理要按超时、重试、限流、熔断、降级、隔离、灰度、回滚、指标、告警和复盘来讲。",
    interviewQuestion: "线上接口 P99 突然升高，你怎么排？",
    answer60s: "先确认是单接口、单机房、单机器还是全局；再看请求量、错误率、P99、下游耗时、线程池、GC、数据库和缓存指标。定位后先做止血，比如限流、降级、扩容或切流，再补根因复盘和监控告警。",
    answer3min: "按发现、定位、止血、修复、复盘五步讲，并给出命令或指标：日志 traceId、APM、GC log、jcmd、慢 SQL、Redis latency、MQ lag。",
    javaMapping: "限流熔断、隔离、观测、故障演练",
    projectEvidence: "可映射搜索链路治理和 AI 服务化健康检查。",
    risk: "只讲理论组件，不讲排查顺序。",
    doNotSay: ["我保证系统不出故障"],
    safeWording: ["通过观测、降级和复盘降低故障影响"]
  },
  {
    id: "kb-project-searchblackhole-001",
    category: "复杂业务链路经验",
    title: "搜索黑洞缓存服务抽象讲法",
    sourceType: "derived",
    sourceRefs: [{ label: "简历风险点", path: refs.riskLine.absolutePath, safeToShow: false }],
    publicSummary: "可公开讲成：消费上游搜索结果消息，构建航线维度缓存，并对外提供查询接口。重点是 MQ 消费、解析、Key 设计、TTL、Redis 查询和未命中排查。",
    interviewQuestion: "缓存查不到时你怎么排查？",
    answer60s: "我会从写链路和读链路两边查。写链路先看 MQ 是否消费、消息解析是否成功、航线映射是否正确、Redis Key 和 TTL 是否写入；读链路再用同样入参复核 Key 构建、渠道配置、Redis 查询和兜底策略。最后结合日志、指标和 Trace 判断是没写入、Key 不一致、过期还是渠道配置问题。",
    answer3min: "先说明服务边界，再按 MQ -> 解析 -> 转换 -> Redis 写入 -> 查询接口 -> 响应语义展开。异常分支包括消息重复、乱序、解析失败、Redis 异常、TTL 过期、渠道兜底配置缺失。不能只说 Redis get/set，要说排查顺序和证据。",
    javaMapping: "MQ 消费、Redis 缓存、幂等、可观测、故障排查",
    projectEvidence: "本地只保留脱敏路径锚点，不公开内部源码。",
    risk: "把 Redis 覆盖写成完全幂等会被追问乱序覆盖。",
    doNotSay: ["完整反爬体系", "全链路架构由我设计"],
    safeWording: ["我独立负责边界清晰的缓存服务，团队既有大链路我参与治理"]
  },
  {
    id: "kb-agent-001",
    category: "供小慧 Agent",
    title: "供小慧 Agent 当前实现与边界",
    sourceType: "project",
    sourceRefs: [{ label: "xiaohui_agent.py", path: refs.xiaohui.absolutePath, safeToShow: true }],
    publicSummary: "当前可讲成受控工具/知识库编排样例：根据输入选择服务分工具或知识库回答，输出有边界。它不是完整生产级自主 Agent。",
    interviewQuestion: "你这个 Agent 是不是只是 if/else？",
    answer60s: "当前实现我不会夸大，它更像一个最小 Agent 工程化样例：把业务意图、工具调用、知识库回答和输出边界收敛到后端服务里。价值不是算法，而是展示后端如何管理工具边界、权限、日志、失败兜底和生产化升级路径。",
    answer3min: "先承认当前是最小闭环，再讲生产化会升级为 Skill 配置、Tool Schema、参数校验、权限审计、异步执行、Trace、降级和 eval。这样回答能防止被认为在吹完整 Agent 平台。",
    javaMapping: "策略模式、工具执行器、参数校验、审计日志、异常兜底",
    projectEvidence: "src/replay/xiaohui_agent.py、data/knowledge/供应商规则.md、outputs/xiaohui_session.jsonl",
    risk: "过度包装为自主规划 Agent。",
    doNotSay: ["生产级 Agent 平台", "模型自主完成复杂规划"],
    safeWording: ["最小 Agent 工程化样例，生产化可升级"]
  },
  {
    id: "kb-rag-001",
    category: "RAG",
    title: "RAG 防幻觉与 no-answer",
    sourceType: "project",
    sourceRefs: [{ label: "供应商规则知识库", path: refs.supplierRules.absolutePath, safeToShow: true }],
    publicSummary: "RAG 是把回答绑定到检索证据，但不能完全消灭幻觉；需要 citation、权限过滤、no-answer 和评测。",
    interviewQuestion: "RAG 为什么不能完全消灭幻觉？",
    answer60s: "RAG 的价值是让模型回答前先拿到外部知识证据，并把答案和来源绑定起来，所以能降低凭空编造。但检索可能漏召回、召回内容可能过期或不相关，模型仍可能误用证据。因此生产系统要有 citation、score threshold、no-answer、权限过滤和评测。",
    answer3min: "可以从检索、重排、证据拼接、生成、引用、拒答和评测七步讲。当前项目是最小演示，生产化升级会补 embedding/vector store、hybrid search、rerank、ACL filter、eval 和审计。",
    javaMapping: "检索服务、ACL filter、ES/BM25/向量检索、结果可信度",
    projectEvidence: "data/knowledge/供应商规则.md 与供小慧 Agent 知识回答链路",
    risk: "把关键词检索说成完整向量 RAG。",
    doNotSay: ["已上线大规模向量库", "RAG 完全解决幻觉"],
    safeWording: ["当前是最小检索增强样例，生产化可升级为混合检索和评测体系"]
  },
  {
    id: "kb-java-jvm-001",
    category: "JVM 排查经验",
    title: "G1/ZGC 与线上 P99 抖动排查",
    sourceType: "derived",
    sourceRefs: [{ label: "JVM XMind", path: refs.jvmXmind.absolutePath, safeToShow: false }],
    publicSummary: "高级 Java 面试需要能从 GC 目标、实现机制、日志/JFR/jcmd 排查顺序讲 P99 抖动。",
    interviewQuestion: "G1 和 ZGC 区别？P99 抖动怎么排查？",
    answer60s: "G1 目标是可预测停顿，通过 Region、并发标记和混合回收控制停顿；ZGC 更强调低停顿，通过着色指针、读屏障和并发搬迁降低 STW。线上 P99 抖动我会先看时间段、接口和机器，再抓 GC log、JFR、jcmd、线程和内存，区分 GC、锁、线程池、慢下游还是数据库问题。",
    answer3min: "按现象定位、指标关联、JVM 证据、线程证据、外部依赖证据、复盘治理展开。不要只背收集器名词。",
    javaMapping: "JVM、GC、JFR、jcmd、线上稳定性",
    projectEvidence: "可结合搜索链路慢 I/O 和 JVM/APM 指标排查口径，但不公开内部监控截图。",
    risk: "只讲 GC 名词不讲排查命令。",
    doNotSay: ["我完整负责 JVM 平台治理"],
    safeWording: ["参与线上问题排查，能按证据链定位 JVM/线程/外部依赖问题"]
  },
  {
    id: "kb-java-mq-001",
    category: "Spring / MySQL / Redis / MQ 经验",
    title: "MQ 不丢不重与幂等消费",
    sourceType: "derived",
    sourceRefs: [{ label: "MQ XMind", path: refs.mqXmind.absolutePath, safeToShow: false }],
    publicSummary: "可靠消息要分生产、Broker、消费、重试、DLQ、幂等和观测，不承诺绝对不重。",
    interviewQuestion: "如何保证 MQ 消息不丢不重？",
    answer60s: "工程上通常不能承诺绝对不重，所以核心是至少一次投递 + 消费幂等。生产端要确认发送结果，Broker 要持久化，消费端要手动 ACK、失败重试和 DLQ。业务侧用唯一键、版本号、状态机或幂等表防重复影响，最后用消费延迟、失败率和积压指标监控。",
    answer3min: "结合缓存构建类场景讲：消息解析、业务 key、版本号防乱序、分布式锁或 CAS 防并发写、重试和死信处理、指标告警。",
    javaMapping: "RabbitMQ/RocketMQ/Kafka、ACK、重试、DLQ、幂等",
    projectEvidence: "可映射 searchblackhole/searchpackage 的 MQ 消费和缓存构建口径。",
    risk: "说 exactly-once 而无法解释业务幂等。",
    doNotSay: ["MQ 天然不重复", "只靠 Redis 覆盖就是完整幂等"],
    safeWording: ["至少一次 + 业务幂等 + 监控补偿"]
  },
  {
    id: "kb-spring-db-cache-001",
    category: "Spring / MySQL / Redis / MQ 经验",
    title: "Spring 事务、MySQL、Redis 高频追问",
    sourceType: "derived",
    sourceRefs: [
      { label: "SpringBoot 工程入口 XMind", path: refs.springXmind.absolutePath, safeToShow: false },
      { label: "MySQL XMind", path: refs.mysqlXmind.absolutePath, safeToShow: false },
      { label: "Redis XMind", path: refs.redisXmind.absolutePath, safeToShow: false }
    ],
    publicSummary: "必须能讲事务传播、自调用失效、MVCC、索引、锁、缓存一致性、热点 key、分布式锁。",
    interviewQuestion: "Spring 事务为什么会失效？缓存和数据库怎么保证一致？",
    answer60s: "事务失效常见原因是自调用绕过代理、方法非 public、异常被吞、传播行为选错、异步线程脱离事务上下文。缓存一致性通常不追求强一致，而是更新 DB 后删除缓存，配合重试、延迟双删或消息补偿，并通过 TTL 和监控兜底。",
    answer3min: "补充 REQUIRED/REQUIRES_NEW/NESTED 的边界、连接池风险、MVCC 快照读/当前读、Redis 分布式锁过期和续期风险。",
    javaMapping: "Spring AOP、事务传播、MySQL MVCC、Redis 缓存治理",
    projectEvidence: "可绑定搜索缓存服务、AI 服务化鉴权和任务状态。",
    risk: "只背传播级别，不会讲失效场景。",
    doNotSay: ["Redis 锁绝对可靠"],
    safeWording: ["通过事务边界、幂等和补偿降低不一致影响"]
  },
  {
    id: "kb-ai-project-001",
    category: "AI 工程化项目",
    title: "AI 工程化项目总口径",
    sourceType: "project",
    sourceRefs: [
      { label: "api.py", path: refs.api.absolutePath, safeToShow: true },
      { label: "准生产路线图", path: refs.roadmap.absolutePath, safeToShow: true }
    ],
    publicSummary: "项目定位是准生产演示级 AI 应用后端骨架，重点是服务化、鉴权、观测、RAG/Agent 边界和生产化升级设计。",
    interviewQuestion: "这个项目工程难点在哪里？",
    answer60s: "难点不是调模型 API，而是把不确定的模型能力放进可验证的后端链路里：入口鉴权、参数校验、工具权限、知识证据、会话记录、metrics、失败兜底和测试。当前我会明确说是准生产演示级，生产化还要补 DB、MQ、权限隔离、审计和评测。",
    answer3min: "按 API 服务化、供小慧 Agent、RAG、往返解析、Observability、Docker/CI、生产化差距展开。",
    javaMapping: "Spring Boot 服务化、外部依赖治理、可观测、异步任务",
    projectEvidence: "src/replay/api.py、auth.py、observability.py、xiaohui_agent.py、roundtrip_langchain.py。",
    risk: "把 demo 说成生产平台。",
    doNotSay: ["完整生产级 SaaS", "大规模 AI 平台"],
    safeWording: ["准生产演示级服务骨架，具备生产化升级方案"]
  },
  {
    id: "kb-tool-skill-001",
    category: "Tool / Skill / Function Calling",
    title: "Tool、Skill、Function Calling、Agent 区分",
    sourceType: "project",
    sourceRefs: [{ label: "AI Agent 工程化 XMind", path: refs.agentXmind.absolutePath, safeToShow: false }],
    publicSummary: "Tool 是可执行能力，Function Calling 是模型选函数和填参数的协议，Skill 是意图/工具/边界配置，Agent 是受控编排。",
    interviewQuestion: "Function Calling 等于 Agent 吗？",
    answer60s: "不等于。Function Calling 更像模型和函数之间的调用协议；Tool 是真正执行的后端能力；Skill 是把意图、槽位、允许工具和边界配置起来；Agent 才是围绕目标做上下文、检索、工具调用、结果校验和会话记录的编排。",
    answer3min: "再落到供小慧：当前是关键词路由 + Tool/知识库 + 输出边界，不是完整自主规划 Agent。",
    javaMapping: "策略模式、命令模式、参数校验、权限和审计",
    projectEvidence: "xiaohui_agent.py 的路由、工具、知识库和 session 记录。",
    risk: "概念混用会被追问击穿。",
    doNotSay: ["有函数调用就是 Agent"],
    safeWording: ["当前实现是受控 Agent 工程化最小闭环"]
  },
  {
    id: "kb-ai-service-001",
    category: "API 服务化",
    title: "AI 能力为什么要后端服务化",
    sourceType: "project",
    sourceRefs: [{ label: "api.py", path: refs.api.absolutePath, safeToShow: true }, { label: "auth.py", path: refs.auth.absolutePath, safeToShow: true }],
    publicSummary: "AI 能力不能直接暴露给前端，需要后端代理处理鉴权、参数校验、超时、日志、审计、成本和降级。",
    interviewQuestion: "为什么不直接让前端调大模型 API？",
    answer60s: "因为 token、权限、成本和业务边界都不能放在前端。后端服务化后，可以统一做 API Key/JWT、用户上下文、参数校验、超时重试、工具权限、日志审计、metrics 和降级兜底。这样 AI 只是后端链路里的一个外部能力，而不是裸露的第三方调用。",
    answer3min: "可以按入口、鉴权、业务编排、模型/工具调用、可观测、异常兜底、成本控制讲，并映射到 Spring Boot Controller、Service、Client、Filter、Actuator、Micrometer。",
    javaMapping: "Spring Boot 服务化、鉴权、观测、外部依赖治理",
    projectEvidence: "src/replay/api.py、auth.py、observability.py",
    risk: "只讲 prompt，不讲服务治理。",
    doNotSay: ["前端直接接模型就行"],
    safeWording: ["模型调用必须被后端工程能力包住"]
  },
  {
    id: "kb-auth-001",
    category: "鉴权",
    title: "AI 服务鉴权与权限边界",
    sourceType: "project",
    sourceRefs: [{ label: "auth.py", path: refs.auth.absolutePath, safeToShow: true }],
    publicSummary: "AI 服务要把 API Key/JWT、用户上下文、工具权限、审计和成本控制放到后端。",
    interviewQuestion: "为什么 AI Tool 调用需要权限控制？",
    answer60s: "因为 Tool 往往连接真实业务数据或动作，不能让模型或前端随意调用。后端要校验用户身份、租户、角色、参数范围和工具白名单，同时记录审计日志，失败时降级而不是越权兜底。",
    answer3min: "映射到 Java：Filter/Spring Security 建立 UserContext，Service 层校验 tool 权限，MDC 写 traceId，审计表记录 toolName、参数摘要、结果状态。",
    javaMapping: "Spring Security、RBAC、审计日志、MDC",
    projectEvidence: "src/replay/auth.py 与 API 依赖注入。",
    risk: "把 API Key 放前端或日志。",
    doNotSay: ["前端可直接带模型 token"],
    safeWording: ["token 和工具权限必须在后端托管"]
  },
  {
    id: "kb-observability-001",
    category: "观测",
    title: "Logging / Metrics / Tracing",
    sourceType: "project",
    sourceRefs: [{ label: "observability.py", path: refs.obs.absolutePath, safeToShow: true }],
    publicSummary: "AI 后端要观测请求、模型调用、工具失败率、检索命中、延迟、错误率和成本。",
    interviewQuestion: "AI 服务上线后你会监控哪些指标？",
    answer60s: "基础指标是 QPS、延迟、错误率、超时率；AI 特有指标包括模型调用耗时、token 成本、Tool 失败率、RAG 命中率、no-answer 比例、评分失败率。日志要带 requestId/sessionId，方便串起入口、检索、工具和回答。",
    answer3min: "Java 映射到 Actuator、Micrometer、Prometheus、Grafana、OpenTelemetry 和结构化日志。",
    javaMapping: "Micrometer、Actuator、OpenTelemetry、结构化日志",
    projectEvidence: "src/replay/observability.py、/api/health、/metrics 设计。",
    risk: "只说打印日志。",
    doNotSay: ["有日志就可观测"],
    safeWording: ["用指标、日志和 trace 三件套定位问题"]
  },
  {
    id: "kb-async-001",
    category: "异步任务",
    title: "AI 长任务异步化与 MQ 设计",
    sourceType: "derived",
    sourceRefs: [{ label: "异步任务 XMind", path: refs.asyncXmind.absolutePath, safeToShow: false }],
    publicSummary: "长文档解析、批量问答和外部 Tool 调用适合异步任务：任务表 + MQ + worker + 状态查询 + 幂等补偿。",
    interviewQuestion: "如果往返政策解析耗时很长，你怎么改造成生产服务？",
    answer60s: "我会把同步接口改成提交任务：POST 返回 taskId，任务表记录状态，MQ 派发 worker 执行，结果落库，前端轮询或回调查询。失败按错误类型重试，超过阈值进入 DLQ 或人工处理，消费端用 taskId/业务 key 做幂等。",
    answer3min: "补充状态机：PENDING/RUNNING/SUCCEEDED/FAILED/RETRYING/CANCELED；监控 queue lag、失败率、平均耗时、超时数。",
    javaMapping: "MQ、任务表、状态机、幂等、补偿、DLQ",
    projectEvidence: "roundtrip_langchain.py 当前是同步 workflow，生产化可升级。",
    risk: "把同步 demo 当成生产长任务。",
    doNotSay: ["当前已经有完整 MQ worker"],
    safeWording: ["当前是同步演示，生产化方案是任务化和 MQ 化"]
  },
  {
    id: "kb-evidence-001",
    category: "项目证据表",
    title: "项目证据表怎么组织",
    sourceType: "process",
    sourceRefs: [{ label: "学习与面试作战手册", path: refs.playbook.absolutePath, safeToShow: true }],
    publicSummary: "每条简历亮点必须绑定文件、命令、输出、边界和面试回答，不能只有一句包装。",
    interviewQuestion: "你简历这条 AI 工程化亮点有什么证据？",
    answer60s: "我会拿证据表回答：对应文件是 api.py/auth.py/observability.py/xiaohui_agent.py；能跑的命令是 pytest、uvicorn 和供小慧 CLI；输出证据是 session jsonl 和 run summary；边界是当前未接生产 DB/MQ 和完整向量检索。",
    answer3min: "按证据类型逐项展开，并说明哪些是已实现、哪些是生产化升级设想。",
    javaMapping: "证据驱动简历、边界管理、面试防追问",
    projectEvidence: "data/schedule.json artifacts、data/interview_kb.json。",
    risk: "没有证据的亮点会被认为包装过度。",
    doNotSay: ["因为我看过代码所以就是我做过生产"],
    safeWording: ["我用本地项目证明工程理解，用真实 Java 项目证明生产经验"]
  },
  {
    id: "kb-resume-bullet-001",
    category: "简历 bullet",
    title: "AI 增强项目简历 bullet",
    sourceType: "resume",
    sourceRefs: [{ label: "AI 应用工程化增强版简历", path: ref(resumeRoot, "长期AI增强/候选人-AI应用工程化增强版简历.md", "AI 应用工程化增强版简历", "AI 增强版简历").absolutePath, safeToShow: false }],
    publicSummary: "AI bullet 要克制：强调服务化、鉴权、观测、RAG/Agent 工程边界和 Java 生产化设计。",
    interviewQuestion: "这条简历 bullet 怎么写才不夸大？",
    answer60s: "可以写：搭建准生产演示级 AI 应用后端骨架，完成 API 服务化、API Key 鉴权、请求日志/metrics、RAG/Agent 最小闭环和往返政策解析 workflow，并沉淀 Java 后端生产化升级方案。不要写训练模型、生产级平台或大规模向量集群。",
    answer3min: "分普通 Java 版和 AI 增强版：普通 Java 版只把 AI 项目放补充；AI 增强版用于 JD 明确需要企业知识库/RAG/Agent 工程化的岗位。",
    javaMapping: "简历定位、JD 匹配、边界表达",
    projectEvidence: "简历文件、项目代码、测试和部署文档。",
    risk: "AI 项目放太重影响高级 Java 主线。",
    doNotSay: ["AI Agent 平台负责人"],
    safeWording: ["高级 Java 后端 + AI 应用工程化增强"]
  }
];

const kb = {
  version: "interview-kb-local-redacted-v1",
  updatedAt: new Date().toISOString(),
  scope: "本地使用的脱敏面试知识库；不上传公司原始材料，不包含密钥、客户数据或内部接口原文。",
  categories: [...new Set(kbEntries.map((entry) => entry.category))],
  entries: kbEntries
};

fs.mkdirSync(path.join(repoRoot, "data"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, "data/schedule.json"), JSON.stringify(schedule, null, 2) + "\n");
fs.writeFileSync(path.join(repoRoot, "data/interview_kb.json"), JSON.stringify(kb, null, 2) + "\n");

const kbMd = [
  "# 本地面试知识库（脱敏版）",
  "",
  "> 仅供本地面试准备使用。内容基于简历、公开可讲项目口径和脱敏抽象，不复制公司内部文档原文，不包含密钥、客户数据或内部接口详情。",
  "",
  ...kbEntries.map((entry) => [
    `## ${entry.title}`,
    "",
    `- 分类：${entry.category}`,
    `- 来源类型：${entry.sourceType}`,
    `- 可公开总结：${entry.publicSummary}`,
    `- 面试问题：${entry.interviewQuestion}`,
    `- 60 秒回答：${entry.answer60s}`,
    `- 3 分钟回答：${entry.answer3min}`,
    `- Java 映射：${entry.javaMapping}`,
    `- 项目证据：${entry.projectEvidence}`,
    `- 风险：${entry.risk}`,
    `- 不能说：${entry.doNotSay.join("；")}`,
    `- 安全表达：${entry.safeWording.join("；")}`,
    ""
  ].join("\n"))
].join("\n");
fs.mkdirSync(path.join(repoRoot, "docs/core"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, "docs/core/05-interview-knowledge-base.md"), kbMd);

console.log(`generated schedule days=${schedule.days.length}, kb entries=${kbEntries.length}`);

# 团队评审与裁决

日期：2026-07-06

## Team Room 状态

- Entrypoint：`full-team-review`
- 当前状态：`TEAM_ROOM_PARTIAL`
- 原因：Product Reviewer 已成功派发；继续派发 Tech Lead 时触发 `agent thread limit reached`。按团队规则，后续停止派发、等待和关闭 agent，不把生命周期清理当成任务，改由主线程基于仓库证据完成 Tech/UI/QA 评审。
- `current_thread_quarantine=true`
- `agent_lifecycle_budget=0`
- `inherited_agent_cleanup_discarded=true`

## 路由决策

| 角色 | 状态 | 责任 |
|---|---|---|
| Team Lead | 主线程完成 | 读取现状、裁决 PRD、安排阶段和门禁。 |
| Product Reviewer | 已派发，已返回 | 产出产品定位、版本取舍、指标和风险。 |
| Tech Lead | 主线程降级完成 | 基于当前 Rust/SQLite/Node/Android 架构给出多用户和 LLM artifact 边界。 |
| UI Designer | 主线程降级完成 | 给出泛 IT 用户的信息架构和关键交互要求。 |
| QA Reviewer | 主线程降级完成 | 给出验收矩阵和 P0 防回归门禁。 |
| Implementation | 暂不执行 | PRD 裁决前不写功能代码。下一阶段按文件边界拆分实现。 |

## Product 评审

结论：推荐“AI 原生教练版”的收敛 MVP。产品叙事走 AI 教练，工程范围采用小范围个人/多画像/多用户、泛 IT 角色族和严格 Evidence Gate，不直接做公开多租户 SaaS。

产品风险：

1. 如果没有北极星指标，功能会继续散。
2. 如果 AI 建议不能被接受、拒绝和回流评估，就只是装饰。
3. 如果机会、面试、复盘没有结果归因，系统无法证明求职进展。

裁决：

- 北极星指标采用“每周有效求职推进数”。
- AI 建议必须先进入草稿，不直接改正式日程。
- 泛 IT 不等于泛所有人，首批仍限定在 IT 求职者。
- 首批角色族冻结为后端、前端、测试、运维、数据、移动端、产品、项目、实施、技术支持、其它 IT。
- 学习项必须来自 JD 缺口、面试弱项或复盘 blocker，不能成为泛学习清单。
- AI 建议被采纳并完成的比例低于 40% 时，说明 AI 教练价值不足，应降级为规则化教练并复盘上下文质量。

## Tech 评审

结论：本轮不能大爆炸重写。应先做服务端权威多用户和 LLM artifact pipeline，现有 `runtime_items` 只作为迁移桥。

技术风险：

1. 用户数据串线是最高风险。
2. localStorage 不能继续作为多用户事实源。
3. LLM prompt 和日志可能包含简历、知识短板和机会状态，必须脱敏。
4. 现有 Android 远端 HTTPS 验收仍是交付边界，不能用 HTTP 服务器验收替代。

裁决：

- MVP 继续使用 SQLite。
- 所有新业务 API 必须强制 `user_id` 或 `data_scope`。
- 生成物保存到 `llm_artifacts`，请求与评估保存到 `llm_runs`。
- Rust 正式服务已落地 `llm_runs` 审计表、`llm_feedback` 反馈账本、`/api/coach/llm-runs` 查询接口、`/api/coach/feedback` 写入/查询接口、反馈 `summary` 聚合和 Anthropic-compatible provider 调用路径；本地 mock provider 合同已覆盖 token、延迟和可选成本写入；React 已补接受/拒绝反馈复盘、best-effort 服务端反馈提交、本地日程级采纳后完成率归因、本地 7 日周复盘归因和 11 个泛 IT 角色族 playbook；Node/Rust 已补 `/api/coach/outcomes` 最小服务端周结果归因和快照写入；后续再补真实远端 provider evidence、完整角色题库/JD 匹配、真实 LLM 周复盘和机会/面试结果长期归因。
- Node fallback 只做兼容，不作为新业务主路径。

## UI 评审

结论：新信息架构必须围绕“画像 -> 今日建议 -> 执行 -> 证据 -> 复盘”重组。

关键交互：

1. 首次进入先完成画像和知识边界最小初始化。
2. 首页从“今日任务列表”升级为“今日推荐与执行台”。
3. AI 建议以草稿卡片出现，默认有接受、编辑、拒绝。
4. Evidence Gate 只展示摘要，详情进入对应工作区。
5. 多用户状态必须可见：当前用户、同步状态、数据范围。

裁决：

- 不做营销页。
- 不做多层嵌套卡片。
- 保留工作台风格，但把文案从“Java 后端”改为“IT 求职”。

## QA 评审

结论：本轮验收必须覆盖“产品方向正确”和“功能真的可用”两层。

新增门禁：

1. 多用户隔离：用户 A 创建的数据，用户 B 不可见。
2. AI artifact：生成、schema 校验、接受、编辑、拒绝、刷新读回。
3. 画像和知识边界：创建、编辑、引用到 AI 建议、刷新读回。
4. 日程建议：AI 生成草稿，用户接受后才进入正式日程。
5. Web + Android 本地入口都跑关键流程。
6. 新 UI 每个按钮都必须有输入、反馈、保存或明确 disabled 原因。

裁决：

- 每个阶段先补测试，再扩 UI。
- 每次 UI 改动后必须跑 React 单测、Playwright 功能流、Android 本地 WebView 流。
- 远端生产结论仍以 `npm run validate:delivery` 为准。

## 最终裁决

采用 `prd-recommended.md` 作为主合同。最终方向是“AI 原生求职教练叙事 + 收敛 MVP 工程边界”。

第一阶段只做：

1. 产品定位与文案从个人高级 Java 收敛到泛 IT 求职者。
2. 用户画像和知识边界的最小闭环。
3. AI artifact 草稿机制的本地/服务端模型设计。
4. 防 P0 回归的自动化验收补齐。

暂不做：

- 公开注册。
- 自动 agent。
- 复杂租户。
- 跨用户知识池。
- 付费。
- 原生重写。

## 本轮执行裁决

本轮已把“个人私人工具”推进到“可验证的 AI 教练最小闭环”，但没有把它包装成已完成的多用户 SaaS。

已完成：

1. 画像、知识边界、自定义日程和 AI 草稿进入同一个教练工作区。
2. AI 输出不直接污染正式数据，必须由用户编辑、接受或拒绝。
3. 接受的日程建议进入今日任务，接受的知识卡进入知识边界。
4. 学习、口述、延期、证据详情、投递、面试复盘等关键流程均纳入 Web/Android 功能测试。
5. 交付门禁能够明确区分本地可用、Android 本地可用、远端未通过。
6. React 工作台补齐当前账号、角色、数据域、只读/可编辑状态、登录入口和退出入口，避免多人邀请制下用户不知道自己正在写谁的数据。

未完成：

1. 远端真实 LLM provider evidence 已通过 DeepSeek/Anthropic-compatible smoke；真实 LLM 周复盘、深度 JD parser 和机会/面试结果长期归因未完成。Rust `llm_runs` 表、`llm_feedback` 表、反馈 `summary` 聚合、Node/Rust `/api/coach/outcomes` 周结果快照、prompt version、schema version、输入摘要 hash、token、延迟、可选成本、用户态 AI 运行记录、React 反馈复盘、本地日程级采纳后完成率归因和本地 7 日周复盘归因已落地。
2. 公开多用户注册、租户隔离和管理员后台。
3. 用户管理后台、账号邀请流和审计后台。
4. HTTPS 远端 Android WebView 验收。
5. Android 远端 URL 仍需切到 `https://job-sprint.example.com/job-sprint/react/index.html` 并生成真机 evidence。
6. 最终统一交付报告仍未从旧失败报告更新为 `PASS`。

已补证据：

1. Linux x86_64 Rust binary 已重新构建并进入 server-delivery。
2. 服务器同步 evidence 已通过，远端 manifest SHA-256 与本地一致。
3. 服务器 HTTP 远端验收已通过，包含页面、登录、session、health、`/api/progress` 保存和 marker 读回。

## P0 复盘

根因：

1. 之前把“页面可见、按钮能点、截图像样”误当成功能完成，没有要求每个按钮产生可读回的业务状态。
2. Evidence Gate、学习笔记、口述、延期、详情、投递和复盘没有统一的端到端验收矩阵。
3. Web 端通过后没有同步要求 Android WebView 安装新包并跑同一条流程。
4. 交付表述混淆了本地可用、服务端包可构建、远端可访问和远端正式验收通过。
5. AI 功能没有先定义“草稿、接受、拒绝、回流评估”的产品契约，导致容易变成装饰按钮。
6. React 新工作台没有继承静态页已有的账号状态可见性，导致多人扩展时用户无法判断当前身份和数据边界。

以后强制约束：

1. 任何可点击控件必须满足输入、反馈、持久化、导航或明确 disabled 原因之一。
2. 保存类功能必须用唯一测试文本验证提交、刷新、重启和移动端读回。
3. AI 输出必须先落入 artifact 草稿，不能直接写正式业务数据。
4. Evidence 列表默认摘要或折叠，详情进入独立视图，避免数据变多后页面失控。
5. `validate:delivery` 失败时只允许说“本地/准交付包可用”，不得说“远端生产已完成”。

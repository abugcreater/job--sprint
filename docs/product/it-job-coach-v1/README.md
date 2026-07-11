# 泛 IT 求职者 AI 教练产品包

日期：2026-07-07

## 结论

本目录是 Job Sprint 从“个人高级 Java 求职冲刺工具”升级为“面向泛 IT 求职者的 AI 求职教练”的产品包。

当前阶段不直接追求公开 SaaS，而是先做邀请制、小规模、多用户可用的求职执行系统。核心目标不是堆日程、题库或笔记功能，而是让每个用户基于自己的目标、知识边界和机会进展，每天得到可执行建议，并能证明这些建议推动了求职进展。

## 文档索引

| 文档 | 用途 |
|---|---|
| `prd-options.md` | 三个 PRD 方向版本：保守个人闭环版、泛 IT 多用户版、AI 原生教练版。 |
| `prd-recommended.md` | 团队裁决后的推荐 PRD，作为后续实现的主合同。 |
| `review-and-adjudication.md` | 产品、技术、UI、QA 视角的评审与取舍记录。 |
| `product-completeness-and-ai-expansion-2026-07-07.md` | 产品完整性审计、多用户私人工具扩展和 AI 教练上下文方案。 |
| `development-workflow.md` | 大范围迭代的团队分工、阶段门禁和防 P0 回归流程。 |
| `completion-audit.md` | 对照用户原始目标逐项审计完成度、证据和剩余边界。 |

跨版本维护入口见 `../product-ops/`。

## 当前状态

- `Assumed { question: "首批目标用户规模?", default: "邀请制 3-10 个泛 IT 求职者", flip_cost: "medium" }`
- `Assumed { question: "首批技术范围?", default: "继续使用 React Web + Android WebView + Rust/SQLite + Node fallback", flip_cost: "high" }`
- `TBD { blocks_coding: no, reason: "正式 HTTPS 域名和 Android 远端真机证据仍是交付边界，不阻塞 PRD 和本地/HTTP 演示迭代。" }`

## 本轮落地结果

已落地到 React Web 和 Android WebView 的最小闭环：

1. 新增“AI 教练设置”工作区，支持画像、知识边界、自定义日程和 AI 草稿管理。
2. AI 草稿支持生成、编辑、接受、拒绝；接受后的知识卡和日程会进入正式执行流，拒绝原因会进入 AI 反馈复盘。
3. 今日页会读取自定义日程和教练状态，More 页导入导出包含画像、知识边界、日程和 AI 草稿。
4. 本地运行时会把教练状态写入 `progress.coach`，Rust/SQLite 功能测试已验证可持久化。
5. Node `dataScope` 与 Rust/SQLite `scope` 已补多用户 coach 数据隔离测试，证明不同账号读取不到彼此的画像、知识边界、日程和 AI 草稿。
6. 新增 `/api/coach/artifacts`：Node 兼容服务和 Rust 正式服务均支持 Anthropic-compatible provider，并在未配置、超时或 schema 异常时明确 fallback；React 生成 AI 草稿时会优先调用服务端，失败时明确提示本地规则 fallback。
7. Rust/SQLite 已新增独立 `llm_runs` 表和 `/api/coach/llm-runs` 查询接口，生成 AI 草稿时按当前账号 `scope` 写入 provider、model、prompt version、schema version、输入摘要 hash、schema 状态、生成数量、token、延迟和可选成本。
8. 新增 `/api/coach/feedback`：React 接受/拒绝 AI 草稿后会 best-effort 写入服务端反馈；Node 兼容层按 `dataScope` 写入 `progress.coachFeedback`，Rust 正式服务写入独立 `llm_feedback` 表并可读回；GET 响应同时返回 `summary`，覆盖采纳率、拒绝类型、拒绝原因和下一轮提示校准。
9. React 教练页已补本地日程级归因：AI 日程草稿被接受后会通过 `acceptedFromArtifactId` 关联到今日 `coach-event-*` 任务，并在 AI 反馈复盘里显示采纳日程完成率和执行判断。
10. React 复盘页已补本地规则版 AI 分析：基于 Evidence Gate、复盘记录、薄弱回答、路径问题和 AI 建议反馈输出事实、欠缺、动作和下一步。
11. React 复盘页已补本地 7 日周复盘归因：基于证据覆盖、完成任务、延期、机会反馈、口述/面试证据和 AI 反馈输出闭环分、有效信号、风险和下周焦点。
12. Node/Rust 已补 `/api/coach/outcomes` 服务端周结果归因：按周计算有效推进、采纳后完成、面试复盘、延期和证据分布，POST 可写入 `coachOutcomeSnapshots`，React Review 页可读取并保存服务端快照。
12. AI 草稿已接入 11 个泛 IT 角色族 playbook 和首批角色追问题卡：React 本地规则、Node fallback、Rust fallback 和 provider prompt 都会带入角色视角、证据类型、回答框架、日程焦点、主候选题和追问库。
13. 机会/JD 信号已进入 AI 教练上下文：React 会从投递/机会记录提取公司、岗位、状态、JD 关键词、命中点和反馈，传给本地规则、Node fallback、Rust fallback 和 provider prompt；React/Node/Rust fallback 会进一步生成 `JD焦点` 和规则版 `JD解析`，把岗位责任、硬技能、风险信号、证据要求、候选追问和角色追问库写入知识卡、日程建议、候选题、来源和输入摘要 hash。
14. AI 提取知识边界草稿已进入确认流程：用户粘贴 JD、简历片段或面试反馈后，React 优先调用 `/api/coach/boundary-suggestions`，服务端不可用时使用本地规则 fallback；候选边界必须由用户点击采纳后才写入正式知识边界，采纳后会保留来源摘要、置信度、provider、prompt version 和输入 hash，Node 和 Rust 后端均有同口径 schema、权限、Anthropic-compatible provider 成功和 provider timeout fallback 测试。
15. 教练页已新增邀请制首登编排、首次配置准备度面板、快速初始化面板和邀请批次首登看板：按账号/数据域、首登画像模板、批量素材与 3 条知识边界、个人日程和 AI 草稿确认展示 1/5 到 5/5 的首登进度，并显示首登完成率、当前放弃点、风险等级和下一步动作；快速初始化可套用 11 个角色族首登模板，追加 JD、简历、面试反馈和学习笔记素材段，保存目标画像，从模板素材或真实素材生成边界候选，采纳三条初始化边界，并生成首条个人日程；React 可手动提交首登观察，Node/Rust `/api/coach/onboarding-events` 可服务端写入并读回摘要；Node/Rust `/api/coach/onboarding-report` 可按 `inviteBatch` 聚合邀请用户、开始数、完成数、完成率、最高风险和 Top 放弃点，React 教练页可读回展示；实体 ID 已改为带随机后缀，避免快速连续新增边界或日程时同毫秒覆盖上一条。
16. 教练页已新增邀请账号管理面板，owner 可登记试用用户的登录名、显示名、数据域、邀请批次、角色族、目标岗位、状态和备注；配置仓库外 `JOB_SPRINT_USERS_FILE` 后，同一面板可开通或重置邀请用户登录密码，并把 `active` 用户写入认证 users file，也可在选中具体邀请批次后批量禁用、恢复或删除已配置登录账号，并按邮件/IM/手工渠道生成可复制邀请通知草稿；Node `/api/coach/invitations` 写入 owner `progress.coachInvitations`，Rust `/api/coach/invitations` 写入独立 `coach_invitations` 表；账号开通、批量动作和通知草稿不会回显明文密码或 hash，远端 `login-switch.json` 已证明真实登录页可完成 owner 登录、页面退出、切换 smoke 用户登录和 dataScope 读回；`JOB_SPRINT_USERS_JSON` inline 模式下会明确禁用页面开通，避免误以为台账等于可登录账号。

当前 AI 已有服务端 coach artifact 生成接口、知识边界候选提取接口、采纳后边界 provenance、首登观察事件接口、首登邀请批次聚合接口、邀请账号台账与 users file 账号生命周期接口、批量账号动作、邀请通知草稿、provider 失败状态、用户态 AI 运行记录、React AI 反馈复盘、React 本地规则版复盘分析、本地 7 日周复盘归因、服务端周结果归因快照、邀请制首登编排、首登完成率/放弃点/风险/下一步可观测、邀请批次首登看板、邀请账号管理面板、批量邀请导入、邀请批次状态动作、邀请报表 JSON 导出、首登模板版本、邀请记录删除、首次配置准备度、快速初始化、批量素材包、角色族首登模板、Rust/SQLite 独立 LLM 运行审计记录、服务端反馈聚合、11 个角色族 playbook 与首批追问题卡、机会/JD 信号上下文和规则版结构化 JD 解析；每次生成会记录 provider、model、prompt version、schema version、输入摘要 hash、schema 结果、生成数量、fallback 状态、token、延迟和可选成本，并可在教练页查看、随 More 页导出恢复。React 本地会根据接受/拒绝结果计算采纳率、拒绝类型、拒绝原因、下一轮提示校准、本地日程级采纳后完成率和 7 日闭环分，同时把接受/拒绝反馈提交到服务端；Node/Rust 服务端现在也会返回同口径 `summary`，首登观察也可返回最新完成率、放弃点、最高风险和下一步摘要，首登报表可返回邀请用户、开始数、完成数、完成率、最高风险、Top 放弃点和用户最新状态，邀请台账可返回已登记邀请、已配置账号、账号开通能力、批量账号动作能力、通知草稿生成能力和批次状态摘要，周结果归因可返回有效推进、采纳后完成、面试复盘、延期和证据分布并保存快照。Rust artifact 和 boundary suggestions 均已有本地 mock provider 合同证据，Node boundary suggestions 已覆盖 mock provider 成功和 timeout fallback；React 已覆盖候选边界采纳后正式边界保留来源摘要、置信度、provider、prompt version 和输入 hash；远端 users-file 账号生命周期 smoke 已证明 smoke 用户可登录、session 可读回、runtime 不串 owner、单账号禁用后拒绝登录、恢复后可登录、删除后拒绝登录，也已证明批量禁用后两个账号登录均被拒绝、批量恢复后可登录、批量删除后被删账号不可登录，并验证 `invitation_notifications_generated` 生成两条可复制邀请通知草稿且不泄露密码/hash；远端 UI 登录切换 smoke 已证明真实登录页 owner 登录、点击退出、切换 smoke 用户登录、session/dataScope 读回和临时账号清理；远端 DeepSeek/Anthropic-compatible provider evidence 已通过，外部 SMTP/IM 自动发送、完整岗位题库、真实 LLM 深度 JD 解析质量闭环、真实 LLM 周复盘，以及机会/面试结果长期归因仍未完成。多用户已具备 Node/Rust 服务端数据隔离证据和远端 UI 切换证据，但仍不是公开注册、组织租户或公开 SaaS。

## 最新验证结论

- Web：`npm test`、React typecheck、Vitest、React build 均通过；Coach 页新增 AI 反馈复盘、本地采纳日程完成率归因、角色族 playbook 与追问题卡草稿生成、AI 提取知识边界候选确认流程、采纳后边界 provenance、首次配置准备度、快速初始化、角色族首登模板和邀请账号管理面板，并由 `CoachPage.test.tsx`、`coachAdapter.test.ts`、`coachBoundaryProvenance.test.ts`、`boundarySuggestionAdapter.test.ts` 覆盖；Review 页新增本地规则版 AI 分析、本地 7 日周复盘归因和服务端周结果归因入口，并由 `ReviewPage.test.tsx`、`reviewAdapter.test.ts` 覆盖。
- 本地闭环：`npm run test:local-functional` 通过，验证画像 1 个、知识边界 2 个、自定义日程 2 个、AI 草稿 3 个，并验证刷新/移动端读回。
- Android App：debug APK 构建、安装和 `npm run test:android:functional` 通过，重启后 WebView localStorage hash 一致。
- 多用户隔离：`node tests/auth_permissions_test.js` 与 `cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api` 通过，覆盖 `kai` 和 `alex` 两个可写账号的 coach runtime 隔离。
- AI coach API：`node tests/api_runtime_test.js` 与 Rust `runtime_contract_matches_node_core_api` 均覆盖 `/api/coach/artifacts` schema、权限、fallback、角色视角来源和机会/JD 信号来源；Node/Rust 专项测试覆盖 `/api/coach/boundary-suggestions` 权限、schema、跨角色通用技术主题提取、已保存主题过滤、mock provider 成功和 provider timeout fallback；Node/Rust 已覆盖 `/api/coach/onboarding-events` 写入/读回和 `/api/coach/onboarding-report` 邀请批次聚合，包含 owner 全量视图、普通用户按 `dataScope` 限制、`inviteBatch` 读回、完成率和 Top 放弃点；Node/Rust 已覆盖 `/api/coach/outcomes` GET/POST、权限、周结果归因和 `coachOutcomeSnapshots` 快照写入；Node/Rust 已覆盖 `/api/coach/invitations` owner 写入/读回、批量邀请导入、非 owner 403、邀请摘要、JSON/SQLite 持久化、users file 账号开通、密码重置、旧密码失效、新用户登录、单账号禁用/恢复/删除、批量账号禁用/恢复/删除、邀请通知草稿和 runtime 隔离；Rust 合同测试还覆盖本地 mock provider 成功返回、`generated-ai` 草稿、token/延迟/成本写入、`/api/coach/llm-runs` 读回、SQLite `llm_runs` 入库、`/api/coach/feedback` 写入/读取、`summary` 聚合返回和 SQLite `llm_feedback` 入库；远端 `docs/evidence/server-remote/provider-config.json` 已证明 DeepSeek/Anthropic-compatible provider 配置并重启服务，`docs/evidence/server-remote/coach-artifacts.json` 已证明 provider 为 `anthropic-compatible`、model 为 `deepseek-v4-flash`、`llmRunStatus=success`、`llmRunSchemaStatus=pass`、token/延迟/成本字段齐全、feedback summary 和 `/api/coach/outcomes` GET/POST 通过；远端 `docs/evidence/server-remote/coach-invitations-2026-07-07.json` 已证明登录态 React 入口、新 JS 资产和 `/api/coach/invitations` SQLite 新增/读回通过，当前 `write_remote_invitation_evidence.js` 已扩展批量导入 smoke；远端 `docs/evidence/server-remote/coach-invitation-account.json` 已证明 users-file 账号开通、smoke 用户登录、session 读回、owner 隔离、单账号禁用/恢复/删除生命周期、批量账号禁用/恢复/删除和 `invitation_notifications_generated` 通过；远端 `docs/evidence/server-remote/login-switch.json` 已证明真实登录页 owner 登录、退出、切换 smoke 用户登录和 dataScope 读回通过；React 已接入接受/拒绝反馈提交，并已覆盖 AI 运行记录的生成、可视化、导出、导入、本地反馈复盘、采纳日程完成率归因、角色族 playbook 与追问题卡、机会/JD 信号生成、规则版 JD 解析、邀请批次首登看板本地降级提示、邀请账号管理本地降级提示、本地 7 日周复盘归因和服务端周结果归因入口。
- Server delivery package：Linux x86_64 Rust binary 已构建并打入同步包，`npm run build:server-delivery` 通过。
- 服务器远端：服务器同步 evidence、HTTP 远端验收和远端 UI 登录切换 evidence 均已通过，HTTP 入口可证明页面、登录、session、health、`/api/progress` 保存和 marker 读回；真实登录页可完成 owner 登录、页面退出、切换 smoke 用户登录和 dataScope 读回。
- 远端交付：2026-07-11 已升级为 `PASS_WITH_LIMITS`。仓库外私有 env 注入的正式 HTTPS 入口、服务器同步与重启、Web 写入读回、正式 APK、Android 真机登录与杀进程读回均通过；限制为未提交工作树和 P8 理论性架构门禁。

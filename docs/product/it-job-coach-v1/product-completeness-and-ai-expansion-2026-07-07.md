# 产品完整性审计与 AI 扩展方案

日期：2026-07-07
状态：PM 审计 + 实现更新版

## 结论

Job Sprint 当前已经不是单纯个人日程页，但也还不是完整公开产品。它处在“邀请制泛 IT 求职者 AI 教练”的准生产演示阶段。

现有闭环已经成立一半：用户可以维护画像、知识边界、自定义日程和 AI 草稿；用户也可以粘贴 JD、简历片段或面试反馈，让系统提取知识边界候选，确认后再写入正式边界，且正式边界会保留来源摘要、置信度、provider、prompt version 和输入 hash，后续能解释“这条边界从哪里来”；边界候选已具备 Node/Rust Anthropic-compatible provider 路径、mock provider 合同测试和本地规则 fallback；候选被采纳、拒绝或修订都会进入 React 本地反馈账本、runtime sync、More 导出/导入、校准摘要，并通过 `/api/coach/boundary-feedback` best-effort 写入 Node/Rust 服务端长期反馈账本；AI 草稿可以被接受、拒绝和反馈；教练页已新增邀请制首登编排、首登完成率/放弃点/风险/下一步可观测、首次配置准备度、快速初始化面板、邀请批次首登看板和邀请账号管理面板，能从账号/数据域、角色族首登模板、批量素材包、目标画像、素材提取、三条边界采纳、首条个人日程到首条 AI 草稿确认形成最小向导；Node/Rust 已新增 `/api/coach/onboarding-events`，可把首登完成率、放弃点、风险和下一步写入服务端并读回摘要；Node/Rust 已新增 `/api/coach/onboarding-report`，可按 `inviteBatch` 聚合邀请用户、开始数、完成数、完成率、最高风险和 Top 放弃点，React 教练页可读回展示；Node/Rust 已新增 `/api/coach/invitations`，可登记邀请账号、批次、角色族、目标岗位、状态、首登模板版本和备注，并支持批量导入邀请记录、批量更新批次状态、删除邀请记录和报表导出；Node/Rust 已新增 `/api/coach/outcomes`，可按周从 runtime 的完成状态、证据、延期、AI 反馈和采纳日程生成服务端周结果归因，并把快照写入 `coachOutcomeSnapshots`；React 复盘页已可读回该服务端结果并保存快照，服务端不可用时明确降级到本地复盘。机会/JD 信号已从轻量 `JD焦点` 升级到规则版 `JD解析`，React/Node/Rust 会把岗位责任、硬技能、风险信号、证据要求和候选追问写入知识卡、日程建议、候选题和输入摘要 hash，并通过首批 11 个角色族追问题卡把候选题扩展成主问题 + 角色追问库。今日页、复盘页、Web、Android 本地和服务端接口都有验证，远端 DeepSeek/Anthropic-compatible coach artifact smoke 已通过。缺口在于：外部 SMTP/IM 自动发送、真实 LLM 深度 JD 解析质量闭环、机会/面试结果长期归因、批量初始化审计、邀请制用户管理和 Android HTTPS 交付还没有完全产品化。

## 当前闭环判断

| 环节 | 当前状态 | 产品判断 |
|---|---|---|
| 用户是谁 | 已有多画像、角色族、目标岗位、城市和不可夸大边界 | 可支撑邀请制用户，不足以支撑公开注册和组织租户 |
| 用户知道自己缺什么 | 已有知识边界、掌握程度、薄弱点、证据链接、AI 提取候选边界、采纳后 provenance、候选采纳/拒绝/修订反馈、邀请制首登编排、首登完成率/放弃点/风险/下一步可观测、首次配置准备度、快速初始化、批量素材包、角色族首登模板、服务端首登观察事件、邀请批次首登看板、邀请账号管理面板、批量邀请导入、批次状态动作、邀请报表 JSON 导出、首登模板版本、users file 账号生命周期、批量账号动作和可复制邀请通知草稿，且远端账号生命周期与远端 UI 登录切换 smoke 已通过 | 基础闭环可用，服务端边界反馈账本已补，仍缺真实 LLM 深度解释、批量初始化审计和外部 SMTP/IM 自动发送 |
| AI 知道该生成什么 | 已接入画像、知识边界、AI 提取边界候选、日程、角色族、首批角色追问题卡、机会/JD 信号、规则版结构化 JD 解析和反馈 summary，边界候选已有 provider/fallback 合同，远端 DeepSeek coach artifact evidence 已通过 | 已从泛化建议进到上下文建议；规则版 JD parser 已能输出岗位责任、硬技能、风险、证据和候选题，角色族题卡已能给出追问库，但真实 LLM 深度解析质量闭环和完整岗位题库匹配仍不足 |
| AI 生成后怎么办 | 草稿支持接受、编辑、拒绝；接受后写入知识边界或日程 | 这是正确产品契约，必须继续保持人工确认 |
| 执行是否产生证据 | 今日任务、Evidence Gate、学习、口述、延期、投递和复盘已可跑通 | 仍需要把长证据统一做摘要、筛选和详情视图 |
| 结果是否反哺 AI | 已有本地反馈复盘、Coach 页结果指标、日程级采纳后完成率、7 日周复盘归因、服务端 feedback summary 和 Node/Rust `/api/coach/outcomes` 周结果归因快照 | `本周有效推进`、`采纳后完成`、`面试复盘` 已进入产品页，React 复盘页可读写服务端周归因快照；仍缺真实 LLM 周复盘、机会结果和面试结果长期归因 |
| 不同用户是否隔离 | Node `dataScope` 与 Rust/SQLite `scope` 已有自动化隔离测试 | 适合邀请制，不等于公开 SaaS |

## 欠缺点

1. 首次使用路径已补最小邀请制首登编排、邀请台账、users file 账号生命周期、批量账号动作、邀请通知草稿和远端 UI 登录切换证据。新用户能看到账号/数据域、画像模板、批量素材与边界、首条个人日程、首条 AI 草稿确认的 5 步进度，并看到首登完成率、当前放弃点、风险等级和下一步动作；owner 能登记邀请账号、数据域、邀请批次、角色族、目标岗位、状态、首登模板版本和备注，也能粘贴 JSON/表格批量导入邀请记录；当配置仓库外 `JOB_SPRINT_USERS_FILE` 时，owner 能开通、重置、禁用、恢复和删除登录账号，也能对指定批次批量禁用、恢复或删除登录账号，并按邮件/IM/手工渠道生成可复制邀请通知草稿，本地合同和远端 smoke 覆盖新用户登录、真实登录页切换账号、旧密码失效或登录读回、禁用后拒绝登录、恢复后可登录、删除后拒绝登录、批量禁用/恢复/删除、通知草稿生成、密码/hash 不出现在响应和跨用户数据隔离；能套用 11 个角色族首登模板之一，追加 JD、简历、面试反馈和学习笔记素材段，生成边界候选，采纳到 3 条初始化边界，并生成首条个人日程；首登观察已可通过 Node/Rust `/api/coach/onboarding-events` 服务端写入和读回，邀请批次聚合已可通过 Node/Rust `/api/coach/onboarding-report` 和 React 看板读回，邀请台账已可通过 Node/Rust `/api/coach/invitations` 写入、批量导入、批量改状态、删除邀请记录和读回；React 可按批次生成邀请报表 JSON。仍缺外部 SMTP/IM 自动发送和正式用户管理后台。
2. 知识边界已补最小 AI 提取闭环和 provider/fallback 服务端路径，采纳后的正式边界也会保留来源摘要、置信度、provider、prompt version 和输入 hash；候选采纳、拒绝和修订反馈已进入 React 本地账本、runtime sync、More 导出/导入、校准摘要和 Node/Rust `/api/coach/boundary-feedback` 服务端长期反馈账本；但仍缺首次批量初始化、深度归类、远端真实 LLM 证据和批量初始化审计。当前用户可粘贴简历、JD、面试反馈或学习笔记，由系统提取候选边界，并由用户确认后写入正式边界。
3. JD/机会匹配已从轻量焦点进入规则版结构化解析，角色族题卡已补首批追问库。当前已能提取机会、关键词、反馈、JD 焦点、岗位责任、硬技能、风险信号、证据要求、主候选题和角色追问，但还不是真实 LLM 深度 JD parser、完整岗位族题库或结果归因。
4. AI 线上能力未完全证明。artifact 与 boundary suggestions 的 fallback 和本地 mock provider 已有证据，但真实 provider 配置和远端线上质量证据缺失。
5. 复盘归因已从纯前端推进到最小服务端周结果归因。Node/Rust `/api/coach/outcomes` 可按周读出 `effectiveActionCount`、AI 采纳日程完成率、面试复盘率、延期数和证据类型分布，也可把当前周快照写入 `coachOutcomeSnapshots`；仍需真实 LLM 周复盘、机会状态和面试结果的长期归因。
6. 邀请制用户管理仍不是完整后台。已有隔离能力、最小邀请台账、批量邀请导入、批次状态动作、邀请报表 JSON 导出、首登模板版本、邀请记录删除、users file 账号开通/密码重置/禁用/恢复/删除、批量禁用/恢复/删除登录账号、可复制邀请通知草稿、远端生命周期 smoke 和远端 UI 登录切换 smoke，但缺外部 SMTP/IM 自动发送和正式用户管理流程。
7. 成功指标进入产品页已补：Coach 页头部现在展示 `本周有效推进`、`采纳后完成` 和 `面试复盘`，由 `CoachDashboard` 根据完成任务、证据、AI 采纳日程和候选题复盘证据计算；Review 页已接入服务端周结果归因快照；仍需把这些指标升级为真实 LLM 解释、机会结果和跨周趋势看板。

## 扩展方向

目标不是做“多人日程系统”，而是做“每个用户自己的 AI 求职教练上下文”。

### 1. 用户可添加自己的日程

日程对象必须带上：

- `profileId` / `scope`
- 类型：学习、面试、机会、复盘、低状态兜底
- 目标知识边界或目标机会
- 是否需要证据
- 来源：用户手建、AI 草稿接受、系统兜底
- 完成、延期、复盘和证据状态

验收标准：用户 A 新增的日程，用户 B 在 Web、Android、Node 和 Rust 入口都不可见。

### 2. 用户输入自己的知识边界

知识边界不是笔记列表，而是 AI 教练的上下文骨架。

每条边界至少包含：

- 主题
- 掌握程度
- 薄弱点
- 可用于面试或简历的证据
- 目标使用场景
- 最近验证时间

本轮已补“AI 提取边界草稿”：用户粘贴 JD、简历片段或面试反馈后，系统生成候选边界，用户确认后写入正式边界。React、Node 和 Rust 均已有回归测试，跨角色通用技术词会被识别，已保存主题会被过滤；Node/Rust 服务端已支持 Anthropic-compatible provider，provider 不可用、超时或 schema 异常时回落本地规则。

### 3. 大模型动态输出三类内容

AI 继续只输出草稿：

| 类型 | 生成依据 | 用户动作 | 成功判定 |
|---|---|---|---|
| 知识卡片 | 知识边界、JD 焦点、规则版 JD 解析、角色族 playbook | 接受后写入知识边界证据或学习材料 | 后续任务/面试回答能引用 |
| 日程建议 | 可投入时间、薄弱边界、机会状态、复盘风险 | 接受后生成正式日程 | 当日完成并产生证据 |
| 候选题目 | 目标岗位、JD 焦点、规则版 JD 解析、薄弱边界、面试反馈 | 接受后进入面试训练 | 有回答、评分或复盘 |

`JD焦点` 和规则版 `JD解析` 是正确方向：它把“机会/JD 信号”进一步收敛成可面试能力点，例如 `MQ 的故障恢复`，并把岗位责任、主技能、风险点、证据要求和候选追问进入知识卡、日程建议、候选题、来源和输入摘要 hash。

## 建议路线

### Now

1. 完成真实 LLM provider 远端证据。
2. 把规则版 `JD解析` 和远端 DeepSeek provider smoke 继续纳入 release gate，并在后续补真实 LLM 深度 JD parser 质量评估。
3. 把已落地的邀请制首登编排、邀请台账、批量邀请导入、users file 账号生命周期、远端 UI 登录切换证据和邀请通知草稿升级为正式首登系统：外部 SMTP/IM 自动发送、批量导入知识边界、批次运营报表和用户初始化模板版本演进。
4. 基于 `/api/coach/outcomes` 继续做跨周趋势、机会结果归因和真实 LLM 周复盘，并统一 AI 草稿、证据、日程长列表的摘要和详情交互。

### Next

1. 真实 LLM 深度 JD parser：在规则版职责、硬技能、风险信号、证据要求基础上，补软技能、岗位层级、公司业务语境和题库匹配。
2. AI 提取边界草稿接入远端真实 LLM 证据，并把服务端边界反馈账本用于真实 LLM 质量归因，同时持久化真实 LLM 深度解释和批量初始化审计。
3. 角色族题卡库：首批 11 个角色族高频追问模板已补，下一步扩展岗位族题库、题卡质量归因和真实 LLM 线上 evidence，不做全行业题库。
4. 服务端长期归因：在已补的周结果快照基础上，串起 AI 草稿 -> 采纳 -> 日程 -> 证据 -> 机会/面试结果。

### Later

1. 外部 SMTP/IM 自动发送邀请通知。
2. 用户数据生命周期治理和完整用户管理后台。
3. 真实用户质量面板。
4. 公开注册、计费或组织租户，只有在邀请制指标达标后再讨论。

## PM 决策

- `Decision { question: "当前是否完整产品", value: "不是完整公开产品，是邀请制 AI 求职教练准生产演示阶段", reason: "闭环已覆盖主流程和最小快速初始化，但真实 LLM、深度 JD、跨周归因和用户管理仍缺。" }`
- `Decision { question: "下一步做多人日程还是 AI 教练上下文", value: "AI 教练上下文优先", reason: "产品吸引力来自不同用户输入自己的边界后获得不同建议，而不是多一个日历。" }`
- `Decision { question: "AI 是否能直接改用户日程", value: "不能", reason: "保持草稿、接受、拒绝、反馈契约，降低幻觉和误改风险。" }`
- `Decision { question: "AI 是否能直接写入知识边界", value: "不能", reason: "边界提取只生成候选，用户点击采纳后才进入正式知识边界，保持私人工具的可控性。" }`

## 待验证假设

- `Assumption { question: "首批外部用户", value: "3-10 个泛 IT 求职者愿意每天维护 15-120 分钟执行记录", validation: "邀请制试用，观察 7 日留存和 evidence-backed actions。" }`
- `Assumption { question: "AI 建议吸引力", value: "引用知识边界、JD 焦点和规则版 JD 解析的建议比泛化建议更容易被采纳并完成", validation: "比较 AI 建议采纳率和采纳后完成率。" }`
- `Assumption { question: "知识边界输入成本", value: "用户愿意先录入 3-5 条边界", validation: "首次初始化完成率和放弃点。" }`

## 下一步验收

1. 新增或更新测试证明快速初始化能套用角色族模板、保存画像、生成边界候选、采纳三条边界、生成首条日程，并推动首次配置准备度推进。
2. 新增或更新测试证明 `JD焦点`、规则版 `JD解析` 和角色追问库进入 React、Node、Rust 的知识卡、日程建议、候选题和 sources。
3. 新增或更新测试证明 AI 提取边界候选可以从泛 IT 用户素材中提取 `MQ`、`Redis`、`稳定性` 等通用技术主题，provider 路径可返回候选，并过滤已保存主题。
4. 新增或更新测试证明 AI 边界候选被采纳后，正式知识边界保留来源摘要、置信度、provider、prompt version 和输入 hash。
5. `npm --prefix apps/react-web test -- --run src/test/coachAdapter.test.ts src/test/coachBoundaryProvenance.test.ts src/test/boundarySuggestionAdapter.test.ts src/test/CoachPage.test.tsx` 通过。
6. `node tests/node_ai_tools_boundary_test.js && node tests/node_ai_routes_boundary_test.js && node tests/api_runtime_test.js` 通过。
7. `node tests/rust_ai_tools_boundary_test.js && node tests/rust_ai_routes_boundary_test.js && cargo test --manifest-path apps/rust-api/Cargo.toml boundary_suggestions_extract_common_topics_for_any_role --lib && cargo test --manifest-path apps/rust-api/Cargo.toml boundary_suggestions_use_provider_and_filter_existing_topics` 通过。
8. `node tests/api_runtime_test.js`、`node tests/node_ai_routes_boundary_test.js`、`node tests/rust_ai_routes_boundary_test.js` 和 `cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api --test runtime_contract` 继续覆盖 `/api/coach/outcomes` 的权限、周归因计算、快照写入、Node/Rust 路由隔离和 React Review 页读写入口。
9. `node tests/api_runtime_test.js`、`node tests/auth_permissions_test.js`、`node tests/invitation_account_provisioning_test.js` 和 `cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api` 继续覆盖 `/api/coach/onboarding-events` POST/GET、摘要、SQLite/JSON 写入和读回，覆盖 `/api/coach/onboarding-report` 的邀请批次聚合、`inviteBatch` 读回和用户可见性边界，并覆盖 `/api/coach/invitations` 的 owner 写入/读回、非 owner 403、JSON/SQLite 持久化、users file 账号开通、密码重置、旧密码失效、新用户登录和 runtime 隔离。
10. `npm run validate:architecture-quality` 通过。

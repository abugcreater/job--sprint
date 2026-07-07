# 大范围产品迭代工作流

日期：2026-07-07

## 目标

形成一套以后可以复用的产品迭代流程，让用户不需要一直盯着每个按钮是否可用。

## 阶段 0：PRD 冻结

产物：

- `prd-options.md`
- `prd-recommended.md`
- `review-and-adjudication.md`
- `development-workflow.md`

通过标准：

- 有多个方向版本。
- 有推荐版本和不选理由。
- 有 MVP 范围、非目标、成功指标、验收门禁。
- 有明确 `Assumed / TBD`。
- 开始编码前不能保留 `blocks_coding: yes` 的 MVP TBD；必须转成 `Decision`、`Assumed` 或明确延期。
- 首批角色族必须在 PRD、前端画像选项、Node fallback 和 Rust fallback 中保持一致。

## 阶段 1：产品定位与信息架构

改动范围：

- 核心文档定位。
- React 文案和导航。
- 种子数据从高级 Java 私人工具弱化为泛 IT 示例。
- 首页信息架构从“当前任务”升级为“今日建议与执行”。

验收：

- 不再把产品主定位写成“高级 Java 后端个人私有工具”。
- 页面中仍可保留 Java 作为示例用户路径，但不是唯一定位。
- React 单测覆盖导航、标题、关键 CTA。
- Playwright 覆盖首页、学习、面试、机会、复盘。

## 阶段 2：用户画像和知识边界

改动范围：

- `user_profiles` 或 runtime 兼容模型。
- `knowledge_boundaries` 或 runtime 兼容模型。
- 前端画像页或首次初始化面板。
- 邀请制首登编排和批量素材包。
- 知识边界增删改查。

验收：

- 用户能创建和编辑画像。
- 用户能创建和编辑知识边界。
- 新用户能看到账号/数据域、画像模板、素材边界、首条日程和 AI 草稿确认的首登进度。
- 新用户能追加 JD、简历、面试反馈和学习笔记素材段，生成边界候选并采纳到正式边界。
- 服务端配置仓库外 `JOB_SPRINT_USERS_FILE` 时，owner 能从邀请账号管理开通或重置账号；新用户能登录，旧密码失效，密码/hash 不出现在响应，用户数据不串线。
- 刷新后可读回。
- Android 本地 WebView 可读回。
- 多用户数据不串线；React 本地多画像必须只把当前激活画像的自定义日程合成进今日任务。
- 切换激活画像后必须立即重建今日任务，不能继续显示上一画像的自定义日程。
- React 工作台必须显示当前账号、角色、数据域和只读/可编辑状态；未登录时给登录入口，已登录时给退出入口。

## 阶段 3：AI artifact 草稿

改动范围：

- `llm_artifacts` 和 `llm_runs`。
- AI 生成知识卡片、日程建议、候选题目。
- 接受、编辑、拒绝。
- 拒绝原因和采纳反馈。

验收：

- AI 输出必须通过 schema。
- 无证据来源时标 `unknown` 或追问。
- 接受后才写入正式日程、知识卡或题目。
- 拒绝原因进入复盘。
- provider 失败时有 fallback 或清晰错误。

## 阶段 4：Evidence Gate 和复盘升级

改动范围：

- Evidence Gate 行动门禁。
- 周复盘有效推进数。
- 机会结果和面试结果归因。

验收：

- 有效推进数可计算。
- 复盘能显示 AI 建议采纳率、拒绝原因、本地日程级采纳后完成率、本地规则版 AI 分析、本地 7 日周复盘归因和服务端周结果归因快照入口。
- AI 草稿必须带角色族视角；至少覆盖首批 11 个泛 IT 角色族的证据类型、回答框架和候选追问，不能让所有用户共用同一套后端话术。
- 机会状态、JD 关键词、命中点和 HR/面试反馈能影响下一轮建议，并被 React/Node/Rust 测试覆盖。

## 阶段 5：交付与回归

每次阶段收口命令：

```bash
npm test
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test
npm run test:functional
npm run test:rust:functional
node tests/product_iteration_workflow_test.js
npm run validate:product-iteration
node tests/invitation_account_provisioning_test.js
cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api
npm run build:rust:linux -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
```

涉及 Android：

```bash
npm --prefix apps/react-web run build
npm run sync:android-react
gradle -p apps/android :app:assembleDebug
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
npm run test:android:functional
```

注意：

- React 构建、Android 资源同步、APK 安装和 WebView 测试必须串行执行。
- 禁止把 `npm --prefix apps/react-web run build` 和 `npm run sync:android-react` 并行执行；否则 Android 可能继续打入旧 bundle，导致源码测试通过但 App 端仍是旧页面。
- `npm run test:android:functional` 只会启动当前已安装的 `com.kai.jobsprint`，不会自动安装新 APK；改动 Android assets 后必须先 `assembleDebug` 并 `adb install -r`。

涉及服务端发布：

```bash
npm run build:public-safe
npm run scan:public-safe
npm run build:server-delivery
npm run validate:delivery -- --allow-dirty
```

当前交付解释规则：

- `npm test` 通过只代表仓库内单元、边界、覆盖、对齐和敏感扫描通过。
- 2026-07-06 起，`npm test` 必须同时执行 `npm --prefix apps/react-web run typecheck` 和 `npm --prefix apps/react-web test`；不能再只用 JS 语法检查代表 React UI 可用。
- 2026-07-07 起，`npm test` 必须同时执行产品迭代工作流门禁，确保多版本 PRD、推荐 PRD、团队隔离规则、UI 防回归规则、AI 草稿契约、已知限制和远端 coach evidence 没有被后续迭代改丢。
- 2026-07-07 起，`npm run validate:delivery` 必须把产品迭代工作流作为 `product_iteration_workflow` 独立检查项；产品 PRD、复盘或工作流证据缺失时，最终交付 readiness 必须失败，不能只靠 release gate 间接兜底。
- `npm run test:local-functional` 通过代表 Web 本地流程和 Rust/SQLite 持久化可用。
- `npm run test:android:functional` 通过代表已安装 APK 的本地 WebView 流程可用。
- `npm run build:server-delivery` 通过只代表服务端交付包可生成且内含 Linux x86_64 ELF，不代表已经同步到远端 Linux；如果当前 Rust release binary 是 macOS Mach-O，它必须失败。发布前 `test:release` 必须使用 `npm run build:rust:linux`，不能用本机 `npm run build:rust` 覆盖 Linux ELF。
- `npm run write:server-sync-evidence` 通过只代表远端文件和本地交付包 manifest 一致，不代表 `job-sprint.service` 已经加载新 binary；Rust 路由或 binary 变化后必须重启服务并运行远端 API smoke。
- `npm run validate:delivery` 通过才可以说远端交付闭环通过；如果它失败，必须逐项说明失败证据。

## 团队分工规则

| 阶段 | Product | Tech | UI | Implementation | QA |
|---|---|---|---|---|---|
| PRD | 定义范围和指标 | 标出架构风险 | 标出流程风险 | 不参与写代码 | 定义验收矩阵 |
| 定位/IA | 审文案和用户流 | 审数据影响 | 设计页面结构 | 改 React 文案/导航 | 跑 Web 流程 |
| 画像/边界 | 审字段和闭环 | 设计数据隔离 | 设计表单状态 | 改前后端 | 跑隔离和读回 |
| AI artifact | 审 AI 价值 | 设计 schema/pipeline | 设计草稿交互 | 接 provider/fallback | 跑 schema/幻觉 fixture |
| 交付 | 审是否达成目标 | 审发布边界 | 审移动端体验 | 修阻塞缺陷 | 决定 PASS/PARTIAL |

## 防关闭智能体异常规则

1. 每轮先做 Team Lead 路由，最多派发当前阶段必要角色。
2. 如果出现 `agent thread limit reached` 或关闭等待，立即停止继续派发、等待和关闭。
3. 已完成角色结果可吸收；未返回角色标 `stale_or_missing`。
4. 主线程必须继续做可验证工作，不能把 agent 清理当成阻塞。
5. 最终报告必须写明哪些角色真实参与，哪些由主线程降级完成。

## 防 UI 功能不可用规则

任何 UI 改动合并前必须满足：

1. 所有按钮至少满足：导航、打开输入、提交真实状态、显示反馈、明确 disabled 原因之一。
2. 保存类功能必须有唯一测试文本、刷新读回和移动端读回。
3. 长列表必须默认摘要或折叠。
4. AI 功能必须有 provider 失败状态。
5. 页面文案变化必须同步测试选择器或可见文本断言。
6. 不能只用截图证明功能可用。
7. 涉及画像、账号或数据域的 UI 改动，必须覆盖“切换后不串线”：知识边界、AI 草稿、自定义日程和今日任务都只能读取当前作用域。
8. 同一页面出现多个相似字段时，端到端测试必须先限定稳定容器，再查找字段；例如主画像表单使用 `#coach-profile` 后再选 `角色族`、`目标岗位`，不能用全页面模糊 label 让邀请表单或快速初始化表单污染核心验收。

## AI 教练功能规则

1. AI 建议必须有来源上下文：画像、知识边界、日程、机会、面试或复盘至少命中一项。
2. AI 输出默认是草稿，状态只能是 `draft`、`accepted` 或 `rejected`。
3. `accepted` 必须产生可读回的业务结果，例如知识边界、日程、候选题或复盘建议。
4. `rejected` 必须记录原因，进入后续建议质量复盘。
5. provider 未接入或失败时必须展示 fallback 或错误状态，不能静默生成假 AI 结果。
6. Node/Rust 双栈 API 必须保持同一路径和同一草稿 schema；provider 未配置、超时或 schema 异常时都要返回明确 `local-fallback`，不能 404 或静默失败。
7. 知识边界候选必须同样覆盖 Node/Rust provider 成功、已有主题过滤、输入校验和 provider timeout fallback；远端未配置真实 provider 时只能说“本地 mock/provider contract 通过”。

## 本轮验证记录

本轮收口已执行并通过：

```bash
npm test
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test -- --run src/test/authClient.test.ts src/test/navigationRoutes.test.tsx
npm --prefix apps/react-web test -- --run
npm --prefix apps/react-web run build
npm run test:local-functional
npm run sync:android-react
gradle -p apps/android :app:assembleDebug
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
npm run test:android:functional
npm run build:rust:linux -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run build:public-safe
npm run scan:public-safe
npm run build:server-delivery
npm run write:server-sync-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-sync/sync.json
npm run restart:remote-service -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/service-restart.json
npm run write:remote-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/acceptance.json
npm run write:remote-invitation-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-invitations.json
npm run write:remote-invitation-account-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-invitation-account.json --allow-create-account
npm run configure:remote-provider -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/provider-config.json
npm run write:remote-coach-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-artifacts.json
npm run build:android:release -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/android-release/formal-release.json
```

本轮追加验证：

```bash
npm --prefix apps/react-web test -- scheduleAdapter
npm --prefix apps/react-web test -- sprintStoreCoachIsolation
npm --prefix apps/react-web test
npm test
node tests/node_ai_routes_boundary_test.js
node tests/rust_ai_routes_boundary_test.js
node tests/api_runtime_test.js
cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test -- coachAdapter CoachPage
npm --prefix apps/react-web test -- --run src/test/coachAdapter.test.ts src/test/CoachPage.test.tsx
node tests/node_ai_tools_boundary_test.js
node tests/rust_ai_tools_boundary_test.js
node tests/api_runtime_test.js
cargo test --manifest-path apps/rust-api/Cargo.toml coach_artifacts --lib
cargo test --manifest-path apps/rust-api/Cargo.toml boundary_suggestions_use_provider_and_filter_existing_topics
npm run validate:architecture-quality
cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api
npm --prefix apps/react-web test -- --run src/test/reviewAdapter.test.ts src/test/ReviewPage.test.tsx
npm run build:rust:linux -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run build:server-delivery
npm run write:server-sync-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-sync/sync.json
npm run restart:remote-service -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/service-restart.json
npm run write:remote-invitation-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-invitations.json
npm run write:remote-invitation-account-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-invitation-account.json --allow-create-account
npm run write:remote-login-switch-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/login-switch.json --allow-create-account
npm run write:remote-coach-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-artifacts.json
```

追加结论：React `DailySprint` 现在按当前激活画像过滤自定义日程，保存或切换画像会立即重建今日任务；根 `npm test` 已接入 React typecheck 与全量 Vitest，防止 UI 交互回归只被语法检查漏掉。Node/Rust `/api/coach/feedback` 现在会返回 `summary`，把采纳率、拒绝类型、拒绝原因和下一轮提示校准从前端本地统计推进到服务端可读回能力；Node/Rust `/api/coach/outcomes` 现在会返回服务端周结果归因，并可写入 `coachOutcomeSnapshots` 快照；React AI 反馈复盘已补本地日程级采纳后完成率，使用 `acceptedFromArtifactId` 把已采纳 AI 日程草稿关联到今日 `coach-event-*` 任务完成状态；React/Node/Rust AI 草稿生成已接入机会/JD 信号，当前投递公司、岗位、状态、关键词、命中点和反馈会进入 sources、reason 和输入摘要 hash；React/Node/Rust fallback 已从机会/JD 信号提取 `JD焦点` 和规则版 `JD解析`，让知识卡、日程建议和候选题围绕岗位责任、主技能、风险点、证据要求和候选追问生成；React 复盘页已补本地规则版 AI 分析，能把 Evidence Gate、薄弱回答、路径问题和 AI 建议反馈转成事实、欠缺和下一步动作；React 复盘页已补本地 7 日周复盘归因，能把证据覆盖、完成任务、延期、机会反馈、口述/面试证据和 AI 反馈转成闭环分、有效信号、风险和下周焦点，并可读取/保存服务端周结果归因快照；Node/Rust boundary suggestions 已补 Anthropic-compatible provider 路径、mock provider 成功测试和超时 fallback 测试，provider 返回的候选会过滤已保存主题；远端 coach smoke 已读回 `summary.reviewedCount=3`、`acceptanceRateLabel=0%`、`qualityLabel=偏离目标`；远端 `coach-jd-focus-2026-07-07.json` 已证明服务端 sources、body 和 reason 均包含 `JD焦点：MQ 的故障恢复`；远端 `login-switch.json` 已证明真实登录页 owner 登录、点击退出、切换 smoke 用户登录、session/dataScope 读回和临时账号清理。

本轮仍失败且不能忽略：

```bash
npm run final:delivery -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/final-delivery/final-delivery.json
npm run validate:delivery -- --allow-dirty
JOB_SPRINT_ANDROID_WEBVIEW_URL=https://job-sprint.example.com/job-sprint/react/index.html npm run test:android:remote:functional -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
```

失败边界已收敛为交付 env 里的 Android 远端 URL 仍是 HTTP、手动切 HTTPS 后 Android 真机首屏加载 `net::ERR_CONNECTION_RESET`、Android HTTPS 真机 evidence 缺失、最终统一交付报告不是 PASS。服务器同步、`job-sprint.service` 重启、服务器 HTTP 远端验收、远端 React 入口、远端邀请台账 smoke、远端 users-file 账号生命周期 smoke、远端 UI 登录切换 smoke、远端批量账号动作 smoke、远端邀请通知草稿 smoke、远端 DeepSeek coach artifact/feedback/outcomes smoke、远端 `JD焦点` smoke、远端规则版 `JD解析` 和角色追问库 smoke、远端 `/api/coach/boundary-suggestions` smoke、远端登录态 `/api/coach/boundary-feedback` GET、服务器本机 HTTPS SNI 和正式签名 APK 已通过；最新服务器同步 manifest SHA-256 为 `e5a1d8195791d988b5e50a0c9badc310771d303dfe34a63167629f5919ae53f2`，正式 APK SHA-256 为 `221c7483d288c5642304d51786fe6f8a664046c2079d3f8ad2df1dcc281d8343`，Linux x86_64 Rust ELF SHA-256 为 `a785bef602c15959f77bdc08957e1de378d132d20ce55dc6a1d9ca5e21d0a89f`，不能再沿用旧失败结论。

2026-07-07 续跑补充：扩展邀请账号管理和快速初始化后，`角色族`、`目标岗位` 等字段在同页出现多个相似 label，导致 Web/Rust/Android 端到端测试的全页面 `getByLabel` 严格模式失败。已将 `tests/react_functional_persistence_test.js`、`tests/rust_sqlite_ui_persistence_test.js`、`tests/android_webview_functional_persistence_test.js` 的主画像表单操作限定到 `#coach-profile`，并按串行流程重建 React bundle、同步 Android assets、构建并安装 debug APK。最新 `npm run test:local-functional`、`npm run test:android:functional` 和 `npm test` 均已通过；`npm run validate:delivery -- --allow-dirty` 仍因 Android 远端 HTTPS evidence 缺失和 delivery env 中 Android URL 为 HTTP 返回 `FAIL`。

2026-07-07 邀请后台补强：邀请账号管理不允许停留在“保存一条记录”。本轮已补 React 批次筛选、批量导入、批量状态更新、邀请报表 JSON 导出、首登模板版本和邀请记录删除；Node 兼容服务和 Rust/SQLite 正式服务均同步支持 `templateVersion`、`bulk-import`、批次状态更新和删除邀请记录；新增/更新 `apps/react-web/src/test/coachInvitationClient.test.ts`、`CoachPage.test.tsx`、`tests/auth_permissions_test.js`、`tests/invitation_account_provisioning_test.js`、`tests/node_ai_routes_boundary_test.js`、`tests/rust_ai_routes_boundary_test.js` 和 Rust runtime contract。以后凡是试用用户后台改动，必须同时覆盖 React UI、Node 合同、Rust 合同和架构边界测试；删除邀请记录不能被描述成删除或禁用登录账号，账号生命周期仍需单独设计。

2026-07-07 账号生命周期补强：邀请后台已继续补上 users-file 登录账号禁用、恢复和删除动作，并新增可复制邀请通知草稿。Node/Rust 均保护 owner 账号，禁用后登录会被拒绝，恢复后可登录，删除后再次登录被拒绝；远端 `coach-invitation-account.json` 已覆盖 `smoke_account_disabled`、`disabled_smoke_user_login_rejected`、`smoke_account_enabled`、`enabled_smoke_user_login`、`smoke_account_deleted`、`deleted_smoke_user_login_rejected` 和 `invitation_notifications_generated`。通知草稿只生成邮件/IM/手工渠道可复制内容，并提示密码必须走单独安全渠道；这仍不等于外部 SMTP/IM 自动发送，也不是公开注册或组织租户。

2026-07-07 Android 远端验收补强：正式 APK 缺少 `WebView.setWebContentsDebuggingEnabled(true)` 会导致 `npm run test:android:remote:functional` 无法通过 CDP 连接 WebView；已在 `AndroidWebViewInitializer.configureSettings()` 打开 DevTools，并用 `tests/android_webview_initializer_test.js` 锁定。随后又补 `com.kai.jobsprint.FORCE_LOCAL_START` intent extra，让自动化可先启动本地壳，再由 CDP 导航到本地或远端目标，避免公网 HTTPS 失败污染本地验收启动。最新正式 APK SHA-256 为 `221c7483d288c5642304d51786fe6f8a664046c2079d3f8ad2df1dcc281d8343`。`localhost.run`、`localtunnel` 和 `trycloudflare` 临时 HTTPS 通道均不能作为正式远端 evidence：有的在 Android WebView 超时，有的触发中间页，有的进入本地 `file:///android_asset/...` fallback。已在 `tests/android_webview_functional_persistence_test.js` 和 `tools/validate_final_delivery_readiness.js` 加防线，远端模式必须停留在配置的 HTTPS origin、`/job-sprint/` 路径，flow/restart 快照和 auth session 状态也必须是远端 URL；本地 fallback 报告会被拒绝。2026-07-07 续跑时 OPPO/Android 16 真机已重新安装成功，`npm run test:android:functional` 在最新 APK 上 PASS，报告写入 `docs/evidence/android-functional/android-webview-functional-persistence-report.json`，覆盖学习笔记、口述/复盘、延期、机会反馈、AI 画像/边界/日程草稿和重启后读回。远端 HTTPS 仍失败：`JOB_SPRINT_ANDROID_WEBVIEW_URL=https://job-sprint.example.com/job-sprint/react/index.html npm run test:android:remote:functional -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env` 返回 `net::ERR_CONNECTION_RESET`。同日试过把 Nginx 临时增加 `8443 ssl`，服务器本机 `https://job-sprint.example.com:8443/api/health` 返回 200，但外部直连 8443 超时/EOF，已撤回 8443 监听并重启 Nginx。因此 Android remote 仍不能标 PASS，剩余阻塞收敛为可信公网 HTTPS 出口和 Android remote evidence，而不是 APK 安装或本地功能。

## 复用模板

以后每次产品迭代都按以下顺序：

1. 写 PRD 方向版本。
2. 团队评审并裁决推荐版。
3. 先写验收矩阵。
4. 再改数据模型和 UI。
5. 跑 Web、Rust/SQLite、Android 本地证据。
6. 如需发布，再跑 public-safe、server sync、remote service restart、remote evidence、涉及新 React/邀请台账能力时跑 remote invitation evidence、涉及 users file 登录账号开通时跑 remote invitation account evidence、涉及登录/退出/账号可见性时跑 remote login switch evidence，最后跑 `validate:delivery`。

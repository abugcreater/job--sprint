# 需求开发复用模板

日期：2026-07-10

## 用途

本模板用于 Job Sprint 之后的产品级需求开发。它把本轮“需求澄清 -> 产品闭环 -> 数据隔离 -> UI/UX -> 开源安全 -> Web/Android/服务器交付 -> GitHub 合并”的完整路径抽象成可复用 SOP。

适用场景：

- 新功能、模块重构、UI/UX 改版、AI 能力增强。
- 用户隔离、权限、账号、数据迁移、开源脱敏。
- Web、Android、服务器、release 包联动交付。
- 需要 AI 团队参与的产品评审、开发、验收和复盘。

不适用场景：

- 一行文案、小 bug、只读解释或一次性命令。
- 没有用户可见价值的内部重排。
- 没有交付目标的泛泛 brainstorming。

## 复制入口

把下面内容复制到新任务开头，替换占位符：

```text
AI团队：按 Job Sprint 需求开发复用模板执行。

需求名称：<feature-slug>
原始问题：<用户原话或需求摘要>
目标用户：<目标用户/角色>
影响范围：<Web / Android / Server / Rust / Node / 数据 / 文档 / 发布>
工作分支：<feature|fix|refactor|docs|chore|test|spike>/<ticket>-<slug>
来源/目标分支：<develop -> develop；release/hotfix 才使用 main>
提交计划：<按单一意图列出预期 Conventional Commits>
必须解决：
1. <条目 1>
2. <条目 2>
3. <条目 3>

明确不做：
- <非目标 1>
- <非目标 2>

交付标准：
- 新用户/新账号不得看到旧数据或其他用户数据。
- 所有新增按钮必须有输入、反馈、保存/读回、导航或 disabled 原因。
- Web、本地功能、Rust/SQLite、Android、服务器和 release 包按影响范围分层验证。
- 开源仓库不得提交真实密钥、真实私密数据、个人路径或不可公开证据。
- 完成后按 GitFlow 提交 PR；普通需求进入 develop，release/hotfix 才进入 main。
- 按需要部署服务器和重新打包 APK，不能用代码合并替代真实交付 evidence。
```

## 标准需求卡

每个后续需求先填这张卡。卡片填不清楚时，先补产品定义，不急着写代码。

| 字段 | 填写内容 | 判定规则 |
|---|---|---|
| 原始问题 | `<用户原话>` | 保留原话，避免改着改着偏题。 |
| 目标用户 | `<普通用户 / owner / 管理员 / 新用户 / 访客>` | 普通用户路径和管理员路径必须分开。 |
| 用户路径 | `<从哪里进入 -> 做什么 -> 得到什么结果>` | 必须能描述成一次完整操作，而不是零散按钮。 |
| 影响模块 | `<画像 / 知识 / 面试 / 机会 / 复盘 / 统计 / 更多 / 登录 / 服务端 / Android>` | 影响跨端或跨数据域时要升级验收。 |
| GitFlow | `<工作分支 / 来源分支 / PR 目标 / 提交计划>` | 普通需求必须从 develop 到 develop；release/hotfix 才从或进入 main。 |
| 当前问题类型 | `<数据隔离 / 权限误露 / UI 不闭环 / 统计分散 / 删除风险 / AI 质量 / 交付证据>` | P0 优先级高于视觉优化。 |
| 数据对象 | `<profile / boundary / interview / opportunity / review / invitation / account / llm_run>` | 写清楚谁拥有、谁可读、谁可改、谁可删。 |
| 权限边界 | `<guest / user / owner / admin>` | owner-only 入口不能出现在普通用户主路径。 |
| 空状态 | `<新用户第一次看到什么>` | 新用户不得看到旧种子、旧画像或其他用户数据。 |
| 成功状态 | `<保存/提交/生成后看到什么>` | 必须有可见反馈和刷新后读回。 |
| 失败状态 | `<无输入/无权限/服务失败/校验失败怎么恢复>` | disabled 要说明原因，错误要给恢复动作。 |
| 破坏性动作 | `<删除/禁用/批量变更/清空>` | 必须二次确认、说明影响、允许取消。 |
| 统计归属 | `<Stats 页 / 模块局部状态>` | 跨模块指标进统计模块，模块头部只留当前任务必要信息。 |
| AI 契约 | `<草稿 / 候选 / 接受后写入 / 拒绝反馈>` | AI 不能直接改正式数据。 |
| 验证层级 | `<React / Node / Rust / Android / 远端 / release>` | 只声明实际跑过的层级。 |
| 完成状态 | `<PASS / PASS_WITH_LIMITS / PARTIAL / FAIL>` | 有限制就写限制，不能扩大解释。 |

复制模板：

```text
需求卡
- 原始问题：
- 目标用户：
- 用户路径：
- 影响模块：
- 工作分支：
- 来源分支 / PR 目标：
- 提交计划：
- 当前问题类型：
- 数据对象：
- 权限边界：
- 新用户空状态：
- 成功反馈和读回：
- 失败/disabled 恢复：
- 破坏性动作确认：
- 统计归属：
- AI 草稿契约：
- 验证层级：
- 明确不做：
- 完成状态：
```

## 一页速用版

后续每个产品级需求先按这 12 步跑，细节再回到后面的阶段模板查：

| 步骤 | 动作 | 产物或证据 |
|---|---|---|
| 1 | 读事实源，确认分支、脏工作树、运行入口和交付形态。 | `git status`、事实源清单、影响范围。 |
| 2 | 从最新 develop 创建合法工作分支，记录 PR 目标和提交计划。 | GitFlow 需求卡、`validate:gitflow`。 |
| 3 | 做 Manager Dispatch，确定 owner、必要角色和不派发理由。 | kickoff 记录，不能虚构全团队参与。 |
| 4 | 把用户原话拆成用户路径、必须解决、明确不做和完成标准。 | 需求摘要或 feature capsule。 |
| 5 | 定义数据对象、账号/画像/权限边界和旧数据清理规则。 | 数据隔离矩阵。 |
| 6 | 先写空状态、无权限、保存反馈、删除确认、错误恢复。 | UI 状态清单。 |
| 7 | 再实现最小业务闭环：输入、提交、持久化、刷新读回。 | 页面、接口或 store 改动。 |
| 8 | 按影响范围补测试，不把局部 PASS 扩大成全量交付。 | React/Node/Rust/Android/远端证据。 |
| 9 | 跑敏感扫描和 public-safe 检查，私有 env 留在仓库外。 | `scan:sensitive`、public-safe 报告。 |
| 10 | 回填账本、已知问题、完成审计和必要的 core 文档。 | `product-ledger.md`、`known-issues.md`、`completion-audit.md`。 |
| 11 | 按单一意图暂存和提交，PR 到正确目标分支。 | Conventional Commits、PR 模板、GitFlow CI。 |
| 12 | 最终汇报只说证据能证明的事，明确限制和下一步。 | `PASS / PASS_WITH_LIMITS / PARTIAL`。 |

最小闭环判断：

- 新用户看到的是空状态、引导和自己的数据，不是历史种子或其他用户数据。
- 普通用户看不到管理员入口，也不能执行 owner-only 动作。
- 每个按钮都有输入、反馈、保存读回、导航或 disabled 原因。
- 弹窗、抽屉和底部 sheet 关闭后，焦点必须回到触发行或下一步可恢复位置。
- 删除、禁用、批量变更和账号动作必须解释影响、允许取消，并在确认后读回。
- 统计进入统计模块；业务模块只保留当前任务所需的局部状态。
- AI 输出只能先成为草稿或候选，用户接受后才写入正式数据。
- Web、本地、Android、服务器和 release 证据分层表述，不互相冒充。

## 问题驱动闭环模板

当用户像本轮一样一次性提出多条产品问题时，按下面方式拆解，不把问题混成一团：

| 阶段 | 输入 | 动作 | 输出 |
|---|---|---|---|
| 1. 原话归类 | 用户列出的所有问题 | 按 P0/P1/P2 分为数据隔离、权限、信息架构、UI 闭环、交付证据。 | 问题矩阵。 |
| 2. 复现定位 | 截图、页面、测试、代码路径 | 找到真实数据源、权限判断、按钮行为和页面入口。 | 根因记录。 |
| 3. 产品裁决 | 问题矩阵 + 根因 | 判断该入口属于普通用户、owner 还是管理员；统计和管理能力是否要迁移。 | 产品决策。 |
| 4. 最小闭环 | 单个用户路径 | 先修输入、保存、读回、确认、取消、空状态和权限露出。 | 可用流程。 |
| 5. 分层验证 | 影响范围 | React 优先，涉及数据域再跑 Node/Rust，涉及 APK 再跑 Android，涉及发布再跑远端。 | 验证清单。 |
| 6. 账本继承 | 改动和限制 | 更新 `known-issues.md`、`product-ledger.md`、必要时更新 feature capsule。 | 后续规则。 |

本轮 8 类问题的默认处理规则：

| 用户问题 | 后续默认规则 |
|---|---|
| 新用户为什么有旧数据 | 先查账号/数据域/scope，再查 seed/fallback/localStorage；新用户必须有空状态和初始化引导。 |
| 邀请用户为什么在画像模块 | 邀请、账号、批次、首登报表属于 owner 管理路径，不能混进普通用户画像主路径。 |
| 统计数据太散 | 跨模块指标进入 Stats 页；业务模块头部只保留当前任务语境。 |
| 创建/编辑不友好 | 表单必须说明新增/编辑模式、保存影响、不可保存原因、成功反馈和取消路径。 |
| 测试画像不能删除 | 删除画像属于破坏性动作，必须解释级联影响、允许取消、确认后读回。 |
| 画像布局差 | 先整理信息架构和操作分组，再优化视觉；不要只改颜色和间距。 |
| 知识/面试/机会/复盘出现其他用户内容 | 所有正式数据、AI 草稿和 fallback 都必须按当前账号/数据域过滤。 |
| 更多模块像管理员后台 | 普通用户和 owner/admin 能力分层；owner-only 入口要有权限校验和无权限状态。 |

## 执行节奏模板

每轮需求按“窄口推进、证据收口”执行：

1. 先选 1 个最能降低风险的主问题，记录为什么不同时处理其它问题。
2. 先修真实业务闭环，再做视觉 polish。
3. 每个 UI 改动都补对应测试文本，避免按钮只是好看但不能用。
4. 每次只声明本轮覆盖的范围，剩余问题留在 `known-issues.md`。
5. 每轮结束追加产品账本：本轮决策、验证命令、不能证明什么、下一步继承规则。

## 阶段 0：事实源和边界

目标：先确认当前系统真实状态，不凭记忆下结论。

必读：

- `docs/README.md`
- `docs/core/01-project-background.md`
- `docs/core/02-project-plan.md`
- `docs/core/03-technical-architecture.md`
- `docs/core/04-acceptance-and-risk.md`
- `docs/product/README.md`
- 当前 feature capsule：`docs/product/<feature-slug>/`
- `docs/product/product-ops/iteration-workflow.md`
- `docs/product/product-ops/gitflow-development-governance.md`
- `docs/product/product-ops/doc-rules.md`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`

必须记录：

| 项目 | 结论 |
|---|---|
| 当前分支 | `<branch>` |
| 来源分支 | `<develop / main>` |
| PR 目标分支 | `<develop / main>` |
| 提交计划 | `<type(scope): description 列表>` |
| 是否已有未提交改动 | `<clean / dirty>` |
| 运行入口 | `<Web / Android / Server>` |
| 数据源 | `<localStorage / runtime JSON / SQLite / users file>` |
| 私有 env 位置 | `<repo 外路径>` |
| 不能提交内容 | `<密钥 / 真实数据 / 本机路径 / 证据>` |

发布形态必须先定清楚：

| 形态 | 是否覆盖 | 交付物 | 验收证据 |
|---|---|---|---|
| 本地 Web | `<Y/N>` | `<dev server / static build>` | `<本地功能报告>` |
| Rust/SQLite | `<Y/N>` | `<binary / DB migration>` | `<cargo test / functional report>` |
| Android 本地 | `<Y/N>` | `<debug APK>` | `<install + WebView flow>` |
| 服务器远端 | `<Y/N>` | `<server package / sync>` | `<restart + API/UI smoke>` |
| Android 远端 | `<Y/N>` | `<release APK>` | `<真实 origin + 业务流>` |
| 开源发布 | `<Y/N>` | `<public-safe tree / PR>` | `<scan + GitHub merge>` |

## 阶段 1：AI 团队 Manager Dispatch

目标：只派必要角色，不为了“像团队”而制造流程噪音。

Kickoff 模板：

```text
Team Lead kickoff
- entrypoint: manager-dispatch
- task_class: <product / ux / data-isolation / security / delivery / docs>
- owner: <Team Lead / Product / Tech / UI / QA / Implementation>
- max_agents: <0-2>
- agent_lifecycle_budget: 0
- required_roles: <本轮必须角色>
- optional_roles: <可选角色>
- forbidden_roles: <禁止角色，例如 plan-only 禁止 Implementation>
- skipped_roles:
  - Product: <跳过原因>
  - Tech: <跳过原因>
  - UI: <跳过原因>
  - QA: <跳过原因>
  - Implementation: <跳过原因>
- validation_plan: <命令、截图、报告、线上验证>
- why_not_full_team: <非发布/安全/数据迁移/最终验收时默认不用 full-team>
- current_thread_quarantine: false
- inherited_agent_cleanup_discarded: false
```

角色使用规则：

| 任务类型 | 默认 owner | 是否需要专家 |
|---|---|---|
| 文档模板、流程沉淀 | Team Lead / Product | 通常 0-1 个 Product Reviewer |
| UI/UX 改版 | UI Designer + Implementation | 需要 UI，必要时 Product |
| 权限、数据隔离、安全脱敏 | Tech Lead + QA | 需要 Tech/QA |
| 服务器、Android、release | QA + Tech | 需要 QA，必要时 Tech |
| 小范围代码实现 | Implementation | 通常主线程或 1 个 Implementation |
| 最终验收审计 | QA | 默认 QA，必要时 Tech/Product |

禁止事项：

- 不等待或关闭 stale agent。
- 不把脚本、本地 handoff 文件冒充真实 agent。
- 不把局部测试扩大解释成全量通过。
- 不在 `plan-only` 任务中修改代码。

## 阶段 2：产品闭环定义

目标：先证明需求值得做、怎么闭环，再写代码。

必须回答：

1. 用户为什么需要这个功能？
2. 这次解决哪条真实用户路径？
3. 成功后用户能完成什么动作？
4. 失败、空状态、未登录、无权限、无数据时怎么恢复？
5. 哪些指标或证据证明它有效？
6. 哪些内容明确不做？

产物：

| 文件 | 用途 |
|---|---|
| `docs/product/<feature-slug>/README.md` | 本次迭代入口、状态和关键结论。 |
| `docs/product/<feature-slug>/prd-options.md` | 至少 2 个方案和不选理由。 |
| `docs/product/<feature-slug>/prd-recommended.md` | 推荐方案、MVP、非目标、指标。 |
| `docs/product/<feature-slug>/review-and-adjudication.md` | 角色意见、分歧、裁决。 |
| `docs/product/<feature-slug>/development-workflow.md` | 分阶段实现和验收流程。 |
| `docs/product/<feature-slug>/completion-audit.md` | 最终逐项验收。 |

最小 PRD 检查：

- 有目标用户和非目标用户。
- 有 MVP 和明确延期项。
- 有 `Decision / Assumed / TBD` 三类结论，不把假设写成已确认事实。
- 有 Web/Android/Server 分层验收。
- 有数据对象和权限边界。
- 有 UI 状态：空、加载、错误、成功、无权限、删除确认。
- 有 AI 草稿契约：来源、schema、fallback、接受、拒绝、反馈。

## 阶段 3：数据隔离和安全基线

目标：新用户只能看到自己的数据，开源仓库只能包含可公开材料。

数据隔离清单：

| 检查项 | 通过标准 |
|---|---|
| 新用户初始状态 | 无旧画像、旧日程、旧知识、旧面试、旧机会、旧复盘。 |
| 账号数据域 | Node `dataScope` / Rust `scope` / React local state 不串线。 |
| 激活画像 | 今日任务、知识边界、AI 草稿、自定义日程只读当前画像。 |
| 角色切换 | `guest`、`owner/kai`、临时 smoke 用户分别验证登录、退出、写权限、只读状态和读回。 |
| 导入导出 | 只能恢复当前数据域允许的数据，跨域导入拒绝。 |
| 删除 | 删除画像时关联边界、日程、AI 草稿按产品规则清理。 |
| 管理员能力 | 普通用户不可见管理员入口，不可执行 owner-only API。 |

开源安全清单：

| 检查项 | 通过标准 |
|---|---|
| 密钥 | 不提交 token、密码、keystore、私有 env。 |
| 私人路径 | 不提交 `/Users/<name>` 等本机路径到源码或公开包。 |
| 真实数据 | 不提交真实简历、真实公司、真实面试反馈、真实账号。 |
| public-safe | `dist/public-safe` 和 Android fallback assets 扫描通过。 |
| 证据文件 | 交付证据可本地保存，但默认不作为开源源码证据依赖。 |

必跑：

```bash
npm run scan:sensitive
npm run build:public-safe
npm run scan:public-safe
```

## 阶段 4：UI/UX 实现约束

目标：用户能正常完成任务，不靠猜。

每个新增或改动按钮必须至少满足一项：

- 打开明确输入。
- 提交真实状态。
- 显示成功或失败反馈。
- 导航到对应页面。
- disabled 时解释原因。

保存类功能必须满足：

- 有可填写输入。
- 明确当前是新增还是编辑。
- 说明保存后会新增什么或更新哪条数据。
- 有保存按钮。
- 有成功反馈。
- 编辑中有取消编辑或返回新增态的路径。
- 刷新后可读回。
- 移动端或 Android 读回按影响范围验证。

页面必须覆盖：

- 空状态：告诉用户下一步做什么。
- 错误状态：展示可恢复动作。
- 删除状态：有确认和后续状态。
- 无权限状态：普通用户不看到管理员操作。
- 长列表状态：默认摘要或折叠。
- 小屏状态：文字不挤压、不遮挡、不需要猜按钮含义。

## 阶段 5：实现顺序

推荐顺序：

1. 建 feature capsule 和验收矩阵。
2. 写或更新数据模型、权限规则和接口契约。
3. 写最小 UI 骨架和空状态。
4. 写本地 store / runtime 读写。
5. 写 Node 与 Rust 合同。
6. 写 Web 单测和本地功能测试。
7. 同步 Android React assets。
8. 跑 Android 本地或远程 WebView。
9. 跑 public-safe、server-delivery、release。
10. 写 completion audit。
11. 提交、推送、PR、合并。

双栈/多端合同必须同步：

| 层 | 合同 |
|---|---|
| React | 页面状态、表单字段、按钮反馈、local/session 状态读写。 |
| Node | 用户、权限、数据域、AI provider、远端 smoke API。 |
| Rust/SQLite | `scope`、持久化 schema、迁移、查询过滤。 |
| Android WebView | React assets 同步、登录态、远端 origin、fallback assets。 |
| 服务器 | 公开包、私有 env、进程重启、版本 manifest。 |

E2E 规则：

- 同名字段或按钮较多时，必须限定稳定容器或测试 id，不能用全页面模糊 label。
- AI 功能必须验证 schema、来源上下文、provider 失败、fallback、接受/拒绝后的业务读回。
- Android 验收必须按顺序完成 React build、sync assets、assemble、install、业务测试；源码通过不等于 APK 已更新。

开发中每个阶段都要问：

- 这个改动是否让原始目标更真实？
- 有没有把示例数据误当用户数据？
- 有没有把管理员能力暴露给普通用户？
- 有没有把本地通过误称远端通过？
- 有没有把 HTTP 演示误称 HTTPS 生产？

## 阶段 6：分层验收命令

基础质量：

```bash
npm test
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test
git diff --check
npm run scan:sensitive
```

本地功能：

```bash
npm run test:functional
npm run test:rust:functional
npm run test:local-functional
```

Rust/SQLite：

```bash
cargo test --manifest-path apps/rust-api/Cargo.toml
```

Android 本地：

```bash
npm --prefix apps/react-web run build
npm run sync:android-react
gradle -p apps/android :app:assembleDebug
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
npm run test:android:functional
```

远端和 release：

```bash
npm run build:rust:linux -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run build:public-safe
npm run scan:public-safe
npm run build:server-delivery
npm run write:server-sync-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run write:remote-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run test:android:remote:functional -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --allow-create-account
npm run build:android:release -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env
npm run validate:delivery -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --allow-dirty
```

最终交付：

```bash
npm run final:delivery -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/final-delivery/final-delivery.json --allow-create-account --allow-dirty
```

解释规则：

| 证据 | 能证明 | 不能证明 |
|---|---|---|
| `npm test` | 仓库内静态、单测、门禁通过。 | 不能证明服务器或 APK 可用。 |
| `test:local-functional` | Web 和 Rust/SQLite 本地闭环。 | 不能证明 Android 真机或远端。 |
| `test:android:functional` | 当前已安装 APK 的本地 WebView。 | 不能证明远端 WebView。 |
| `write:server-sync-evidence` | 远端文件和本地 manifest 一致。 | 不能证明服务已加载新进程。 |
| `write:remote-evidence` | 远端 Web/API smoke 通过。 | 不能证明 Android。 |
| `test:android:remote:functional` | Android 远端 WebView 真实流程。 | 不能证明 HTTPS，若 URL 是 HTTP 只能 PASS_WITH_LIMITS。 |
| `build:android:release` | 正式 APK 已签名。 | 不能证明安装后业务可用。 |
| `final:delivery` | 聚合交付证据。 | HTTP 限制仍要明示。 |

## 阶段 7：完成审计

完成前逐项填写：

| 原始需求 | 当前证据 | 状态 | 限制 |
|---|---|---|---|
| `<需求 1>` | `<文件/命令/报告/PR>` | `PASS / PASS_WITH_LIMITS / PARTIAL / FAIL` | `<限制>` |
| `<需求 2>` | `<文件/命令/报告/PR>` | `<状态>` | `<限制>` |
| `<需求 3>` | `<文件/命令/报告/PR>` | `<状态>` | `<限制>` |

不能接受的完成说法：

- “应该可以用。”
- “测试没报错，所以线上也行。”
- “本地通过，所以 Android 通过。”
- “HTTP 通过，所以 HTTPS 生产通过。”
- “代码已写，所以需求完成。”

可接受的完成说法：

- “`npm run final:delivery ...` 输出 `PASS_WITH_LIMITS`，限制是远端 URL 仍为 HTTP。”
- “Android 远端 WebView 报告为 `PASS`，包含 flow/restart 快照和登录态。”
- “GitHub PR 已合并，`origin/main` 包含提交 `<sha>`。”

## 阶段 8：GitHub 和发布收口

标准流程：

```bash
git status --short --branch
git diff --check
npm run scan:sensitive
git add <本次单一意图涉及的明确文件>
git diff --cached --check
npm run validate:gitflow -- --phase commit --message "<type(scope): summary>"
git commit -m "<type(scope): summary>"
git push -u origin <branch>
git status --porcelain
npm run validate:gitflow -- --phase pr --base <develop|main> --message "<type(scope): title>"
gh pr create --base <develop|main> --head <branch> --title "<type(scope): title>" --body-file <pr-body.md>
gh pr merge <number> --squash --delete-branch
git fetch --prune origin
git branch -r --contains <commit>
```

提交前确认：

- 工作目录只包含本次需求相关改动。
- 工作分支、来源分支和 PR 目标符合 `gitflow-development-governance.md`。
- 混合工作树只按明确路径暂存，禁止直接 `git add -A`。
- 没有提交私有 env、真实证据、keystore、token。
- 大体量构建产物是项目要求的一部分才提交。
- PR 描述包含验证命令和限制。
- 普通需求合并到 `origin/develop`；release/hotfix 合并到 `origin/main` 并回同步 develop。

## 最终报告模板

```text
Dispatch:
- status: <MANAGER_DISPATCH_PASS / SINGLE_SPECIALIST_PASS / TEAM_ROOM_PARTIAL>
- entrypoint: manager-dispatch
- actual_agents: <角色和 agent id，没有则写 main-thread only>
- skipped_roles: <角色和原因>

交付结果：
- 独立路径：<path>
- 工作分支 / PR 目标：<branch -> develop|main>
- PR：<url>
- merge commit：<sha>
- 服务器：<URL 或说明>
- Android APK：<path>
- 最终验收：<PASS / PASS_WITH_LIMITS / PARTIAL>
- 限制：<HTTP / 外部 provider / 未覆盖范围>

验证：
- <命令 1>
- <命令 2>
- <报告路径>

完成审计：
- <需求 1>：<PASS + 证据>
- <需求 2>：<PASS + 证据>
- <需求 3>：<PASS_WITH_LIMITS + 限制>

下次继承：
- <规则 1>
- <规则 2>
```

## 反模式清单

- 先写代码，最后才补 PRD 和验收矩阵。
- 把旧种子数据当作新用户默认数据。
- 把“邀请用户”“管理员台账”放到普通用户主路径。
- 把统计散在每个模块头部，而不是集中到统计模块。
- 只测 React，不同步 Android assets。
- 只打 APK，不跑 WebView 业务流程。
- 只同步服务器文件，不跑远端 API/Web smoke。
- 只跑本地敏感扫描，不检查 public-safe 和 Android fallback。
- 把 evidence 报告里的本机路径或服务器信息提交到开源源码。
- 把 `PASS_WITH_LIMITS` 写成生产全量 `PASS`。
- 在 `main` 或 `develop` 直接开发和提交。
- 在混合工作树使用 `git add -A`，把多个需求塞进同一提交。

## 本轮沉淀的继承规则

1. 新用户默认空状态必须是产品能力，不是测试障碍。
2. 画像、知识、面试、机会、复盘必须按账号/数据域隔离。
3. 管理员能力要从普通用户“我的数据”中分离。
4. 创建、编辑、保存、删除必须有明确反馈和读回。
5. UI/UX 改版要先保证流程闭环，再谈视觉细节。
6. Android 远端验收必须使用临时账号证明新用户不继承旧数据。
7. release gate 不能依赖私有信息进入仓库；私有 env 必须留在 repo 外。
8. 最终交付必须验证 Web、Android、服务器、APK、GitHub 合并。
9. 普通需求必须从 develop 创建独立分支并回到 develop；release/hotfix 才进入 main。
10. 每个提交必须是可测试、可独立回退的单一意图，PR 标题决定 squash 后的最终提交信息。

# 每日主动产品迭代日志

日期：2026-07-08

## 2026-07-15 GitFlow 发布与回同步收口

主任务：解除因未完成 `main → develop` 回同步造成的每日迭代阻塞，并按正式 release 流程收敛主干。

今日动作：

- 将无冲突且 `validate` 已通过的 PR #6 从 Draft 转为正式并合入 `develop`，恢复日常需求的正确集成基线。
- 发现直接 `develop → main` 的 PR #7 被 GitFlow 门禁拒绝；关闭该未合并 PR，改从 `release/v0.2.0` 创建 PR #8 并合入 `main`。
- 从 `main` 创建本分支，用一条发布回同步记录建立可审阅的 `main → develop` PR，避免发布 merge commit 再次让日更机制误判基线漂移。

已验证：

- PR #6 与 PR #8 的 GitFlow Policy `validate` 均通过；PR #8 已合入 `main`。
- `npm test`：PASS，包含 111 个 React 测试、架构/功能覆盖/功能对齐/目标验收/GitFlow/敏感扫描与产品迭代门禁。
- 本分支以 `chore` 类型向 `develop` 提交回同步 PR；不直接向受保护分支推送。

限制与下一步：

- 本条回同步 PR 合并前，`develop` 会因 release merge commit 比 `main` 少一个祖先关系，日更仍应保持只读；合并后再恢复正常的每日单需求迭代。
- 发布分支与回同步分支均为短生命周期分支，合并后删除；已合并的历史 feature/chore/test 分支也在同一轮清理。

## 2026-07-10 至 2026-07-11 产品 UI 与 Android 收口

- 将 Today、准备、机会、学习、面试、复盘、统计和我的数据重构为单任务、阶段式或主从工作台，移动导航收敛为今日、准备、机会、面试、复盘。
- Android 补齐状态栏与键盘安全区、远端 URL 安全策略、系统文件选择器，以及 React 离线资源同步；导入素材保持空值，不再写入模板占位正文。
- “导入简历或 JD”使用 `resume-import` 深链，进入准备页后直接定位并聚焦导入工作区；普通准备入口不受影响。
- Web、Android 和服务端使用同一 React 构建；发布通过敏感信息扫描、公开包扫描、完整 release gate、HTTPS 远端验收和 Android 杀进程读回。
- 真实部署地址、账号、密钥与签名材料继续只从仓库外私有 env/keystore 注入，开源仓库只保留示例地址。

## 2026-07-08 启动记录

目标：把“每天由 Codex 主动优化 Job Sprint”从口头目标落成可重复执行的机制。

当前状态：

- 已有 `requirement-development-template.md`，可作为单次需求开发模板。
- 新增 `daily-product-iteration.md`，定义每日主动扫描、排序、实施、验证和汇报流程。
- 后续每日默认从 `known-issues.md`、`product-ledger.md` 和当前测试/运行状态里选择 1 个主任务推进。

今日候选池：

| 候选 | 来源 | 初步优先级 | 处理 |
|---|---|---|---|
| Android 远端 HTTPS 真机 evidence 缺失 | `known-issues.md` | 高 | 需要外部 HTTPS/SNI 问题修复后再验收，当前记录为外部阻塞。 |
| 真实 LLM 周复盘、机会状态、面试结果长期归因 | `known-issues.md` | 高 | 适合拆成后续 feature capsule。 |
| 外部 SMTP/IM 自动发送和用户管理后台 | `known-issues.md` | 中 | 需要产品边界确认，不在日常小修里直接做。 |
| 统一长列表摘要、筛选、详情页模式 | `known-issues.md` | 中 | 适合后续每日 UI/UX 小步优化候选。 |

今日动作：

- 建立每日主动产品迭代 runbook。
- 接入 product-ops 入口。
- 准备创建 Codex 每日 heartbeat 自动化。

下次默认优先：

1. 先处理不依赖外部服务器的 UI/UX 或产品闭环小问题。
2. 如果发现数据隔离、权限误露、安全泄露或交付口径问题，立即提到 P0。
3. 如果任务超过一天，先建 feature capsule，再按 `requirement-development-template.md` 推进。

## 2026-07-08 第一次主动迭代

主任务：补齐 AI 运行记录长列表的摘要与展开/收起交互。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 3 | 用户需要回看 provider、schema、fallback 和降级状态，不能只看到被截断的最近 5 条。 |
| 问题确定性 | 5 | `LlmRunPanel` 只执行 `runs.slice(0, 5)`，没有剩余数量提示或展开按钮。 |
| 风险降低 | 1 | 主要是可观测性和交互问题，不直接影响数据隔离。 |
| 交互改善 | 5 | 补充“还有 N 条 / 查看全部 / 收起”，与日程和 AI 建议列表一致。 |
| 可验证性 | 5 | 可通过 Coach 页面测试和前端 typecheck 验证。 |
| 实现大小 | 5 | 只改一个展示组件和一条现有长列表测试。 |

改动：

- `apps/react-web/src/features/coach/components/LlmRunPanel.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `tests/goal_acceptance_test.js`
- `docs/product/product-ops/known-issues.md`

已验证：

- `npm --prefix apps/react-web test -- CoachPage.test.tsx`：PASS，4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，28 个测试文件、94 个测试通过。
- `node tests/goal_acceptance_test.js`：首次在根门禁中暴露 reason 白名单滞后，补 `goal_acceptance_has_limits` 后 PASS。
- `npm test`：PASS；包含前端 typecheck/Vitest、目标验收门禁、产品迭代门禁、敏感扫描和工作树边界验证。

限制：

- 本次只覆盖 AI 运行记录长列表，不等于所有 owner 邀请台账、批次报表和用户管理长列表都已统一。
- 未做 Android 重新打包；这是 React UI 局部改动，后续发布前仍需 sync Android assets 并跑 Android 验收。

明日候选：

1. 检查邀请账号管理和邀请批次看板是否存在同类长列表/筛选/disabled 原因问题。
2. 如果继续做 UI/UX 小步优化，优先选择不依赖外部 HTTPS 的本地可验收项。

## 2026-07-08 第二次主动迭代

主任务：补齐邀请账号管理批量操作的 disabled 原因。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | owner 批量更新邀请、账号状态和通知草稿时，需要知道为什么按钮不能点。 |
| 问题确定性 | 5 | `InviteManagementPanel` 里三个批量按钮直接 disabled，但原因只藏在点击保护逻辑或用户猜测里。 |
| 风险降低 | 2 | 明确“必须选择具体批次”可降低误操作全部试用用户的风险。 |
| 交互改善 | 5 | 新增持续可见的批量操作提示，并用 `aria-describedby` 关联到 disabled 按钮。 |
| 可验证性 | 5 | 可通过组件测试、前端 typecheck 和根门禁验证。 |
| 实现大小 | 4 | 只改邀请管理组件和一条组件测试。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementBatchActions.ts`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementPanel.test.tsx`：PASS，2 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：首次发现 `InviteManagementPanel.tsx` 超过 560 行预算；抽取 `inviteManagementBatchActions.ts` 后 PASS，组件为 559 行。
- `npm --prefix apps/react-web test`：PASS，29 个测试文件、96 个测试通过。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只补批量操作 disabled 原因，不等于邀请台账和批次看板的全部长列表筛选、分页或详情页已完成。
- 未做远端账号操作 smoke；这是 React 本地交互说明，不涉及真实账号禁用、恢复或删除。

明日候选：

1. 继续检查邀请台账列表超过 8 条时是否需要“查看全部/收起”或详情页。
2. 检查批次首登看板是否需要按批次、风险或放弃点筛选。

## 2026-07-08 第三次主动迭代

主任务：补齐邀请账号与邀请记录长列表的摘要与展开/收起交互。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | owner 查看邀请台账时，需要知道还有多少账号或邀请记录被折叠，而不是误以为只有前几条。 |
| 问题确定性 | 5 | `InviteManagementPanel` 直接 `slice(0, 6)` 和 `slice(0, 8)`，没有剩余数量提示或展开入口。 |
| 风险降低 | 2 | 主要降低误读台账风险，不直接改变账号权限或数据隔离。 |
| 交互改善 | 5 | 新增“还有 N 个/条未显示、查看全部、收起”交互，并把台账列表抽成独立组件。 |
| 可验证性 | 5 | 可通过组件测试、前端 typecheck、架构质量门禁和根门禁验证。 |
| 实现大小 | 4 | 改动集中在邀请管理台账组件、测试和产品台账。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementLedger.tsx`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementPanel.test.tsx`：PASS，3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS；`InviteManagementPanel.tsx` 从 559 行降到 498 行，新组件 137 行。
- `npm --prefix apps/react-web test`：PASS，29 个测试文件、97 个测试通过。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只补邀请账号与邀请记录列表的可见性，不等于批次首登看板、用户管理后台和详情页已经完成。
- 未做远端账号生命周期 smoke；本次是 React 本地展示与交互改动，不改变服务端账号开通、禁用、恢复或删除逻辑。

明日候选：

1. 检查批次首登看板是否需要按批次、风险或放弃点筛选。
2. 继续梳理 owner 管理台账是否需要独立详情页，避免所有管理动作挤在教练页。

## 2026-07-08 第四次主动迭代

主任务：补齐邀请批次首登看板的批次、风险、放弃点筛选和展开/收起交互。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | owner 需要优先查看高风险批次、共同放弃点和具体批次用户，不能只看默认前几条。 |
| 问题确定性 | 5 | `InviteOnboardingReportPanel` 直接 `slice(0, 4)` 和 `slice(0, 5)`，没有筛选、剩余数量提示或空状态。 |
| 风险降低 | 3 | 可降低高风险首登用户被列表截断隐藏的运营风险。 |
| 交互改善 | 5 | 新增批次、风险、放弃点筛选，当前筛选计数、查看全部/收起和空结果说明。 |
| 可验证性 | 5 | 可通过独立组件测试、前端 typecheck、架构质量门禁和根门禁验证。 |
| 实现大小 | 4 | 改动集中在一个看板组件、一条测试和产品台账。 |

改动：

- `apps/react-web/src/features/coach/components/InviteOnboardingReportPanel.tsx`
- `apps/react-web/src/test/InviteOnboardingReportPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteOnboardingReportPanel.test.tsx`：PASS，1 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS；看板组件 177 行。
- `npm --prefix apps/react-web test`：PASS，30 个测试文件、98 个测试通过。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只补 React 本地看板筛选和展示，不改变 `/api/coach/onboarding-report` 服务端聚合口径。
- 未做远端 owner 实账号 smoke；服务端数据、账号和权限链路沿用既有合同。

明日候选：

1. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。
2. 检查统计模块是否需要把散落的模块头部统计进一步集中到 Stats 页。

## 2026-07-08 第五次主动迭代

主任务：强化 Stats 页的集中结果统计，让统计模块承接关键结果指标和 AI 运行质量。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户明确反馈统计散在各模块头部会显乱；集中统计页应优先回答今天是否推进、AI 是否有效、面试是否复盘。 |
| 问题确定性 | 4 | `StatsPage` 已存在，但首屏仍偏“今日完成/证据/画像/同步”，没有突出本周有效推进、采纳后完成、面试复盘和 AI 运行质量。 |
| 风险降低 | 2 | 集中结果指标能降低产品判断偏差，但不直接改变数据隔离或账号权限。 |
| 交互改善 | 4 | 新增“关键结果”说明、结果闭环面板和 AI 运行质量面板，减少用户跨模块找数字。 |
| 可验证性 | 5 | 可通过独立页面测试、前端 typecheck、架构质量门禁和根门禁验证。 |
| 实现大小 | 4 | 改动集中在 Stats 页、一条测试和产品台账。 |

改动：

- `apps/react-web/src/features/stats/StatsPage.tsx`
- `apps/react-web/src/test/StatsPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- StatsPage.test.tsx`：PASS，1 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS；Stats 页 243 行。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、99 个测试通过。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只强化 Stats 页集中统计，不删除各业务页已有必要上下文数字。
- 未做浏览器截图巡检；本轮以 React 页面测试和门禁验证为主。

明日候选：

1. 检查业务模块头部是否还有重复 KPI 可进一步收敛到 Stats 页。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第六次主动迭代

主任务：收敛 More 页重复 KPI，把普通用户的统计入口统一到 Stats 页。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | 普通用户进入“我的数据”时主要想看账号、同步和备份，不应该被完成、证据、延期、画像、AI 建议等重复 KPI 干扰。 |
| 问题确定性 | 5 | `MorePage` 头部仍有 6 到 7 个 `MetricTile`，账号卡和后续入口也重复提供统计入口。 |
| 风险降低 | 2 | 主要降低信息架构混乱和误读风险，不改变数据隔离、权限或导入导出格式。 |
| 交互改善 | 4 | 用低密度“统计快照 + 查看集中统计”替代指标卡网格，保留上下文摘要但把详细趋势交给 Stats 页。 |
| 可验证性 | 5 | 可通过 More 页面测试、前端 typecheck、架构质量门禁和前端全量测试验证。 |
| 实现大小 | 5 | 改动集中在 More 页展示、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/more/MorePage.tsx`
- `apps/react-web/src/test/MorePage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- MorePage.test.tsx`：PASS，3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、99 个测试通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只收敛 More 页的重复 KPI，不删除今日、画像、学习、面试、机会、复盘页中仍有上下文价值的局部数字。
- 未做浏览器截图巡检；本轮以 React 页面测试、类型和架构门禁验证为主。

明日候选：

1. 继续检查学习、面试、机会、复盘页是否还有可迁移到 Stats 页的重复入口。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第七次主动迭代

主任务：移除业务模块头部的重复“集中统计”卡片。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | 用户明确反馈统计分布在每个模块头部显乱；业务模块头部应该先讲当前模块任务，而不是重复推统计入口。 |
| 问题确定性 | 5 | 画像、知识、面试、机会、复盘 5 个页面头部都有同款 `to="/stats"` 大卡片，搜索可直接定位。 |
| 风险降低 | 2 | 主要降低信息架构混乱，不改变数据、权限、保存或导入导出逻辑。 |
| 交互改善 | 5 | 业务页首屏少一张横向卡片，主导航继续提供 Stats 一级入口，页面层级更清晰。 |
| 可验证性 | 5 | 可通过路由测试断言 5 个业务页不再出现“集中统计”，并验证全局 Stats 导航仍可用。 |
| 实现大小 | 5 | 改动集中在 5 个页面头部、一条路由测试和产品台账。 |

改动：

- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/features/learning/LearningPage.tsx`
- `apps/react-web/src/features/interview/InterviewPage.tsx`
- `apps/react-web/src/features/applications/ApplicationsPage.tsx`
- `apps/react-web/src/features/review/ReviewPage.tsx`
- `apps/react-web/src/test/navigationRoutes.test.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- navigationRoutes.test.tsx LearningPage.test.tsx InterviewPage.test.tsx ApplicationsPage.test.tsx ReviewPage.test.tsx CoachPage.test.tsx`：PASS，6 个测试文件、25 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `git diff --check`：PASS。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只移除业务模块头部统计卡，不删除模块主体中服务当前任务的局部状态、筛选计数或反馈数字。
- 今日页空态里的“查看统计”属于启动路径辅助动作，不是业务模块头部卡片，本轮保留。

明日候选：

1. 检查模块主体内的局部数字是否仍有必要，避免把局部状态误做成跨模块统计。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第八次主动迭代

主任务：补齐画像页日程和知识边界表单的创建/编辑反馈。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户明确反馈创建交互不友好、编辑保存没有提示；知识边界和日程是 AI 教练上下文里的高频表单。 |
| 问题确定性 | 5 | `SchedulePanel` 编辑已有日程后缺少取消编辑；`SchedulePanel` 和 `BoundaryPanel` 都没有明确说明当前是新增还是编辑。 |
| 风险降低 | 3 | 模式提示能降低误改已有日程或知识边界的风险，但不改变底层数据隔离。 |
| 交互改善 | 5 | 新增持续可见的模式说明、保存影响说明，并让日程编辑可以撤回到新增态。 |
| 可验证性 | 5 | 可通过 Coach 页面测试覆盖“新增说明 -> 保存 -> 编辑说明 -> 取消编辑 -> 回到新增说明”。 |
| 实现大小 | 5 | 改动集中在两个表单组件、一处页面接线、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/coach/components/SchedulePanel.tsx`
- `apps/react-web/src/features/coach/components/BoundaryPanel.tsx`
- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`
- `docs/product/product-ops/requirement-development-template.md`

已验证：

- `npm --prefix apps/react-web test -- CoachPage.test.tsx`：PASS，4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只覆盖教练页知识边界和我的日程两个高频表单，不等于所有页面的创建/编辑体验都已统一。
- 未做浏览器截图巡检；本轮先以 React 行为测试和后续门禁验证为主。

明日候选：

1. 继续按保存类表单清单检查机会、复盘、面试和统计页是否存在同类模式提示缺口。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第九次主动迭代

主任务：补齐机会记录表单的新增/编辑模式提示和保存影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 机会记录会影响 Evidence Gate 和 AI 教练机会/JD 信号，用户需要知道新增和编辑分别会写入或更新什么。 |
| 问题确定性 | 5 | `ApplicationForm` 只有标题、字段提示和提交反馈，没有持续说明“新增写入当前机会任务”或“编辑更新已有证据”。 |
| 风险降低 | 3 | 明确编辑保存影响可降低误改机会反馈证据的风险，尤其在已有记录筛选后编辑时。 |
| 交互改善 | 5 | 打开表单即可看到新增/编辑状态、保存影响和无可绑定任务说明。 |
| 可验证性 | 5 | 可通过 Applications 页面测试覆盖新增模式提示和编辑模式提示。 |
| 实现大小 | 5 | 改动集中在机会表单组件、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/applications/components/ApplicationForm.tsx`
- `apps/react-web/src/test/ApplicationsPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ApplicationsPage.test.tsx`：PASS，4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只覆盖机会记录表单，不等于学习笔记、面试口述和复盘快照等所有保存入口都已补到同一标准。
- 未做浏览器截图巡检；本轮以 React 行为测试和后续门禁验证为主。

明日候选：

1. 继续按保存类表单清单检查学习笔记、面试口述和服务端周结果快照是否需要更明确的保存影响提示。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十次主动迭代

主任务：补齐面试口述训练的 disabled 原因和保存影响提示。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 面试口述是高频练习入口，用户需要知道为什么空回答时不能评分/保存，以及保存后会写到哪里。 |
| 问题确定性 | 5 | `AnswerPanel` 两个按钮在空回答时直接 disabled，没有持续说明；有回答后也没有说明保存会进入当前面试任务 Evidence Gate。 |
| 风险降低 | 3 | 明确保存影响能降低用户把评分草稿误认为已记录、或以为空回答按钮失效的困惑。 |
| 交互改善 | 5 | 新增可读的状态提示，并用 `aria-describedby` 关联保存和评分按钮。 |
| 可验证性 | 5 | 可通过 Interview 页面测试覆盖空回答 disabled 原因和输入后保存影响提示。 |
| 实现大小 | 5 | 改动集中在面试页组件、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/interview/InterviewPage.tsx`
- `apps/react-web/src/test/InterviewPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InterviewPage.test.tsx`：PASS，4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：首次发现 `InterviewPage.tsx` 超过 560 行预算；压回 559 行后 PASS。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `npm test`：PASS；包含架构质量、前端 typecheck/Vitest、产品迭代、敏感扫描和工作树边界验证。

限制：

- 本次只覆盖面试口述保存和评分入口，不等于学习笔记、复盘服务端快照等所有保存入口都已补到同一标准。
- 未做浏览器截图巡检；本轮以 React 行为测试和后续门禁验证为主。

明日候选：

1. 继续按保存类表单清单检查学习笔记和服务端周结果快照是否需要更明确的保存影响提示。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十一次主动迭代

主任务：补齐学习笔记保存入口的 disabled 原因和保存影响提示。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 学习笔记会进入当前知识任务的 Evidence Gate，用户需要在保存前知道它会写到哪里。 |
| 问题确定性 | 5 | `LearningTaskCard` 原本只有 textarea placeholder 和 disabled 保存按钮，没有持续说明空笔记为什么不能保存，也没有说明保存后的影响。 |
| 风险降低 | 3 | 明确写入对象可降低用户误以为笔记只保存在侧栏、或担心影响其他知识任务的困惑。 |
| 交互改善 | 5 | 新增可读状态提示，并用 `aria-describedby` 关联输入框和保存按钮。 |
| 可验证性 | 5 | 可通过 Learning 页面测试覆盖空笔记 disabled 原因和输入后的保存影响提示。 |
| 实现大小 | 5 | 改动集中在学习任务卡片、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/learning/components/LearningTaskCard.tsx`
- `apps/react-web/src/test/LearningPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- LearningPage.test.tsx`：PASS，6 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。

限制：

- 本次只覆盖学习笔记入口，不等于复盘服务端快照等所有保存入口都已补到同一标准。
- 未做浏览器截图巡检；本轮先以 React 行为测试和门禁验证为主。

明日候选：

1. 继续检查复盘页服务端周结果快照是否需要更明确的保存影响和覆盖范围提示。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十二次主动迭代

主任务：补齐复盘页服务端结果快照的可保存状态和保存影响提示。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 周结果快照承接北极星指标，用户需要知道当前能不能写服务端、写入后覆盖哪些指标。 |
| 问题确定性 | 5 | `WeeklyReviewPanel` 在本地 fallback 时提示稍后同步，但保存结果快照按钮仍可点击，容易让用户误以为本地也能写服务端。 |
| 风险降低 | 4 | 禁用不可用状态可避免本地模式误触发保存失败；保存影响说明能避免把本地周复盘误报为服务端长期归因。 |
| 交互改善 | 5 | 按服务端状态显示 helper text，并用 `aria-describedby` 关联保存按钮。 |
| 可验证性 | 5 | 可通过 Review 页面测试覆盖本地模式 disabled 原因。 |
| 实现大小 | 5 | 改动集中在周复盘面板、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/review/components/WeeklyReviewPanel.tsx`
- `apps/react-web/src/test/ReviewPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ReviewPage.test.tsx`：PASS，3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。

限制：

- 本次只修复 React 复盘页的服务端快照入口状态，不改变 `/api/coach/outcomes` 服务端归因算法。
- 未做真实服务器写入 smoke；本轮以本地 fallback UI 状态和现有合同测试为主。

明日候选：

1. 检查本地复盘表单是否也需要更明确的空内容保存提示和编辑保存影响提示。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十三次主动迭代

主任务：补齐本地复盘表单的空内容 disabled 原因、新增保存影响和编辑覆盖提示。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 复盘表单会直接写入今日 Evidence Gate，用户需要在保存前知道空内容为什么不能保存、新增和编辑分别影响什么。 |
| 问题确定性 | 5 | `ReviewForm` 原本只在点击空表单后反馈“请至少填写”，保存按钮仍可点击；编辑态也只改标题，没有说明会覆盖已有本机复盘证据。 |
| 风险降低 | 4 | 禁用空表单可避免无效保存动作；编辑覆盖提示可降低用户误改已有复盘证据的风险。 |
| 交互改善 | 5 | 新增持续 helper text，并用 `aria-describedby` 关联保存按钮。 |
| 可验证性 | 5 | 可通过 Review 页面测试覆盖空复盘 disabled 原因、新增保存影响和编辑覆盖影响。 |
| 实现大小 | 5 | 改动集中在复盘页表单、一条页面测试和产品台账。 |

改动：

- `apps/react-web/src/features/review/ReviewPage.tsx`
- `apps/react-web/src/test/ReviewPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ReviewPage.test.tsx`：PASS，3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。

限制：

- 本次只修复 React 本地复盘表单状态，不改变服务端周结果归因、复盘 AI 分析算法或历史记录数据结构。
- 未做浏览器截图巡检；本轮以 React 行为测试和门禁验证为主。

明日候选：

1. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。
2. 检查复盘历史删除动作是否需要撤销或二次确认，避免误删本机证据。

## 2026-07-08 第十四次主动迭代

主任务：补齐复盘历史删除的二次确认和取消路径。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 复盘历史本机记录会进入今日 Evidence Gate，误删会直接影响复盘证据和后续建议。 |
| 问题确定性 | 5 | `LocalReviewRecords` 原本点击删除按钮就立即调用 `onDelete`，没有确认、取消或影响说明。 |
| 风险降低 | 5 | 二次确认能阻止误触；文案明确删除后会从今日 Evidence Gate 移除。 |
| 交互改善 | 5 | 删除流程从瞬时破坏改为可读、可取消、确认后执行，并保留 44px 以上触控目标和清晰焦点样式。 |
| 可验证性 | 5 | 可通过 Review 页面测试覆盖首次点击不删除、取消和确认后删除。 |
| 实现大小 | 4 | 为守住页面行数上限，先把复盘历史列表抽成独立组件，再补确认状态。 |

改动：

- `apps/react-web/src/features/review/ReviewPage.tsx`
- `apps/react-web/src/features/review/components/LocalReviewRecords.tsx`
- `apps/react-web/src/test/ReviewPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ReviewPage.test.tsx`：PASS，3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 复盘历史删除，不改变服务端周结果归因、Evidence Gate 数据结构或历史记录导出格式。
- 画像、邀请、机会、日程和账号类删除动作仍需继续按同一标准巡检。

明日候选：

1. 检查画像删除是否需要同口径二次确认、级联影响说明和读回验证。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十五次主动迭代

主任务：补齐求职画像删除的级联影响确认和取消路径。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 画像是 AI 教练上下文根节点，删除后会影响知识边界、个人日程和 AI 建议，误删成本高。 |
| 问题确定性 | 5 | `ProfilePanel` 原本点击“删除此画像”后依赖浏览器原生 `window.confirm`，缺少产品内一致的影响说明、取消状态和可测试 UI。 |
| 风险降低 | 5 | 面板内确认区让首次点击只解释影响，不删除；用户可取消，确认后才执行级联清理。 |
| 交互改善 | 5 | 确认区保留 44px 以上触控目标、语义危险色、`aria-live` 和明确按钮标签，Web 与 Android WebView 表现一致。 |
| 可验证性 | 5 | 可通过 Coach 页面测试覆盖首次点击不删除、取消和确认后删除，并读回画像为空。 |
| 实现大小 | 4 | 改动集中在画像面板、删除 handler 和一条页面测试。 |

改动：

- `apps/react-web/src/features/coach/components/ProfilePanel.tsx`
- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- CoachPage.test.tsx`：PASS，4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，31 个测试文件、100 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 求职画像删除，不改变 `deleteUserProfile` 的级联清理规则或服务端数据结构。
- 知识边界、日程、邀请记录、机会记录和账号类破坏性操作仍需继续按同一标准巡检。

明日候选：

1. 检查知识边界和个人日程删除是否需要同口径二次确认、影响说明和读回验证。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十六次主动迭代

主任务：补齐知识边界和个人日程删除的二次确认、取消路径和影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 知识边界会影响后续 AI 建议、知识卡和面试训练；个人日程会进入今日页行动。误删会让用户的执行闭环断掉。 |
| 问题确定性 | 5 | `BoundaryPanel` 和 `SchedulePanel` 原本点击垃圾桶就直接调用删除回调，没有确认、取消或影响说明。 |
| 风险降低 | 5 | 首次点击只展开确认区，确认前 store 数量不变；取消后收起，确认后才真正删除。 |
| 交互改善 | 5 | 确认区使用产品内语义危险色、`aria-live`、明确按钮标签和 44px 以上触控目标，Web 与 Android WebView 行为一致。 |
| 可验证性 | 5 | `CoachPage.test.tsx` 覆盖知识边界和日程的首次点击不删除、取消不删除、确认后删除。 |
| 实现大小 | 4 | 改动集中在两个 Coach 子面板和一条页面测试，不改变 store 删除规则。 |

改动：

- `apps/react-web/src/features/coach/components/BoundaryPanel.tsx`
- `apps/react-web/src/features/coach/components/SchedulePanel.tsx`
- `apps/react-web/src/test/CoachDestructiveActions.test.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- CoachPage.test.tsx CoachDestructiveActions.test.tsx`：PASS，2 个测试文件、5 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。

限制：

- 本次只修复 React 知识边界和个人日程删除，不改变 `deleteKnowledgeBoundary`、`deleteCoachScheduleEvent` 的 store 清理规则或服务端数据结构。
- 邀请记录、机会记录和账号类破坏性操作仍需继续按同一标准巡检。

明日候选：

1. 检查机会记录删除是否需要同口径二次确认、影响说明和读回验证。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页信息拥挤。

## 2026-07-08 第十七次主动迭代

主任务：补齐机会记录删除的二次确认、取消路径和影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 机会记录会进入今日 Evidence Gate，也会成为 AI 教练的机会/JD 信号；误删会影响后续知识卡、日程建议和候选题上下文。 |
| 问题确定性 | 5 | `ApplicationsPage` 原本点击“删除机会记录”就直接调用 `deleteEvidence`，没有确认、取消或影响说明。 |
| 风险降低 | 5 | 首次点击只展开确认区，确认前记录数量不变；取消后收起，确认后才真正删除。 |
| 交互改善 | 5 | 确认区使用产品内语义危险色、`aria-live`、明确按钮标签和 44px 以上确认/取消触控目标。 |
| 可验证性 | 5 | `ApplicationsPage.test.tsx` 覆盖首次点击不删除、取消不删除、确认后删除，并继续验证导出数量。 |
| 实现大小 | 4 | 改动集中在机会记录列表和一条页面测试，不改变 Evidence Gate 数据结构。 |

改动：

- `apps/react-web/src/features/applications/ApplicationsPage.tsx`
- `apps/react-web/src/test/ApplicationsPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ApplicationsPage.test.tsx`：首次断言过宽导致 FAIL；收窄断言后 PASS，1 个测试文件、4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，32 个测试文件、101 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 机会记录删除，不改变 `deleteEvidence` 的 store 清理规则、服务端机会接口或 AI 机会/JD 信号生成算法。
- 邀请记录和账号类破坏性操作仍需继续按同一标准巡检。

明日候选：

1. 检查邀请记录删除是否需要同口径二次确认、影响说明和读回验证。
2. 检查账号禁用、恢复、删除和批量账号动作是否需要更强确认、撤销或独立管理页。

## 2026-07-08 第十八次主动迭代

主任务：把本轮问题驱动修复工作流沉淀成可复用需求开发模板。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户要求后续需求开发能复用本轮“产品问题 -> 排查 -> 修复 -> 验证 -> 复盘”的完整路径，降低每次重新组织需求的成本。 |
| 问题确定性 | 5 | `requirement-development-template.md` 已有阶段清单，但缺少更适合复制使用的标准需求卡、问题归类和本轮 8 类问题继承规则。 |
| 风险降低 | 4 | 模板把数据隔离、权限误露、统计归属、破坏性操作和完成口径提前列为必填项，可减少后续虚假完成或范围漂移。 |
| 交互改善 | 3 | 本次不直接改 UI，但把创建/编辑、删除确认、长列表、统计集中和管理员入口分层固化为后续 UI 必检项。 |
| 可验证性 | 4 | 可通过产品迭代文档门禁、文档 diff 检查和敏感扫描验证模板没有破坏现有 product-ops 体系。 |
| 实现大小 | 5 | 改动集中在 product-ops 文档，不触碰业务代码和运行数据。 |

改动：

- `docs/product/product-ops/requirement-development-template.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。

限制：

- 本次是工作流模板沉淀，不等于邀请记录、账号类动作或管理员详情页已经修复。
- 模板能降低后续需求遗漏风险，但每个新需求仍必须按影响范围跑实际代码、UI、服务端、Android 或远端验证。

明日候选：

1. 继续检查邀请记录删除是否需要同口径二次确认、影响说明和读回验证。
2. 检查账号禁用、恢复、删除和批量账号动作是否需要更强确认、撤销或独立管理页。

## 2026-07-08 第十九次主动迭代

主任务：补齐邀请记录删除的二次确认、取消路径和影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 邀请记录属于 owner 试用用户台账，误删会让管理员看板失去登记线索，也容易让人误以为登录账号已同步删除。 |
| 问题确定性 | 5 | `InviteManagementLedger` 原本点击“删除邀请记录”就直接调用删除回调，没有产品内确认、取消或影响说明。 |
| 风险降低 | 5 | 首次点击只展开确认区，确认前不会调用 `deleteCoachInvitation`；确认文案明确“已开通登录账号不会自动删除”。 |
| 交互改善 | 5 | 确认区使用语义危险色、可取消路径、44px 以上确认/取消触控目标、明确 `aria-label` 和展开状态。 |
| 可验证性 | 5 | `InviteManagementPanel.test.tsx` 覆盖首次点击不删除、取消不删除、确认后调用删除并显示成功反馈。 |
| 实现大小 | 4 | 改动集中在邀请台账组件和一条组件测试，不改变服务端删除合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementLedger.tsx`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementPanel.test.tsx`：PASS，1 个测试文件、4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，32 个测试文件、102 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 邀请记录删除确认，不改变 `/api/coach/invitations` DELETE 合同或 users file 登录账号生命周期。
- 登录账号禁用、恢复、删除和批量账号动作仍需继续按破坏性动作标准巡检。

明日候选：

1. 检查单个登录账号禁用、恢复、删除是否需要同口径二次确认、影响说明和读回验证。
2. 检查批量账号禁用、恢复、删除是否需要更强确认、撤销或独立管理页。

## 2026-07-08 第二十次主动迭代

主任务：补齐单个登录账号禁用、恢复、删除的二次确认、取消路径和影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 管理试用用户时，单个账号禁用、恢复、删除直接影响用户能否登录；误操作会造成真实访问中断。 |
| 问题确定性 | 5 | `InviteManagementLedger` 原本点击“禁用账号/恢复账号/删除登录账号”就直接调用账号动作回调，没有确认、取消或影响说明。 |
| 风险降低 | 5 | 首次点击只展开确认区，确认前不会调用 `updateCoachInvitationAccountStatus`；文案区分登录权限、数据域、邀请记录和历史求职数据的边界。 |
| 交互改善 | 5 | 禁用、恢复、删除各自有独立确认文案、取消路径、44px 以上确认/取消触控目标、明确 `aria-label` 和展开状态。 |
| 可验证性 | 5 | `InviteManagementPanel.test.tsx` 覆盖禁用、恢复、删除三类单账号动作的首次点击不执行、取消不执行和确认后执行。 |
| 实现大小 | 4 | 改动集中在邀请台账组件和一条组件测试，不改变服务端 users file 账号生命周期合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementLedger.tsx`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementPanel.test.tsx`：PASS，1 个测试文件、5 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration`：PASS，检查 9 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，32 个测试文件、103 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 单账号动作确认，不改变 `/api/coach/invitations` 的 `account-status` 服务端合同或远端 users file 行为。
- 批量账号禁用、恢复、删除仍需继续按破坏性动作标准巡检。

明日候选：

1. 检查批量账号禁用、恢复、删除是否需要更强确认、取消和读回验证。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页拥挤。

## 2026-07-08 第二十一次主动迭代

主任务：把需求开发复用模板纳入产品迭代门禁。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户明确要求把整个工作流沉淀成可复用模板，模板如果只存在于文档里，后续容易被删改或绕过。 |
| 问题确定性 | 5 | `validate_product_iteration_workflow.js` 已校验 product ledger、known issues 和 doc rules，但未校验 `requirement-development-template.md`。 |
| 风险降低 | 4 | 门禁锁定复制入口、标准需求卡、数据隔离、UI/UX、分层验收和最终报告模板，能减少后续需求重新漂移。 |
| 交互改善 | 3 | 本轮不改页面，但把创建/编辑、破坏性动作、统计归属和权限分层固化为后续 UI 必检项。 |
| 可验证性 | 5 | 新增专项目测覆盖“缺模板关键章节时门禁失败”，并让当前仓库门禁检查 10 份产品文档。 |
| 实现大小 | 5 | 改动集中在产品门禁、门禁测试和 product-ops 账本，不触碰业务代码或运行数据。 |

改动：

- `tools/validate_product_iteration_workflow.js`
- `tests/product_iteration_workflow_test.js`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `node tests/product_iteration_workflow_test.js`：PASS，8 项通过。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `git diff --check`：PASS。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；React 32 个测试文件、103 个测试通过，产品迭代门禁检查 10 份产品文档。

限制：

- 本轮是流程模板和门禁固化，不等于批量账号动作、owner 管理详情页或 Android 远端 HTTPS 已完成。
- 后续每个新需求仍必须按影响范围跑对应的 React、Node、Rust、Android、远端或 release 验证，不能只引用模板宣称完成。

明日候选：

1. 检查批量账号禁用、恢复、删除是否需要更强确认、取消和读回验证。
2. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页拥挤。

## 2026-07-08 第二十二次主动迭代

主任务：补齐批量账号禁用、恢复、删除的二次确认、取消路径和影响说明。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 对一个批次做账号禁用、恢复或删除时，会同时影响多个试用用户登录；误操作比单账号动作影响更大。 |
| 问题确定性 | 5 | `InviteManagementPanel` 原本点击“批量更新账号状态”会直接调用 `updateCoachInvitationBatchAccountStatus`，没有确认、取消或影响说明。 |
| 风险降低 | 5 | 首次点击只展开确认区，确认前不会调用批量账号接口；文案明确批次、账号数、登录权限影响和数据域/邀请记录/历史数据保留边界。 |
| 交互改善 | 5 | 批量禁用、恢复、删除复用同一确认区，切换批次或动作会清空确认态；确认/取消按钮均满足 44px 以上触控目标和明确 `aria-label`。 |
| 可验证性 | 5 | 新增 `InviteManagementBatchAccountActions.test.tsx` 覆盖删除文案、取消不调用、禁用文案和确认后调用批量账号接口。 |
| 实现大小 | 4 | 改动集中在邀请账号管理面板、批量文案 helper、focused React 测试和 product-ops 继承记录，不改变服务端合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementBatchActions.ts`
- `apps/react-web/src/test/InviteManagementBatchAccountActions.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementBatchAccountActions.test.tsx InviteManagementPanel.test.tsx`：PASS，2 个测试文件、6 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。
- `npm --prefix apps/react-web test`：PASS，33 个测试文件、104 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本次只修复 React 批量账号动作确认，不改变 `/api/coach/invitations` 的 `account-batch-status` 服务端合同或远端 users file 行为。
- 仍未补撤销 toast、独立 owner 管理详情页或更完整用户管理后台。

明日候选：

1. 检查 owner 管理动作是否需要独立详情页，减少管理员中心单页拥挤。
2. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。

## 2026-07-08 第二十三次主动迭代

主任务：把管理员中心拆成建档看板和账号管理两个 owner 工作区。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户明确反馈邀请用户不应在画像模块，更多/管理能力不应污染普通用户路径；owner 需要看首登风险，也需要处理账号生命周期，但二者不是同一件事。 |
| 问题确定性 | 5 | `AdminPage` 已承接 owner-only 入口，但首登报表和邀请账号管理如果继续堆在同一长页，会复发“管理员后台塞进用户路径”的信息架构问题。 |
| 风险降低 | 4 | 工作区分离后，普通用户仍由路由守卫回到 More；owner 默认先看建档看板，账号禁用、恢复、删除等高风险动作只在显式切到账号管理后出现。 |
| 交互改善 | 5 | 新增 `tablist/tab/tabpanel` 语义、44px 以上触控高度和两个明确任务描述，减少长页滚动和误触风险。 |
| 可验证性 | 5 | 新增 `AdminPage.test.tsx` 覆盖 owner tab 切换、面板互斥和默认工作区；既有导航测试覆盖非 owner 直达 `/admin` 不进入管理员中心。 |
| 实现大小 | 4 | 改动集中在 Admin 页、focused React 测试和 product-ops 继承记录，不改变 Node/Rust 账号合同。 |

改动：

- `apps/react-web/src/features/admin/AdminPage.tsx`
- `apps/react-web/src/test/AdminPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- AdminPage.test.tsx navigationRoutes.test.tsx MorePage.test.tsx CoachPage.test.tsx`：PASS，4 个测试文件、12 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `git diff --check`：PASS。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，34 个测试文件、105 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只完成 owner 管理中心的信息架构分区，不等于完整用户管理后台、账号详情页或外部 SMTP/IM 自动发送已完成。
- 本轮不改变 `/api/coach/invitations`、users file 或远端账号生命周期合同。

明日候选：

1. 检查账号管理是否需要搜索、筛选和账号详情页，继续降低 owner 长列表压力。
2. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。

## 2026-07-08 第二十四次主动迭代

主任务：给账号管理台账补搜索筛选，并把筛选控件从大面板中拆出。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 找试用用户时更常按登录名、显示名、数据域、岗位或备注查找，而不是只按批次翻长列表。 |
| 问题确定性 | 5 | `InviteManagementPanel` 只有批次筛选和“查看全部/收起”，上轮日志已把账号管理搜索、筛选、详情页列为下一步；新增搜索前还触发了组件行数接近上限的维护压力。 |
| 风险降低 | 4 | 搜索结果会同时约束邀请记录、登录账号、批量账号动作和通知生成范围，避免 owner 以为只看到了某些账号却实际批量操作整批。 |
| 交互改善 | 5 | 搜索输入有可见 label、helper 文案和清空动作；无需展开长列表即可定位第 9 条邀请或第 7 个账号。 |
| 可验证性 | 5 | `InviteManagementPanel.test.tsx` 覆盖搜索、清空、折叠恢复，并和既有删除/账号状态确认测试同跑。 |
| 实现大小 | 4 | 改动集中在 React 账号管理面板、筛选组件、focused 测试和 product-ops 记录，不改变服务端合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementFilters.tsx`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementPanel.test.tsx InviteManagementBatchAccountActions.test.tsx AdminPage.test.tsx`：PASS，3 个测试文件、8 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 当前 533 行，低于 560 行门禁。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，34 个测试文件、106 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只做 React 本地搜索筛选和组件拆分，不新增服务端搜索接口。
- 本轮不等于账号详情页、外部 SMTP/IM 自动发送或完整用户管理后台完成。

明日候选：

1. 检查账号管理是否需要账号详情页或右侧详情抽屉，承接单账号风险、最近动作和首登状态。
2. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。

## 2026-07-08 第二十五次主动迭代

主任务：给账号管理补轻量详情面板，承接单账号和邀请记录上下文。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 搜到账号后需要马上判断登录状态、数据域、批次、岗位和备注，而不是只看到长列表或被动填入编辑表单。 |
| 问题确定性 | 5 | 上轮已完成搜索筛选，但“点选行后发生了什么”仍不够明确，详情上下文缺口会继续放大账号管理的误操作风险。 |
| 风险降低 | 4 | 只读详情面板把账号/邀请记录区别、登录能力和数据域边界显性化，降低把邀请登记、登录账号和编辑保存混在一起的风险。 |
| 交互改善 | 5 | 右侧新增空状态、详情 region、关闭动作和 44px 以上触控按钮；点击账号或邀请记录后，详情面板与左侧编辑表单同步变化。 |
| 可验证性 | 5 | 新增独立 `InviteManagementDetailPanel.test.tsx`，覆盖空状态、选中账号、选中邀请和关闭详情；主测试文件保持行数预算内。 |
| 实现大小 | 4 | 改动集中在 React owner 账号管理 UI、focused 测试和 product-ops 记录，不改变服务端合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `apps/react-web/src/test/InviteManagementPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementDetailPanel.test.tsx InviteManagementPanel.test.tsx InviteManagementBatchAccountActions.test.tsx AdminPage.test.tsx`：PASS，4 个测试文件、9 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.test.tsx` 336 行、`InviteManagementDetailPanel.test.tsx` 91 行，均低于门禁预算。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只完成轻量右侧详情面板，不新增服务端账号详情接口、最近动作时间线或独立用户管理后台。
- 详情面板展示的是当前台账返回字段，不等于完整审计日志或组织级用户管理能力。

明日候选：

1. 检查账号详情是否需要最近动作时间线或首登风险摘要，避免详情面板继续堆字段。
2. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。

## 2026-07-08 第二十六次主动迭代

主任务：给账号详情补首登状态摘要，承接风险、放弃点和下一步。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 点进账号后最需要知道试用用户是否完成首登、卡在哪里、风险多高和下一步做什么，而不是只看到登录字段。 |
| 问题确定性 | 5 | 第二十五次迭代已补轻量详情面板，但明日候选明确指出仍缺最近动作时间线或首登风险摘要；现有 `AdminPage` 已加载首登报表，数据可以复用。 |
| 风险降低 | 4 | 首登状态、完成率、风险和放弃点进入详情后，owner 不会把“暂无观察数据”误判为“用户已完成建档”，也不会把账号字段当成运营结论。 |
| 交互改善 | 5 | 详情面板新增紧凑首登摘要、风险 chip、放弃点/下一步卡片和无匹配空状态，让点选账号后的下一步更明确。 |
| 可验证性 | 5 | `InviteManagementDetailPanel.test.tsx` 覆盖匹配到首登摘要和无匹配 fallback；`AdminPage` 复用既有 owner 首登报表传入账号管理。 |
| 实现大小 | 4 | 改动集中在 React owner 账号管理 UI、一个匹配 helper、focused 测试和 product-ops 记录，不改变 Node/Rust 服务端合同。 |

改动：

- `apps/react-web/src/features/admin/AdminPage.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementOnboarding.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementDetailPanel.test.tsx InviteManagementPanel.test.tsx AdminPage.test.tsx InviteOnboardingReportPanel.test.tsx`：PASS，4 个测试文件、9 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 550 行，仍低于 560 行门禁。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `npm test`：PASS；保留既有 Android functional evidence warning。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。

限制：

- 本轮只复用当前 `onboardingReport`，不新增服务端账号详情接口、最近动作时间线或独立用户管理后台。
- 没有匹配到首登用户时展示可恢复空状态；这不代表用户没有风险，只代表当前报表没有该账号的服务端观察。

明日候选：

1. 检查账号详情是否需要最近动作时间线，承接开通、重置、禁用、恢复、删除和邀请通知生成等关键操作。
2. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。

## 2026-07-08 第二十七次主动迭代

主任务：给账号详情补可证明最近动态，避免把字段详情误当审计日志。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 点进账号后需要快速判断最近发生了什么：是否有首登观察、邀请记录何时登记/更新、当前账号是否可登录。 |
| 问题确定性 | 5 | 第二十六次迭代把首登摘要接进详情，但明日候选仍指出缺最近动作时间线；当前邀请台账和首登报表已有 `createdAt`、`updatedAt`、`latestEvent` 和登录状态可复用。 |
| 风险降低 | 4 | 时间线明确“仅展示当前台账和首登报表可证明的记录”，避免前端伪造开通、重置、禁用、恢复或删除时间，防止把局部 UI 当完整审计。 |
| 交互改善 | 5 | 详情面板新增最近动态区，把首登观察、账号当前状态、归属批次、邀请登记、邀请更新和运营备注组织成可扫读列表。 |
| 可验证性 | 5 | `InviteManagementDetailPanel.test.tsx` 覆盖账号和邀请记录两类详情的时间线条目，focused React 测试、typecheck 和架构门禁可直接验证。 |
| 实现大小 | 4 | 改动集中在一个 timeline helper、详情组件、focused 测试和 product-ops 记录，不改变 Node/Rust 服务端合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementTimeline.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- InviteManagementDetailPanel.test.tsx InviteManagementPanel.test.tsx AdminPage.test.tsx InviteOnboardingReportPanel.test.tsx`：PASS，4 个测试文件、9 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 550 行，仍低于 560 行门禁。

限制：

- 本轮只展示已有台账和首登报表能证明的最近动态，不新增服务端账号审计表。
- 登录账号开通、重置、禁用、恢复、删除和邀请通知生成的历史时间仍缺服务端审计日志，不能在 UI 中伪造。

明日候选：

1. 检查破坏性动作是否需要统一撤销 toast 或短时恢复入口。
2. 检查完整账号审计日志是否值得进入服务端合同，而不是继续在前端推导。

## 2026-07-08 第二十八次主动迭代

主任务：给本机复盘证据删除补短时撤销恢复。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 复盘证据直接影响今日 Evidence Gate、AI 复盘建议和周复盘归因；误删后如果只能重新填写，会打断用户的每日记录连续性。 |
| 问题确定性 | 5 | 第二十七次迭代的明日候选明确提出要检查破坏性动作是否需要撤销；`LocalReviewRecords` 已有二次确认，但确认删除后只给“已删除”反馈，没有恢复路径。 |
| 风险降低 | 4 | 撤销仅恢复本地 Evidence 原记录，不触碰服务端账号、邀请或权限动作，避免把账号删除这类需要审计日志的动作伪装成可撤销。 |
| 交互改善 | 5 | 删除后在复盘历史顶部出现 `aria-live` 恢复提示，提供“撤销删除”和“不撤销”两个清晰路径，符合破坏性动作 undo-support 规则。 |
| 可验证性 | 5 | `ReviewPage.test.tsx` 覆盖删除后列表按钮消失、恢复提示出现、点击撤销后原记录回到 Evidence Gate。 |
| 实现大小 | 4 | 改动集中在 Zustand store、复盘页、复盘历史组件、单个页面测试和 product-ops 记录，不改变 Node/Rust/Android 合同。 |

改动：

- `apps/react-web/src/stores/sprintStoreTypes.ts`
- `apps/react-web/src/stores/sprintStore.ts`
- `apps/react-web/src/features/review/ReviewPage.tsx`
- `apps/react-web/src/features/review/components/LocalReviewRecords.tsx`
- `apps/react-web/src/test/ReviewPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ReviewPage.test.tsx`：PASS，1 个测试文件、3 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；保留既有 Android functional evidence warning。

限制：

- 本轮只覆盖本地可恢复的复盘证据删除，不覆盖机会记录、知识边界、个人日程、画像、邀请记录或登录账号动作。
- 账号禁用、恢复、删除和邀请记录删除涉及服务端状态、权限和审计，不能直接套用本机撤销，需要先补完整审计日志和恢复规则。

明日候选：

1. 把撤销恢复范式推广到机会记录、知识边界或个人日程这类本地可恢复对象。
2. 评估完整服务端账号审计日志是否进入 Node/Rust 合同，承接账号开通、重置、禁用、恢复、删除和邀请通知生成历史。

## 2026-07-08 第二十九次主动迭代

主任务：给机会记录删除补短时撤销恢复。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 机会记录保存公司、岗位、JD 关键词、沟通反馈和下一步动作，会直接影响当前求职推进和 AI 教练的机会/JD 信号。 |
| 问题确定性 | 5 | 第二十八次迭代已把本地复盘证据删除升级为撤销模式，并把机会记录列为明日候选；`ApplicationsPage` 原本只有二次确认，确认删除后没有恢复路径。 |
| 风险降低 | 4 | 撤销仅恢复本地 `delivery_record` Evidence 原记录，不触碰服务端账号、邀请或权限动作，避免把需要审计日志的动作伪装成可撤销。 |
| 交互改善 | 5 | 删除后在机会反馈顶部出现 `aria-live` 恢复提示，提供“撤销删除”和“不撤销”两个清晰路径，误删后不需要重新填写公司、岗位和沟通反馈。 |
| 可验证性 | 5 | `ApplicationsPage.test.tsx` 覆盖删除后列表按钮消失、恢复提示出现、点击撤销后原记录回到 Evidence Gate 并进入导出。 |
| 实现大小 | 4 | 改动集中在机会页、机会页测试和 product-ops 记录，复用既有 `restoreEvidence`，不改变 Node/Rust/Android 合同。 |

改动：

- `apps/react-web/src/features/applications/ApplicationsPage.tsx`
- `apps/react-web/src/test/ApplicationsPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- ApplicationsPage.test.tsx`：PASS，1 个测试文件、4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只覆盖本地可恢复的机会 Evidence 删除，不覆盖知识边界、个人日程、画像、邀请记录或登录账号动作。
- 账号禁用、恢复、删除和邀请记录删除涉及服务端状态、权限和审计，不能直接套用本机撤销，需要先补完整审计日志和恢复规则。

明日候选：

1. 把撤销恢复范式推广到知识边界或个人日程这类本地可恢复对象。
2. 评估完整服务端账号审计日志是否进入 Node/Rust 合同，承接账号开通、重置、禁用、恢复、删除和邀请通知生成历史。

## 2026-07-08 第三十次主动迭代

主任务：给知识边界删除补短时撤销恢复。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 知识边界是 AI 教练上下文骨架，影响 AI 建议、知识卡、面试训练和候选题；误删会让个性化建议突然退化。 |
| 问题确定性 | 5 | 第二十九次迭代已把机会记录删除升级为撤销模式，并把知识边界/个人日程列为明日候选；`BoundaryPanel` 原本只有二次确认，确认删除后没有恢复路径。 |
| 风险降低 | 4 | 撤销仅恢复仍有归属画像的本地 `KnowledgeBoundary` 原记录，保留来源摘要、置信度、provider、prompt version 和输入 hash，不触碰账号、邀请或权限动作。 |
| 交互改善 | 5 | 删除后在知识边界顶部出现 `aria-live` 恢复提示，提供“撤销删除”和“不撤销”两个清晰路径，误删后不需要重新填写主题、缺口和岗位用途。 |
| 可验证性 | 5 | `CoachDestructiveActions.test.tsx` 覆盖删除后列表按钮消失、恢复提示出现、点击撤销后原边界回到 store 和界面。 |
| 实现大小 | 4 | 改动集中在 Zustand store、Coach 页、BoundaryPanel、focused 测试和 product-ops 记录，不改变 Node/Rust/Android 合同。 |

改动：

- `apps/react-web/src/stores/sprintStoreTypes.ts`
- `apps/react-web/src/stores/sprintStore.ts`
- `apps/react-web/src/stores/sprintCoachActions.ts`
- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/features/coach/components/BoundaryPanel.tsx`
- `apps/react-web/src/test/CoachDestructiveActions.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- CoachDestructiveActions.test.tsx CoachPage.test.tsx`：PASS，2 个测试文件、5 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只覆盖仍有归属画像的本地知识边界删除，不覆盖个人日程、画像、邀请记录或登录账号动作。
- 画像删除会级联删除知识边界、日程和 AI 建议，不能用单条边界撤销直接恢复；账号禁用、恢复、删除和邀请记录删除仍需要完整审计日志和恢复规则。

明日候选：

1. 把撤销恢复范式推广到个人日程这类本地可恢复对象。
2. 评估完整服务端账号审计日志是否进入 Node/Rust 合同，承接账号开通、重置、禁用、恢复、删除和邀请通知生成历史。

## 2026-07-08 第三十一次主动迭代

主任务：给个人日程删除补短时撤销恢复。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 个人日程会进入今日页行动，也是 AI 草稿被采纳后能否完成的执行锚点；误删后如果只能重建，会丢失时间段、类型、原因和 AI 草稿来源。 |
| 问题确定性 | 5 | 第三十次迭代已把知识边界删除升级为撤销模式，并把个人日程列为明日候选；`SchedulePanel` 原本只有二次确认，确认删除后没有恢复路径。 |
| 风险降低 | 4 | 撤销仅恢复仍有归属画像的本地 `CoachScheduleEvent` 原记录，保留 `acceptedFromArtifactId`、日期、时间、类型、原因和证据要求，不触碰账号、邀请或权限动作。 |
| 交互改善 | 5 | 删除后在我的日程顶部出现 `aria-live` 恢复提示，提供“撤销删除”和“不撤销”两个清晰路径，误删后不需要重新填写日程。 |
| 可验证性 | 5 | `CoachDestructiveActions.test.tsx` 覆盖删除后列表按钮消失、恢复提示出现、点击撤销后原日程回到 store 和界面；`TodayPage.test.tsx` 防止今日行动合成回归。 |
| 实现大小 | 4 | 改动集中在 Zustand store、Coach 页、SchedulePanel、focused 测试和 product-ops 记录，不改变 Node/Rust/Android 合同。 |

改动：

- `apps/react-web/src/stores/sprintStoreTypes.ts`
- `apps/react-web/src/stores/sprintStore.ts`
- `apps/react-web/src/stores/sprintCoachActions.ts`
- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/features/coach/components/SchedulePanel.tsx`
- `apps/react-web/src/test/CoachDestructiveActions.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- CoachDestructiveActions.test.tsx CoachPage.test.tsx TodayPage.test.tsx`：PASS，3 个测试文件、8 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、107 个测试通过。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只覆盖仍有归属画像的本地个人日程删除，不覆盖画像整包删除、邀请记录或登录账号动作。
- 画像删除会级联删除知识边界、日程和 AI 建议，不能用单条日程撤销直接恢复；账号禁用、恢复、删除和邀请记录删除仍需要完整审计日志和恢复规则。

明日候选：

1. 评估画像删除是否需要整包恢复快照，承接知识边界、个人日程、AI 建议和候选反馈的级联恢复。
2. 评估完整服务端账号审计日志是否进入 Node/Rust 合同，承接账号开通、重置、禁用、恢复、删除和邀请通知生成历史。

## 2026-07-08 第三十二次主动迭代

主任务：给求职画像删除补整包撤销恢复。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 画像是 AI 教练上下文根节点，误删后会同时丢失知识边界、日程、AI 建议、运行记录和候选反馈；只提示“级联清理”仍会让用户害怕误操作。 |
| 问题确定性 | 5 | 第三十一次迭代已把个人日程删除升级为撤销模式，并把画像整包恢复列为明日候选；`deleteUserProfile` 确实会级联清理多个 store 切片。 |
| 风险降低 | 5 | 恢复包在删除前从当前本地 store 截取，只恢复原画像 ID 未被占用的本地对象；账号、邀请和权限动作继续排除在前端快照撤销之外。 |
| 交互改善 | 5 | 删除后在求职画像面板顶部出现 `aria-live` 恢复提示，清楚列出可恢复的画像本身、知识边界、个人日程、AI 建议、AI 运行记录和候选反馈。 |
| 可验证性 | 5 | `CoachDestructiveActions.test.tsx` 构造完整画像包，覆盖删除后六类数据清空、撤销后六类数据恢复和今日页行动重建；`CoachPage.test.tsx` 覆盖新确认文案。 |
| 实现大小 | 4 | 改动集中在 Zustand store、Coach 页、ProfilePanel、focused 测试和 product-ops 记录，不改变 Node/Rust/Android 合同。 |

改动：

- `apps/react-web/src/stores/sprintStoreTypes.ts`
- `apps/react-web/src/stores/sprintStore.ts`
- `apps/react-web/src/stores/sprintCoachActions.ts`
- `apps/react-web/src/features/coach/CoachPage.tsx`
- `apps/react-web/src/features/coach/components/ProfilePanel.tsx`
- `apps/react-web/src/test/CoachDestructiveActions.test.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- CoachDestructiveActions.test.tsx CoachPage.test.tsx TodayPage.test.tsx`：PASS，3 个测试文件、9 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、108 个测试通过。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`CoachPage.tsx` 抽出 `useProfileRecovery` 后回到 559 行，低于 560 行门禁。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只覆盖本地求职画像快照恢复，不覆盖邀请记录删除、登录账号禁用/恢复/删除或服务端 users file 的历史审计。
- 若用户在删除后先新建了同 ID 画像，恢复包会拒绝覆盖，避免前端误合并两个画像上下文。

明日候选：

1. 评估完整服务端账号审计日志是否进入 Node/Rust 合同，承接账号开通、重置、禁用、恢复、删除和邀请通知生成历史。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-08 第三十三次主动迭代

主任务：给账号生命周期补服务端审计账本。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 管理试用账号时，需要知道谁开通、重置、禁用、恢复、删除或批量处理了账号，不能只看当前 users file 状态。 |
| 问题确定性 | 5 | 第三十二次迭代已把完整服务端账号审计日志列为明日候选；现有 Node/Rust 动作只返回本次 action，没有持久历史。 |
| 风险降低 | 5 | 审计事件只记录动作、操作者、账号、批次、影响数量和跳过原因，不记录密码、hash 或 session；后续恢复规则可基于真实历史设计。 |
| 交互改善 | 4 | React 账号详情最近动态优先展示服务端审计，再 fallback 到首登和台账状态，owner 不必从当前状态倒推历史。 |
| 可验证性 | 5 | Node 合同、Rust runtime contract、React 详情测试和架构门禁均可当天验证。 |
| 实现大小 | 4 | 改动集中在账号生命周期 helper、邀请接口 response、React 详情时间线和 product-ops 文档；没有引入新存储服务。 |

改动：

- `apps/server/auth_account_audit_store.js`
- `apps/server/auth_account_store.js`
- `apps/server/auth_account_batch_store.js`
- `apps/server/coach_invitations_routes.js`
- `apps/rust-api/src/auth_account_audit.rs`
- `apps/rust-api/src/auth_account_users_file.rs`
- `apps/rust-api/src/auth_account_store.rs`
- `apps/rust-api/src/auth_account_actions.rs`
- `apps/rust-api/src/auth_account_batch_actions.rs`
- `apps/rust-api/src/coach_invitation_routes.rs`
- `apps/rust-api/src/coach_invitation_action_routes.rs`
- `apps/rust-api/src/auth_state.rs`
- `apps/rust-api/src/lib.rs`
- `apps/rust-api/tests/runtime_contract/invitation_account.rs`
- `apps/react-web/src/api/coachInvitationClient.ts`
- `apps/react-web/src/api/coachInvitationExport.ts`
- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementTimeline.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `tests/invitation_account_provisioning_test.js`
- `docs/core/04-acceptance-and-risk.md`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `node --check apps/server/auth_account_audit_store.js && node --check apps/server/auth_account_store.js && node --check apps/server/auth_account_batch_store.js && node --check apps/server/coach_invitations_routes.js && node tests/invitation_account_provisioning_test.js && node tests/architecture_quality_test.js`：PASS。
- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx src/test/coachInvitationClient.test.ts`：PASS，2 个测试文件、6 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `cargo check`：PASS，无 warning。
- `cargo test --test runtime_contract runtime_contract_matches_node_core_api -- --nocapture`：PASS。

限制：

- 审计账本只覆盖 users-file 模式下成功的账号生命周期动作；`JOB_SPRINT_USERS_JSON` 模式仍禁用页面开通。
- 本轮没有做独立账号详情页、审计筛选后台、账号恢复规则或外部 SMTP/IM 自动发送。
- 远端 users-file evidence 仍是上一轮 smoke；本轮新增合同尚未同步服务器并跑远端账号审计 evidence。

明日候选：

1. 把账号详情页从轻量面板升级为可筛选审计历史和恢复规则设计稿。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-08 第三十四次主动迭代

主任务：把账号详情最近动态升级为可筛选审计历史和恢复规则提示。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 处理试用账号时，需要快速区分开通/重置、禁用/恢复、删除/清理和批量动作，不能从混排最近动态里猜当前账号经历。 |
| 问题确定性 | 5 | 第三十三次迭代已把账号审计账本落到 Node/Rust/React，并把“可筛选审计历史和恢复规则”列为下一候选。 |
| 风险降低 | 5 | 筛选 helper 只匹配当前登录名或受影响用户名，测试加入其他用户噪音事件，防止账号详情显示别人的审计内容。 |
| 交互改善 | 4 | 详情面板新增审计类型筛选、匹配计数和恢复规则提示，owner 可在同一上下文里判断下一步是恢复、重置还是重新开通。 |
| 可验证性 | 5 | React 详情测试覆盖多动作审计、其他用户隔离、删除筛选和删除恢复规则；类型检查和产品门禁可当天验证。 |
| 实现大小 | 4 | 改动集中在账号详情面板、timeline helper、focused 测试和 product-ops 文档，不改 Node/Rust 存储合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementTimeline.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx`：PASS，1 个测试文件、1 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只做 React 账号详情面板内的审计筛选和恢复规则提示，没有新增独立账号详情页或服务端审计专页。
- 恢复规则目前是操作边界说明，不是自动恢复动作；真实恢复仍要通过已有禁用/恢复、重置密码或重新开通链路执行。
- 本轮没有同步服务器或刷新远端 users-file 审计 evidence。

明日候选：

1. 把账号详情抽成独立详情页或抽屉，支持更完整的审计列表、搜索和账号恢复动作编排。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-08 第三十五次主动迭代

主任务：让账号详情从审计查看推进到下一步账号处理。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 查到账号审计后，下一步通常就是禁用、恢复、删除或重置；如果还要回长列表找同一账号，会增加误操作和管理成本。 |
| 问题确定性 | 5 | 第三十四次迭代已经补了审计筛选和恢复规则，但仍只是在“看历史”，没有把详情里的证据和可执行动作串起来。 |
| 风险降低 | 5 | 本轮只复用既有 `updateCoachInvitationAccountStatus`，不新增后端权限面；详情动作仍要先展开确认文案，确认后才调用 API。 |
| 交互改善 | 5 | 审计区新增搜索、展开全部和无结果提示；账号详情新增“账号下一步”，让 owner 在同一上下文完成证据查看和处理动作。 |
| 可验证性 | 5 | `InviteManagementDetailPanel.test.tsx` 覆盖展开全部审计、搜索审计、其他用户审计隔离，以及详情内禁用动作确认后才调用 API。 |
| 实现大小 | 4 | 改动集中在 React 详情面板、timeline helper、父组件传参、focused 测试和 product-ops 文档；没有改 Node/Rust 合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementTimeline.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx`：PASS，1 个测试文件、1 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮没有新增独立账号详情页、服务端审计专页、外部 SMTP/IM 自动发送或公开注册/组织租户。
- 详情内只编排单账号禁用/恢复/删除；开通或重置仍走既有邀请表单的密码输入和保存链路。
- 本轮没有同步服务器或刷新远端 users-file 审计 evidence。

明日候选：

1. 把开通/重置密码也纳入账号详情的“下一步”引导，但仍必须明确需要 owner 输入新密码且不回显旧密码。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-08 第三十六次主动迭代

主任务：把开通/重置密码纳入账号详情下一步引导。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 在账号详情里看到审计和恢复规则后，最常见的下一步之一是开通或重置密码；如果仍要回左侧表单手动找用户，会增加二次定位和误填风险。 |
| 问题确定性 | 5 | 第三十五次迭代已把该项列为明日候选，且现有详情只支持禁用、恢复和删除，不支持切到开通/重置模式。 |
| 风险降低 | 5 | 密码不能回显，也不能从详情按钮直接重置；本轮只准备表单、清空旧输入并提示 owner 必须输入新密码后保存。 |
| 交互改善 | 5 | 账号详情“账号下一步”新增“开通/重置密码”，点击后左侧邀请表单自动填入当前账号、勾选开通/重置、清空密码并显示下一步提示。 |
| 可验证性 | 5 | 详情测试覆盖点击后表单进入开通/重置模式、密码输入被清空、提示出现且不调用账号状态 API。 |
| 实现大小 | 4 | 改动集中在 React 详情面板、邀请管理父组件、draft helper、focused 测试和 product-ops 文档，不改 Node/Rust 合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/inviteManagementDraft.ts`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx`：PASS，1 个测试文件、1 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 抽出 `inviteManagementDraft` 后为 545 行，低于 560 行门禁。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只做详情面板到左侧邀请表单的开通/重置引导，不直接重置密码，不显示旧密码，也不新增独立账号详情页。
- 真实保存仍依赖 owner 在左侧输入新密码并点击保存；服务端 users-file 合同、外部 SMTP/IM 发送、公开注册和组织租户均不在本轮范围。
- 本轮没有同步服务器或刷新远端 users-file 审计 evidence。

明日候选：

1. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。
2. 评估账号详情是否需要升级为独立详情页或抽屉，统一承接审计、搜索、恢复规则和账号动作编排。

## 2026-07-08 第三十七次主动迭代

主任务：把账号详情升级为右侧抽屉，并修复筛选区桌面挤压。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 在账号管理里最常见路径是先筛选/搜索，再点选账号看审计和处理动作；详情空态常驻在台账上方会占空间，点选后也缺少明确上下文层。 |
| 问题确定性 | 5 | 第三十六次迭代已把账号详情独立抽屉列为候选；本轮视觉 smoke 还发现筛选区被批量按钮挤成窄列，影响桌面扫描和操作。 |
| 风险降低 | 4 | 抽屉不改后端权限和账号生命周期合同，只改变展示层；关闭后保留当前筛选和台账状态，避免打断 owner 定位。 |
| 交互改善 | 5 | 未选中时不再显示空详情；点选账号或邀请记录后右侧打开 `dialog` 抽屉，台账行显示“详情已打开”，Esc 或关闭按钮退出。 |
| 可验证性 | 5 | Focused Vitest 覆盖未选中无抽屉、点选打开、选中态、关闭消失；Playwright mock owner 会话后截图验证抽屉和筛选区布局。 |
| 实现大小 | 4 | 改动集中在 React 账号详情、台账、筛选布局、focused 测试和 product-ops 文档，不改 Node/Rust 合同。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementLedger.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementFilters.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx src/test/InviteManagementPanel.test.tsx`：PASS，2 个测试文件、7 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 550 行，仍低于 560 行门禁。
- Playwright 视觉 smoke：PASS，临时 `VITE_JOB_SPRINT_SERVER_RUNTIME=true` dev server + mock owner/邀请接口，确认 `账号详情抽屉` 出现、`详情已打开` 选中态可见、账号搜索框宽度约 697px；截图 `/tmp/job-sprint-account-detail-drawer.png`。
- `npm --prefix apps/react-web run build`：PASS；保留 Vite chunk size warning。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮是 React 管理体验优化，不新增独立账号详情路由、服务端审计专页、账号恢复自动编排、外部 SMTP/IM 发送或公开注册/组织租户。
- Playwright 视觉 smoke 使用本地 mock owner 会话和 mock 邀请接口，只证明前端抽屉布局和交互，不代表远端 users-file evidence 已刷新。
- 本轮没有同步服务器或刷新 Android 内置 React assets。

明日候选：

1. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。
2. 评估账号详情抽屉是否需要补移动端底部 sheet 形态，避免窄屏遮挡关键信息。

## 2026-07-08 第三十八次主动迭代

主任务：给账号详情抽屉补移动端底部 sheet 形态。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | Android WebView 和手机浏览器是当前交付边界的一部分；账号详情如果在窄屏仍按桌面抽屉思路占满高度，会让 owner 难以判断这是临时详情还是页面跳转。 |
| 问题确定性 | 5 | 第三十七次迭代已经把移动端底部 sheet 列为候选；现有抽屉只验证桌面和宽屏，未单独验证 390px 窄屏。 |
| 风险降低 | 4 | 本轮只改响应式容器和 safe-area padding，不改账号状态、审计、开通/重置或服务端合同。 |
| 交互改善 | 5 | 小屏改为底部 sheet，最大高度约 `88dvh`，顶部有 sheet 把手，标题和关闭按钮常驻顶部，详情内容在 sheet 内滚动；桌面仍保持右侧抽屉。 |
| 可验证性 | 5 | Focused Vitest、typecheck、架构门禁和双视口 Playwright smoke 可当天验证。 |
| 实现大小 | 5 | 改动集中在 `InviteManagementDetailPanel` 的容器类名和 product-ops 文档，范围很窄。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementDetailPanel.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx src/test/InviteManagementPanel.test.tsx`：PASS，2 个测试文件、7 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementDetailPanel.tsx` 429 行，`InviteManagementDetailPanel.test.tsx` 340 行。
- Playwright 双视口视觉 smoke：PASS，临时 `VITE_JOB_SPRINT_SERVER_RUNTIME=true` dev server + mock owner/邀请接口；桌面 1440x1100 抽屉位于右侧，移动 390x844 sheet 宽 390、高约 743、贴底；截图 `/tmp/job-sprint-account-detail-drawer-desktop.png` 和 `/tmp/job-sprint-account-detail-sheet-mobile.png`。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS。
- `npm test`：PASS；保留既有 Android functional evidence missing warning。

限制：

- 本轮只证明本地 React 响应式布局，不代表 Android 内置 React assets 已同步、远端 users-file evidence 已刷新或 Android 远端 HTTPS 真机验收已完成。
- 移动端底部 sheet 只支持明确关闭按钮和 Esc；没有做拖拽关闭，避免引入手势冲突和复杂状态。

明日候选：

1. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。
2. 给账号详情抽屉补焦点回退到触发行，进一步完善键盘和读屏体验。

## 2026-07-08 第三十九次主动迭代

主任务：给账号详情抽屉补焦点回退到触发行。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | owner 在账号台账里会连续搜索、点选、关闭、再看下一位；关闭详情后如果焦点丢失，键盘用户和读屏用户会失去刚才所在行。 |
| 问题确定性 | 5 | 第三十八次迭代已把该项列为候选；抽屉和移动底部 sheet 已经可用，但关闭后的焦点恢复没有被测试守住。 |
| 风险降低 | 4 | 本轮只记录触发按钮并在关闭时恢复焦点，不改账号生命周期、审计、筛选、保存或后端合同。 |
| 交互改善 | 5 | 点选登录账号或邀请记录打开详情后，点击关闭或触发关闭逻辑会回到刚才的台账行，用户可以继续按 Tab 或方向感浏览。 |
| 可验证性 | 5 | Focused Vitest 直接断言关闭邀请详情后 `Candidate 1` 台账按钮重新获得焦点。 |
| 实现大小 | 5 | 改动集中在邀请管理父组件、台账点击回调、focused 测试和 product-ops 文档，不增加新组件。 |

改动：

- `apps/react-web/src/features/coach/components/InviteManagementPanel.tsx`
- `apps/react-web/src/features/coach/components/InviteManagementLedger.tsx`
- `apps/react-web/src/test/InviteManagementDetailPanel.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/requirement-development-template.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/InviteManagementDetailPanel.test.tsx src/test/InviteManagementPanel.test.tsx`：PASS，2 个测试文件、7 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过；`InviteManagementPanel.tsx` 559 行，仍低于 560 行门禁；`InviteManagementDetailPanel.test.tsx` 340 行，保持测试行数上限。
- `git diff --check`：PASS。
- `npm run validate:product-iteration -- --json`：PASS。
- `npm run scan:sensitive`：PASS，未发现高风险命中。
- `npm --prefix apps/react-web run build`：PASS；保留既有 Vite chunk size warning。
- `npm test`：PASS；React 35 个测试文件、108 个测试通过，保留既有 Android functional evidence missing warning。

限制：

- 本轮只补关闭后的焦点回退，不新增完整焦点陷阱、拖拽关闭、独立账号详情页、服务端审计专页或 Android/远端 evidence。
- 焦点只在触发行仍存在于 DOM 时恢复；如果筛选条件改变导致原行消失，关闭仍只收起详情，不强行跳到错误用户。

明日候选：

1. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。
2. 给账号详情抽屉补焦点陷阱和背景不可达性复核，判断是否需要更完整的 dialog a11y 封装。

## 2026-07-09 第四十次主动迭代

主任务：给 AI 运行记录补本地/服务端/provider 诊断文案。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户已截图反馈 AI 运行记录一直像失败；如果不解释 `server_unavailable` 的环境含义，用户会误判 AI 能力不可用。 |
| 问题确定性 | 5 | 当前 `5173` 是纯 Vite 前端，`/api/coach/artifacts` 不由后端处理；React 会记录 `local-fallback / server_unavailable`。 |
| 风险降低 | 4 | 明确区分本地前端未连接后端、真实 provider 成功、schema 失败、运行失败和规则降级，降低交付口径误判。 |
| 交互改善 | 4 | AI 运行记录卡片新增“诊断”和“恢复动作”，不再只展示 raw status、provider 和 warning。 |
| 可验证性 | 5 | Coach 页测试覆盖本地前端模式诊断文案；typecheck 和架构门禁可当天验证。 |
| 实现大小 | 5 | 改动集中在 `LlmRunPanel`、`CoachPage.test.tsx` 和 product-ops 文档，不改后端、不改远端配置。 |

改动：

- `apps/react-web/src/features/coach/components/LlmRunPanel.tsx`
- `apps/react-web/src/test/CoachPage.test.tsx`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `npm --prefix apps/react-web test -- --run src/test/CoachPage.test.tsx`：PASS，1 个测试文件、4 个测试通过。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `node tests/architecture_quality_test.js`：PASS，10 项通过。

限制：

- 本轮只修 AI 运行记录的前端诊断和解释，不启动后端 runtime、不验证远端 provider、不改服务器配置。
- `local-fallback / server_unavailable` 仍表示当前本地前端没有拿到服务端 AI JSON；这次只是避免把它误读成“真实模型失败”。

明日候选：

1. 补 dev server/API runtime smoke，自动识别纯前端模式、服务端 API 不可用、provider 配置失败和 schema 失败。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-10 第四十一次主动迭代

主任务：补 `/api/coach/artifacts` runtime 分层诊断 smoke。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 用户已明确问“为什么 AI 运行记录一直失败”；只靠 UI 文案仍需要一个可重复命令证明到底是本地端口、纯前端、鉴权、后端、provider 还是 schema 问题。 |
| 问题确定性 | 5 | 第四十次迭代已确认 `local-fallback / server_unavailable` 容易被误判；今天默认 `127.0.0.1:5173` 端口没有监听，实际诊断为 `runtime_unreachable`。 |
| 风险降低 | 5 | 诊断命令只做非破坏性 POST smoke，不改远端配置、不写账号、不迁移数据；输出不把环境问题外推成 provider 失败。 |
| 交互改善 | 3 | 本轮主要补验收与排障入口，间接支撑 Stats/AI 运行质量后续统一解释。 |
| 可验证性 | 5 | 纯函数单测覆盖纯前端 HTML、鉴权、API 不可用、provider 未配置、provider fallback、schema 失败和 provider 成功。 |
| 实现大小 | 5 | 改动集中在一个诊断工具、一个单测、package 脚本、产品迭代门禁和 product-ops 文档。 |

改动：

- `tools/diagnose_coach_artifacts_runtime.js`
- `tests/coach_artifacts_runtime_diagnostic_test.js`
- `package.json`
- `tools/validate_product_iteration_workflow.js`
- `tests/product_iteration_workflow_test.js`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `node --check tools/diagnose_coach_artifacts_runtime.js`：PASS。
- `node --check tests/coach_artifacts_runtime_diagnostic_test.js`：PASS。
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package json ok')"`：PASS。
- `node tests/coach_artifacts_runtime_diagnostic_test.js`：PASS，8 类诊断用例通过。
- `npm run test:coach-runtime-diagnostic`：PASS。
- `node tests/product_iteration_workflow_test.js`：PASS，8 项通过。
- `npm run validate:product-iteration -- --json`：PASS，检查 10 份产品文档。
- `npm run diagnose:coach-runtime`：PASS_WITH_FACT，默认 `http://127.0.0.1:5173/api/coach/artifacts` 输出 `status=FAIL`、`code=runtime_unreachable`，说明当前本机 5173 未监听。
- `lsof -nP -iTCP:5173 -sTCP:LISTEN`：无监听进程。

限制：

- 本轮没有启动 Node/Rust 后端，也没有改远端 provider 配置；`runtime_unreachable` 只说明本机默认端口不可达，不代表 DeepSeek/真实 provider 失败。
- 诊断脚本默认不携带登录态；如果本地服务启用了鉴权，预期会分类为 `auth_required`，后续需要补 cookie/Vite proxy/runtime 启动说明。
- Stats 的 AI 运行质量还未复用这套诊断口径，本轮只把工具和门禁先落地。

明日候选：

1. 把 `diagnose:coach-runtime` 的分类口径复用到 Stats 的 AI 运行质量说明里。
2. 检查求职画像整包撤销是否需要抽成复用 hook，避免后续每个模块复制本地 undo 状态。

## 2026-07-12 GitFlow 主线回同步

- 分支：`codex/chore/GITFLOW-002-sync-main-to-develop -> develop`。
- 选择：`main` 已先后合入发布候选、产品 UI 基线和 `develop` 的测试修复，但 `develop` 未回收这些提交，下一项普通需求会基于过期集成基线开始。
- 交付：从最新 `develop` 创建短生命周期同步分支，并以 `git merge --ff-only origin/main` 无冲突带入当前主线历史。
- 验证：默认并发的根 `npm test` 在 React/Vitest 阶段出现 8 个 5 秒超时；同一批失败文件单 worker 16 条用例全通过，完整前端 35 个文件/111 条用例在 1 worker 与 2 worker 下均通过。前端默认测试改为 2 worker 后，再以根 `npm test`、GitFlow PR 目标门禁、产品工作流门禁和敏感扫描验证。
- 远端证据：草稿 PR #6 的 `GitFlow Policy / validate` 已成功；随后 `main/develop` ruleset 已要求 PR、禁止删除/强推，并将该 Actions `validate` 加为 required check。
- 限制：不在每日迭代中直接合并受保护分支；本轮能证明本机 2 worker 稳定，不能替代 GitHub Actions 实际资源下的完整根测试证据。

## 2026-07-15 主线回同步门禁复核

主任务：复核 `main -> develop` 回同步是否已解除，避免在过期集成基线上继续日常产品迭代。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 普通用户功能改动必须进入一致的集成基线，才能避免后续回同步时覆盖或遗漏已验收能力。 |
| 问题确定性 | 5 | `origin/main...origin/develop` 显示 `10 0`；PR #6 仍为 Draft。 |
| 风险降低 | 5 | 不在过期 `develop` 上启动新需求，避免产生第二条待人工裁决的产品分叉。 |
| 交互改善 | 1 | 本轮是交付治理门禁，不直接修改用户界面。 |
| 可验证性 | 5 | GitHub PR 状态、分支比较、产品迭代门禁与敏感扫描均可复现。 |
| 实现大小 | 5 | 仅补运行记录，不改产品代码或远端配置。 |

改动：

- `docs/product/product-ops/daily-product-iteration-log.md`

已验证：

- `gh pr view 6 --repo abugcreater/job--sprint --json ...`：PR #6 为 `OPEN / Draft / CLEAN`，目标分支 `develop`，`GitFlow Policy / validate` 为 `SUCCESS`。
- `git rev-list --left-right --count origin/main...origin/develop`：`10 0`，确认仅 `main` 领先，`develop` 没有待回带提交。
- `npm run validate:product-iteration`：PASS，检查 10 份产品文档。
- `npm run scan:sensitive`：PASS，未发现高风险命中。

限制：

- 本轮不将 Draft PR 标记为可审阅、不直接合并受保护分支，也不在未同步的 `develop` 上启动普通需求。
- 这只能证明本机分支关系、PR 元数据和本地门禁状态，不能替代人工审阅或 GitHub 合并后的最终分支对齐检查。

明日候选：

1. 审阅并合并 PR #6 后，先确认 `main` 与 `develop` 的提交关系，再从更新后的 `develop` 选择一个普通用户路径的小步改进。
2. 在回同步尚未完成前，只做不改变集成基线的只读核验，不新增产品代码分支。

## 2026-07-16 第四十二次主动迭代

主任务：让 Stats 的 AI 运行质量使用与 AI 运行记录一致的诊断口径。

改动：

- 新增 `apps/react-web/src/data/llmRunDiagnosis.ts`，统一运行记录、Stats 的诊断标签、说明和建议动作。
- `LlmRunPanel` 与 `StatsPage` 共用诊断口径；Stats 会展示最新诊断和建议动作，区分本地前端未连接后端、schema 异常、真实 provider 成功、运行失败与规则降级。
- 补 `StatsPage.test.tsx` 覆盖 `provider_not_configured` 与 `runtime_unreachable` 的代表性状态，并同步产品运维台账。

已验证：

- React 定向测试、全量前端测试、typecheck 和 build 均通过；Browser visual QA 在桌面与移动视口通过。
- `npm run validate:product-iteration` 与 `npm run scan:sensitive` 通过；本轮不启动远端 provider。

限制：

- Stats 只解释已保存的运行记录，不替代 Node/Rust runtime 或远端 provider 的实际探测。

## 2026-07-20 第四十三次主动迭代

主任务：为 Rust 本地 coach runtime 补独立 smoke，并纠正 health 对空 provider 环境变量的误报。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | AI 运行记录需要明确区分“Rust API 可用但未配置真实模型”和“服务不可用”，否则本地验收继续把 fallback 误读为失败。 |
| 问题确定性 | 5 | 现有诊断单测已有 `provider_not_configured` 分类，但缺少真实 Rust 启动 smoke；新 smoke 首次运行还复现 health 在空变量下返回 `apiConfigured=true`、生成实际 fallback 的口径矛盾。 |
| 风险降低 | 5 | 测试只使用临时端口、临时 SQLite 和 `JOB_SPRINT_AUTH_DISABLED=true`，不读取真实 users file、不调用 provider、不写远端。 |
| 交互改善 | 3 | 本轮主要修正开发验收与运行状态事实，间接支撑 AI 运行记录和后续 Stats 的正确解释。 |
| 可验证性 | 5 | 可启动真实 Rust 进程，分别断言 health、artifacts schema/诊断与 `llm_runs` SQLite 读回，并在 finally 中清理。 |
| 实现大小 | 5 | 改动限定在 health 状态判断、一个 Node smoke、一个 npm 命令、Rust README 与 product-ops 记录。 |

基线：

- `git fetch --prune origin` 后，`git diff --quiet origin/main origin/develop` 通过；双方提交祖先关系均不成立，提交差异为 `1 / 2`，判定“历史差异、内容已对齐”。已从最新 `develop` 创建本轮分支。
- PR #11、#12、#13 都是目标为 `develop` 的 Draft，GitHub `validate` 均成功；本轮没有复制其中 Stats、Vite proxy 或账号导航改动。

改动：

- `apps/rust-api/src/health_routes.rs`：`apiConfigured` 改为检查 provider base URL 与 token 都为非空；空模型名不再作为已配置模型返回。
- `tests/rust_coach_runtime_smoke_test.js`：临时启动 Rust、等待 `/api/health`、调用 `/api/coach/artifacts`、复用 runtime 诊断分类，并断言 fallback 的 schema 与 `llm_runs` 读回；结束时终止进程并清理临时 SQLite。
- `package.json`：新增 `npm run test:rust-coach-runtime`。
- `apps/rust-api/README.md`、`known-issues.md`、`product-ledger.md`：说明命令、口径与限制。

已验证：

- `npm run test:rust-coach-runtime`：PASS，真实 Rust runtime 返回 `provider_not_configured`、SQLite、临时 DB、`llmRunCount=1`。
- `cargo test --manifest-path apps/rust-api/Cargo.toml`：PASS，23 个单元测试和 2 个合同测试通过。
- `node tests/coach_artifacts_runtime_diagnostic_test.js`：PASS。
- `node tests/rust_http_responses_boundary_test.js`：PASS。
- `git diff --check`：PASS。
- `cargo fmt --manifest-path apps/rust-api/Cargo.toml -- --check`：未通过；失败只列出提交前已有的其它 Rust 文件格式差异，本轮未批量格式化这些无关文件。`health_routes.rs` 已用 Rust 2024 edition 单独格式化。

限制：

- 本轮证明的是免登录的临时 Rust runtime 和本地 fallback 合同，不代表 Vite 已代理到 Rust、带真实 Cookie 的 API 可用、真实 provider 已配置，或远端 AI 调用成功。
- 未改远端环境、账号、users file、正式 SQLite、Android 或发布包；未删除或迁移任何数据。
- 仍需单独治理仓库中既有的全量 `cargo fmt --check` 格式差异，不能把本轮局部格式化说成全仓格式门禁通过。

明日候选：

1. 审阅 PR #11 合入后，验证 Stats 页的 AI 运行诊断是否能正确区分 `provider_not_configured` 与 `runtime_unreachable`。
2. 在 PR #12 合入后，为 Vite proxy + 登录 Cookie 到 Node/Rust runtime 补一条本地端到端 smoke，不接远端 provider。

## 2026-07-17 第四十四次主动迭代

主任务：让本地 React AI 联调真正连到 Node API，而不是把纯 Vite 结果当成模型失败。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 诊断文案存在但缺少可复现恢复路径，本地使用者仍无法验证 AI 草稿生成链路。 |
| 问题确定性 | 5 | `VITE_JOB_SPRINT_SERVER_RUNTIME=true` 只开启服务端调用，原 Vite 配置没有 `/api` proxy，`5173` 无法转到 Node `8000`。 |
| 风险降低 | 5 | 新命令只绑定回环地址，smoke 使用免登录 Node fallback，不读取真实密钥、不调用远端 provider。 |
| 交互改善 | 4 | 浏览器可沿同一端口使用 React 与 API，诊断进入鉴权、fallback、provider 或 schema 的准确分类。 |
| 可验证性 | 5 | Vite proxy 回归测试与真实临时进程 smoke 均可复现。 |
| 实现大小 | 4 | 只涉及本地启动配置、公开模板、测试和说明，不改变业务数据或权限模型。 |

改动：

- `apps/react-web/vite.config.ts`：从仓库根读取本地 env，为 `/api` 配置可覆盖、默认指向 `127.0.0.1:8000` 的开发代理。
- `apps/react-web/package.json` 与根 `package.json`：新增 `dev:coach-runtime` 和 `start:local`，前端联调固定绑定回环地址。
- `.env.example`：去除会抢占单用户认证或误触 provider 的占位值，明确多用户 JSON/file 与单用户配置互斥。
- `README.md`：补本地登录、两进程启动、诊断状态边界和 Cookie 限制说明。
- `apps/react-web/src/test/viteConfig.test.ts`：锁定 `/api` proxy 与可配置 target。

已验证：

- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，36 个测试文件、112 个测试通过。
- `npm --prefix apps/react-web run build`：PASS；保留既有 Vite chunk size warning。
- `npm run test:coach-runtime-diagnostic`：PASS，8 类诊断用例通过。
- 临时 Node runtime + `npm run dev:coach-runtime`：PASS；`5173 -> /api -> Node` 返回 `provider_not_configured`，两个临时进程均已停止。
- `npm run validate:product-iteration -- --json`、`npm run scan:sensitive`、`npm run build:public-safe && npm run scan:public-safe`、`npm run validate:workspace-boundaries`、`git diff --check`：PASS。

限制：

- smoke 刻意使用 `JOB_SPRINT_AUTH_DISABLED=true`，只证明 Vite proxy、Node API、fallback 与 schema；没有验证真实用户 Cookie 或真实 provider。
- `npm run start:local` 要求使用未跟踪的 `.env`；本轮没有修改服务器配置、发布或同步 Android 资源。

## 2026-07-18 第四十五次主动迭代

主任务：把本地 Vite -> Node AI runtime 联调从手工 smoke 升级为可重复自动验证。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 4 | 本地用户需要稳定区分 proxy、鉴权、fallback 与 provider，避免开发服务变化后重新面对“AI 一直失败”。 |
| 问题确定性 | 5 | 前一轮已手工证明 `5173 -> /api -> Node`，但没有自动入口守住该关键链路。 |
| 风险降低 | 5 | 动态端口、临时免登录 runtime、超时和子进程清理不依赖用户 `.env`，也不与常用端口冲突。 |
| 交互改善 | 3 | 本轮是开发验收闭环，间接保证两进程启动时得到准确 AI 诊断。 |
| 可验证性 | 5 | 测试直接断言经 Vite `/api` proxy 的 health 与 artifacts JSON，并验证分类为 `provider_not_configured`。 |
| 实现大小 | 5 | 只新增一个 Node smoke 和两个 package script，不改产品数据、权限或服务器。 |

改动：

- `tests/local_coach_runtime_proxy_test.js`：动态启动临时 Node runtime 与 Vite，验证 health、artifacts 合同、proxy、fallback/schema，并在 finally 中回收子进程和临时 runtime JSON。
- `package.json`：新增 `test:coach-runtime-proxy`，并把它加入 `test:coach-runtime-diagnostic`。
- `product-ledger.md`、`known-issues.md`、本日志：记录自动 smoke 的证据范围和剩余 Cookie/provider/Rust 限制。

已验证：

- `node --check tests/local_coach_runtime_proxy_test.js`：PASS。
- `npm run test:coach-runtime-proxy`：PASS。
- `npm run test:coach-runtime-diagnostic`：PASS，8 类诊断单测与 proxy smoke 均通过。
- smoke 后进程检查：PASS，未发现测试遗留的 Node runtime 或 Vite 进程。

限制：

- 测试使用 `JOB_SPRINT_AUTH_DISABLED=true`，只证明 Node fallback、proxy 与 schema，不能证明真实用户 Cookie、真实 provider 或远端服务。
- Rust/Axum runtime、Android WebView 和 HTTPS 远端验收未运行；Rust runtime 已由后一轮独立 smoke 补齐本地证据。

## 2026-07-19 第四十六次主动迭代

主任务：将普通用户的“更多”入口收敛为个人“账号与数据”工作区，并固化管理员直链的权限边界。

选择原因：

| 维度 | 分数 | 依据 |
|---|---:|---|
| 用户价值 | 5 | 普通求职者需要一眼分清个人同步/备份与邀请、批次、账号生命周期管理。 |
| 问题确定性 | 5 | `/admin` 已有 owner 守卫，但普通导航仍显示“更多”，非 owner 直达管理员页会跳到 `/more`，产品语义不清。 |
| 风险降低 | 5 | 只改 React 导航、页面文案和前端路由落点；不改服务端权限、不触碰账号数据。 |
| 交互改善 | 5 | 桌面导航把“账号与数据”和 owner-only“管理员”拆开，个人操作不再像后台入口。 |
| 可验证性 | 5 | 路由页面测试覆盖普通用户页面、隐藏的管理员能力和 `/admin` 越权直链落点。 |
| 实现大小 | 5 | 改动限制在导航、个人数据页、路由守卫落点、页面测试和 product-ops 记录。 |

改动：

- `apps/react-web/src/app/navigation.ts` 将 `/more` 展示为“账号 / 账号与数据”，明确邀请与批次管理仅在管理员中心提供。
- `apps/react-web/src/app/AppShell.tsx` 将桌面导航拆为“账号与数据”和仅 owner 可见的“管理员”分组。
- `apps/react-web/src/features/more/MorePage.tsx` 将页面标题、辅助说明和页内标签改为个人账号、同步与备份语义。
- `apps/react-web/src/features/admin/AdminPage.tsx` 将非 owner 直达 `/admin` 的落点改为 `/today`；会话检查等待态保持不变。
- 更新 `MorePage`、路由页面测试、产品台账和已知问题。

已验证：

- `npm run validate:gitflow -- --phase start`：PASS。
- `npm --prefix apps/react-web test -- MorePage.test.tsx navigationRoutes.test.tsx`：PASS，2 个测试文件、9 条用例通过。
- `npm --prefix apps/react-web test`：PASS，35 个测试文件、111 条用例通过。
- `npm --prefix apps/react-web run build`、`git diff --check`：PASS；保留既有 Vite chunk size warning。

限制：

- 已以 `npm --prefix apps/react-web run dev -- --host 127.0.0.1 --port 5173` 启动本地 Vite，`curl http://127.0.0.1:5173/` 返回 `200`；这只证明页面可打开，未把它扩大解释为 Node/Rust API 或真实 AI 调用通过。
- 本轮只收敛客户端导航与落点；Node/Rust 服务端的 owner 权限校验仍是最终安全边界。
- 未改远端配置、未删除账号、未迁移数据，也未绕过受保护分支。

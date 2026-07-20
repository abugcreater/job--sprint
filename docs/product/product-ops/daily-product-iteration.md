# 每日主动产品迭代机制

日期：2026-07-20

## 目标

让 Codex 每天主动检查 Job Sprint 的真实产品状态，发现不足，挑选最高价值的小步改进，完成实现、验证和记录。这个机制服务于“把产品越做越好”，不是每天制造大改动。

## 每日输入

每天开始前先读取这些事实源：

- `.github/gitflow-automation-contract.json`
- `docs/README.md`
- `docs/core/01-project-background.md`
- `docs/core/02-project-plan.md`
- `docs/core/03-technical-architecture.md`
- `docs/core/04-acceptance-and-risk.md`
- `docs/product/README.md`
- `docs/product/product-ops/product-ledger.md`
- `docs/product/product-ops/known-issues.md`
- `docs/product/product-ops/iteration-workflow.md`
- `docs/product/product-ops/requirement-development-template.md`
- `docs/product/product-ops/daily-product-iteration-log.md`

## 每日循环

1. 事实检查：确认分支、未提交改动、最近文档、已知问题、当前交付边界。
2. 积压收口门禁：先检查所有目标为 `develop` 的开放 PR、Draft、冲突、required checks 和对应远端分支；存在未收口需求时，不得创建新的工作分支。
3. 处理积压：按最早创建顺序将分支 rebase 到最新 `develop`，逐项保留功能与文档语义，运行影响范围测试，转为 Ready，required checks 通过后执行 squash merge 并删除工作分支。
4. 发布判定：积压为零后，判断是否达到定期发布条件；达到条件时从 `develop` 创建 `release/vX.Y.Z`，按 GitFlow 合入 `main` 并回同步 `develop`。
5. 产品扫描：仅在积压已清零且无需优先发布时，从用户路径、数据隔离、权限、空状态、创建/编辑/删除、AI 草稿、统计、Android、服务器交付中找不足。
6. 候选排序：按用户价值、证据强度、风险、实现大小和可验证性评分。
7. 选择任务：每天默认只选 1 个主任务，最多 1 个顺手小修；大需求必须先建 feature capsule。
8. AI 团队路由：默认 Manager Dispatch；日常小步改进优先主线程，只有 UI/数据/安全/验收风险明确时才派 1 个专家。
9. 实施：保持改动窄，尊重已有 worktree，不覆盖用户未提交内容。
10. 验证与收口：按影响面运行最小充分命令；完成后必须推送、建 PR、解决冲突、等待 required checks、合入 `develop` 并删除短分支。
11. 记录与汇报：更新日志、product ledger、known issues 或 completion audit，说明合并结果、删除的分支、验证证据、限制和下一优先级。

## 积压收口门禁

- `.github/gitflow-automation-contract.json` 是可执行流程参数的机器事实源；本文负责解释原因和操作顺序，不得与合同值冲突。
- 每次运行先执行 `git fetch --prune origin`，并用 `gh pr list` 检查目标为 `develop` 的开放 PR；Draft 也属于未完成需求，不能长期停放。
- 若工作分支落后或冲突，先 rebase 到最新 `origin/develop`。冲突必须按行为逐项合并，禁止对页面或 product-ops 文档整文件选择 ours/theirs。
- 分支已有完整实现时，补跑影响范围测试和敏感扫描，转为 Ready；GitHub required checks 通过后使用 squash merge，并删除远端与本地工作分支。
- 若 required check、外部账号、用户输入或不可控平台状态阻塞，保留唯一阻塞 PR，报告明确动作；当日不得绕开它再堆一个新需求分支。
- “已提交”“已推送”“已创建 Draft PR”都不是完成。每日需求只有在 PR 已合入 `develop`、工作分支已删除、工作树干净后才算完成。

## 定期发布条件

积压清零且 `origin/develop` 与 `origin/main` 文件树存在真实差异时，满足以下任一条件就启动 release：

- 距上次正式 release 已满 7 天；
- 自上次 release 后已有 3 项需求合入 `develop`；
- 用户明确要求立即发布或同步主分支。

版本号取现有语义化 tag 与已合并 `release/vX.Y.Z` PR 中的最大版本，再递增补丁位；不得复用已存在的 release 分支、PR 或 tag。Git 版本发布必须走 `release/vX.Y.Z -> main`，运行 `npm run test:git-release` 与敏感扫描，required checks 通过后合并并打标签；随后将 `main` 回同步 `develop`，最后删除 release/回同步短分支。只有明确授权服务器交付时才运行包含远端 Linux 构建的 `npm run test:release`。这里只授权 Git 仓库发布收口，不自动修改远端服务器、账号、数据或生产配置。

## 候选评分

| 维度 | 说明 | 分值 |
|---|---|---|
| 用户价值 | 是否改善新用户、普通用户或 owner 的真实路径 | 0-5 |
| 问题确定性 | 是否有代码、测试、截图、文档或运行结果证明问题存在 | 0-5 |
| 风险降低 | 是否减少数据串线、权限误露、交付误判或安全泄露 | 0-5 |
| 交互改善 | 是否让创建、编辑、保存、删除、空状态或错误恢复更清楚 | 0-5 |
| 可验证性 | 是否能在当天用命令、测试或本地运行证明 | 0-5 |
| 实现大小 | 越小越适合每日推进；大改要拆 feature capsule | 0-5 |

优先级规则：

- 20 分以上：当天优先推进。
- 15-19 分：进入近期候选。
- 10-14 分：记录观察，等待更多证据。
- 10 分以下：不做，除非用户明确要求。

## 每日禁止事项

- 不为了“主动”而每天做随机重构。
- 不把 HTTP 演示说成完整 HTTPS 生产交付。
- 不把本地 Web 通过说成 Android 或服务器通过。
- 不把旧种子数据、真实用户数据或本机路径提交到公开仓库。
- 不把管理员入口放回普通用户主路径。
- 不在没有证据时宣称问题已修复。
- 不等待、关闭或清理 inherited/stale agent 作为交付步骤。

## 最小验证矩阵

| 改动范围 | 最小验证 |
|---|---|
| 文档/流程 | `git diff --check`、`npm run validate:product-iteration`、`npm run scan:sensitive` |
| React UI | `npm --prefix apps/react-web run typecheck`、`npm --prefix apps/react-web test` |
| 业务流 | `npm run test:functional` 或对应功能脚本 |
| Rust/SQLite | `cargo test --manifest-path apps/rust-api/Cargo.toml` |
| Android 本地 | React build、sync assets、assemble、install、Android functional |
| 服务器远端 | server delivery、sync、restart、remote evidence |
| 最终交付 | `npm run final:delivery ...`，失败时只能报 `PASS_WITH_LIMITS` 或 `PARTIAL` |

## 自动化提示词

每日 heartbeat 使用以下意图：

```text
AI团队：按 Job Sprint 每日主动产品迭代机制执行。

目标：每天主动优化 Job Sprint，探索现有不足，修复存在的问题，优化交互体验，让产品更接近一个正常用户可持续使用的 AI 求职教练。

工作目录：<repo-root>

必须先读：
- docs/product/product-ops/daily-product-iteration.md
- docs/product/product-ops/requirement-development-template.md
- docs/product/product-ops/product-ledger.md
- docs/product/product-ops/known-issues.md

每日流程：
1. 检查 git status 和当前事实源，不覆盖用户未提交改动。
2. 执行 `git fetch --prune origin`，检查所有目标为 develop 的开放 PR、Draft、冲突、required checks 和短分支。存在积压时不得创建新分支；从最早 PR 开始 rebase、解决冲突、验证、转 Ready、等待 checks、squash merge 并删除分支。
3. 积压清零后判断 release：当 develop 与 main 文件树不同，且距上次 release 已满 7 天、累计 3 项需求或用户明确要求时，从现有 tag 和已合并 release PR 的最大版本递增补丁位，创建未使用的 release/vX.Y.Z，走 release PR 合入 main、打标签、回同步 develop 并删除短分支。不要直接创建 develop -> main PR。
4. 无积压且无需发布时，才从 known issues、product ledger、测试缺口、UI/UX、数据隔离、权限、Android/服务器交付边界中选择 1 个当天主任务。
5. 小任务直接实现；产品级大任务先建 feature capsule。实现后运行最小充分验证，推送并创建目标为 develop 的 PR。
6. 当轮必须继续处理到 PR 合入 develop、工作分支已删除、工作树干净；只有 required check、用户输入或外部平台阻塞时才允许停在开放 PR，并明确说明唯一阻塞项。
7. 更新 daily-product-iteration-log.md，并按需更新 product-ledger.md 或 known-issues.md；用中文汇报合并结果、删除分支、验证、限制和下一步。

AI 团队规则：
- 默认 manager-dispatch。
- 每天最多 1 个专家 agent；当前线程若处于 quarantine，则 max_agents=0。
- 不等待或关闭 inherited/stale agents。
- 允许按上述 GitFlow 完成 PR 合并、短分支清理和定期 release；不自动部署服务器，不改远端配置、账号或生产数据，除非用户明确要求。
```

## 每日报告格式

```text
Dispatch:
- status: <MANAGER_DISPATCH_PASS / SINGLE_SPECIALIST_PASS / TEAM_ROOM_PARTIAL>
- owner: <Team Lead / role>
- agents: <none / role + id>

今日选择：
- 主任务：<task>
- 选择原因：<score and evidence>

改动：
- <file/path>

验证：
- <command>: <PASS / PARTIAL / FAIL>

限制：
- <不能证明的范围>

明日建议：
- <next best action>
```

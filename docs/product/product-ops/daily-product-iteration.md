# 每日主动产品迭代机制

日期：2026-07-08

## 目标

让 Codex 每天主动检查 Job Sprint 的真实产品状态，发现不足，挑选最高价值的小步改进，完成实现、验证和记录。这个机制服务于“把产品越做越好”，不是每天制造大改动。

## 每日输入

每天开始前先读取这些事实源：

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
2. 产品扫描：从用户路径、数据隔离、权限、空状态、创建/编辑/删除、AI 草稿、统计、Android、服务器交付中找不足。
3. 候选排序：按用户价值、证据强度、风险、实现大小和可验证性评分。
4. 选择任务：每天默认只选 1 个主任务，最多 1 个顺手小修；大需求必须先建 feature capsule。
5. AI 团队路由：默认 Manager Dispatch；日常小步改进优先主线程，只有 UI/数据/安全/验收风险明确时才派 1 个专家。
6. 实施：保持改动窄，尊重已有 worktree，不覆盖用户未提交内容。
7. 验证：按影响面运行最小充分命令，不能把局部证据扩大成全量通过。
8. 记录：更新日志、product ledger、known issues 或 completion audit。
9. 汇报：给出改了什么、为什么、证据、限制、明天优先级。

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
2. 从 known issues、product ledger、测试缺口、UI/UX 不顺、数据隔离、权限、Android/服务器交付边界中找候选。
3. 按用户价值、风险、可验证性和实现大小选择 1 个当天主任务。
4. 小任务直接实现；产品级大任务先建 feature capsule，不要裸改。
5. 运行最小充分验证，不能把局部 PASS 扩大解释。
6. 更新 daily-product-iteration-log.md，并按需要更新 product-ledger.md 或 known-issues.md。
7. 用中文汇报：今日选择、改动、验证、限制、明日建议。

AI 团队规则：
- 默认 manager-dispatch。
- 每天最多 1 个专家 agent；当前线程若处于 quarantine，则 max_agents=0。
- 不等待或关闭 inherited/stale agents。
- 不做真实发布、远端改配置、账号删除、数据迁移或破坏性操作，除非用户明确要求。
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

# 工作树边界盘点

日期：2026-07-03

本文件承接 `docs/plans/2026-07-03-001-refactor-workspace-boundaries-plan.md` 的 U0。当前执行模式固定为“原路径概念清理”：不移动 Git 仓库，不重排职业工作区顶层目录，不改造 `CODEX_HOME`。

## 边界决策

| 边界 | 当前归属 | 本轮处理 |
|---|---|---|
| Job Sprint 应用项目 | 当前 Git 仓库 | 保留 `apps/`、`assets/`、`data/`、`tools/`、`tests/`、核心入口文件。 |
| Job Sprint 当前事实源 | `docs/core/` | 保留为唯一当前项目事实源。 |
| 旧文档摘要 | `docs/archive/` | 只保留归档索引、边界盘点、删除处置记录。 |
| 全局 Codex AI 团队 | `~/.codex/skills/codex-ai-team/` 与 `~/.codex/agents/codex-ai-team/` | 不在本仓库维护副本；本仓库只说明如何调用全局能力。 |
| 职业资料、简历、学习资料、求职输出 | Job Sprint 外部工作区输入 | 本轮只记录边界，不移动、不重命名、不删除。 |
| `dist/` 生成物 | 沿用当前 release 策略 | 本轮不改 `.gitignore` 和发布语义，只验证 release gate 不被破坏。 |

## 当前影子入口

以下项目级 AI team 影子入口需要由后续 U2-U6 清理：

- `.codex/agents/`
- `docs/ai-team/`
- `tools/ai_team_*.js`
- `tests/ai_team_*_test.js`
- `package.json` 中的 `ai-team:*` 和 `validate:ai-team` 脚本

## 停止条件

如果用户要求物理迁移到职业工作区，本计划停止在 U0，另开物理迁移计划。物理迁移必须等待 clean worktree、路径依赖扫描和用户确认。

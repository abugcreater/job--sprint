# 删除处置清单

日期：2026-07-03

本文件承接工作树边界清理的 U4。删除目标是移除 Job Sprint 项目内的 AI team 影子入口，不删除全局 Codex AI 团队能力。

## 处置规则

| 路径族 | 处置 | 承接位置 |
|---|---|---|
| `.codex/agents/` | 删除项目级兼容角色副本。 | 全局角色位于 `~/.codex/agents/codex-ai-team/`；项目规则由 `AGENTS.md` 指向全局 skill。 |
| `docs/ai-team/` | 删除项目级完整团队文档和本地运行留痕。 | 历史结论浓缩到 `docs/archive/index.md`、本文件和 `docs/archive/workspace-boundary-inventory.md`。 |
| `tools/ai_team_*.js` | 删除项目级团队脚本。 | 项目边界验证改由 `tools/validate_workspace_boundaries.js` 承担；真实团队运行由 Codex 对话层全局 skill 承担。 |
| `tests/ai_team_*_test.js` | 删除项目级团队脚本测试。 | 新门禁测试为 `tests/workspace_boundaries_test.js`。 |
| `package.json` 的 `ai-team:*`、`validate:ai-team` | 删除项目级团队入口脚本。 | 新项目 gate 为 `validate:workspace-boundaries`。 |

## 证据保留

- 删除前的完整项目级 AI team 文件状态已由提交 `0f411af chore: capture workspace cleanup baseline` 保留。
- 本轮不把运行证据迁入 `CODEX_HOME`，避免把 Job Sprint 项目清理和全局团队产品化混成一个回滚面。
- 若后续需要全局团队产品化，应从全局 `codex-ai-team` skill 另开计划，并按需从 `0f411af` 读取历史项目适配材料。

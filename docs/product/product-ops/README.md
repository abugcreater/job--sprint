# Product Ops 文档入口

日期：2026-07-10

`product-ops/` 保存跨版本产品治理资产，避免每次大需求都重新发明开发流程、验收口径和文档结构。

| 文件 | 用途 |
|---|---|
| `doc-rules.md` | 产品文档治理、feature capsule 和 AI 团队留痕规则。 |
| `daily-product-iteration.md` | 每日主动产品迭代机制，用于 Codex 自动扫描、排序、修复和验收。 |
| `daily-product-iteration-log.md` | 每日主动迭代日志，记录候选、选择、验证和下一步。 |
| `iteration-workflow.md` | 长期产品迭代工作流和分层验收解释。 |
| `gitflow-development-governance.md` | 所有需求、提交、PR、发布和 hotfix 必须遵守的 GitFlow 规范。 |
| `requirement-development-template.md` | 新需求开发复用模板，可直接复制到后续任务使用。 |
| `known-issues.md` | 当前已知问题、外部限制和防回归风险。 |
| `product-ledger.md` | 产品决策、当前状态、验证记录和继承规则。 |

使用规则：

1. 新需求先看 `gitflow-development-governance.md` 和 `requirement-development-template.md`，从正确基线创建独立工作分支，再建 `docs/product/<feature-slug>/`。
2. 每日主动优化先看 `daily-product-iteration.md`，并追加 `daily-product-iteration-log.md`。
3. 需求完成后同步 `product-ledger.md` 和 `known-issues.md`。
4. 改变定位、架构或验收口径时，同步 `docs/core/`。
5. PR 前必须运行 `npm run validate:gitflow` 和影响范围门禁；普通需求只向 `develop` 合并，release/hotfix 只向 `main` 合并。

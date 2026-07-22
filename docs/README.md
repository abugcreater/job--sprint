# Job Sprint 文档入口

日期：2026-07-05

当前文档已收敛为核心事实源，旧 PRD、一次性计划、历史验收、截图和复盘不再作为当前入口。

## 核心文档

| 文件 | 用途 |
|---|---|
| `core/00-project-overview.md` | 面向新读者的完整项目介绍：背景、用户闭环、能力、权限边界、技术选型、开发方式、验收与交付状态。 |
| `core/01-project-background.md` | 项目背景、定位、边界、非目标。 |
| `core/02-project-plan.md` | 当前阶段、下一步规划、文档治理策略。 |
| `core/03-technical-architecture.md` | 技术栈、目录、数据流、安全边界和架构风险。 |
| `core/04-acceptance-and-risk.md` | 验收命令、当前结论、P1/P2 风险。 |
| `core/05-interview-knowledge-base.md` | 脱敏面试知识库，可由 `tools/build_schedule_and_kb.js` 生成。 |

## 产品迭代文档

| 路径 | 用途 |
|---|---|
| `product/README.md` | 产品文档入口，说明当前主产品包和 product-ops 维护规则。 |
| `product/it-job-coach-v1/` | 泛 IT AI 求职教练 v1 产品包，包含多版本 PRD、推荐版 PRD、团队评审裁决和可复用开发工作流。 |
| `product/product-ops/` | 跨版本 GitFlow、产品账本、文档治理、每日主动迭代、已知问题、可复用迭代工作流和需求开发模板。 |

## 支撑文档

| 路径 | 用途 |
|---|---|
| `archive/index.md` | 旧文档删除和归档规则。 |
| `archive/workspace-boundary-inventory.md` | Job Sprint、职业资料和全局 Codex AI 团队的边界盘点。 |
| `archive/deletion-disposition.md` | 本轮删除项目级 AI team 影子的处置清单。 |
| `solutions/` | 少量可复用的问题解决经验。 |

## 当前事实源规则

- 项目状态、规划、架构和验收结论以 `docs/core/` 为准。
- AI 团队是全局 Codex 能力；Job Sprint 不维护本地团队本体。
- 旧路径只能作为历史线索，不能作为当前 PASS 证据。
- 新产品或技术文档优先进入 `docs/product/<feature-slug>/` feature capsule；关键结论同步回 `docs/core/`。
- 产品级迭代结束后必须同步 `docs/product/product-ops/` 的账本、已知问题和工作流继承规则。
- 运行路径不属于文档清理对象：`apps/`、`assets/`、`data/`、`tools/`、`tests/`、`schedule.html`、`login.html`、`sw.js`。

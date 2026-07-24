# Job Sprint 产品文档入口

日期：2026-07-06

## 当前产品方向

Job Sprint 的当前产品方向是面向泛 IT 求职者的 AI 求职教练与执行工作台。

它不是公开 SaaS、企业 ATS、自动投递平台或通用题库。当前优先级是邀请制、小范围、多画像/多用户可演示、严格 Evidence Gate、人工确认 AI 草稿，并证明“计划 -> 执行 -> 证据 -> 复盘”真的推动求职进展。

## 当前产品包

| 路径 | 状态 | 用途 |
|---|---|---|
| `it-job-coach-v1/` | 当前主合同 | 泛 IT AI 求职教练 v1：多版本 PRD、推荐 PRD、团队评审、开发工作流和完成审计。 |
| `ai-runtime-recovery/` | 已完成 | AI 运行失败的用户可见分类与恢复提示，明确区分登录、provider、API 与合同问题；真实 provider 重试与熔断仍为后续能力。 |
| `product-ops/` | 长期维护入口 | 记录跨版本 GitFlow、文档规则、每日主动迭代、产品账本、已知问题、可复用迭代工作流和需求开发模板。 |

## 使用规则

1. 新产品迭代先进入 `docs/product/<feature-slug>/`，不要直接改散落文档。
2. 每个 feature capsule 至少包含：`README.md`、`prd-options.md`、`prd-recommended.md`、`review-and-adjudication.md`、`development-workflow.md`、`completion-audit.md`。
3. 新需求启动时先读 `product-ops/gitflow-development-governance.md`，再复制 `product-ops/requirement-development-template.md` 的入口模板。
4. 每日主动优化按 `product-ops/daily-product-iteration.md` 执行，并追加 `product-ops/daily-product-iteration-log.md`。
5. 迭代结束后必须同步 `product-ops/product-ledger.md` 和 `product-ops/known-issues.md`。
6. 影响项目定位、架构边界或验收口径的结论，必须同步回 `docs/core/`。
7. `npm run validate:delivery` 未通过时，只能说本地、Android 本地或 HTTP 演示已通过，不能说完整 HTTPS 生产交付通过。

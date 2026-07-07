# 产品文档治理规则

日期：2026-07-06

## 目标

让大范围产品迭代有固定入口、固定评审、固定验收和固定复盘，不再依赖用户逐个按钮盯进度。

## Feature Capsule 规则

每次产品级需求都建立一个目录：

```text
docs/product/<feature-slug>/
```

必须包含：

| 文件 | 作用 |
|---|---|
| `README.md` | 本次迭代入口、状态、关键结论。 |
| `prd-options.md` | 至少 2 个方向版本和不选理由。 |
| `prd-recommended.md` | 团队裁决后的主合同。 |
| `review-and-adjudication.md` | Product、Tech、UI、QA、Implementation 的评审、分歧和裁决。 |
| `development-workflow.md` | 本次需求的分阶段开发与验收流程。 |
| `completion-audit.md` | 对照原始目标逐项证明完成、未完成或证据不足。 |

## 同步规则

迭代收口时必须同步：

1. `docs/product/product-ops/product-ledger.md`：记录产品决策、当前状态、验收命令和剩余边界。
2. `docs/product/product-ops/known-issues.md`：记录未完成项、P0 防回归风险和下一步。
3. `docs/core/01-project-background.md`：如果定位、目标用户或非目标改变。
4. `docs/core/04-acceptance-and-risk.md`：如果验收命令、证据口径或风险改变。

## AI 团队留痕规则

1. 如果当前线程处于 `current_thread_quarantine=true`，不得伪造真实多 agent 参与。
2. 缺失角色必须标 `stale_or_missing`、`spawn_failed` 或 `main-thread fallback`。
3. 产品、技术、UI、实现和 QA 视角可以由主线程降级完成，但只能标 `TEAM_ROOM_PARTIAL` 或 `MANAGER_DISPATCH_PASS`，不能标 `TEAM_ROOM_PASS`。
4. 每轮结束必须写明：实际参与角色、跳过角色、验证命令、残余风险和下次继承规则。

## PRD 质量门禁

任何推荐 PRD 必须具备：

1. 清晰目标用户和非目标用户。
2. 北极星指标和 2-5 个辅助指标。
3. MVP 范围和明确不做范围。
4. 关键用户流程。
5. 数据对象和 AI artifact 契约。
6. Web、Android、本地服务和远端交付的分层验收口径。
7. P0 防回归规则：每个按钮必须有输入、反馈、持久化、导航或明确 disabled 原因。

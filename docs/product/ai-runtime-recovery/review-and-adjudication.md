# AI 运行恢复提示审阅与裁决

日期：2026-07-24

## Manager Dispatch

- status：`MANAGER_DISPATCH_PASS`
- owner：Team Lead 主线程
- max_agents：0
- agent_lifecycle_budget：0
- current_thread_quarantine：true
- inherited_agent_cleanup_discarded：true
- 未派发角色：当前线程处于 quarantine，不能发现、创建、等待或关闭专家 agent；本轮是窄范围前端契约补强，可由主线程以代码和测试证据完成。

## 裁决

| 争议 | 裁决 | 理由 |
|---|---|---|
| 是否直接做 provider 自动重试 | 否。 | 需要服务器成本、限流、幂等和真实 provider 验证，不能由 UI 猜测实现。 |
| 是否暴露原始错误 | 否。 | 原始 body、配置和日志可能包含不适合普通用户或公开仓库的信息。 |
| 是否把 fallback 标为“成功” | 否。 | 草稿可用与真实 provider 成功是两件事，必须分别展示。 |
| 是否改变数据隔离 | 否。 | 仅复用现有 `llmRuns` 和 `dataScope`，不修改用户数据模型或权限。 |

## 完成条件

- 已知错误码在 Coach 与 Stats 中得到相同诊断和下一步动作。
- 客户端认证/API/合同失败能留下安全诊断码，而不是全部坍缩为 `server_generation_failed`。
- 单测与渲染验证证明用户能看到新的恢复提示。
- 不声称真实 provider、服务器或 Android 已通过。

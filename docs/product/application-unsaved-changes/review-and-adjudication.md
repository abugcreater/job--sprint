# 机会编辑未保存修改保护审阅与裁决

日期：2026-07-26

## Manager Dispatch

- status：`MANAGER_DISPATCH_PASS`
- owner：Team Lead 主线程
- max_agents：0
- agent_lifecycle_budget：0
- current_thread_quarantine：true
- inherited_agent_cleanup_discarded：true
- 跳过 Product、Tech、Implementation、QA 专家：当前线程处于 quarantine，不能发现、创建、等待或关闭专家 agent；本轮是已有 P2 交互缺口的窄范围修复，可由主线程以现有页面、测试与浏览器证据完成。

## 裁决

| 问题 | 裁决 | 理由 |
|---|---|---|
| 是否直接建设全局 dirty form 框架 | 否。 | 各模块的保存、路由和 Android 返回语义不同，当天无法安全统一。 |
| 是否保护机会编辑器的取消和移动端关闭 | 是。 | 两个控件都调用同一退出意图，且会直接重置草稿，问题有代码和产品文档证据。 |
| 是否自动保存或恢复草稿 | 否。 | 会改变 Evidence Gate 和本地/服务端同步边界，需要独立数据合同。 |
| 是否拦截刷新、强杀或全部外部路由 | 否。 | 浏览器/WebView 生命周期保护需要单独验证，不能用局部页面确认冒充覆盖。 |

## 完成条件

- 有修改与无修改的退出行为可区分。
- 继续编辑不会丢失输入，放弃修改不会写入机会记录。
- 现有新增、编辑、删除、对照和 Evidence Gate 路径不回归。
- 文档明确局部范围与未覆盖的全局表单能力。

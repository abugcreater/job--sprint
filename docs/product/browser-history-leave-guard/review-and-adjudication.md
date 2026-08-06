# 审阅与裁决

## 事实

- 当前生产 Web 使用声明式 `HashRouter`，它不能为 `useBlocker` 提供数据路由上下文。
- React Router `6.30.4` 已提供 `createHashRouter`、`RouterProvider` 与 `useBlocker`。
- 现有守卫仅在 DOM 链接捕获阶段中断导航，因此历史 `POP` 未被处理。

## 裁决

采用方案 B。通过官方路由状态机阻塞导航，而不是先发生浏览器返回、再从 `popstate` 修正 URL。

## 风险控制

- 路由路径仍使用 `/today` 等现有绝对路径，保留 hash 部署兼容性。
- 确认面板只对 `blocked` 状态执行 `proceed()` 或 `reset()`，防止重复导航。
- 用内存数据路由模拟历史栈，覆盖实际 `POP` 状态机；全量 React 构建验证 Hash 数据路由可编译。
- 本轮不把移动端物理返回、预测返回和浏览器关闭误标为已覆盖。

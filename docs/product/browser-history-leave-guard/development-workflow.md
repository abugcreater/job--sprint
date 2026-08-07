# 开发与验证流程

## 实施

1. 将 `AppRouter` 的声明式 `HashRouter` 路由表迁移为 `createHashRouter` 对象路由。
2. 在 `RouteLeaveGuardProvider` 中注册官方 `useBlocker`，让确认面板处理路由阻塞结果。
3. 保留只读链接来源记录，用于“继续编辑”后的无障碍焦点恢复；不在捕获阶段取消链接事件。
4. 将守卫测试改为 `createMemoryRouter`，并增加 dirty 草稿下的历史 `POP` 测试。

## 最小充分验证

- `npm --prefix apps/react-web test -- RouteLeaveGuard.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test`
- `npm --prefix apps/react-web run build`
- `npm run sync:android-react && gradle -p apps/android :app:assembleDebug`
- `npm run test:local-functional`
- `npm run validate:architecture-quality && npm test`
- `npm run validate:product-iteration && npm run scan:sensitive && git diff --check`

## 不执行

不运行 `npm run test:release`，因为本轮没有服务器交付授权，也不涉及远端发布。

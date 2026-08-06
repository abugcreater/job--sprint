# 完成审计

状态：代码与本地验证完成，待本轮 GitFlow PR 合入 `develop`

## 已确认

- GitFlow 起始门禁通过，工作分支为 `codex/fix/UX-017-browser-history-leave-guard`。
- `develop` 没有目标为 `develop` 的开放 PR、Draft 或远端短分支积压。
- `develop` 与 `main` 存在内容差异，但 `v0.2.7` 发布于 2026-08-04，当前累计需求不足三项，今天不创建 release。
- 方案已明确排除 history 回滚和自动保存。

## 待完成

- `AppRouter` 已迁移为 `createHashRouter` + `RouterProvider`；每次 App 挂载创建独立路由实例，避免测试或嵌入场景复用历史状态。
- `RouteLeaveGuardProvider` 已用 `useBlocker` 暂停脏草稿下的跨 pathname 路由导航；确认面板分别调用 `reset()` 与 `proceed()`，不写回或伪造历史。
- `RouteLeaveGuard.test.tsx` 已覆盖 dirty 草稿历史 `POP` 的继续编辑与确认离开；会话门禁测试已换为数据路由容器。
- React 定向回归、全量 48 个文件 145 项测试、类型检查与 production build 已通过。
- 已同步 React 资源到 Android，并完成 `:app:assembleDebug`；`test:local-functional` 已覆盖浏览器重启、移动端读回、导入恢复与 Rust SQLite UI 持久化。
- `npm test`、架构质量、功能覆盖、功能对齐、产品迭代、敏感扫描、`git diff --check` 与 PR 前 GitFlow 门禁已通过；功能覆盖/对齐仅保留既有 Android 远端真机 evidence 缺失 warning，目标验收为 `PASS_WITH_LIMITS`。

## 验收边界

本审计不替代浏览器关闭提示的人工兼容性测试，不提供 Android 真机、预测返回、强杀、进程恢复或服务器部署证据。同页 query/hash 交互仍由对应模块自行确认，不进入全局路由守卫。

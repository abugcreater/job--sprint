# 浏览器历史返回草稿保护

日期：2026-08-06

## 问题

用户在画像、知识边界、日程、机会或复盘中输入未保存内容后，现有 `RouteLeaveGuardProvider` 能拦截页面内 `#/...` 链接、整页离开和 Android 系统返回，但浏览器后退/前进属于路由历史 `POP`，会绕过确认面板并离开编辑页面。

## 目标

在不读取草稿内容、不改数据模型、不写入服务端的前提下，让 Web 的 Hash 路由历史返回/前进与站内链接使用同一份“继续编辑 / 放弃修改并离开”确认。

## 范围

- 将 Web 路由改为 React Router `createHashRouter` 数据路由。
- 用官方 `useBlocker` 拦截有脏草稿时跨页面路径的路由 `PUSH`、`REPLACE` 与历史 `POP`。
- 保留链接焦点恢复、`beforeunload` 和 Android bridge 的既有职责。
- 为 `POP` 的继续编辑和确认离开补自动化回归。

## 非目标

- 不伪造 `pushState`，不以 `history.go()` 回滚浏览器历史。
- 不拦截同一页面内仅 query/hash 改变的编辑器、筛选和视图状态；这些交互继续使用各模块既有确认。
- 不自动保存、恢复草稿或迁移草稿到服务端。
- 不承诺 Android 预测返回动画、应用强杀、进程回收或跨进程恢复。
- 不修改 Android 包、服务器、远端配置、账号或生产数据。

## 文档

- [方案比较](prd-options.md)
- [推荐方案](prd-recommended.md)
- [审阅与裁决](review-and-adjudication.md)
- [开发与验证流程](development-workflow.md)
- [完成审计](completion-audit.md)

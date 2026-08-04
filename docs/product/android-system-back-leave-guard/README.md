# Android 系统返回未保存内容保护

日期：2026-08-02
状态：已完成（本地源码与 APK 编译验收）

## 问题与结论

Android `MainActivity` 原先把系统返回直接转成 `WebView.goBack()`；这会绕过 React 中针对站内链接的未保存内容确认。当前任务在 WebView 与 React 之间建立最小返回协商：网页只有发现脏草稿时才接管返回并展示既有确认面板，用户确认放弃后才由原生执行一次真实返回或退出。

## 用户路径

1. 用户在画像、知识边界、日程、机会或复盘中输入未保存内容。
2. 在 Android 应用按系统返回键。
3. 页面显示“离开当前页面？”；继续编辑保留输入，放弃修改后才返回上一页或退出应用。
4. 没有未保存内容时，系统返回保持原有的 WebView 返回或退出行为。

## 范围

- 新增受限的 Android 返回桥，仅暴露“确认后完成返回”动作。
- React 复用现有 `RouteLeaveGuard` 对话框和 dirty 回调，不修改数据写入、保存或同步语义。
- 补原生结构回归、React 行为回归和 Android 构建验证。

## 非目标

- 不通过重复 `pushState`、history 回滚或返回循环拦截浏览器历史。
- 不实现浏览器历史返回、强杀/进程回收后的草稿快照和恢复。
- 不自动保存、不同步草稿、不修改后端、服务器、远端配置、账号或生产数据。

## 验收入口

- [方案比较](prd-options.md)
- [推荐方案](prd-recommended.md)
- [审阅与裁决](review-and-adjudication.md)
- [开发与验证流程](development-workflow.md)
- [完成审计](completion-audit.md)

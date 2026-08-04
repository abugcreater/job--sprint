# Android 系统返回未保存内容保护开发与验证流程

日期：2026-08-02

1. 审计 `MainActivity`、`AndroidActivityLifecycleController` 与 `RouteLeaveGuard`，确认原生返回当前直接调用 `WebView.goBack()`。
2. 建立功能胶囊，冻结不使用 history 回滚的裁决和安全边界。
3. 新增原生返回协调器与受限桥，在 `AndroidWebViewInitializer` 注册。
4. 将生命周期控制器改为先请求网页处理；只有网页未接管时才走真实返回。
5. 扩展 React 守卫，监听 Android 事件并复用确认面板；确认放弃后调用原生桥。
6. 补 React 行为测试与 Android 静态结构回归，运行类型检查、前端构建、debug APK 编译、架构和敏感扫描。
7. 更新产品账本、已知问题、日更日志和完成审计，走 GitFlow PR 合入 `develop`。

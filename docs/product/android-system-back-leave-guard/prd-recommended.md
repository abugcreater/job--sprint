# Android 系统返回未保存内容保护推荐方案

日期：2026-08-02

## MVP 合同

1. Android 系统返回先向当前 WebView 派发一个可取消的 `jobsprint:android-back-pressed` 事件。
2. React 的 `RouteLeaveGuardProvider` 在存在任一脏草稿时取消该事件，并显示既有确认对话框。
3. 用户选择继续编辑时，原生不导航，输入保持不变。
4. 用户选择放弃修改时，React 调用 `AndroidBackNavigation.completeBackNavigation()`；原生只执行一次 `WebView.goBack()`，无可回退页面时结束当前 Activity。
5. 没有脏草稿、网页未加载 React 或事件未被取消时，原生直接执行同一真实返回动作。

## 安全与数据边界

- `AndroidBackNavigation` 仅提供无参数、无返回值的确认后返回动作。
- 原生桥不读取或传递草稿、账号、Cookie、令牌、远端地址和文件内容。
- 原生仍使用现有 URL 白名单和 HTTPS 校验；本任务不扩大 WebView 可访问范围。

## 指标与验收

- 脏草稿的系统返回必须先出现确认，继续编辑后不导航。
- 确认放弃后桥被调用一次；无脏草稿不出现确认。
- Android 结构回归、React 单测、类型检查、前端构建和 debug APK 编译通过。

## 非目标

- 浏览器历史返回、Android 手势返回的原生动画适配、应用强杀、进程回收和草稿恢复仍另立需求。

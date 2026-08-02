# Android 系统返回未保存内容保护完成审计

日期：2026-08-02
状态：`PASS_WITH_LIMITS`

| 验收项 | 证据 | 状态 |
|---|---|---|
| Android 系统返回不再直接绕过脏草稿确认 | `AndroidBackNavigationController` 先派发可取消事件，`RouteLeaveGuard` 有脏草稿时接管 | PASS |
| 继续编辑不导航且保留输入 | `RouteLeaveGuard.test.tsx` Android 返回回归 | PASS |
| 放弃修改后只完成一次真实返回 | React 断言桥只调用一次；Java 结构回归断言桥只走 `goBack()` 或 `finish()` | PASS |
| 无脏草稿保持原有返回体验 | React 干净返回回归与 Java 协调器结构回归 | PASS |
| Bridge 不扩大敏感能力 | 桥仅有无参数 `completeBackNavigation()`；架构质量和敏感扫描通过 | PASS |
| 不宣称浏览器历史、强杀或远端 Android 已覆盖 | 本文件和已知问题边界 | 已明确 |

## 已完成验证

- `npm --prefix apps/react-web test -- RouteLeaveGuard.test.tsx`：PASS，4 项。
- `npm --prefix apps/react-web run typecheck`：PASS。
- `npm --prefix apps/react-web test`：PASS，45 个文件、136 项。
- `npm --prefix apps/react-web run build && npm run sync:android-react`：PASS，Android assets 已同步。
- `:app:assembleDebug`：PASS。
- `node tests/android_activity_lifecycle_controller_test.js`、`node tests/android_webview_initializer_test.js` 与 `node tools/validate_architecture_quality.js`：PASS。

## 限制

- 当前没有连接 Android 真机或模拟器，未执行物理返回键、手势返回和应用退出的运行时验收。
- 浏览器历史返回、预测返回的系统动画适配、应用强杀、进程回收和草稿恢复没有在本次实现。

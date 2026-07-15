# UI 基线完成审计

日期：2026-07-10

结论：`PASS_WITH_LIMITS`

## 已完成范围

- Web/Android 共用的产品 token、字体、表面、圆角、阴影与 reduced motion 基线。
- 桌面深墨色分组侧栏、移动单行产品头、唯一同步恢复入口、跳过导航链接。
- Today 新用户三步建档脊柱、已有日历的单任务工作面、真实状态带、决策上下文 rail。
- Evidence 表单打开后自动聚焦，保存/取消后返回触发按钮；触控型筛选与展开按钮提升到 44px。
- Android React assets 同源同步、状态栏颜色、系统图标对比度与重复顶部 inset 修复。

## Web 验证

| 验证 | 结果 |
|---|---|
| 根级 `npm test` | PASS；覆盖 Node/Rust/Android 边界、React 96 条测试、产品迭代、架构质量与敏感信息扫描。 |
| `npm --prefix apps/react-web test` | PASS，28 个文件、96 条测试。 |
| `npm --prefix apps/react-web run typecheck` | PASS。 |
| `npm --prefix apps/react-web run build` | PASS；存在既有单 chunk 超过 500 kB 警告。 |
| HashRouter 键盘跳过链接 | PASS；从 `#/interview` 用 Enter 激活后路由不变，焦点进入 `app-content`。 |
| 1440x1100 最终任务态截图 | PASS；`/tmp/job-sprint-ui-final/today-active-desktop.png`，时间晚于最终 dist。 |
| 390x844 最终任务态截图 | PASS；`/tmp/job-sprint-ui-final/today-active-mobile.png`，无横向溢出。 |

## Android 验证

| 验证 | 结果 |
|---|---|
| React dist 与 Android assets `diff -qr` | PASS，零差异。 |
| `node tests/android_window_layout_controller_test.js` | PASS。 |
| 最新工作树 APK | 正式 `com.kai.jobsprint` APK 构建、v2/v3 验签并覆盖安装成功；APK SHA-256 为 `8dabb6902de7ae136e7f9e81336fd8ffa080bb79a1072ba6fd17843aa2141b09`。 |
| Android HTTPS 远端流 | PASS；正式域名登录/session、保存、AI 草稿处理和杀进程重启读回通过。 |
| 全路由真机布局 | 384 CSS px；8 个主路由均无横向溢出。 |
| 真机键盘态 | PASS；`792→487px`，输入框与主操作位于键盘上方，关闭后底栏恢复。 |
| Evidence 表单触控量测 | PASS；保存与取消按钮均为 44px。 |

## AI 团队验收

- UI Designer 先给出 `swissDesign + flatDesign` 的单任务作战台规格，并明确拒绝伪指标、重复同步和卡片瀑布。
- QA 首轮发现 HashRouter 跳过链接会重置页面、Web 截图晚于源码以及 40px 表单按钮；全部修复并追加回归测试、最终截图和真机量测。
- 复核结论：`SINGLE_SPECIALIST_PASS_WITH_LIMITS`。UI 专项限制来自审阅范围；P5 已独立补齐正式签名、服务器部署和 Android HTTPS 远端验收。

## 限制

- P5 已完成远端 Web、远端 Android WebView 与服务器部署；该结论不反向改写 P0–P4 当时仅做本地 UI 验收的历史过程。
- 当前最新工作树尚未创建 GitHub PR 或合并到 `develop`。
- UI 结论只证明本轮全流程重构通过明确门禁，不把一次交付外推为 AI 审美能力的永久保证。
- 根级门禁中的 `goal_acceptance` 测试已跟随当前适配器合同改用 `goal_acceptance_has_limits`；门禁状态仍为 `PASS_WITH_LIMITS`，没有放宽验收条件。

## 历史正式包提示

旧正式 APK 哈希只证明“产品壳 + Today”竖切的历史构建。P5 已为最新工作树重新生成并验签正式 APK；最新真机证据见 `docs/product/product-flow-redesign/p5-https-production-delivery.md`。

## 当前结论

P0–P5 主旅程重构与 HTTPS 生产交付已经完成。后续工作不再是“继续补页面”，而应根据真实使用数据处理冷启动拆包、离线冲突恢复和 P8 架构范围。

# UI 基线团队审阅与裁决

日期：2026-07-10

## 路由

- entrypoint：`manager-dispatch`
- Team Lead：主线程，负责范围、实现、验证和最终裁决。
- 必要专家：UI Designer，只读审阅，不修改仓库。
- 未派发 Product：首轮用户路径已由用户原话和既有 product-ops 事实源限定。
- 未派发 Tech：没有新依赖、后端合同或数据架构变更。
- 未派发 Implementation：主线程直接实现，避免多人同时写同一组前端文件。
- QA：最终证据由主线程运行全量 Web 与 Android 门禁；首轮不是发布级审计，不升级 Full Team Room。

## UI Designer 关键意见

1. 历史训练只证明方法和原型积累，不能证明审美已经稳定提升；本轮必须以 Job Sprint 实际截图和运行证据判断。
2. 采用“单任务作战台”，拒绝 KPI 卡阵列、同步伪交互和卡片瀑布。
3. 删除固定 `35/60/100` 任务进度和 Evidence 分母至少为 4 的伪指标。
4. 同步失败只保留真实“前往同步与恢复”，没有真实动作时不显示“重试成功”。
5. Android 必须使用整机截图验证状态栏、底栏、安全区、键盘和触控尺寸，不能用 Web 390px 代替。

## Team Lead 裁决

- 采纳单任务作战台、`swissDesign + flatDesign`、桌面状态带和移动任务优先。
- 采纳删除伪进度与伪重试；Evidence 保存/取消后焦点返回触发按钮。
- 桌面保留真实完成数、证据数、计划时长和周期；移动端不显示四格状态带，直接进入当前任务。
- Android 真机截图发现原生根容器重复应用状态栏 inset，按单点根因修复；同时移除深色状态栏上的 `LIGHT_STATUS_BAR`。
- 不扩大范围到 Coach、Learning、Interview、Stats、Applications、Review 和 More 的内部重构；它们只继承全局壳和 token。

## 反向证据

- 第一次视觉采集只得到 Vite 错误覆盖层，因为开发服务未重新加载新增 Tailwind token；重启后重新采集，错误图不计入结论。
- Android debug APK 因签名与已安装正式版不一致而被系统拒绝；未卸载应用，改用同证书正式 release 覆盖安装以保留数据。
- 一次 Android 复跑因 USB 设备脱离导致 WebView 调试页关闭；ADB 重连后对最终 APK 重新跑通，不把中间失败隐藏为成功。

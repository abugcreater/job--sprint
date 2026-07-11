# P4：统计、数据设置与全量回归

日期：2026-07-10

结论：`PASS_WITH_LIMITS`

## 低频页面收口

### 进展统计

- 首屏只展示今日完成、Evidence Gate、画像完整度和同步状态四类事实。
- 画像、知识、面试、机会、复盘与数据完整度明细改为按需展开。
- “知识卡”改为“任务知识摘要”，“评分维度”改为“规则自检维度”。
- 384px Web 默认高度从 `3307px` 降为 `958px`。

### 我的数据

- 页面改为“账号 / 备份 / 更多入口”互斥视图。
- 默认只显示同步状态、账号范围和数据摘要。
- 备份导入/导出、回滚说明和低频入口不再连续堆叠。
- 384px Web 默认高度从 `2534px` 降为 `1378px`。

## 全量验收口径

- Web 与 Android 共享同一 React production build，Android assets 必须零差异。
- 384px 所有主旅程不得横向溢出。
- Android 必须验证状态栏、安全区、软键盘、底栏隐藏与恢复。
- 真实异步状态保留 loading/saving/error；本地同步操作不伪造 loading。
- 正式交付必须同时验证 release signing、APK hash、远端 HTTPS URL、登录/session、保存和杀进程读回，不能沿用旧 APK/hash。

## 最终回归结果

- 根级 `npm test` 通过；React 为 28 个文件、96 条测试全部通过。
- TypeScript、Vite production build、架构质量、功能覆盖、功能对齐、目标验收、产品迭代、工作区边界与敏感信息扫描全部通过。
- React `dist` 与 Android assets 零差异，正式 APK 构建、v2/v3 验签并覆盖安装成功。
- OnePlus 8 Pro 上 8 个主路由均为 `scrollWidth = 384px`，不存在横向溢出。
- Android 统计页默认高度 `955px`，我的数据默认高度 `1316px`。
- 面试输入法打开后 `792→487px`，输入框底部约 `333.5px`；关闭键盘后底栏恢复。

## 限制

- Vite production build 仍有单 chunk 超过 500 kB 告警；必须用真实冷启动指标指导拆包，不能仅为消除告警机械拆分。
- P5 已补远端 HTTPS Android evidence 与正式签名 APK；当前交付限制仅保留未提交工作树、P8 理论性架构门禁和单 chunk 告警。

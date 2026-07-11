# Job Sprint 产品级 UI 基线

日期：2026-07-10

## 状态

- 当前阶段：全流程 `PASS_WITH_LIMITS`
- 目标：以全局产品壳与“今日”工作台为基线，完成所有主工作台并把同一 React 产物同步到 Android WebView。
- 分支：`codex/feature/product-ui-foundation`
- 堆叠基线：`codex/chore/gitflow-governance`
- 最终目标分支：`develop`

## 原始问题

用户希望升级 Job Sprint 的 Web 与 Android UI/交互，让它更像可持续使用的产品，而不是功能堆叠的玩具；工作流沿用此前有效的“基线截图、互斥构图、真实状态、桌面/移动验证、不过度宣称”方法。

## 起始竖切

本轮只处理两处高杠杆表面：

1. 全局产品壳：品牌、导航、账号与同步状态、桌面侧栏、移动顶部与底部导航。
2. 今日工作台：新用户建档空状态，以及已有个人日历时的单任务执行主链路。

React 构建产物会同步进 Android assets，因此同一设计必须同时通过 Web 1440px、Web 390px 和 Android WebView 验收。

## 需求卡

- 原始问题：Web 和 Android 看起来更像玩具，不像成熟产品。
- 目标用户：个人求职者；owner/admin 不在本轮主路径。
- 用户路径：打开产品 -> 识别当前状态 -> 开始唯一主动作 -> 补证据 -> 完成或恢复。
- 影响模块：React 全局壳、今日页、Android WebView assets、产品文档。
- 工作分支：`codex/feature/product-ui-foundation`
- 来源分支 / PR 目标：当前为 GitFlow 治理分支上的堆叠分支；治理基线合入后重放到 `develop`，PR 目标为 `develop`。
- 提交计划：`feat(ui): establish product shell and today workbench`；`test(android): verify shared responsive product surface`；`docs(product): record ui foundation evidence`。
- 当前问题类型：信息架构与 UI 闭环。
- 数据对象：不新增数据对象；复用 profile、schedule、evidence、sync state。
- 权限边界：普通用户主路径不新增 owner/admin 能力。
- 新用户空状态：只展示建档路径和数据边界，不加载示例任务。
- 成功反馈和读回：复用现有画像、日程、证据保存读回；视觉改造不得破坏。
- 失败/disabled 恢复：本地模式提供真实的“前往同步设置”导航；无画像时主动作直接进入画像模块。
- 破坏性动作确认：无。
- 统计归属：跨模块统计继续留在 Stats，不在今日页堆 KPI。
- AI 草稿契约：不改变。
- 验证层级：React 单测/类型/构建、桌面与移动截图、Android assets 同步、Android WebView 功能回归与构建。
- 明确不做：不改后端契约、不做远端发布、不宣称完整 Android release 交付。
- 完成状态：`PASS_WITH_LIMITS`。全局产品壳、Today、准备、机会、学习、面试、复盘、统计和数据设置均已迁移，正式签名、服务器部署和 Android HTTPS 远端验收已在 P5 通过；限制来自未提交工作树、P8 理论性架构门禁和既有 Vite chunk 告警。

## 验收入口

- [方案比较](./prd-options.md)
- [推荐方案](./prd-recommended.md)
- [团队审阅与裁决](./review-and-adjudication.md)
- [开发与验收流程](./development-workflow.md)
- [完成审计](./completion-audit.md)

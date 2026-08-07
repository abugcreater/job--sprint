# 历史数据域冲突可见性

日期：2026-08-05
状态：已完成

## 需求卡

- 原始问题：新建账号已拒绝重复 `dataScope`，但历史 users file 若已有重复配置，owner 无法发现仍可能共享求职数据的账号。
- 目标用户：受邀用户的 owner；普通求职用户不访问管理后台，也不会收到其他账号信息。
- 用户路径：owner 打开邀请账号管理 -> 服务端读取可管理账号 -> 识别重复数据域 -> 显示风险与手动恢复边界 -> owner 核验并处理账号。
- 影响模块：Node/Rust 邀请管理 API、owner 邀请管理面板、账号合同测试、产品账本。
- 数据对象：只读取 `username` 与 `dataScope`；不写 users file、runtime 数据、邀请台账或审计记录。
- 权限边界：仅 `/api/coach/invitations` 的 owner 响应可见；普通用户无该接口权限。

## 本轮范围

1. Node 与 Rust 响应统一返回 `dataScopeConflicts`，包含重复的数据域和受影响登录名。
2. owner 界面在台账上方展示明确风险、账号列表与手动处理边界。
3. 用 Node HTTP 合同、Rust 单元合同和 React 交互测试证明结果一致。

## 明确不做

- 不自动迁移、删除、禁用或重命名账号，不猜测历史 runtime 数据归属。
- 不向普通用户暴露其他账号名或数据域。
- 不做公开注册、组织共享空间或服务端部署。

## 验收入口

- [方案比较](prd-options.md)
- [推荐方案](prd-recommended.md)
- [评审与裁决](review-and-adjudication.md)
- [开发与验证流程](development-workflow.md)
- [完成审计](completion-audit.md)

# 完成审计

状态：已完成（本地、跨运行时与 Android debug 构建验收）

| 验收项 | 预期证据 | 状态 |
|---|---|---|
| Node 返回历史重复数据域 | `invitation_account_provisioning_test.js` HTTP 断言 | PASS |
| Rust 与 Node 合同一致 | `cargo test` 数据域冲突聚合测试 | PASS |
| owner 看见可恢复提示 | React 组件测试 | PASS |
| 普通用户不获得管理数据 | 既有 owner 权限与接口回归 | PASS |
| Web/Android 资产一致 | 构建、同步、debug 构建 | PASS |

## 验证记录

- `node tests/invitation_account_provisioning_test.js`：PASS，临时 users file 中的历史重复 scope 通过 owner HTTP 响应读回，响应不包含明文密码。
- `npm run test:rust`：PASS，24 个单元测试和 2 个合同测试；其中 `data_scope_conflicts_only_returns_reused_scopes` 覆盖 Rust 聚合合同。
- `npm --prefix apps/react-web test`：PASS，48 个文件、144 项；`InviteManagementDataScopeConflict` 覆盖 owner 风险提示与既有保存前拦截。
- `npm run test:local-functional`：PASS；`npm --prefix apps/react-web run typecheck`、`npm --prefix apps/react-web run build`、`npm run sync:android-react`、`gradle -p apps/android :app:assembleDebug`：PASS。
- `npm run validate:architecture-quality`、`npm test`、`npm run validate:product-iteration`、`npm run scan:sensitive`、`npm run validate:gitflow -- --phase before-pr`、`git diff --check`：PASS；功能覆盖门禁仅保留既有 Android 远端 evidence 缺失 warning。
- `cargo fmt --check` 仍列出未触及 Rust 文件的既有格式差异；本轮 `coach_invitation_routes.rs` 已单独以 Rust 2024 格式化，不能把全仓格式失败归因于本次改动。

## 交付边界

- 本轮不部署服务器，不创建、删除或修改远端账号。
- 本轮不自动迁移历史 runtime 数据；真实生产重复配置仍必须由 owner 核验后处理。

# 完成审计

状态：已完成（本地、跨运行时与 Android debug 构建验收）

| 验收项 | 预期证据 | 状态 |
|---|---|---|
| 新账号不能复用其他账号数据域 | Node/Rust 合同测试返回 `409` | PASS |
| 冲突失败没有写入账号或邀请记录 | users file 与响应断言 | PASS |
| 同账号密码重置不改变数据域 | Node/Rust 既有重置回归 | PASS |
| owner 在界面保存前知道冲突 | React 页面交互回归 | PASS |
| Web/Android 交付物一致 | 构建、资产同步、Android debug 构建 | PASS |

## 验证记录

- `node tests/invitation_account_provisioning_test.js`：PASS，Node API 拒绝 `mia-shadow -> mia`，且 users file 与邀请台账均无副作用。
- `cargo test --manifest-path apps/rust-api/Cargo.toml runtime_contract_matches_node_core_api`：PASS，Rust/SQLite 合同复用同一冲突场景。
- `npm --prefix apps/react-web test`：PASS，48 个文件、143 项测试；`InviteManagementDataScopeConflict` 覆盖页面保存前拦截。
- `npm --prefix apps/react-web run typecheck`、`npm --prefix apps/react-web run build`、`npm run sync:android-react`、`gradle -p apps/android :app:assembleDebug`：PASS。
- `npm run test:local-functional`、`npm test`、`npm run validate:architecture-quality`、`npm run scan:sensitive`：PASS；功能覆盖门禁仅保留既有 Android 远端 evidence 缺失 warning。

## 交付边界

- 本轮只发布开源 Git 源码，不部署服务器、不创建或修改远端账号、不迁移数据。
- 没有连接 Android 设备时，debug 构建不等于真实 WebView/登录流程验收。

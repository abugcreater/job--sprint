# 完成审计

## 实施前检查

- [x] GitFlow 开始门禁通过，来自干净的 `develop`。
- [x] 无目标为 `develop` 的开放 PR、Draft 或短分支积压。
- [x] 已确认本轮不部署服务器、不修改账号、远端配置或真实数据。

## 验收清单

- [x] 非空回答离页时需要明确确认。
- [x] 清空、题型切换和题目切换在非空时需要明确确认。
- [x] 继续编辑后保留回答与原题上下文。
- [x] 放弃后不创建 Evidence Gate 证据。
- [x] 保存后仍按原格式写入当前面试任务。
- [x] 自动化与 PR 前 GitFlow 门禁通过。

## 当前验证证据

- `npm --prefix apps/react-web run typecheck`、面试页定向测试（5 项）和全量 React 测试（48 文件、147 项）均已通过。
- `npm --prefix apps/react-web run build`、`npm run sync:android-react`、`gradle -p apps/android :app:assembleDebug`、`npm run test:local-functional`、`npm test`、产品迭代/架构门禁、敏感扫描和 `git diff --check` 均已通过。
- 测试夹具仅有一题候选题；已覆盖与候选题替换共用的题型替换确认状态机。真实多题候选题端到端验证、刷新恢复、Android 预测返回、强杀和远端真机不在本次审计范围。

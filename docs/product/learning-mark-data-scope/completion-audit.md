# 完成审计

## 实施前检查

- [x] 从干净 `develop` 启动，`npm run validate:gitflow -- --phase start` 通过。
- [x] 没有目标为 `develop` 的开放 PR、Draft 或短分支积压。
- [x] 已确认不创建 release，不部署服务器，不操作账号或生产数据。

## 验收清单

- [x] 已登录账号使用独立数据域键读写学习重点标记。
- [x] 旧无归属共享 key 不被认证账号读取。
- [x] 数据域变化会重新载入当前账号标记。
- [x] 标记不写入 Evidence Gate、runtime、服务端或 AI 反馈。
- [x] 适配器与页面定向测试覆盖旧 key 拒读、双 scope 隔离和 scope 切换。
- [x] 全量 React 测试（48 文件、161 项）、typecheck、build 和本地功能流通过。
- [x] `npm test`、产品迭代/架构门禁、敏感扫描和 `git diff --check` 通过。
- [ ] GitFlow PR、required check、squash merge 和短分支删除。

## 当前限制

- 不迁移旧共享 key；其归属未知，不能安全归入任何账号。
- 未同步 Android React assets、未运行 Android 真机、远端服务器或跨设备同步验收；Android 脚本仅完成作用域键契约更新和语法检查。

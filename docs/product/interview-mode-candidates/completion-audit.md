# 完成审计

## 实施前检查

- [x] GitFlow 开始门禁通过，来自干净的 `develop`。
- [x] 无目标为 `develop` 的开放 PR、Draft 或短分支积压。
- [x] 已确认本轮不部署服务器、不修改账号、远端配置或真实数据。

## 验收清单

- [x] 题型切换会产生符合题型语义的候选题，而非仅改变选中态。
- [x] 候选题只引用当前用户画像、当前任务或当前数据域的机会记录。
- [x] 有 JD 记录和无 JD 记录的降级路径都清晰可用。
- [x] 未保存回答时，切换题型仍先确认且不会提前写入 Evidence Gate。
- [x] 保存路径、自动化和普通需求 GitFlow 门禁通过。

## 当前验证证据

- `npm --prefix apps/react-web run typecheck` 已通过。
- 面试 adapter 与页面定向测试已通过，13 项覆盖题型差异、真实机会记录、无 JD 降级和未保存回答切换确认。
- 全量 Web 测试已通过：48 个文件、150 项；构建、架构质量与产品迭代门禁已通过。
- Android 资源同步与 Debug 编译、根功能流、根测试、敏感扫描、`git diff --check`、GitFlow PR 前门禁均已通过；保留既有 Android 远端真机 evidence 缺失 warning。

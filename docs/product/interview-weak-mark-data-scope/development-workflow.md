# 开发与验证流程

1. 从干净 `develop` 建立 `fix/interview-weak-mark-data-scope`，记录当前无开放 PR 和无发布触发。
2. 为弱标记适配器增加 `dataScope`、登录名、离线 `local` 的稳定键生成函数。
3. 保留旧 key 常量仅供兼容检测；认证读取路径不得回退到该 key。
4. 面试页订阅当前 `storageOwner`，数据域变化后重新读取本域标记。
5. 补适配器双账号隔离与旧 key 拒读测试，补页面 scope 切换回归；同步功能流的作用域键断言。
6. 功能流使用 Playwright 时，失败路径也必须关闭已启动的 context，避免断言失败后遗留浏览器进程。
7. 运行 React 定向/全量、typecheck、build、产品迭代、架构、敏感扫描与 GitFlow 门禁。
8. 完成 PR、required check、squash merge、分支删除和产品运营记录回写。

# 开发与验证流程

1. 新建 `authSessionScope` 纯函数，集中定义 owner 比较、状态 transition 和业务访问门禁。
2. RuntimeSyncBridge 复用 owner 比较函数，保持上传和服务端回填的原有校验。
3. AppShell 在异步会话解析完成后先应用 transition，再更新会话状态；路由出口仅在可访问状态渲染。
4. 使用单测验证状态机和 owner 处理，使用完整 React 测试、类型检查、生产构建、Android 资产同步/构建及安全扫描回归。
5. 仅在验证通过后创建并合并目标为 `develop` 的 PR；不触发服务器部署。

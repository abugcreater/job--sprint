# 开发与验证流程

1. 从邀请管理的可配置登录账号生成 `dataScope -> usernames` 分组。
2. 只返回用户名数大于 1 的分组，忽略空登录名，空数据域回退为登录名。
3. Node 与 Rust 使用同一响应字段；React 只读取该字段展示 owner 风险提示。
4. 运行 Node 合同、Rust 测试、React 测试和类型检查，再构建 Web/Android 资产。
5. 不运行服务器发布或用户数据迁移；通过本地、质量与敏感扫描后合入 `develop`。

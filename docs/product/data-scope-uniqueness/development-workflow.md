# 开发与验证流程

1. 读取 users file 后构造目标账号，并比较其他 `username` 的标准化 `dataScope`。
2. Node 与 Rust 都在写文件、写审计、写邀请记录之前返回相同的 `409 data_scope_conflict` 合同。
3. 在 React 草稿层复用同一“空数据域回退登录名”的规则，提交前作非权威预检。
4. 更新 Node 与 Rust 真实 HTTP/API 合同测试，验证失败不产生副作用。
5. 运行 React 测试、类型检查、构建、Android 资产同步/debug 构建及根测试、质量/安全门禁；仅在证据通过后合并 `develop`。
6. 本轮成为 `v0.2.6` 后第三项需求时，按 GitFlow 创建 `release/v0.2.7 -> main`，但不运行服务器交付。

# 推荐方案：会话门禁与 owner 切换

## 行为合同

| 会话状态 | 是否展示业务内容 | 本地运行态处理 |
|---|---:|---|
| `authenticated` | 是 | owner/dataScope 不匹配时先清空并绑定当前 owner |
| `anonymous` | 否 | 清空运行态，提供登录入口 |
| `checking` | 否 | 不读取或展示业务内容 |
| `failed` | 否 | 不清空未知归属数据，但不展示业务内容 |
| `local` / `unconfigured` | 是 | 保持单机或开发模式现有数据 |

## 关键约束

1. owner 比较优先使用 `dataScope`，缺失时才使用用户名。
2. 认证会话写入 UI 前必须先执行 owner transition。
3. 运行时同步仍保留既有 owner 校验，避免异步保存把 A 的数据写到 B 的会话。
4. 本轮所有证据仅证明客户端展示与本地状态隔离；服务端数据隔离继续由 Node/Rust 合同测试负责。

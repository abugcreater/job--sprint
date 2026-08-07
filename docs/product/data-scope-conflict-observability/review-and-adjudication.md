# 评审与裁决

## 产品视角

历史重复数据域直接解释了“新用户为什么看见旧内容”的高风险路径。优先让 owner 看见并处理，比把账号管理逻辑继续隐藏在配置文件中更可控。

## 技术视角

Node runtime JSON 与 Rust SQLite 都依赖 users file 决定 `dataScope`。检测应复用邀请管理的已授权账号列表，而不是扫描求职 runtime 或邀请记录。

## UI/UX 视角

风险提示放在 owner 台账的摘要下方，先说明影响账号，再说明系统不会自动迁移。它不阻断 owner 查看台账，也不提供危险的一键修复按钮。

## QA 视角

Node 通过临时 users file 构造历史重复配置并从 HTTP 响应断言；Rust 验证同一聚合规则；React 验证 owner 能看到风险和“不会自动改写”的边界。

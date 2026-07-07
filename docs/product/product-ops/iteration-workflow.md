# 可复用产品迭代工作流

日期：2026-07-06

## 适用场景

适用于 Job Sprint 之后所有产品级需求：定位调整、核心流程改造、新 AI 能力、多用户能力、Web/Android 同步改造、交付验收升级。

## Team Lead 固定流程

1. 读当前事实源：`docs/README.md`、`docs/core/`、当前 product capsule、`product-ops/`。
2. 做 AI 团队 preflight：如果有 `closing agents`、`agent thread limit reached` 或继承 cleanup 信号，立即进入 `current_thread_quarantine=true`，不要派发、等待或关闭 agent。
3. 写轻量 kickoff：任务类型、owner、角色、禁止角色、验证计划、why_not_full_team。
4. 先产出多版本 PRD，再裁决推荐版。
5. 先补验收矩阵，再改 UI 和数据。
6. 每个按钮验收输入、反馈、保存、导航或 disabled 原因。
7. 涉及新用户、多用户或画像的功能，必须验收首登进度、素材输入、边界采纳和下一步动作，不能只验收 CRUD。
8. Web 通过后必须同步 Android React assets，构建 APK，安装并跑 Android 本地功能。
9. 如需远端发布，最后跑 server delivery、server sync、remote service restart、remote evidence；涉及 React 新入口、邀请台账、批量导入或首登管理时再跑 remote invitation evidence；涉及 users file 登录账号开通时必须再跑 remote invitation account evidence；Android 远端仍必须单独跑 Android remote evidence 和 `validate:delivery`。
10. 收口时更新 product ledger、known issues、core acceptance 和 completion audit。

## 分层验收

| 层级 | 能证明什么 | 不能证明什么 |
|---|---|---|
| React 单测/typecheck/build | 前端代码和关键交互无明显回归 | 不能证明 Android 已更新。 |
| 本地功能测试 | Web 点击、保存、刷新和 Rust/SQLite 入库可用 | 不能证明远端服务器可用。 |
| Android 本地功能测试 | 当前安装 APK 的本地 WebView 可用 | 不能证明远端 HTTPS 首访可用。 |
| server delivery package | 本地交付包可生成，且同步包内 Rust binary 是 Linux x86_64 ELF | 不能证明已同步到 Linux 服务器。 |
| remote service restart | 远端服务进程已加载当前 manifest | 不能证明具体业务按钮已跑通。 |
| remote invitation evidence | 远端 React 新入口和邀请台账新增/读回/批量导入可用 | 不能证明真实登录账号已开通，也不能替代 Android HTTPS。 |
| remote invitation account evidence | 远端 users-file 账号开通、禁用、恢复、删除、批量账号动作、邀请通知草稿、smoke 用户登录、session 读回和数据隔离可用 | 不能证明公开注册、批量用户后台、外部 SMTP/IM 自动发送或 Android HTTPS。 |
| remote login switch evidence | 远端真实登录页可 owner 登录、退出、切换到 smoke 用户，并读回正确账号和数据域 | 不能证明 Android HTTPS，也不能证明公开注册或外部发送。 |
| `validate:delivery` | 完整交付证据聚合 | 失败时不得宣称生产交付完成。 |

## 复盘模板

每轮收口至少回答：

1. 原始目标有哪些明确条目？
2. 哪些条目已经有当前证据证明？
3. 哪些条目只是局部通过，不能扩大解释？
4. 哪些角色真实参与，哪些是主线程降级？
5. 哪些按钮或流程新增了输入、反馈和读回？
6. 下次迭代继承哪些规则？

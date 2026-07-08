# 项目规划

日期：2026-07-08

## 当前阶段目标

把 Job Sprint 从“个人私有可用 + 可演示 + 可验证”的状态，推进到“普通用户可闭环使用、管理员能力按权限收敛”的 AI 求职教练。当前优先级是求职画像、简历导入建档、知识边界、AI 建议、复盘闭环、统计集中和多用户隔离，而不是继续堆普通日程、题库或后台台账。

## 已完成主线

1. React Web 今日、学习、面试、投递、复盘、更多页已经进入 MVP / Phase B 可用状态，今日页已补齐延期记录，更多页已补齐 `jobSprint.react.v1` 导出/导入恢复。
2. Android WebView 已改为远端优先，远端不可用时回退本地 React assets / 旧 public-safe fallback。
3. Node runtime 已支持应用层登录、权限、`/api/runtime` 兼容读写、AI 评分 fallback、知识库生成 fallback。
4. Rust API + SQLite 已覆盖核心 runtime 合同、用户同步、legacy runtime JSON 首次迁移和 body limit 边界。
5. Web runtime 同步已通过刷新、浏览器重启、移动视口读回、延期记录、导入恢复和服务端 `/api/runtime` 证据验证。
6. Android 本地 WebView 保存进度已通过点击全流程、延期记录、导入控件存在性、杀进程重启读回和 localStorage hash 对比验证。
7. Codex AI 团队已抽离为全局入口，Job Sprint 只保留适配和验证工具。
8. 2026-07-08 已完成一轮产品闭环修复：普通用户画像页改为“导入简历建档 -> 确认求职画像 -> 采纳知识边界 -> 生成今日行动 -> 处理 AI 建议”，新用户知识/面试空态不再加载旧 Java 内容，更多页普通用户只保留账号、同步、个人备份和常用入口，管理员邀请与批次能力收敛到管理员中心；Web build 已同步到 Android `assets/react` 并通过目录 diff。

## 下一阶段优先级

| 优先级 | 事项 | 目标 |
|---|---|---|
| P0 | AI 求职教练产品闭环 | 以 `docs/product/it-job-coach-v1/prd-recommended.md` 为主合同，先完成定位、简历导入建档、求职画像、知识边界、AI 建议和有效推进数闭环；所有改动必须遵守 `docs/product/it-job-coach-v1/development-workflow.md`。 |
| P0 | 防 P0 回归门禁 | 每个新入口必须有输入、反馈、保存、刷新读回、移动端验证和失败态；不能再出现“按钮能点但流程不可用”。 |
| P0 | 多用户隔离设计 | 以邀请制小规模为边界，新增用户画像、日程、知识边界和 AI artifact 时必须服务端强制 user scope，不能只靠前端过滤。 |
| P0 | AI 建议 pipeline | AI 只生成待确认建议，不直接改正式日程；生成物必须可接受、编辑、拒绝，并记录 prompt version、schema 校验、引用证据、用户反馈和机会/JD 信号。 |
| P1 | 正式域名公网稳定首访 | 完成备案/接入备案或迁移方案，关闭公网 reset 风险。 |
| P1 | Rust/SQLite 服务端持续验收 | 维持服务器 Rust/SQLite 入口，域名恢复后补远端 HTTPS 首访、登录、保存和重启读回验收；远端同步后用 `npm run restart:remote-service -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/service-restart.json` 证明服务进程加载当前 manifest；远端 Web/服务器验收可用 `JOB_SPRINT_SERVER_REMOTE_ACCEPTANCE_EVIDENCE=<report.json> npm run write:remote-evidence` 生成可复核 JSON，脚本会在现有 `/api/progress` 上合并 `remoteAcceptance` marker 并读回确认；涉及 React 新入口或邀请台账时用 `npm run write:remote-invitation-evidence -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --report docs/evidence/server-remote/coach-invitations.json` 证明远端 React asset marker 和 `/api/coach/invitations` 新增/读回/批量导入。 |
| P1 | 目标级验收门禁 | 每次收口先跑 `npm run validate:goal-acceptance -- --allow-user-action`，按原始 7 项目标确认哪些已完全证明、哪些只是本地通过或仍需外部输入；该门禁已接入 `npm run validate:delivery`，避免把 Web/Android 本地测试、Rust/SQLite 入库或本地 APK 误报成服务器同步和正式 APK 已完成。 |
| P1 | 最终交付 readiness 门禁 | 使用 `npm run final:delivery` 编排发布门禁，使用 `npm run final:delivery -- --dry-run` 预览缺少的服务器、远端账号、Android 真机和正式签名输入；真实交付建议加 `--report docs/evidence/final-delivery/final-delivery.json` 或设置 `JOB_SPRINT_FINAL_DELIVERY_REPORT` 留存统一报告；runner 会先做 preflight，检查 `npm`/`node` 基础工具，并在对应 env 已配置时检查 `ssh`/`rsync`、`adb`、`gradle` 等条件工具，报告初步 PASS 后会追加 `post_final_report_validation`，该阶段只允许自身步骤尚未写入；最终落盘报告必须包含 `post_final_report_validation=PASS`；最终仍以 `npm run validate:delivery` 汇总架构质量门禁、功能覆盖门禁、Linux x86_64 ELF 目标平台校验、public-safe 待发布包扫描、server delivery package、服务器同步 evidence、最终交付统一报告、Web/服务器远端验收 evidence、远端 UI 登录切换 evidence、Android 远端 HTTPS 首访/登录/session 认证态/保存/重启读回证据、Rust release binary、正式 Android 签名和 `FORMAL_SIGNED` APK 验签报告；服务器同步前必须先用 `npm run test:local-functional` 验证 Web 功能持久化和 Rust/SQLite UI 入库，再准备 Linux x86_64 ELF Rust release binary，再用 `npm run build:public-safe` 生成 dist 包和 Android fallback 资产，并通过 `npm run scan:public-safe`，最后用 `npm run build:server-delivery` 把目标平台 Rust release binary 与 public-safe 包绑定成可同步产物，实际同步后用 `npm run write:server-sync-evidence` 生成远端 manifest hash 证据，再用 `npm run restart:remote-service` 证明远端服务加载当前 manifest；服务器远端 evidence 由 `npm run write:remote-evidence` 生成，报告必须包含登录、session、health、`/api/progress` 远端保存和读回通过输出；React 新入口或邀请台账能力由 `npm run write:remote-invitation-evidence` 补专项 smoke；users file 登录账号开通由 `npm run write:remote-invitation-account-evidence -- --allow-create-account` 补专项 smoke；登录/退出/账号可见性由 `npm run write:remote-login-switch-evidence -- --allow-create-account` 补专项 smoke；Android 远端 evidence 由 `npm run test:android:remote:functional` 生成，报告必须包含 `authEvidence` 且至少有一次 `/api/auth/session` 返回 authenticated；正式 APK evidence 由 `npm run build:android:release -- --report <report.json>` 或 `JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE=<report.json>` 生成，报告必须包含可重新计算匹配的 `apkSha256` 与证书 SHA-256；缺 Linux x86_64 ELF、public-safe 包/扫描、server delivery package、服务器同步 evidence、最终交付统一报告、远端 URL/账号、服务器远端验收报告、Android 远端验收报告、认证态证据、正式签名材料或 `FORMAL_SIGNED` 验签报告时保持 `USER_ACTION_REQUIRED`/`PASS_WITH_LIMITS`/`FAIL`，Rust 源码/Cargo/migration 文件比 release binary 更新时也必须先重建，不能把本地 WebView、macOS Mach-O、未扫描 dist、未绑定同步包、未同步证据、缺统一报告、未被 post-validation 复核的报告、旧 Rust binary、API 登录 smoke 或本地临时包当正式交付。 |
| P2 | AI provider 状态提示增强 | 已接入基础 timeout；继续补错误分类、重试和用户提示。 |
| P2 | Android 远端 API 鉴权 | 远端 token/session 登录产品化；当前 Basic Auth 凭据和远端 URL 已集中到 `AuthCredentialStore`，Basic Auth 用户名/密码已用 `AndroidKeystoreStringCipher` 通过 Android Keystore + AES/GCM 加密保存并迁移旧明文键，Basic Auth 弹窗、认证 host 校验、已保存凭据尝试和取消 fallback 已集中到 `AndroidBasicAuthController`，远端/本地 fallback、远端登录页加载和 WebSettings 切换已集中到 `RemoteWebViewController`，远端 URL 设置、reload remote 和 fallback 切换已集中到 `AndroidRemoteSettingsBridge`，Basic Auth 状态读取和清除已集中到 `AndroidAuthSettingsBridge`，远端 session cookie 状态读取、清除和重新登录入口已集中到 `AndroidSessionCookieBridge`，并受 `RemoteUrlPolicy` allowlist 约束；后续继续做完整远端 session/token 登录产品化。 |
| P2 | 技术架构拆分 | Rust 已先抽出 `app_bootstrap`、`runtime_store`、`runtime_records`、`runtime_routes`、`data_routes`、`application_routes`、`interview_mistake_routes`、`ai_routes`、`static_routes`、`static_files`、`http_responses`、`login_rate`、`session_token`、`auth_config`、`auth_bearer`、`auth_tokens`、`auth_users`、`auth_values`、`auth_hash`、`auth_permissions`、`auth_state`、`auth_http`、`auth_routes`、`ai_tools` 和 `ai_transcribe`；Android 已抽出 `RemoteUrlPolicy`、`AuthCredentialStore`、`AndroidKeystoreStringCipher`、`RemoteWebViewController`、`AndroidRemoteSettingsBridge`、`AndroidAuthSettingsBridge`、`AndroidSessionCookieBridge`、`AndroidRecorderBridge`、`AndroidRecorderUploader`、`AndroidTranscribeEndpointResolver`、`AndroidSpeechServiceResolver`、`AndroidSpeechErrorPolicy`、`AndroidSpeechErrorCoordinator`、`AndroidSpeechSessionState`、`AndroidSpeechCallbackEmitter`、`AndroidSpeechStartCoordinator`、`AndroidSpeechRecognizerController`、`AndroidSpeechBridge`、`AndroidBasicAuthController`、`AndroidWebChromePermissionController`、`AndroidRemoteWebViewClient`、`AndroidActivityLifecycleController`、`AndroidWindowLayoutController`、`AndroidWebViewInitializer` 和 `AndroidAppStartupController`，且远端登录页 URL 由 `RemoteUrlPolicy` 统一生成；Node 已抽出 `auth.js` 承接认证配置、session、权限和 cookie helper，`auth_routes.js` 承接 `/api/auth/session|login|logout` 兼容 handler 和登录限流，`runtime_store.js` 承接 runtime JSON 路径、envelope、用户 `dataScope`、读写和记录规范化，`runtime_routes.js` 承接 `/api/runtime|progress|reviews|applications|interview-mistakes` 兼容 handler，`static_files.js` 承接静态路径、public-safe fallback、content-type、私有静态资源和文件响应，`ai_routes.js` 承接 `/api/score-answer|generate-kb|transcribe` 兼容 handler、权限校验和请求解析，`ai_tools.js` 承接 AI 评分 fallback、知识库生成 fallback、provider timeout、JSON 抽取和 AI 结果规范化，`http_utils.js` 承接安全响应 header、JSON/redirect 响应、请求体读取和 multipart 音频解析；新增 `npm run validate:architecture-quality` 约束拆分模块存在、入口薄层、legacy JS 冻结和 Android fallback hash 一致性；Node 兼容入口已接近薄路由层，后续转向远端 session/token 产品化和剩余 JS bridge 最小化，冻结旧 `assets/schedule.js`，降低维护风险。 |
| P3 | 指标看板 | 只做轻量求职进展指标，不做复杂 BI。 |

## 文档治理策略

- 当前事实源只保留 `docs/core/`。
- 旧 PRD、历史验收、截图、复盘、发布说明和一次性执行文档默认删除或归档摘要。
- 验收结论必须落在 `04-acceptance-and-risk.md`，不得散落在历史目录。
- 删除旧文档前必须确认没有运行脚本、测试、数据路径依赖旧文件。

## 技术定位策略

如果用于求职表达：

- 可以说：这是个人求职冲刺工作台，体现产品化、全栈实现、AI 工程化辅助、移动端和验证意识。
- 不能说：这是高级 Java 后端主项目、生产 SaaS、强一致多端系统或企业级多租户平台。
- Java 主项目证据仍应来自 Spring Boot / Spring Cloud / MyBatis / MySQL / Redis / MQ / JVM / 稳定性治理等项目。

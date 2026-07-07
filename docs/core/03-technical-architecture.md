# 技术架构

日期：2026-07-07

## 技术栈

| 层 | 当前实现 | 说明 |
|---|---|---|
| Web 新前端 | React 19 + TypeScript + Vite + Zustand + React Router + Tailwind | 主入口，使用 Hash Router，适配 Web 和 Android WebView。 |
| Web 旧前端 | `schedule.html` + `assets/schedule.js` + `assets/schedule.css` | fallback 和历史兼容入口，后续冻结维护。 |
| 服务端兼容入口 | Node.js CommonJS 自研 HTTP server | 认证、静态资源、`/api/runtime` JSON 兼容 API、AI proxy、public-safe 支持。 |
| 服务端目标入口 | Rust + Axum + SQLx + SQLite | 覆盖核心 runtime 合同、session/bearer 权限、多用户 `dataScope`、legacy JSON 首次迁移和 AI 运行审计。 |
| Android | Java Activity + WebView | 远端 HTTPS 优先；仅允许 `job-sprint.example.com` 远端 host；远端不可用时 fallback 到本地 React assets / 旧 public-safe。 |
| 存储 | localStorage + `/api/runtime` + SQLite | React 本地优先启动后与服务端同步；Rust 侧使用 SQLite 持久化 users、runtime items、`llm_runs` 和 `llm_feedback`。 |
| AI | Anthropic-compatible provider + local fallback + LLM run/feedback audit | provider 未配置或失败时退回本地评分/生成；Rust 生成 AI 教练草稿时会尝试 Anthropic-compatible provider，并把 provider、model、token、延迟、可选成本和 schema 状态写入 `llm_runs`，采纳/拒绝反馈写入 `llm_feedback`。 |
| 验证 | Node tests、Playwright、Vitest、public-safe scan、Android release signing gate、workspace-boundaries validator、architecture-quality validator、functional-coverage validator、feature-parity validator、goal-acceptance validator | 根 `npm test` 应保持只读；release 构建另跑；架构质量门禁用于防止入口文件、兼容层和旧 JS 继续膨胀，并补充 Rust `mod`、Node `require`、Java `new Class` 的入口语义边界检查；功能覆盖门禁用于防止 Web/Android/Rust UI 验收脚本缺失关键业务流；功能对齐门禁用于防止 Web/Android 本地功能矩阵漂移；目标验收门禁用于防止把局部 PASS 冒充 7 项目标全部完成。 |

## 主要目录

```text
apps/server/app.js                 Node 兼容运行入口
apps/server/auth.js                Node 认证配置、session、权限和 cookie helper
apps/server/auth_routes.js         Node `/api/auth/session|login|logout` 兼容 handler 和登录限流
apps/server/runtime_store.js       Node runtime JSON 路径、envelope、用户 dataScope、读写和记录规范化
apps/server/runtime_routes.js      Node `/api/runtime|progress|reviews|applications|interview-mistakes` 兼容 handler
apps/server/static_files.js        Node 静态路径、public-safe fallback、content-type、私有静态资源和文件响应
apps/server/ai_routes.js           Node `/api/score-answer|generate-kb|transcribe` 兼容 handler、权限校验和请求解析
apps/server/ai_tools.js            Node AI 评分 fallback、知识库生成 fallback、provider timeout 和 AI 结果规范化
apps/server/coach_feedback_routes.js Node `/api/coach/feedback` 兼容 handler，按 dataScope 写入和读取 AI 草稿反馈
apps/server/coach_opportunity_signals.js Node AI 教练机会/JD 信号规范化和规则版 JD 解析，供 fallback、provider prompt 和 input hash 使用
apps/server/http_utils.js          Node 安全响应 header、JSON/redirect 响应、请求体读取和 multipart 音频解析
apps/rust-api/                     Rust API / SQLite runtime 后端
apps/rust-api/src/coach_ai_provider.rs Rust AI 教练草稿 provider 调用与 fallback 编排
apps/rust-api/src/coach_ai_provider_format.rs Rust AI 教练草稿请求/响应 schema 标准化
apps/rust-api/src/coach_jd_insights.rs Rust 规则版 JD 解析：岗位责任、硬技能、风险信号、证据要求和候选追问
apps/rust-api/src/coach_opportunity_signals.rs Rust AI 教练机会/JD 信号规范化，供 fallback 和 input hash 使用
apps/rust-api/src/llm_runs.rs      Rust LLM 运行审计记录写入和查询
apps/rust-api/src/llm_feedback.rs  Rust LLM 草稿采纳/拒绝反馈写入和查询
apps/react-web/                    React Web 工程
apps/android/                      Android WebView 工程
assets/                            旧静态 fallback 资源
data/                              日程、面试上下文、知识库数据
tests/                             Node/浏览器/Android 验证脚本；`android_webview_functional_persistence_test.js --remote` 可生成 Android 远端 evidence
tools/                             构建、扫描、工作树边界 validator
tools/write_remote_acceptance_evidence.js 服务器远端验收 evidence：运行远端 Web 登录/session/health/保存读回检查并写出脱敏 JSON
tools/write_remote_login_switch_evidence.js 远端 UI 登录切换 evidence：使用 Playwright 打开真实远端登录页，验证 owner UI 登录、页面退出、切换临时 smoke 用户登录、session/dataScope 读回和账号清理，不输出生成密码或 hash
tools/build_server_delivery_package.js 服务器同步包：把 Rust release binary、根静态入口、`dist/public-safe` 和 `apps/react-web/dist` 复制到 `dist/server-delivery/` 并生成 hash manifest，匹配 Rust 静态资源根目录和 React 入口
tools/write_server_sync_evidence.js 服务器同步 evidence：通过 rsync/ssh 同步 `dist/server-delivery/` 并验证远端 manifest SHA-256；支持 `--identity-file`、`JOB_SPRINT_DEPLOY_SSH_KEY` 和 `JOB_SPRINT_DEPLOY_PORT`，报告只显示 key 是否配置，不输出 key 内容
tools/delivery_env_file.js 私有交付 env 文件加载器：支持 `--delivery-env-file` 或 `JOB_SPRINT_DELIVERY_ENV_FILE` 指向仓库外 `KEY=VALUE` 文件，拒绝仓库内 env 文件；`final:delivery`、服务器同步、服务器远端验收、Android 远端真机测试和正式 APK 构建入口均复用该加载器；报告只输出加载状态和变量名，不输出变量值
tools/delivery_readiness_env.js 最终交付 readiness 的私有 env 适配层：CLI 默认读取仓库外 `~/.job-sprint/job-sprint-delivery.env`，测试可用 `JOB_SPRINT_DISABLE_DEFAULT_DELIVERY_ENV=1` 隔离本机私有状态，避免 readiness 主文件继续膨胀
tools/delivery_action_commands.js 最终交付动作命令表：集中维护服务器同步、服务器远端验收、远端 UI 登录切换、Android 远端真机测试、Android release signing 初始化、正式 APK 构建和最终交付的 `--delivery-env-file` 命令，供目标验收、外部输入预检和最终 readiness 复用，避免提示命令漂移
tools/write_delivery_env_template.js 私有交付 env 模板生成器：`npm run init:delivery-env` 默认在仓库外创建 `~/.job-sprint/job-sprint-delivery.env`，文件权限固定为 `0600`，只写空白变量名、可选部署 SSH key/port 槽位和默认最终报告路径，不写入真实密码、keystore 或 token；已有私有 env 时可用 `npm run init:delivery-env -- --merge-missing` 只追加缺失变量，不覆盖已有签名材料或账号值
tools/init_android_release_signing.js Android release signing 初始化器：`npm run init:android-release-signing -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --write-env` 可在仓库外生成私有长期 keystore，读取证书 SHA-256，并只把 keystore 路径、alias、密码和证书 pin 写入仓库外私有 env；报告不打印密码，默认不覆盖已有 signing env 或已有 keystore
tools/run_final_delivery.js 最终交付编排：先做工具/env preflight，并在 preflight 中嵌入 `validate_delivery_external_inputs.js` 的 `externalInputs` 结构化缺口，再依次串联 release gate、服务器同步 evidence、服务器远端验收、Android 远端验收、正式 APK 构建和最终 readiness；支持 `--delivery-env-file` 读取仓库外私有输入；`--dry-run` 只预览缺口不触发远端动作；`--report` 或 `JOB_SPRINT_FINAL_DELIVERY_REPORT` 可落盘统一报告；runner 内部最终 readiness 会用延后自报告校验避免写报告前自引用，初步 PASS 报告写入后还会追加 `post_final_report_validation`；post-validation 期间只允许自身步骤尚未写入，最终落盘报告必须包含 `post_final_report_validation=PASS`
tools/validate_final_delivery_readiness.js 最终交付 readiness：release gate 脚本防回退、架构质量门禁、功能覆盖门禁、功能对齐门禁、交付外部输入预检、public-safe 包扫描、server delivery package、服务器同步 evidence、最终交付统一报告、Web/服务器远端 evidence、远端 UI 登录切换 evidence 工具存在性、Android 远端 evidence、Rust release binary freshness、正式 APK 签名输入、APK SHA-256 和 FORMAL_SIGNED 报告检查；只有 runner 内部带 `JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS=1` 和 `--defer-final-delivery-report` 时才允许最终报告项延后，报告落盘后仍需独立严格校验
tools/delivery_readiness_architecture.js 最终交付 readiness 的架构质量适配层：把架构质量验证结果转换为 readiness check，并显式暴露 `sourceFileCount`、`requiredFileCount`、`semanticBoundaryRuleCount`，避免总门禁脚本继续膨胀
tools/validate_architecture_quality.js 架构质量门禁：检查 Rust/Android/Node 拆分模块仍存在、关键入口文件保持薄层、旧 `assets/schedule.js` 与 Android fallback 拷贝 hash 一致且冻结在行数预算内；同时结构化读取 Rust `mod`、Node `require`、Java `new Class`，约束 `lib.rs`、`apps/server/app.js`、`MainActivity.java` 继续作为装配层，防止渐进式拆分后的职责回流
tools/delivery_readiness_functional.js 最终交付 readiness 的功能覆盖适配层：把功能覆盖验证结果转换为 readiness check
tools/validate_functional_coverage.js 功能覆盖门禁：检查 Web、Android WebView、Rust/SQLite UI 三条功能测试链仍覆盖今日、延期、学习、面试、投递、复盘、更多页、重启读回和 SQLite 入库证据
tools/delivery_readiness_feature_parity.js 最终交付 readiness 的功能对齐适配层：把 Web/Android 本地功能矩阵验证结果转换为 readiness check
tools/validate_feature_parity.js 功能对齐门禁：检查 Web 与 Android 本地功能矩阵、Android 登录/session 能力入口和本地 Android evidence；远端真机 evidence 仍由 Android remote acceptance 单独证明
tools/delivery_readiness_goal.js 最终交付 readiness 的目标验收适配层：把 7 项用户目标验收结果转换为 readiness check
tools/validate_goal_acceptance.js 目标验收门禁：逐项汇总 Web/Android 对齐、DB 入库、前后端 Rust 边界、架构质量、重构后测试、服务器同步和正式 APK 证据；P8/AST 渐进式重构目标必须继承架构门禁的 `requiredFileCount` 与 `semanticBoundaryRuleCount` 证据，缺外部输入时保持 `USER_ACTION_REQUIRED`
tools/validate_delivery_external_inputs.js 交付外部输入预检：只检查服务器同步、远端验收、Android 远端真机、正式签名和最终报告所需 env/tool 是否就绪；支持 `--delivery-env-file` 读取仓库外私有输入；不输出密码明文，不替代真实 evidence
docs/core/                         当前核心文档
docs/archive/                      旧文档归档、边界盘点和删除处置记录
```

## 请求与数据流

1. 用户访问 `/` 或 `/react/index.html#/today`。
2. 服务端校验 session / bearer token。
3. React 读取压缩种子数据和 localStorage，hydration 完成后再启动 runtime sync。
4. React 根据本地/远端 `lastSavedAt` 和内容空缺判断优先上传本地数据或拉取远端数据。
5. `/api/runtime`、`/api/progress`、`/api/reviews` 提供进度、延期记录和复盘等状态读写；`/api/applications` 和 `/api/interview-mistakes` 提供投递与面试错题 CRUD；Node 为兼容 JSON，runtime JSON 路径、envelope、用户 `dataScope`、读写和记录规范化已集中到 `runtime_store.js`，Node 兼容 runtime/data HTTP handler 已集中到 `runtime_routes.js`，静态路径、public-safe fallback、content-type、私有静态资源和文件响应已集中到 `static_files.js`，安全响应 header、JSON/redirect 响应、请求体读取和 multipart 音频解析已集中到 `http_utils.js`；Rust 为 SQLite，Rust runtime HTTP handler 已集中到 `runtime_routes.rs`，投递 CRUD handler 已集中到 `application_routes.rs`，面试错题 CRUD handler 已集中到 `interview_mistake_routes.rs`，`data_routes.rs` 仅保留对旧路由表调用面的 re-export facade，记录 ID / `createdAt` 规范化已集中到 `runtime_records.rs`。
6. provider 配置存在时，AI 评分、知识库生成和录音转写经服务端代理；否则本地 fallback；Node 兼容层 AI HTTP handler、权限校验和请求解析已集中到 `ai_routes.js`，AI 评分 fallback、知识库生成 fallback、provider timeout、JSON 抽取和 AI 结果规范化已集中到 `ai_tools.js`，AI 教练机会/JD 信号规范化和规则版 JD 解析在 `coach_opportunity_signals.js`，`/api/coach/feedback` 已集中到 `coach_feedback_routes.js` 并按 `dataScope` 写入 `progress.coachFeedback`；Rust AI HTTP handler 已集中到 `ai_routes.rs`，AI 评分与知识库 payload/fallback 判定在 `ai_tools.rs`，AI 教练草稿 provider 调用与降级在 `coach_ai_provider.rs`，请求/响应 schema 标准化在 `coach_ai_provider_format.rs`，机会/JD 信号规范化在 `coach_opportunity_signals.rs`，规则版 JD 解析在 `coach_jd_insights.rs`，生成会通过 `llm_runs.rs` 写入当前账号 scope 下的独立 `llm_runs` 审计行，并可由 `/api/coach/llm-runs` 读回；React 接受/拒绝 AI 草稿会调用 `/api/coach/feedback`，Rust 通过 `llm_feedback.rs` 写入当前账号 scope 下的独立 `llm_feedback` 行并可读回；ASR 上传校验与 multipart 音频解析在 `ai_transcribe.rs`。
7. Rust 静态资源 fallback 的 HTTP 分支已集中到 `static_routes.rs`，路径归一化、public-safe 映射、content-type 和 no-store 判定保留在 `static_files.rs`。
8. Rust 启动、SQLite connect/init、用户同步、legacy JSON 迁移、body limit 和监听入口已集中到 `app_bootstrap.rs`，`lib.rs` 保留薄路由表、health 和 JSON body 解析。
9. Android 默认加载 allowlist 内的远端 HTTPS React；远端不可用时加载本地 React assets，再退到旧 public-safe fallback。

## 安全边界

- 前端不保存 provider token。
- session cookie 使用 HttpOnly + SameSite=Lax；HTTPS 或代理标记时添加 Secure。Node 侧鉴权配置、session、权限和 cookie helper 在 `auth.js`，`/api/auth/session|login|logout` 兼容 handler 和登录限流在 `auth_routes.js`。Rust 侧鉴权配置总装配在 `auth_config.rs`，bearer token 模型、env/file 读取、JSON 解析和 known user 过滤在 `auth_tokens.rs`，Authorization Bearer 解析、token hash 对比、过期判断和用户映射在 `auth_bearer.rs`，用户配置模型、用户 JSON 解析、用户索引和 `dataScope` 选择在 `auth_users.rs`，认证配置 JSON 字段读取在 `auth_values.rs`，SHA-256、hex digest 校验和 constant-time 比较在 `auth_hash.rs`，角色权限归一化、只读判断和通配权限判断在 `auth_permissions.rs`，运行时 session 校验、认证状态编排和 `dataScope` 在 `auth_state.rs`，认证错误响应、runtime 响应外壳和未登录静态资源跳转在 `auth_http.rs`，`/api/auth/session|login|logout` handler 在 `auth_routes.rs`。
- public-safe bundle 会脱敏本机路径、公司名、内部项目名、token、私钥和云厂商敏感线索。
- Android remote 默认开启，远端 URL 规范化、登录页 URL 生成、host allowlist 和 WebView 跳转拦截已抽到 `RemoteUrlPolicy`；远端 URL、Basic Auth 凭据迁移清理和认证重试去重已集中到 `AuthCredentialStore`；Basic Auth 用户名/密码加密/解密已集中到 `AndroidKeystoreStringCipher`，通过 Android Keystore + AES/GCM 保存，并保留旧明文键一次性迁移后清理；Basic Auth 弹窗、认证 host 校验、已保存凭据尝试和取消 fallback 已集中到 `AndroidBasicAuthController`；远端/本地 fallback、远端登录页加载、React asset 探测、WebSettings 安全切换和当前页面 URL 跟踪已集中到 `RemoteWebViewController`；远端 URL 设置、reload remote 和 fallback 切换已集中到 `AndroidRemoteSettingsBridge`；Basic Auth 状态读取和清除已集中到 `AndroidAuthSettingsBridge`；远端 session cookie 状态读取、清除和重新登录入口已集中到 `AndroidSessionCookieBridge`，并只对 `RemoteUrlPolicy` 判定可用的 HTTPS 远端 URL 生效；录音生命周期、权限续跑和录音 payload 回调已集中到 `AndroidRecorderBridge`；录音 multipart 上传、cookie 转发、响应解析和上传线程已集中到 `AndroidRecorderUploader`；`/api/transcribe` endpoint 推导、当前页面优先和配置 URL fallback 已集中到 `AndroidTranscribeEndpointResolver`；系统语音服务可用性、默认服务选择和 queryable `RecognitionService` fallback 已集中到 `AndroidSpeechServiceResolver`；语音错误码、错误文案、冷却时长和可重试判断已集中到 `AndroidSpeechErrorPolicy`；语音启动失败映射、错误策略消费、冷却启动和连续失败文案已集中到 `AndroidSpeechErrorCoordinator`；语音 phase、listening、ready、cooldown、debounce 和连续失败计数已集中到 `AndroidSpeechSessionState`；语音状态/partial/final/error 的 JS 回调、payload 拼装和 WebView evaluate 已集中到 `AndroidSpeechCallbackEmitter`；语音开始前的冷却、debounce、服务可用性、麦克风权限请求和授权后续跑已集中到 `AndroidSpeechStartCoordinator`；原生语音识别 `SpeechRecognizer` 创建、`RecognizerIntent` 构造、recognizer listener 和结果提取已集中到 `AndroidSpeechRecognizerController`；`AndroidSpeechBridge` 仅保留 JS 接口、回调响应和语音事件转发；WebView 音频采集权限请求、非音频资源拒绝和系统录音权限申请已集中到 `AndroidWebChromePermissionController`；WebViewClient 的 Basic Auth 委托、URL 拦截、页面 URL 跟踪、主帧错误 fallback 和 SSL 拒绝已集中到 `AndroidRemoteWebViewClient`；Activity 暂停、销毁、返回键和音频权限回调已集中到 `AndroidActivityLifecycleController`；窗口颜色、系统栏 flags、根 WebView 布局和 system bar insets 已集中到 `AndroidWindowLayoutController`；WebSettings、JS bridge 绑定、WebChromeClient/WebViewClient 装配和 lifecycle controller 创建已集中到 `AndroidWebViewInitializer`；启动编排、控制器组装和默认远端/本地加载决策已集中到 `AndroidAppStartupController`。正式远端 session/token 登录仍需继续收敛。
- Android 正式 release 签名只从仓库外部读取 `JOB_SPRINT_ANDROID_KEYSTORE`、`JOB_SPRINT_ANDROID_STORE_PASSWORD`、`JOB_SPRINT_ANDROID_KEY_ALIAS`、`JOB_SPRINT_ANDROID_KEY_PASSWORD` 和 `JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256`；若没有既有长期 keystore，可用 `npm run init:android-release-signing -- --delivery-env-file ~/.job-sprint/job-sprint-delivery.env --write-env` 生成仓库外私有 keystore 和证书 pin；构建工具和 readiness 会拒绝仓库内 keystore 路径，密钥、密码和证书 pin 不进仓库。
- Codex AI 团队是全局对话层能力；Job Sprint 只用项目规则说明调用边界，不在仓库内维护团队本体。

## 架构风险

| 风险 | 当前处理 | 后续方向 |
|---|---|---|
| `apps/rust-api/src/lib.rs` 过大 | 已抽出启动与 schema、runtime、data routes、AI routes、AI provider、LLM run/feedback、静态资源、认证/session、响应工具等小模块；新增 `app_schema.rs` 承接 SQLite schema，`coach_ai_provider.rs` 承接 provider 调用与 fallback 编排，`coach_ai_provider_format.rs` 承接请求/响应 schema 标准化；`lib.rs` 仍为薄路由层 | Rust 主入口已收敛为薄路由层；后续优先做真实 provider 线上 evidence 和反馈聚合分析，每刀跑 clippy、契约测试和 UI 入库测试。 |
| `apps/server/app.js` 过大 | 已抽出 `auth.js` 承接 Node 兼容层认证配置、session 签名/校验、权限判断、cookie 和 secure request helper；已抽出 `auth_routes.js` 承接 `/api/auth/session|login|logout` 兼容 handler 和登录限流；已抽出 `runtime_store.js` 承接 runtime JSON 路径、envelope、用户 `dataScope`、读写和记录规范化；已抽出 `runtime_routes.js` 承接 `/api/runtime`、`/api/progress`、`/api/reviews`、`/api/applications` 和 `/api/interview-mistakes` 兼容 handler；已抽出 `static_files.js` 承接静态路径、public-safe fallback、content-type、私有静态资源和文件响应；已抽出 `ai_routes.js` 承接 `/api/score-answer|generate-kb|transcribe` 兼容 handler、权限校验和请求解析；已抽出 `coach_feedback_routes.js` 承接 `/api/coach/feedback` 兼容 handler、权限校验和 dataScope 反馈账本读写；已抽出 `ai_tools.js` 承接 AI 评分 fallback、知识库生成 fallback、provider timeout、JSON 抽取和 AI 结果规范化；已抽出 `http_utils.js` 承接安全响应 header、JSON/redirect 响应、请求体读取和 multipart 音频解析；`app.js` 从 1643 行降到薄路由层，并由 `tests/node_auth_boundary_test.js`、`tests/node_auth_routes_boundary_test.js`、`tests/node_runtime_store_boundary_test.js`、`tests/node_runtime_routes_boundary_test.js`、`tests/node_static_files_boundary_test.js`、`tests/node_ai_routes_boundary_test.js`、`tests/node_ai_tools_boundary_test.js` 和 `tests/node_http_utils_boundary_test.js` 防止逻辑回流 | Node 兼容入口已接近薄路由层；后续只做 health/router/export 小步清理，继续压缩 Android 剩余生命周期。 |
| Android Java 控制器复杂度 | 已先抽出 `RemoteUrlPolicy`、`AuthCredentialStore`、`AndroidKeystoreStringCipher`、`RemoteWebViewController`、`AndroidRemoteSettingsBridge`、`AndroidAuthSettingsBridge`、`AndroidSessionCookieBridge`、`AndroidRecorderBridge`、`AndroidRecorderUploader`、`AndroidTranscribeEndpointResolver`、`AndroidSpeechServiceResolver`、`AndroidSpeechErrorPolicy`、`AndroidSpeechErrorCoordinator`、`AndroidSpeechSessionState`、`AndroidSpeechCallbackEmitter`、`AndroidSpeechStartCoordinator`、`AndroidSpeechRecognizerController`、`AndroidSpeechBridge`、`AndroidBasicAuthController`、`AndroidWebChromePermissionController`、`AndroidRemoteWebViewClient`、`AndroidActivityLifecycleController`、`AndroidWindowLayoutController`、`AndroidWebViewInitializer` 和 `AndroidAppStartupController`，把远端 URL 策略、远端 URL 保存、Basic Auth 保存/清除/重试去重、远端/本地 fallback、React asset 探测、WebSettings 安全切换、页面 URL 跟踪、远端设置 JS bridge、鉴权设置 JS bridge、session cookie 状态/清除/重新登录 JS bridge、录音生命周期、录音上传线程、multipart/cookie/响应解析、transcribe endpoint 推导、系统语音服务发现、语音错误策略、语音错误协调、语音识别会话状态、语音 JS 回调 payload、语音启动门禁和麦克风权限续跑、原生语音识别启动/intent/listener、Basic Auth 弹窗、认证 host 校验、已保存凭据尝试、WebView 音频采集权限协调、WebViewClient 导航/错误/SSL 边界、返回/销毁、音频权限回调、窗口颜色、系统栏 flags、根 WebView 布局、system bar insets、WebSettings、JS bridge 绑定、WebChromeClient/WebViewClient 装配、lifecycle controller 创建、启动编排和远端/本地加载决策从 Activity 中分离；`MainActivity.java` 已从 167 行降到 53 行，`AndroidRecorderBridge.java` 已从 294 行降到 225 行，`AndroidSpeechBridge.java` 已从 382 行降到 246 行 | `MainActivity` 已收敛为生命周期壳；后续优先做远端 session/token 产品化和剩余 JS bridge 最小化，每刀跑 Android 编译，涉及真机行为时再补 Android 功能验收。 |
| `assets/schedule.js` 过大 | 作为 legacy fallback 冻结；`npm run validate:architecture-quality` 会校验 Web 旧入口与 Android fallback 拷贝 hash 一致，并把两者限制在 3600 行以内 | 新功能进入 React，旧入口只修阻断问题。 |
| Node runtime JSON 并发写 | Node 仅保留兼容入口 | 优先切 Rust/SQLite；Node 只承担回滚或轻量演示。 |
| Rust/SQLite 远端切换 | 服务器已切到 Rust/SQLite release，公共 IP health 和 DB integrity 通过 | 正式域名仍受 DNSPod 拦截；域名恢复后再做远端 HTTPS 首访验收。 |
| Android 正式签名 | 已增加外部 signingConfig、仓库内 keystore 拒绝、APK SHA-256 绑定、严格验签脚本和 `init:android-release-signing` 仓库外私有签名初始化入口；当前已生成 `FORMAL_SIGNED` 报告 | 后续必须保留仓库外 keystore 和私有 env；更换签名会影响 APK 升级连续性。 |
| 最终交付误判 | 已增加 `npm run final:delivery` 编排命令、可选 `--report` 统一报告和 `npm run validate:delivery` 最终裁决，把工具/env preflight、fresh Rust release binary、Linux x86_64 ELF 目标平台校验、public-safe 包扫描、server delivery package、服务器同步 evidence、最终交付统一报告、Web/服务器远端 evidence、远端 UI 登录切换 evidence 工具、Android 远端验收 evidence、正式签名 env、APK SHA-256 和 FORMAL_SIGNED APK 验签报告统一到只读 readiness 报告；`test:release` 会先运行 `npm run test:local-functional`，显式验证 Web 功能持久化和 Rust/SQLite UI 入库，再运行 `npm run build:rust:linux`，避免本机 `build:rust` 生成的 macOS Mach-O 覆盖 Linux ELF；readiness 会拒绝 Rust 源码/Cargo/migration 文件比 release binary 更新的旧产物，server delivery package 会拒绝 macOS Mach-O；runner 内部最终 readiness 只在 `JOB_SPRINT_FINAL_DELIVERY_IN_PROGRESS=1` 且带 `--defer-final-delivery-report` 时延后自报告校验，避免报告尚未写入时形成自引用；报告初步 PASS 且已写入后，runner 会追加 `post_final_report_validation`，post-validation 期间只允许自身步骤尚未写入；最终落盘报告必须包含 `post_final_report_validation=PASS`，旧 7 步报告会被 `npm run validate:delivery` 拒绝；服务器同步 evidence 由 `npm run write:server-sync-evidence` 生成，必须证明远端 manifest SHA-256 与本地同步包一致；服务器远端 evidence 由 `npm run write:remote-evidence` 生成，并必须包含 `/api/progress` 远端保存与读回；远端 UI 登录切换 evidence 由 `npm run write:remote-login-switch-evidence` 生成，必须证明真实登录页可退出并切换用户；Android 远端 evidence 由 `npm run test:android:remote:functional` 生成 | 缺 fresh Rust release binary、Linux x86_64 ELF、public-safe 包/扫描、server delivery package、服务器同步 evidence、最终交付统一报告、Web/服务器远端验收输入或 evidence、Android 远端验收报告或 FORMAL_SIGNED 报告时必须保持 `USER_ACTION_REQUIRED` 或 `PASS_WITH_LIMITS`，不能把 macOS Mach-O、旧 binary、未扫描 dist、未绑定同步包、未同步证据、缺统一报告、未被 post-validation 复核的报告、本地 WebView、signed-local、API 登录 smoke 或历史服务器状态当完整交付。 |
| AI provider timeout 基础保护 | Node 兼容层已在 `ai_tools.js` 使用 `AI_PROVIDER_TIMEOUT_MS` 和 `AbortController` 防止请求长期挂起 | 补错误分类、重试、熔断和用户提示。 |
| `npm test` 误做 release 构建 | 已拆只读测试和 release gate | 构建同步 Android assets 只在 `test:release` 跑。 |

## 市场匹配

本项目技术栈在中国大陆市场可作为“泛 IT AI 求职教练 / 全栈辅助 / AI 工程化增强”展示；当前工程边界是邀请制、小范围、多画像/多用户和严格证据门禁，不等同于公开 SaaS、企业 ATS 或自动投递平台。若用于高级 Java 后端求职表达，仍应另有 Spring Boot、Spring Cloud、MyBatis、MySQL、Redis、MQ、JVM 调优、稳定性治理等主线证据。

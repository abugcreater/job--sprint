# 产品已知问题与下一步

日期：2026-07-07

## P0 防回归

| 问题 | 当前状态 | 下一步 |
|---|---|---|
| 按钮只计数、不产生真实业务状态 | 已通过本地流程和测试修复为输入、反馈、保存、读回 | 每次 UI 改动继续跑 React/Vitest/本地功能/Android 本地功能。 |
| Evidence 或 AI 草稿长列表失控 | Evidence 已改摘要；AI 草稿和自定义日程已补“查看全部/收起” | 后续把所有长列表统一成摘要、筛选、详情页模式。 |
| 交付口径混乱 | 文档已强制区分本地、Android 本地、HTTP 演示和完整 HTTPS 交付 | 每次对外结论先跑 `npm run validate:delivery`。 |

## P1 产品缺口

| 问题 | 影响 | 下一步 |
|---|---|---|
| 远端真实 LLM provider evidence 已通过，质量闭环仍需增强 | Node 与 Rust 均已有 Anthropic-compatible `/api/coach/artifacts` 接口；React 已记录用户态 AI 运行记录，包含 provider、model、prompt version、schema version、输入摘要 hash、schema 结果、生成数量和 fallback 状态；Rust 已有独立 `llm_runs` 表和 `llm_feedback` 表，并用本地 mock provider 合同覆盖 token、延迟和可选成本写入；Node/Rust `/api/coach/feedback` 已返回采纳率、拒绝类型、拒绝原因和下一轮提示校准 `summary`；React 已能把已采纳 AI 日程草稿关联到今日 `coach-event-*` 任务完成状态，计算本地日程级采纳后完成率；React 复盘页已新增本地 7 日周复盘归因，能把证据覆盖、完成任务、延期、机会反馈、面试证据和 AI 反馈转成闭环分、有效信号、风险和下周焦点；Node/Rust `/api/coach/outcomes` 已能服务端计算周结果并写入 `coachOutcomeSnapshots`；`configure:remote-provider` 已把仓库外 DeepSeek/Anthropic-compatible provider env 写入远端 systemd drop-in 并重启服务；`docs/evidence/server-remote/coach-artifacts.json` 已证明远端 `apiConfigured=true`、provider 为 `anthropic-compatible`、model 为 `deepseek-v4-flash`、`llmRunStatus=success`、`llmRunSchemaStatus=pass`、token/延迟/成本字段齐全，且生成物引用 `MQ`、`Redis`、`稳定性`、故障恢复和面试候选题语义；同一报告还证明 feedback summary 与 `/api/coach/outcomes` GET/POST 通过 | 下一步不是再证明 provider 是否存在，而是把真实 LLM 周复盘、机会状态、面试结果、边界候选反馈和长期质量归因串起来；DeepSeek 远端 smoke 只能证明服务端真实模型调用和 schema 合同通过，不等于真实 JD 深度解析质量已经产品化。 |
| 多用户仍不是公开 SaaS | 已有 Node `dataScope` 与 Rust/SQLite `scope` 隔离测试，但没有公开注册、组织租户和完整用户管理后台；React 已有邀请制首登编排、只读邀请批次首登看板、邀请账号管理面板、批量邀请导入、可复制邮件/IM/手工邀请通知草稿和 UI 级账号/数据域展示，Node/Rust 已有首登观察事件写入、读回、`/api/coach/onboarding-report` 批次聚合、`/api/coach/invitations` 邀请台账和 users file 账号开通/重置/禁用/恢复/删除，远端 users-file 账号生命周期 smoke 已通过；本轮已补 React 批次筛选、批量导入、批量状态更新、邀请报表 JSON 导出、首登模板版本、邀请记录删除、登录账号生命周期动作、批量登录账号禁用/恢复/删除、邀请通知草稿生成和远端 UI 级登录切换 evidence，Node/Rust 同步支持 `bulk-import`、批次状态更新、`templateVersion` 持久化、删除邀请记录、单账号状态动作、批量账号状态动作和 `notification-draft`；但该能力只在配置仓库外 `JOB_SPRINT_USERS_FILE` 且未使用 `JOB_SPRINT_USERS_JSON` 时启用，不等于公开注册或组织租户 | 下一步接外部 SMTP/IM 自动发送和更完整的用户管理后台。 |
| 知识边界初始化仍需降低输入成本 | React 已新增 AI 提取边界确认流，Node/Rust 新增 `/api/coach/boundary-suggestions` 并覆盖权限、schema、跨角色通用技术主题提取、已保存主题过滤、mock provider 成功和 provider timeout fallback；候选被采纳后，正式知识边界已保留来源摘要、置信度、provider、prompt version 和输入 hash；候选采纳、拒绝和修订反馈已进入 React 本地账本、runtime sync、More 导出/导入、校准摘要和 Node/Rust `/api/coach/boundary-feedback` 服务端长期反馈账本；教练页已新增邀请制首登编排、首登完成率/放弃点/风险/下一步可观测、首次配置准备度、快速初始化、批量素材包、11 个角色族首登模板、只读邀请批次首登看板和邀请账号管理面板，支持保存画像、追加 JD/简历/面试反馈/学习笔记素材段、生成边界候选、采纳三条边界并生成首条日程；Node/Rust 新增 `/api/coach/onboarding-events`、`/api/coach/onboarding-report` 和 `/api/coach/invitations`，可记录首登观察、读回摘要、按邀请批次聚合、登记试用用户、保存首登模板版本、批量更新邀请状态、导出邀请报表，并在 users file 模式下开通/重置/禁用/恢复/删除账号，远端 smoke 已证明 smoke 用户可登录、可禁用、可恢复、可删除并隔离 runtime；DeepSeek 远端 provider 已在 `/api/coach/artifacts` smoke 中通过，但 boundary suggestions 仍需要补同口径远端真实 provider evidence、真实 LLM 深度解释和批量初始化审计 | 下一步把远端真实 LLM 输出、服务端边界反馈账本和批量初始化审计串成质量闭环，并把当前首登编排升级成正式账号首登系统。 |
| 泛 IT 角色族知识库仍需扩展 | 已先为后端、前端、测试、运维、数据、移动端、产品、项目、实施、技术支持、其它 IT 11 个角色族补本地 playbook 和首批角色追问题卡；React 本地规则、Node fallback、Rust fallback 和 provider prompt 均会带入角色视角、证据类型、回答框架、日程焦点、主候选题和追问库，避免所有用户都落到同一套后端话术 | 下一步补更完整的岗位族题库、真实 LLM 线上 evidence 和题卡质量归因，不一次做全行业题库。 |
| JD/机会匹配已从轻量焦点进入规则版结构化解析 | React 已从投递/机会记录提取公司、岗位、状态、JD 关键词、命中点和反馈，作为机会信号进入 React 本地生成、Node fallback、Rust fallback 和 provider prompt；React/Node/Rust fallback 已进一步提取 `JD焦点` 和规则版 `JD解析`，让知识卡、日程建议和候选题围绕岗位责任、硬技能、风险信号、证据要求和候选追问生成；生成物 sources/reason/inputSummaryHash 会引用当前机会、JD 焦点和结构化解析摘要，能证明机会状态变化影响下一轮建议 | 下一步做真实 LLM 深度 JD parser、岗位族题卡匹配、机会结果归因和服务端跨周追踪；当前能力不是自动投递，也不是企业 ATS。 |
| 面试复盘 AI 分析仍需增强 | React 复盘页已新增本地规则版 AI 分析和本地 7 日周复盘归因，能基于 Evidence Gate、复盘记录、薄弱回答、路径问题、机会反馈、延期记录和 AI 建议采纳/完成情况输出事实、欠缺、闭环分、风险和下周焦点；Node/Rust `/api/coach/outcomes` 已补最小服务端周结果归因和快照写入；但尚未接入服务端真实 LLM，也未形成机会/面试结果长期归因 | 下一步把服务端真实 LLM provider、周结果快照、机会结果和面试弱项串起来，形成服务端跨周 AI 分析和结果归因。 |

## P1 交付缺口

| 问题 | 影响 | 下一步 |
|---|---|---|
| GitHub 远端 GitFlow 保护缺少 CI 必过检查 | `develop` 已从当前 `main` 创建；ruleset `Protect main and develop` 已强制 PR、禁止强推和删除，管理员不能绕过。但当前 OAuth token 缺少 `workflow` scope，尚不能推送 `.github/workflows/gitflow-policy.yml`，因此还不能把 `GitFlow Policy` 设置为 GitHub required check。 | 授权 `workflow` scope 后推送 GitFlow 治理分支，创建 `-> develop` PR 并取得实际检查名称；再将该检查加入现有 ruleset，最后验证一个合规 PR 和一个故意错误目标的 PR 都按预期受控。 |
| Android 远端 HTTPS 真机 evidence 缺失 | 不能标完整 HTTPS 生产交付 | HTTPS URL 就绪后运行 `npm run test:android:remote:functional`。 |
| 最终统一交付报告缺 PASS | 不能标最终交付完成 | 真实服务器、远端 URL、账号和 Android 证据齐备后运行 `npm run final:delivery`。 |
| Android 远端 URL/公网 HTTPS 未完成 | Android remote 脚本明确拒绝 HTTP WebView URL；`JOB_SPRINT_ANDROID_WEBVIEW_URL` 已配置为 `https://job-sprint.example.com/job-sprint/react/index.html`，`validate:delivery-inputs` 中 `android_remote_inputs=PASS`；`docs/evidence/server-remote/https-diagnostic-2026-07-06.md` 证明 HTTPS 域名 DNS 指向正确服务器、外部 TCP 443 可连但正式域名 SNI 在 ClientHello 后 EOF/reset、服务器本机 Nginx/cert/监听/本机 SNI HTTPS 和服务器本机公网域名 HTTPS 均正常；Android 真机 HTTPS 远端测试失败为 `net::ERR_CONNECTION_RESET`；临时裁剪 fullchain、8443 监听、localtunnel 和 trycloudflare 均不能形成可信远端验收；最新正式 APK 已重新安装成功，`npm run test:android:functional` 本地全流程 PASS，且远端验收脚本/readiness 已拒绝本地 `file:///android_asset/...` fallback 报告 | 需要在云厂商安全组、边界防火墙、负载均衡、WAF/CDN、DDoS 防护、运营商路径、公网转发或域名合规侧修复并验证公网 HTTPS，然后直接复跑真机 remote evidence 和 `npm run validate:delivery -- --allow-dirty`。 |
| 当前线程 AI 团队处于 quarantine | 不能声称全角色真实参与 | 新任务若需要真实多 agent，需由用户明确重新启用 subagents，且先做 stall preflight。 |

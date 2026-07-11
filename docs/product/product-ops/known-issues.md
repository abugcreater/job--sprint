# 产品已知问题与下一步

日期：2026-07-10

## P0 防回归

| 问题 | 当前状态 | 下一步 |
|---|---|---|
| 按钮只计数、不产生真实业务状态 | 已通过本地流程和测试修复为输入、反馈、保存、读回 | 每次 UI 改动继续跑 React/Vitest/本地功能/Android 本地功能。 |
| Evidence 或 AI 草稿长列表失控 | Evidence 已改摘要；AI 草稿和自定义日程已补“查看全部/收起” | 后续把所有长列表统一成摘要、筛选、详情页模式。 |
| 交付口径混乱 | 文档已强制区分本地、Android 本地、HTTPS 生产交付和 Git 合并状态 | 每次对外结论先跑 `npm run validate:delivery`。 |

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
| Android 远端 HTTPS 真机 evidence 已通过 | OnePlus 8 Pro 已在私有交付 env 注入的正式 HTTPS React URL 完成登录/session、保存、AI 草稿处理和杀进程读回；所有快照保持正式 HTTPS URL | 后续每次正式 APK 改动都复跑 `npm run test:android:remote:functional`，禁止本地 fallback 报告冒充远端通过。 |
| 最终统一交付报告为 `PASS_WITH_LIMITS` | 服务器、Web HTTPS、Android remote、formal APK 和 post validation 均 PASS；限制来自 `--allow-dirty` 与 P8 理论性架构门禁，不是生产链路缺口 | 提交工作树后在同一提交上重跑最终 runner；若 P8 范围变化，按架构门禁单独收口。 |
| 正式域名 HTTPS 已恢复 | 备案与证书生效后，公网 443、HTTP 308、HTTPS 登录/session/写入读回均通过；Android 已拒绝 HTTP 并关闭 cleartext | 证书续期时复测公网 SNI、证书 SAN、Web 登录和 Android remote evidence，避免回退到 IP HTTP。 |
| 当前线程 AI 团队处于 quarantine（历史任务标记） | 旧任务的 agent 生命周期状态不能继承成新任务证据 | 本次新目标已由用户明确重新启用 AI 团队，已派 1 名只读 UI Designer 并正常回传；后续每个新任务仍需独立执行 stall preflight。 |

## P1 UI 后续迁移

| 问题 | 影响 | 下一步 |
|---|---|---|
| 产品级 UI 主旅程已完成全局壳、Today、Coach、Applications、Learning、Interview、Review、Stats 与 More 竖切 | 主要页面已按单任务、主从或互斥视图收口，不再默认连续堆叠全部模块 | 后续只按真实用户证据迭代，不回到统一换皮或同权卡片模式。 |
| 机会编辑尚无未保存修改确认 | Android 返回键退栈正确，但用户修改后直接返回会丢弃当前草稿 | 在 P3/P4 建立统一表单脏状态协议，再覆盖机会、面试和复盘编辑器。 |
| React 生产构建单 chunk 超过 500 kB | 首屏加载和 Android WebView 冷启动仍有优化空间 | 在不改变功能合同的前提下按路由拆包，并用真实 Web/Android 启动指标验收。 |

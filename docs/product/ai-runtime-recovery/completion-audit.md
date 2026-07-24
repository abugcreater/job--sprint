# AI 运行恢复提示完成审计

日期：2026-07-24
状态：PASS_WITH_LIMITS

| 验收项 | 结果 | 证据 |
|---|---|---|
| 用户可区分登录、provider、API 与合同问题 | PASS | `auth_required`、`provider_not_configured`、`api_unavailable`、`api_contract_error` 与未知生成失败均映射为中文诊断和恢复动作；`LlmRunPanel.test.tsx` 覆盖三类关键文案。 |
| Coach 与 Stats 共用诊断口径 | PASS | 两个页面均调用 `diagnoseLlmRun`；`StatsPage.test.tsx` 覆盖未配置 provider 的标签、解释和下一步。 |
| fallback 不冒充真实 provider 成功 | PASS | `local-fallback` 且无服务端 warning 时标为 `provider_not_configured`，服务端不可达仍明确为 `server_unavailable`；浏览器本地走查确认显示“本地前端未连接后端 AI API”。 |
| React 类型与定向测试 | PASS | `npm --prefix apps/react-web run typecheck` 通过；定向 4 个测试文件、12 条用例通过；完整 Vitest 为 37 个文件、116 条用例通过。 |
| Node/Rust 本地 proxy 诊断未回归 | PASS | `npm run test:coach-runtime-diagnostic` 与 `npm run test:rust-coach-runtime-proxy-auth` 通过，覆盖本地 proxy、认证、数据域、fallback 与 schema 读回。 |
| 敏感信息未进入前端或文档 | PASS_WITH_LIMITS | 本轮只记录诊断码和用户恢复文案，不引入凭据、地址或真实 provider 返回；仍需在 PR 门禁中跑敏感扫描。 |

限制：本审计不证明真实 provider 的 timeout/限流/5xx 分类、自动重试或熔断策略；不部署服务器、不改远端 provider 配置、不更新 Android，也不代表完整 HTTPS 生产交付。

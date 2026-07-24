# AI 运行恢复提示

日期：2026-07-24
状态：实施中

## 需求卡

- 原始问题：用户看到 AI 运行记录中的 `fallback`、失败或原始错误码时，难以判断是未登录、没有配置模型、服务暂不可用，还是模型响应不合格。
- 目标用户：已完成画像和知识边界、准备生成 AI 建议的普通用户。
- 用户路径：进入“准备 -> AI 建议” -> 生成草稿 -> 展开 AI 运行记录或查看统计 -> 看到当前状态、影响范围与下一步动作。
- 影响模块：React Coach、Stats、AI runtime client、产品文档。
- 当前问题类型：AI 质量可观测性与失败恢复。
- 数据对象：已有 `llmRuns`；不新增用户数据、不修改既有运行记录归属。
- 权限边界：沿用既有登录与 `dataScope`；本功能不绕过认证，也不展示 provider token、服务端配置或原始敏感错误。
- 新用户空状态：仍显示“生成草稿后会记录 provider、schema 和 fallback 状态”。
- 成功反馈和读回：每条运行记录显示诊断标签、解释和恢复动作；Stats 与 Coach 的最新诊断保持一致。
- 失败恢复：未登录提示重新登录；provider 未配置提示可继续审核规则草稿并由服务端维护者配置；API 或合同异常提示检查服务端 runtime，不诱导用户重试写入。
- 破坏性动作：无。
- 统计归属：跨模块诊断摘要仍在 Stats；详细运行记录仍在 Coach。
- AI 草稿契约：AI 仍只生成待确认草稿；本轮不改变接受、编辑、拒绝或反馈写入逻辑。
- 验证层级：React 单测、runtime client 单测、已有 Node/Rust proxy diagnostics、浏览器渲染验证、产品迭代和敏感扫描。
- 明确不做：不实现自动重试、熔断、provider 成本监控、真实 provider 配置、服务器同步、Android 打包或远端验收。

## 目标状态

| 诊断码 | 用户理解 | 恢复动作 |
|---|---|---|
| `auth_required` | 服务端可达，但当前登录态或 AI 权限缺失。 | 重新登录后再生成。 |
| `provider_not_configured` | 服务端和 schema 可用，但未启用真实 provider；规则草稿仍可审核。 | 继续审核草稿，或由维护者在仓库外配置 provider。 |
| `ai_generation_fallback` | 真实 provider 本轮未完成，系统安全降级为规则草稿。 | 保留草稿，稍后由已配置 runtime 复验。 |
| `api_unavailable` | API 可达但服务端当前异常。 | 检查 Node/Rust runtime，再重新生成。 |
| `api_contract_error` | 返回内容不符合可安全写入草稿的合同。 | 检查服务端响应与 schema，不自动写入。 |
| `server_unavailable` | 当前前端没有连接到后端 AI API。 | 启动服务端 runtime 或配置 Vite API proxy。 |

## 验收入口

- [方案比较](prd-options.md)
- [推荐方案](prd-recommended.md)
- [审阅与裁决](review-and-adjudication.md)
- [开发与验证流程](development-workflow.md)
- [完成审计](completion-audit.md)

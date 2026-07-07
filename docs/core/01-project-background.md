# 项目背景

日期：2026-07-05

Job Sprint 正在从个人私有的高级 Java 后端求职冲刺工作台，升级为面向泛 IT 求职者的 AI 求职教练与执行工作台。它服务于 2-8 周集中求职、转岗或跳槽场景：把目标画像、知识边界、每日执行、机会跟进、面试训练、复盘证据和 AI 建议集中到一个可验证闭环里。

当前最新产品合同见 `docs/product/it-job-coach-v1/prd-recommended.md`。

## 定位

- 目标用户：正在集中求职、转岗或跳槽的泛 IT 从业者，首批角色族包括后端、前端、测试、运维、数据、移动端、产品、项目、实施和技术支持。
- 主线方向：AI 求职教练叙事，工程上先做邀请制、小范围、多画像/多用户、严格 Evidence Gate 和人工确认。
- 当前阶段：`准生产演示级 / 小范围邀请制产品化迭代中`。
- 对外表达：适合作为 AI 求职教练、全栈辅助项目、AI 工程化增强案例；当前不适合作为公开 SaaS、企业 ATS 或自动投递平台。

## 核心能力

- 目标画像、知识边界、今日建议和执行节奏。
- 学习知识卡、面试候选题、本地重点/薄弱标记。
- 机会跟进、复盘记录和 Evidence Gate。
- AI 建议草稿：知识卡片、日程建议、候选题目和下一步行动。
- React Web 入口、旧静态 fallback、Android WebView 远端优先入口。
- React `/api/runtime` 同步，离线时回落 localStorage。
- Node 应用层登录、runtime JSON 兼容 API、AI 评分/知识库 provider fallback。
- Rust API + SQLite runtime 存储切片，作为后端替换方向和当前验证重点。
- public-safe 脱敏演示包和 Android fallback assets。
- Codex AI 团队适配层，用于本项目内审计、留痕和验证，但通用团队权威入口在 `~/.codex/skills/codex-ai-team/SKILL.md`。

## 明确非目标

- 不是公开 SaaS。
- 不是企业 ATS。
- 不是招聘方管理系统。
- 不是自动投递或批量海投系统。
- 不是组织级多租户协作系统。
- 不是大模型训练平台。
- 不是通用学习平台或大而全题库。
- 不是 Spring Boot / MyBatis / Redis / MQ 组成的高级 Java 后端主项目。
- 不是强隔离多 agent runtime；当前 AI 团队依赖软权限、主线程审计和 validator。

## 当前边界

- Web runtime 同步已通过浏览器刷新、浏览器重启和移动视口读回验证；服务端证据通过 `/api/runtime` 轮询确认。
- Android 本地 WebView 保存已通过杀进程重启读回验证；当前自动化覆盖的是本地 asset 路径，不等于远端 HTTPS 首访已经完全消除外部网络风险。
- 正式域名公网首访仍受外部备案/接入状态影响；不能把域名 reset 归因于 React 或 Node。
- Android 默认远端优先，远端不可用时 fallback 到本地 React assets / 旧 public-safe；Basic Auth 凭据已改为 Android Keystore + AES/GCM 加密保存并迁移旧明文键，远端 session cookie 状态、清除和重新登录入口已集中到原生 bridge，但远端真机验收仍需真实 URL/账号和 evidence。
- 旧文档已收敛到 `docs/core/` 作为当前事实源；历史细节只在必要证据索引中保留。

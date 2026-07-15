# Job Sprint 项目规则

## Codex AI 团队项目适配规则

通用 Codex AI 工作团队不绑定本项目目录。权威入口是全局 skill：

- `~/.codex/skills/codex-ai-team/SKILL.md`

当用户在 Codex 对话里说到下列意图时，视为明确要求启用全局 Codex 多 agent 团队；本项目只追加 Job Sprint 的文档治理、验证命令和本地留痕规则：

- `AI团队：<任务>`
- `AI工作团队：<任务>`
- `用 AI 团队处理/复核/实现/规划 <任务>`
- `manager-dispatch`、`full-team-review`、`qa-gate`、`plan-only`、`runtime-spike`
- `让团队看一下`、`让团队接手`、`开发团队模式`

固定原则：

0. 熔断恢复和当前线程隔离优先级最高。只要最新用户消息、截图或线程历史出现“正在关闭智能体”、`closing agents`、`agent thread limit reached`、清理等待或 stale role，本轮不得再以“真实团队证据”“完整 Team Room”或“释放容量”为理由发现、派发、关闭或等待任何 agent；必须直接进入 `current_thread_quarantine=true`、`max_agents=0` 的主线程恢复。
1. 真正的团队入口是全局 `codex-ai-team` skill + Codex 对话触发；默认先由 Team Lead / 主线程做 Manager Dispatch，再按需使用 `multi_agent_v1.spawn_agent` 派发独立专家角色；不得把 npm 脚本当作团队调度入口。
2. 优先使用全局角色 `codex_team_lead`、`codex_product_reviewer`、`codex_tech_lead`、`codex_implementation_agent`、`codex_qa_reviewer`、`codex_runtime_spike`；若当前运行时只暴露本项目旧角色，可兼容使用 `team_lead`、`product_reviewer`、`tech_lead`、`implementation_agent`、`qa_reviewer`、`runtime_spike`，但收口必须标明这是项目兼容角色。
3. 本项目不再提供本地团队调度脚本；任何本地记录或归档只能作为历史证据，不能代表 Product Reviewer、Tech Lead、Implementation Agent 或 QA Reviewer 已经参与。
4. Team Lead 默认由主线程担任唯一用户沟通入口，负责定义 `task_class`、owner、max_agents、必要角色、禁止角色、跳过原因、验收命令和收口口径；只有高风险审计或用户明确要求时才派发独立 Team Lead agent。
5. 当前运行时硬只读隔离仍是 `BLOCKED`，所以只读角色必须靠软权限、diff 审核和 validator 约束。
6. 只有用户意图需要实施时才派发 Implementation Agent；如果用户明确说“只出方案、不能改动”，不得派发实施角色修改文件。
7. 每轮默认最多派 1 个专家 agent；需要 2 个专家时必须说明交叉风险；超过 2 个必须是架构级、发布级、鉴权/安全、数据迁移、最终验收审计或用户明确要求，否则标 `DISPATCH_OVERBUDGET` 或 `TEAM_ROOM_PARTIAL`。
8. 团队收口必须说明路由决策、实际派发了哪些 agent、哪些角色未派发及原因、运行了哪些验证、剩余风险是什么。
9. 团队运行采用分级协作：日常任务用轻量 kickoff + 按需专家；只有 T2/T3 高风险任务才要求完整 Team Room 的角色接力、交叉质询、Team Lead 裁决和复盘。缺少所需层级证据时必须标 `TEAM_FEEL_INSUFFICIENT`、`TEAM_ROOM_PARTIAL` 或 `DISPATCH_OVERBUDGET`，不能宣称完整团队协作通过。
10. 不得把关闭、停止或等待 stale agent 作为团队收尾步骤；一旦必要证据已返回或角色超时，直接记录 `stale_or_missing`、按证据降级并继续执行，不能卡在“正在关闭智能体”。
11. 一旦出现 `agent thread limit reached`、`closing agents`、`正在关闭智能体` 或清理等待，本轮必须立即熔断：不补派、不关闭、不等待，把失败记录为 `spawn_failed` 或 `stale_or_missing`，切回主线程 Manager Dispatch 继续；除非本来就是经理直办，否则最高只能标 `TEAM_ROOM_PARTIAL`。
12. 如果截图、旧 checklist、上一轮输出或上下文压缩摘要里已经出现“已创建智能体”“正在关闭智能体”“还要关闭/清理 agent”，不得把它继承成下一步计划；必须设置 `agent_lifecycle_budget=0`、`inherited_agent_cleanup_discarded=true`，把旧 agent 证据记为 `stale_or_missing`，直接继续主线程可验证工作。

最高优先级运行保护：

- 每次进入 AI 团队/Team Room/Manager Dispatch 前，必须先做熔断检查：最新用户消息、截图或线程历史只要出现“正在关闭智能体”、`closing agents`、`agent thread limit reached`、清理等待或 stale role，本轮立即进入隔离期。
- 如果当前窗口、截图或历史输出已经显示“正在关闭智能体”、`closing agents`、`agent thread limit reached` 或 agent 清理等待，后续动作必须先执行熔断恢复规则。
- 熔断后禁止调用 `close_agent`、禁止继续 `wait_agent`、禁止为了补证据再派发新 agent；Team Lead / 主线程直接继续可验证的本地工作。
- 熔断后也禁止做 agent 工具发现或“释放容量”动作；缺失的团队证据就是本轮的失败证据，不允许为了补齐证据继续消耗用户时间。
- 因熔断缺失的角色证据必须在最终报告中记录为 `stale_or_missing` 或 `spawn_failed`；本轮不得标 `TEAM_ROOM_PASS`。
- 如果用户反馈本窗口已经因为“关闭智能体”卡住，或截图能看到“正在关闭智能体”，本用户任务剩余部分进入隔离期：`max_agents=0`，不发现、不派发、不关闭、不等待任何 agent；只有用户明确要求“重新启用 subagents / 多 agent”时，后续新任务才允许恢复按需派发。
- 隔离期必须同时写明 `agent_lifecycle_budget=0` 和 `inherited_agent_cleanup_discarded=true`；旧 run 的关闭/清理步骤视为已作废的流程噪音，不得再作为待办、阻塞项或“先处理一下”的动作。
- 隔离期内仍可使用 Team Room 的路由看板和最终报告格式，但只能标 `MANAGER_DISPATCH_PASS`、`TEAM_ROOM_PARTIAL` 或 `TEAM_ROOM_BLOCKED`，不得为了“团队感”伪造角色参与。
- 隔离期 kickoff 和最终报告必须显式写出 `current_thread_quarantine=true`、`max_agents=0`、`stall_recovery_reason`、未派发角色原因和实际验证命令；不得把关闭/停止/等待 agent 写成待办或继续执行步骤。

入口映射：

| 用户意图 | entrypoint | 默认派发 |
|---|---|---|
| 普通 AI 团队任务、小改动、一般复核 | `manager-dispatch` | Team Lead 主线程先路由；默认不派或只派 1 个必要专家 |
| 架构级、发布级、鉴权/安全、数据迁移、最终验收审计，或用户明确要求完整团队 | `full-team-review` | Team Lead 先裁剪角色；只派触发条件成立的 Product / Tech / Implementation / QA |
| 交付前复核、代码/文档复核、冒烟测试 | `qa-gate` | `codex_qa_reviewer`，只有 QA 点名产品或技术风险时补派 `codex_tech_lead` 或 `codex_product_reviewer` |
| 只制定方案、不能改动 | `plan-only` | Team Lead 主线程收口；仅当计划问题需要产品或技术判断时派 `codex_product_reviewer` 或 `codex_tech_lead`；不派发实施修改 |
| 验证 Codex agent、权限、沙箱或平台能力 | `runtime-spike` | `codex_runtime_spike`，Team Lead 主线程收口 |

## GitFlow 版本管理硬规则

权威规范是 `docs/product/product-ops/gitflow-development-governance.md`。所有新需求、缺陷、重构、文档、发布和热修都必须遵守；历史分支不追溯改名。

1. `main` 只代表可发布版本，`develop` 只代表下一版本集成；两者禁止直接开发和直接提交。
2. 普通需求从最新 `develop` 创建 `feature/`、`fix/`、`refactor/`、`docs/`、`chore/`、`test/` 或 `spike/` 分支；Codex 分支允许增加 `codex/` 前缀。
3. `release/vX.Y.Z` 从 `develop` 创建并只向 `main` 提 PR；`hotfix/<ticket>-<slug>` 从 `main` 创建并在合并后回同步 `develop`。
4. 开始任何写操作前必须检查 `git status`；发现无关未提交改动时保留并绕开，不能覆盖、重置或混入本需求提交。
5. 禁止在混合工作树中直接 `git add -A`；按单一意图显式暂存文件并检查 `git diff --cached`。
6. 提交和 PR 标题必须使用 `type(scope): description`；一个提交只表达一个可测试、可独立回退的意图。
7. 普通需求 PR 目标必须是 `develop`；release/hotfix PR 目标必须是 `main`。合并前必须通过 `GitFlow Policy` 和影响范围内的测试、安全扫描。
8. 普通需求使用 squash merge，合并后删除工作分支；release/hotfix 必须把 `main` 回同步到 `develop`。
9. 新需求卡必须记录工作分支、来源分支、目标分支、提交计划和验证计划；缺少这些字段不得开始实施。
10. 本地检查使用 `npm run validate:gitflow` 和 `npm run test:gitflow`；不得绕过失败门禁后宣称需求已完成。

## 问题修复硬规则

以后处理任何线上故障、登录失败、页面白屏、部署异常、测试失败或用户反馈的 bug，必须先诊断再修改，不得拿到症状就直接动手改。

固定顺序：

1. **定义问题**：先写清用户看到的现象、受影响入口、期望结果、当前证据和本轮边界。
2. **真实复现**：优先用用户同等路径复现。浏览器问题必须用真实浏览器或等价 UI 验证；远端问题必须区分本地、服务器回环、正式域名、临时入口和用户网络。
3. **判断能不能修**：明确问题属于代码、配置、数据、部署、账号、网络、云厂商、第三方服务还是用户侧环境；不能把不属于本项目控制面的故障写成已修复。
4. **需要外力就先借助外力**：
   - 需要用户提供设备、验证码、控制台操作、账号确认、真实输入或授权时，先问用户。
   - 涉及最新规则、云厂商限制、第三方服务、浏览器/框架行为或不确定技术事实时，先查官方文档、源码、日志或网络资料。
   - 涉及真实浏览器状态时，必须控制真实浏览器验证，不能只靠推论或 curl。
5. **确定方案再改**：在修改前说明根因假设、证据、方案、影响范围、回滚方式和验收命令；根因没有证据时不得做“顺手试试”的补丁。
6. **单点改动**：一次只修一个已确认根因。远端配置先备份，本地文件用最小变更，不做无关重构。
7. **验证闭环**：改完必须跑对应门禁，并给出通过项、失败项、截图或关键输出。部分通过就标 `PARTIAL`，外部阻塞就标 `BLOCKED` 或 `USER_ACTION_REQUIRED`。
8. **沉淀状态**：若问题涉及产品能力、部署、验收或交接，必须同步更新 `docs/core/` 或 `docs/archive/index.md` 中对应事实源，不能只改功能不改档案。

停止条件：

- 复现不了问题时，先补证据或让用户协助复现，不直接改。
- 无法确认控制面时，先标出本项目能修和不能修的部分。
- 需要外部控制台、域名合规、第三方封禁、账号权限或用户私密输入时，不伪造完成结论。
- 验证失败时，不得把“可能好了”写成“已解决”。

## 产品文档治理

凡是新增或更新 Job Sprint 的产品文档、验收报告、PRD、审计报告、交接文档、路线图或复盘，都必须先阅读：

- `docs/README.md`
- `docs/core/01-project-background.md`
- `docs/core/02-project-plan.md`
- `docs/core/03-technical-architecture.md`
- `docs/core/04-acceptance-and-risk.md`

默认规则：

1. 当前事实源只放在 `docs/core/`，不要恢复旧产品文档目录。
2. 项目背景、规划、技术架构、验收风险分别更新对应核心文档。
3. 旧文档已删除或归档索引化时，只更新 `docs/archive/index.md`，不要重新生成历史截图和一次性报告。
4. AI 团队相关规则以全局 `~/.codex/skills/codex-ai-team/SKILL.md` 为准；本项目只保留最小调用边界和归档摘要。
5. 任何验收结论必须说明真实验证命令、截图路径或关键输出、失败项和剩余风险。
6. 不得在文档中写入真实 token、密码、服务器私钥路径、完整登录命令或敏感部署信息。

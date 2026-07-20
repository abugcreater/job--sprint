# GitFlow 开发与版本治理规范

日期：2026-07-10

## 目标

本规范是 Job Sprint 所有需求、缺陷、重构、文档、发布和紧急修复的 Git 权威流程。目标是让每次开发都能回答四个问题：从哪个稳定基线开始、改动属于哪个需求、提交为什么可以独立回退、最终通过什么证据进入发布分支。

本项目采用轻量经典 GitFlow。它保留 `main + develop + 短生命周期工作分支`，不引入长期个人分支，也不允许在受保护分支上直接开发。

## 分支职责

| 分支 | 来源 | 合并目标 | 用途 | 直接提交 |
|---|---|---|---|---|
| `main` | 已验收 release/hotfix | 无 | 始终代表可发布、可打标签的稳定版本 | 禁止 |
| `develop` | `main` 或上一版本回同步 | 无 | 下一版本的日常集成基线 | 禁止 |
| `feature/<ticket>-<slug>` | `develop` | `develop` | 新功能、用户可见能力 | 禁止跨需求复用 |
| `fix/<ticket>-<slug>` | `develop` | `develop` | 非生产紧急缺陷和回归修复 | 禁止跨问题复用 |
| `refactor/<slug>` | `develop` | `develop` | 不改变产品行为的结构调整 | 禁止混入新功能 |
| `docs/<slug>` | `develop` | `develop` | 独立文档和流程治理 | 禁止混入业务代码 |
| `chore/<slug>` | `develop` | `develop` | 依赖、工具、仓库治理 | 禁止混入用户功能 |
| `test/<slug>` | `develop` | `develop` | 独立测试补强 | 禁止借测试名义改行为 |
| `spike/<slug>` | `develop` | 通常不合并；需要时转正式分支 | 有时间盒的技术验证 | 不作为正式交付分支 |
| `release/vX.Y.Z` | `develop` | `main` | 发布冻结、版本说明、阻断修复 | 只允许发布相关改动 |
| `hotfix/<ticket>-<slug>` | `main` | `main`，随后回同步 `develop` | 生产紧急修复 | 只允许单一根因修复 |

Codex 创建的工作分支允许增加 `codex/` 命名空间，例如 `codex/feature/REQ-102-profile-import` 或 `codex/chore/gitflow-governance`。去掉 `codex/` 后仍必须符合上表规则。

历史分支不追溯改名；本规范合并后创建的新需求必须遵守。

## 一次需求的标准生命周期

### 1. 启动前

1. 确认工作树干净，不覆盖其他人或其他任务的未提交内容。
2. 读取需求卡、事实源、known issues 和当前交付边界。
3. 普通需求从最新 `develop` 开始；生产热修从最新 `main` 开始。
4. 一个需求只创建一个主工作分支；发现无关问题时另建 issue/分支。

```bash
git fetch --prune origin
git switch develop
git pull --ff-only origin develop
npm run validate:gitflow -- --phase start
git switch -c feature/REQ-102-profile-import
```

### 2. 开发中

1. 先更新需求卡中的分支、影响范围、验收层级和提交计划。
2. 小步实现并运行相应测试；不要把多个产品问题堆到一次提交。
3. 提交前只暂存本提交负责的文件，混合工作树禁止直接 `git add -A`。
4. 每次提交必须是可解释、可测试、可独立回退的单一意图。
5. 生成物、私有 env、数据库、证据报告、密钥和本机路径不得提交。

### 3. 提交

提交信息采用 Conventional Commits：

```text
<type>(<scope>): <concise description>
```

允许的 `type`：

| type | 用途 |
|---|---|
| `feat` | 新增用户可见能力 |
| `fix` | 修复缺陷、安全问题或行为回归 |
| `docs` | 只修改文档 |
| `refactor` | 行为不变的代码重构 |
| `test` | 只新增或修正测试 |
| `chore` | 仓库、依赖和维护任务 |
| `build` | 构建系统或打包 |
| `ci` | CI 工作流 |
| `perf` | 性能优化 |
| `revert` | 回退已有提交 |

`scope` 使用稳定模块名，例如 `coach`、`auth`、`admin`、`stats`、`rust-api`、`android`、`gitflow`、`deps`。

正确示例：

```text
feat(coach): add profile import feedback
fix(auth): isolate invited user data
docs(gitflow): define release workflow
chore(deps): remove unused sqlx drivers
```

禁止示例：`WIP`、`update files`、`fix bug`、`misc changes`、一个提交同时包含无关功能和格式化。

提交前执行：

```bash
git diff --cached --check
npm run validate:gitflow -- --phase commit --message "feat(coach): add profile import feedback"
npm run scan:sensitive
```

### 4. 提交 PR

1. `feature/fix/refactor/docs/chore/test/spike` 只能向 `develop` 提 PR。
2. `release` 和 `hotfix` 只能向 `main` 提 PR。
3. PR 标题必须使用与提交相同的 Conventional Commit 格式。
4. PR 必须填写需求、范围、测试、安全、数据隔离、交付边界和回滚方式。
5. PR 前工作树必须干净，分支必须推送且与目标分支无未处理冲突。
6. 所有 required checks 通过前不得合并。

```bash
npm run validate:gitflow -- \
  --phase pr \
  --base develop \
  --message "feat(coach): add profile import feedback"
git push -u origin feature/REQ-102-profile-import
```

### 5. 合并和清理

- 普通需求 PR 使用 squash merge，保证 `develop` 上“一项需求一个最终提交”；PR 标题就是最终提交标题。
- 合并后删除远端和本地工作分支，不保留长期个人分支。
- 合并前若目标分支前进，优先 rebase 当前工作分支；禁止对共享的 `main`、`develop`、`release`、`hotfix` 做 force push。
- 发现合并后回归时，优先 revert 对应 squash commit，再另建修复分支，不在 `develop` 直接补丁。

### 6. 每日迭代收口规则

- 每次自动迭代开始前必须先检查目标为 `develop` 的全部开放 PR；只要存在 Draft、冲突、失败/等待中的 required check 或未合并工作分支，就先收口积压，不再创建新需求分支。
- 自动迭代不得把“提交已推送”或“Draft PR 已创建”当作完成。实现完整且验证通过后必须转 Ready，required checks 成功后 squash merge 到 `develop`，随后删除远端和本地短分支。
- 同一时刻原则上只保留一个正在实施的日更需求；外部阻塞时保留该 PR 并停止新增，避免功能堆叠后集中解决冲突。
- 按每 7 天一次的节奏检查发布条件；当 `develop` 与 `main` 文件树有差异，且距上次 release 已满 7 天、或已有 3 项需求合入 `develop`、或用户明确要求时，启动 `release/* -> main`。
- release 合并并打标签后必须回同步 `develop`；只有确认内容与历史均已按规范收口，才删除 release 和回同步短分支。

## 发布流程

1. 从已通过需求验收的 `develop` 创建 `release/vX.Y.Z`。
2. 版本号从现有 tag 与已合并 release PR 的最大语义化版本递增补丁位；禁止复用已有 release 分支、PR 或 tag。
3. release 分支只允许版本号、发布说明、打包配置和发布阻断修复。
4. Git 版本发布运行 `npm run test:git-release`、安全扫描和本地功能流；只有明确授权服务器交付时，才运行追加远端 Linux 与交付包构建的 `npm run test:release`。
5. 以 `chore(release): prepare vX.Y.Z` 为 PR 标题合并到 `main`。
6. 在 `main` 创建附注标签 `vX.Y.Z`。
7. 将 `main` 回同步到 `develop`，确保 release 修复不会在下一版本丢失。
8. 删除 release 分支。

## Hotfix 流程

1. 从 `main` 创建 `hotfix/<ticket>-<slug>`。
2. 只修一个已确认根因，补回归测试和安全验证。
3. PR 合并到 `main`，发布补丁版本并打 `vX.Y.Z` 标签。
4. 将同一修复回同步到 `develop`；有未发布 release 时也同步到该 release。
5. 禁止只修 `main` 而让下一版本重新引入问题。

## GitHub 仓库设置

`main` 和 `develop` 必须设置为受保护分支：

- 禁止直接 push 和 force push。
- 必须通过 Pull Request 合并。
- 必须通过 `GitFlow Policy` 和项目测试。
- 必须解决 review conversation。
- 单人仓库可不强制他人 approval；多人协作至少 1 个 approval。
- 管理员也应遵守规则，紧急绕过必须在 PR 或事故记录中说明。

仓库第一次启用本规范时，先将已批准发布基线合并到 `main`，再从 `main` 创建 `develop`。在 `develop` 建立并保护前，不开始下一项产品需求。

## 自动门禁

| 入口 | 作用 |
|---|---|
| `npm run validate:gitflow -- --phase work` | 检查当前是否处于合法工作分支。 |
| `npm run validate:gitflow -- --phase start` | 检查需求是否从干净的 `develop` 启动。 |
| `npm run validate:gitflow -- --phase commit --message "..."` | 检查分支和提交信息。 |
| `npm run validate:gitflow -- --phase pr --base <base> --message "..."` | 检查 PR 目标、标题和干净工作树。 |
| `npm run test:gitflow` | 运行 GitFlow 策略单测。 |
| `.github/workflows/gitflow-policy.yml` | GitHub PR 自动检查分支、目标分支和 PR 标题。 |
| `.github/gitflow-automation-contract.json` | 精确约束积压阻断、普通需求合并方式、release 周期、目标分支和回同步目标，避免关键词文档被反向改写后仍通过。 |

## 完成定义

一项需求只有同时满足以下条件才算 Git 层面完成：

- 工作分支命名正确，来源和目标分支正确。
- 提交按单一意图拆分，最终 PR 标题符合 Conventional Commits。
- 对应测试、安全扫描和影响范围门禁通过。
- PR 描述记录真实验证、限制和回滚方式。
- 合并后删除短生命周期分支。
- release/hotfix 已按规则回同步 `develop`。

# 旧文档归档索引

日期：2026-07-03

当前文档治理目标是“只保留少数核心文档”。旧 PRD、一次性计划、历史验收报告、截图、复盘、发布说明和研究材料不再作为当前事实源。

## 当前事实源

- `docs/core/01-project-background.md`
- `docs/core/02-project-plan.md`
- `docs/core/03-technical-architecture.md`
- `docs/core/04-acceptance-and-risk.md`

## 旧文档处理规则

| 类别 | 处理 |
|---|---|
| 产品 capsule | 有效结论合并进 `docs/core/` 后删除。 |
| 历史 QA / 截图 | 只保留最新验收摘要和必要证据；大量过程截图删除。 |
| 发布说明 / 复盘 | 可复用经验合并进核心风险或计划后删除。 |
| 部署 / 运维旧稿 | 当前架构、风险和命令合并进 `03-technical-architecture.md` 与 `04-acceptance-and-risk.md`。 |
| AI team 适配 | 删除项目级团队本体，只保留边界说明和删除处置记录；通用团队入口以全局 skill 为准。 |

## 不删除的运行路径

- `apps/`
- `assets/`
- `data/`
- `tools/`
- `tests/`
- `schedule.html`
- `login.html`
- `sw.js`

## 删除后的验证

删除旧文档后必须至少运行：

```bash
npm test
npm run validate:paths
npm run validate:workspace-boundaries
npm run scan:sensitive
```

发布或 Android fallback 相关变更再运行：

```bash
npm run test:release
```

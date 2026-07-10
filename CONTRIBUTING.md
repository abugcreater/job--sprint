# 参与开发

Job Sprint 使用轻量 GitFlow。完整规则见 [`docs/product/product-ops/gitflow-development-governance.md`](docs/product/product-ops/gitflow-development-governance.md)。

## 必须遵守

- `main` 是可发布分支，`develop` 是日常集成分支；两者都禁止直接开发和直接提交。
- 普通需求从 `develop` 创建 `feature/`、`fix/`、`refactor/`、`docs/`、`chore/`、`test/` 或 `spike/` 分支。
- 发布从 `develop` 创建 `release/vX.Y.Z`；生产紧急修复从 `main` 创建 `hotfix/<ticket>-<slug>`。
- Codex 分支可增加 `codex/` 前缀，但去掉前缀后仍须符合上述命名。
- 提交和 PR 标题使用 `type(scope): description`，例如 `feat(coach): add profile import feedback`。
- 普通需求 PR 目标是 `develop`；release/hotfix PR 目标是 `main`。
- 不提交真实密钥、私有数据、本机路径、数据库、签名材料或交付 evidence。

## 开发前

```bash
git fetch --prune origin
git switch develop
git pull --ff-only origin develop
npm run validate:gitflow -- --phase start
git switch -c feature/REQ-102-profile-import
```

## 提交前

```bash
git diff --cached --check
npm run validate:gitflow -- --phase commit --message "feat(coach): add profile import feedback"
npm run scan:sensitive
```

根据影响范围运行 React、Node、Rust、Android 或交付门禁。局部测试通过不能写成全量交付通过。

## PR 前

```bash
npm test
npm run validate:gitflow -- \
  --phase pr \
  --base develop \
  --message "feat(coach): add profile import feedback"
```

普通需求使用 squash merge，并在合并后删除工作分支。release/hotfix 合并后必须把 `main` 回同步到 `develop`。

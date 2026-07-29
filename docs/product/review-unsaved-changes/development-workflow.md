# 复盘编辑未保存修改保护开发与验证流程

日期：2026-07-29

## 实施顺序

1. 新建复盘草稿适配层，定义克隆与 dirty 判断，并补字段覆盖单测。
2. 新建复盘编辑保护 Hook，维护基线、待确认状态和确认后的取消动作。
3. 在复盘页接入局部 `alertdialog`，保留既有保存、删除、历史和服务器快照行为。
4. 补页面测试，验证继续编辑、放弃修改、未修改快速路径、保存后基线刷新与 Evidence Gate 不被误写。
5. 运行前端、仓库治理和 GitFlow 验证，完成 PR 合入与短分支清理。

## 验证命令

```bash
npm --prefix apps/react-web test -- ReviewPage.test.tsx reviewDraftAdapter.test.ts
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test
npm --prefix apps/react-web run build
npm test
npm run validate:product-iteration
npm run scan:sensitive
git diff --check
```

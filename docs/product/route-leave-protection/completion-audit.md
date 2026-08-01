# 未保存内容路由离开保护完成审计

日期：2026-08-01
状态：已完成（本地 React 验收）

## 已确认事实

- 已确认五类表单均有可复用的 dirty 判断，未保存草稿不应写入正式记录。
- 已确认 AppShell 可以包裹全部站内 `Link` / `NavLink`，且当前 HashRouter 链接使用 `#/...`。
- 已明确浏览器/Android 系统返回与应用强杀不在本轮承诺范围。

## 验证结果

- `RouteLeaveGuard.test.tsx`：覆盖脏草稿的继续编辑、放弃离开、干净直接跳转和 `beforeunload`，2 项通过。
- `ProfileDraftProtection.test.tsx`：新增真实 AppShell 侧栏导航回归；画像输入有修改时，继续编辑保留输入，确认放弃才进入机会页，4 项通过。
- 五类草稿保护定向回归：6 个文件、20 项通过。
- `npm --prefix apps/react-web run typecheck`：通过。
- `npm --prefix apps/react-web test`：45 个文件、134 项通过。
- `npm --prefix apps/react-web run build`：通过；仅保留既有单包超过 500 kB 告警。
- `node tools/validate_architecture_quality.js`、`npm test`、`npm run validate:product-iteration`、`npm run scan:sensitive` 和 `git diff --check`：通过；根门禁仅提示既有 Android 远端 evidence 缺失。

## 交付边界

- 本轮仅修改 React Web 源码与产品文档；不执行 Android 打包、远端服务器同步、部署或生产账号/数据操作。

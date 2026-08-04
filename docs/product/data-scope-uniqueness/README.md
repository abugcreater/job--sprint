# 邀请账号数据域唯一性

日期：2026-08-04
状态：开发中

## 需求卡

- 原始问题：新账号绝不能因配置错误进入其他登录账号的数据域。
- 目标用户：由 owner 通过邀请账号管理开通或重置账号的求职用户。
- 用户路径：owner 填写登录名和数据域 -> 界面提前提示已占用的数据域 -> 服务端最终校验 -> 成功开通独立账号，或保留输入并说明冲突。
- 影响模块：邀请账号管理、Node users file、Rust users file、账号/数据域合同测试、Android WebView 资产。
- 数据对象：`users` 配置中的 `username`、`dataScope`、账号审计；`dataScope` 是服务端 runtime 隔离键。
- 权限边界：仅 owner 可操作邀请与开通；普通用户没有该入口，也不能绕过后端校验。

## 本轮范围

1. Node 与 Rust 在创建或更新登录账号前，拒绝与其他登录账号重复的 `dataScope`。
2. 邀请管理界面在已读取到的配置账号中提前提示冲突，但后端仍是唯一可信防线。
3. 保持同一账号的密码重置可用；不修改其既有的 `dataScope`。
4. 用 Node/Rust API 合同测试证明失败不会写入账号或邀请记录。

## 明确不做

- 不新增公开注册、组织共享空间、多人共用数据域或跨租户数据迁移。
- 不自动修改现有 users file 中的历史配置，不操作服务器、远端账号或生产数据。
- 不把未开通登录账号的邀请记录当成 runtime 数据域；实际登录账号才进入强制校验。

## 验收入口

- [方案比较](prd-options.md)
- [推荐方案](prd-recommended.md)
- [评审与裁决](review-and-adjudication.md)
- [开发与验证流程](development-workflow.md)
- [完成审计](completion-audit.md)

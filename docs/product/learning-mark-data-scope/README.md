# 学习重点数据域隔离

## 目标

让共用同一浏览器的不同账号只看到自己的学习重点标记，避免新账号沿用前一账号的知识卡练习偏好。

## 本轮范围

- 将学习重点标记从单一共享浏览器键改为 `dataScope` 分桶。
- 无 `dataScope` 时回退登录名；离线单机模式使用 `local`。
- 已登录账号只读取自己的分桶，旧无归属共享键不会被迁移或读取。
- 数据域切换时重载当前账号的学习重点标记。

## 非目标

- 不把标记写入 Evidence Gate、runtime、Node、Rust 或 AI 反馈。
- 不猜测、迁移或暴露旧共享 key 的归属。
- 不提供跨设备同步、Android 真机或远端服务器交付。

## 验收入口

- `apps/react-web/src/test/learningAdapter.test.ts`
- `apps/react-web/src/test/LearningPage.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test`

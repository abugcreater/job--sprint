# 画像未保存修改保护开发与验证流程

日期：2026-07-28

## 实现步骤

1. 在 `coachAdapter` 增加画像草稿克隆与 dirty 判断。
2. 在 `CoachPage` 保存草稿基线和待处理画像动作，保存成功或确认放弃后同步基线。
3. 在 `ProfilePanel` 将三种替换动作改为请求式回调，并渲染确认对话框。
4. 扩展适配层和教练页测试，验证输入保留、明确放弃、无修改快速路径与数据不被误写入。

## 最小验证

- `npm --prefix apps/react-web test -- coachAdapter.test.ts CoachPage.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test`
- `npm run validate:product-iteration`
- `npm run scan:sensitive`
- `git diff --check`

## 不覆盖的验证

- 浏览器刷新、关闭标签页、应用强杀、Android 系统返回或全部外部导航。
- 全局表单协议、自动保存、服务端草稿、Android 更新和服务器交付。

# 机会编辑未保存修改保护开发与验证流程

日期：2026-07-26

## 实施顺序

1. 在机会工作台记录打开编辑器时的草稿基线，并提供精确 dirty 判断。
2. 将取消编辑和移动端关闭统一到同一个退出请求；无修改直接退出，有修改显示确认。
3. “继续编辑”只关闭确认面板；“放弃修改”才执行既有草稿重置、URL 返回和焦点恢复。
4. 扩展机会页测试，验证新增和编辑两种路径以及无修改直接退出。
5. 运行 React、产品工作流、敏感扫描和 GitFlow 门禁；浏览器检查桌面与窄屏确认面板。

## 验收命令

```bash
npm --prefix apps/react-web run typecheck
npm --prefix apps/react-web test -- ApplicationsPage.test.tsx applicationsAdapter.test.ts
npm --prefix apps/react-web run build
npm run validate:product-iteration
npm run scan:sensitive
```

## 不覆盖的验证

- 浏览器刷新、关闭标签页、应用强杀或全部外部导航的未保存修改拦截。
- 全局表单协议、服务端草稿、自动保存、Android 包更新和服务器交付。

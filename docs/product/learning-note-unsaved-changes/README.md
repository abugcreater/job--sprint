# 学习笔记未保存草稿保护

## 目标

让用户在学习工作台输入笔记后，取消编辑或离开页面时不会无提示丢失内容。

## 本轮范围

- 输入非空学习笔记后，点击“取消”先展示“继续编辑 / 放弃修改”确认。
- 输入非空学习笔记后，沿用全局路由离开守卫，站内切页和浏览器历史返回先确认。
- 保存成功、确认放弃或空草稿取消后，清理当前临时草稿。

## 不在本轮范围

- 不自动保存，不在刷新或重新打开浏览器后恢复草稿。
- 不改 Evidence Gate 写入语义、服务端接口、账号数据或 Android bridge。
- 不拦截学习工作台内部的“当前任务 / 任务知识摘要”视图切换；该切换不卸载草稿状态。

## 验收入口

- `apps/react-web/src/test/LearningPage.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test -- --run src/test/LearningPage.test.tsx`

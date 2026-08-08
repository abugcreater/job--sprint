# 口述回答草稿保护

## 目标

避免用户在面试训练中写到一半的口述回答因离开页面、清空输入、切换题型或切换题目而无提示丢失，或被保存到另一道题目下。

## 本轮范围

- 非空口述回答接入既有 Web 路由、浏览器历史与 Android 返回的离页守卫。
- 新增“清空回答”动作；非空时先确认“继续编辑 / 放弃修改”。
- 非空回答时，切换题型或候选题先确认；确认放弃后才清空回答并切换上下文。
- 输入开始后锁定当前题目 ID，筛选条件变化不会悄然改写回答将要保存的题目。

## 不在本轮范围

- 不自动保存，不在刷新、关闭浏览器、强杀或进程恢复后还原草稿。
- 不改变本地 rubric、Evidence Gate 写入格式、AI provider、服务端接口或账号数据。
- 不重新设计题库和筛选能力。

## 验收入口

- `apps/react-web/src/test/InterviewPage.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test -- --run src/test/InterviewPage.test.tsx`

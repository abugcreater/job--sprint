# 面试题型候选题闭环

## 目标

让面试训练页的“自动、技术核心、项目经历、JD、AI”题型切换真正改变候选题内容，使普通用户能按当前准备意图练习，而不是只看到按钮选中态变化。

## 本轮范围

- 自动题型继续使用今日口述任务的问题。
- 技术核心题型从当前任务的链路、产出和验收边界生成本地规则题。
- 项目经历题型使用当前用户画像中的经历、项目证据与不可夸大边界。
- JD 题型优先使用当前数据域内最近记录的机会岗位、JD 关键词和命中点；没有记录时降级为目标岗位匹配练习，并明确未引用具体 JD。
- AI 题型围绕当前用户目标岗位，练习 AI 工具使用、输出校验、敏感数据与人工决策边界。

## 不在本轮范围

- 不调用真实模型，不新增题库服务端接口或自动抓取 JD。
- 不向跨账号数据域读取画像、机会或证据，不改变 Evidence Gate 写入格式。
- 不自动保存口述回答，不修改已有草稿确认、Android 预测返回或远端交付语义。

## 验收入口

- `apps/react-web/src/test/interviewAdapter.test.ts`
- `apps/react-web/src/test/InterviewPage.test.tsx`
- `npm --prefix apps/react-web run typecheck`
- `npm --prefix apps/react-web test`

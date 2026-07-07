import type { DailySprint } from "../types/sprint";

export const seedSprint: DailySprint = {
  date: "2026-07-02",
  weekday: "周四",
  day: 2,
  totalDays: 14,
  theme: "泛 IT AI 求职教练样例",
  goal: "验证今日建议、知识边界、机会反馈和 Evidence Gate 能形成闭环",
  currentTaskId: "react-step-1",
  nextMilestone: "今日 AI 教练稳定可用",
  syncState: "local_fallback",
  generatedAt: "2026-07-02T00:00:00.000Z",
  progress: {
    total: 1,
    done: 0,
    pending: 1,
    overdue: 0,
    evidenceMissing: 1
  },
  risks: [
    {
      id: "react-migration-scope",
      level: "medium",
      title: "闭环范围控制",
      reason: "AI 建议必须能回到任务、证据和复盘，不能只生成静态内容。",
      mitigation: "保留 Evidence Gate，所有建议都需要可保存、可读回、可复盘。"
    }
  ],
  tasks: [
    {
      id: "react-step-1",
      day: 2,
      date: "2026-07-02",
      weekday: "周四",
      title: "验证 AI 教练闭环",
      description: "用一个泛 IT 求职样例验证今日建议、知识边界、口述训练和机会反馈是否能进入 Evidence Gate。",
      type: "project",
      status: "active",
      startAt: "Step 1",
      endAt: "完成骨架后",
      durationLabel: "Step 1",
      deliverables: [
        "今日建议可见",
        "知识边界可记录",
        "机会反馈可保存",
        "Evidence Gate 可读回"
      ],
      interviewQuestions: [
        "你的目标岗位和当前知识边界是什么？",
        "今天哪条证据能支撑下一轮面试表达？"
      ],
      acceptanceCriteria: "今日建议、笔记、口述、机会反馈和复盘均可保存并读回。",
      tags: ["AI 教练", "泛 IT", "Evidence Gate", "fallback"],
      riskIds: ["react-migration-scope"],
      evidenceRequired: ["review", "learning_note"],
      sourceLabels: []
    }
  ],
  dailyDeliverables: ["一条可验证求职证据"],
  mustAnswer: ["今天最需要 AI 教练帮我判断的知识边界是什么？"]
};

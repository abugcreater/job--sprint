import { buildTodaySprint, getScheduleData } from "../../data/scheduleAdapter";
import type { CoachScheduleEvent, DailySprint, ReviewEvidence, UserProfile } from "../../types/sprint";

export const qaProfile: UserProfile = {
  id: "profile-qa",
  name: "QA 求职画像",
  roleFamily: "qa",
  targetRole: "测试开发工程师",
  targetLevel: "高级",
  cities: "杭州",
  salaryTarget: "面议",
  companyTypes: "工具平台 / SaaS",
  experienceSummary: "接口自动化、缺陷归因、质量平台和跨团队推进。",
  projectEvidence: "测试平台用例、缺陷复盘、质量指标报表。",
  nonClaims: "不包装成后端架构师，不夸大线上所有权。",
  dailyMinutes: 90,
  active: true,
  createdAt: "2026-07-02T09:00:00+08:00",
  updatedAt: "2026-07-02T09:00:00+08:00"
};

export const qaTaskIds = {
  learning: "coach-event-qa-learning",
  interview: "coach-event-qa-interview",
  opportunity: "coach-event-qa-opportunity",
  review: "coach-event-qa-review"
} as const;

export const qaScheduleEvents: CoachScheduleEvent[] = [
  {
    id: "qa-learning",
    profileId: qaProfile.id,
    date: "2026-07-02",
    start: "09:30",
    end: "11:30",
    kind: "learning",
    title: "补 缺陷归因 面试表达",
    reason: "围绕测试开发画像补齐缺陷归因、证据边界和面试表达。",
    evidenceRequired: true,
    createdAt: "2026-07-02T09:00:00+08:00",
    updatedAt: "2026-07-02T09:00:00+08:00"
  },
  {
    id: "qa-interview",
    profileId: qaProfile.id,
    date: "2026-07-02",
    start: "14:00",
    end: "15:00",
    kind: "interview",
    title: "练 Mock 服务边界 60 秒回答",
    reason: "把测试开发项目里的 Mock 服务边界说清楚。",
    evidenceRequired: true,
    createdAt: "2026-07-02T09:00:00+08:00",
    updatedAt: "2026-07-02T09:00:00+08:00"
  },
  {
    id: "qa-opportunity",
    profileId: qaProfile.id,
    date: "2026-07-02",
    start: "16:00",
    end: "16:30",
    kind: "opportunity",
    title: "记录测试开发岗位机会反馈",
    reason: "记录一条测试开发岗位反馈，作为机会证据。",
    evidenceRequired: true,
    createdAt: "2026-07-02T09:00:00+08:00",
    updatedAt: "2026-07-02T09:00:00+08:00"
  },
  {
    id: "qa-review",
    profileId: qaProfile.id,
    date: "2026-07-02",
    start: "20:30",
    end: "21:00",
    kind: "review",
    title: "复盘测试开发证据闭环",
    reason: "复盘今天的画像、证据和下一步。",
    evidenceRequired: true,
    createdAt: "2026-07-02T09:00:00+08:00",
    updatedAt: "2026-07-02T09:00:00+08:00"
  }
];

export function buildQaSprint({
  now = new Date("2026-07-02T14:05:00+08:00"),
  completed = {},
  evidenceByTaskId = {}
}: {
  now?: Date;
  completed?: Record<string, boolean>;
  evidenceByTaskId?: Record<string, ReviewEvidence[]>;
} = {}): DailySprint {
  return buildTodaySprint(getScheduleData(), now, {
    completed,
    evidenceByTaskId,
    syncState: "local_fallback",
    activeProfileId: qaProfile.id,
    coachScheduleEvents: qaScheduleEvents
  });
}

import { buildCoachDashboard } from "../data/coachAdapter";
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const now = "2026-07-02T14:05:00+08:00";

describe("coachOutcomeMetricsAdapter", () => {
  it("surfaces outcome metrics for effective actions and interview review completion", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [{
        id: "evidence-interview-1",
        taskId: qaTaskIds.interview,
        type: "interview_answer",
        title: "测试开发面试复盘证据",
        content: "围绕 Mock 服务边界完成一轮面试回答复盘。",
        createdAt: now,
        verified: true
      }]
    };
    const sprint = buildQaSprint({
      now: new Date(now),
      completed: { [qaTaskIds.interview]: true },
      evidenceByTaskId
    });
    const dashboard = buildCoachDashboard({
      profiles: [qaProfile],
      boundaries: [],
      scheduleEvents: qaScheduleEvents,
      artifacts: [],
      evidenceByTaskId,
      sprint
    });
    const interviewTaskCount = sprint.tasks.filter((task) => task.interviewQuestions.length > 0).length;

    expect(dashboard.outcomeMetrics.effectiveActionLabel).toBe("1 项");
    expect(dashboard.outcomeMetrics.interviewReviewCompletedCount).toBe(1);
    expect(dashboard.outcomeMetrics.interviewReviewTotalCount).toBe(interviewTaskCount);
    expect(dashboard.outcomeMetrics.interviewReviewRateLabel).toBe(`${Math.round((1 / interviewTaskCount) * 100)}%`);
  });
});

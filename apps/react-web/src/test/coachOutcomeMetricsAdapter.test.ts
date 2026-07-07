import { buildCoachDashboard } from "../data/coachAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { ReviewEvidence } from "../types/sprint";

const now = "2026-07-02T14:05:00+08:00";

describe("coachOutcomeMetricsAdapter", () => {
  it("surfaces outcome metrics for effective actions and interview review completion", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [{
        id: "evidence-interview-1",
        taskId: "2026-07-02-1400-java",
        type: "interview_answer",
        title: "面试复盘证据",
        content: "围绕 MQ 故障恢复完成一轮面试回答复盘。",
        createdAt: now,
        verified: true
      }]
    };
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), {
      completed: { "2026-07-02-1400-java": true },
      evidenceByTaskId,
      syncState: "local_fallback"
    });
    const dashboard = buildCoachDashboard({
      profiles: [],
      boundaries: [],
      scheduleEvents: [],
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

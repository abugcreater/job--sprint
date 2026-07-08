import { buildTodaySprint, getEvidenceSummary, getScheduleData } from "../data/scheduleAdapter";
import type { CoachScheduleEvent } from "../types/sprint";

function scheduleEvent(patch: Partial<CoachScheduleEvent> = {}): CoachScheduleEvent {
  return {
    id: "event-qa-1",
    profileId: "profile-qa",
    date: "2026-07-02",
    start: "20:00",
    end: "20:30",
    kind: "learning",
    title: "补 缺陷归因 面试表达",
    reason: "围绕测试开发画像补齐缺陷归因证据",
    evidenceRequired: true,
    createdAt: "2026-07-02T09:00:00+08:00",
    updatedAt: "2026-07-02T09:00:00+08:00",
    ...patch
  };
}

describe("scheduleAdapter", () => {
  it("does not create today's tasks before a profile exists", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T10:00:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback"
    });

    expect(sprint.date).toBe("2026-07-02");
    expect(sprint.tasks).toEqual([]);
    expect(sprint.currentTaskId).toBeUndefined();
    expect(sprint.progress.total).toBe(0);
    expect(sprint.risks).toEqual([]);
    expect(sprint.theme).toBe("等待导入简历建档");
  });

  it("does not fall back to demo schedule when a profile has no generated calendar", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T10:00:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback",
      activeProfileId: "profile-qa",
      coachScheduleEvents: []
    });

    expect(sprint.tasks).toEqual([]);
    expect(sprint.theme).toBe("等待生成今日日历");
    expect(sprint.nextMilestone).toBe("生成今日个人行动");
  });

  it("keeps generated schedules scoped to the active profile", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T12:15:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback",
      activeProfileId: "profile-qa",
      coachScheduleEvents: [
        scheduleEvent(),
        scheduleEvent({
          id: "event-backend",
          profileId: "profile-backend",
          title: "后端画像补 MQ 边界",
          reason: "后端岗位需要补消息可靠性证据"
        })
      ]
    });

    expect(sprint.tasks.map((task) => task.title)).toEqual(["补 缺陷归因 面试表达"]);
    expect(sprint.theme).toContain("补 缺陷归因 面试表达");
    expect(sprint.risks.map((risk) => `${risk.title} ${risk.reason}`).join(" ")).not.toContain("Spring");
    expect(sprint.risks.map((risk) => `${risk.title} ${risk.reason}`).join(" ")).not.toContain("Java");
  });

  it("keeps the in-window generated task selected after completion so the user can undo", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T20:10:00+08:00"), {
      completed: { "coach-event-event-qa-1": true },
      evidenceByTaskId: {},
      syncState: "local_fallback",
      activeProfileId: "profile-qa",
      coachScheduleEvents: [scheduleEvent()]
    });

    expect(sprint.currentTaskId).toBe("coach-event-event-qa-1");
    expect(sprint.tasks.find((task) => task.id === sprint.currentTaskId)?.status).toBe("done");
  });

  it("does not merge legacy local records into a new user's evidence", () => {
    const evidence = getEvidenceSummary(
      "coach-event-event-qa-1",
      "2026-07-02",
      {},
      {
        completed: { "old-demo-task": true },
        reviews: { "2026-07-02": { summary: "旧复盘" } },
        applications: [{ date: "2026-07-02", company: "旧机会" }],
        interviewSessions: [{ date: "2026-07-02", summary: "旧口述" }]
      }
    );

    expect(evidence.hasEvidence).toBe(false);
    expect(evidence.evidence).toEqual([]);
  });
});

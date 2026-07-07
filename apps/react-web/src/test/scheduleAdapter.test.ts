import { buildTodaySprint, getEvidenceSummary, getScheduleData } from "../data/scheduleAdapter";
import type { LegacySnapshot } from "../data/legacyAdapters";
import type { CoachScheduleEvent } from "../types/sprint";

const emptyLegacy: LegacySnapshot = {
  completed: {},
  reviews: {},
  applications: [],
  interviewSessions: []
};

describe("scheduleAdapter", () => {
  it("maps the legacy schedule JSON into the React DailySprint model", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T10:00:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback"
    });

    expect(sprint.date).toBe("2026-07-02");
    expect(sprint.day).toBe(2);
    expect(sprint.tasks.length).toBeGreaterThan(1);
    expect(sprint.tasks[0].title).toBe("Spring 事务与搜索链路边界");
    expect(sprint.currentTaskId).toBe("2026-07-02-0930-java");
    expect(sprint.syncState).toBe("local_fallback");
  });

  it("chooses the next task after the current focus window", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T12:15:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback"
    });

    expect(sprint.currentTaskId).toBe("2026-07-02-1400-java");
    expect(sprint.nextTaskId).toBe("2026-07-02-1600-java");
  });

  it("keeps custom coach schedules scoped to the active profile", () => {
    const coachScheduleEvents: CoachScheduleEvent[] = [
      {
        id: "event-backend",
        profileId: "profile-backend",
        date: "2026-07-02",
        start: "20:00",
        end: "20:30",
        kind: "learning",
        title: "后端画像补 MQ 边界",
        reason: "后端岗位需要补消息可靠性证据",
        evidenceRequired: true,
        createdAt: "2026-07-02T09:00:00+08:00",
        updatedAt: "2026-07-02T09:00:00+08:00"
      },
      {
        id: "event-frontend",
        profileId: "profile-frontend",
        date: "2026-07-02",
        start: "20:30",
        end: "21:00",
        kind: "learning",
        title: "前端画像补性能指标",
        reason: "前端岗位需要补性能优化证据",
        evidenceRequired: true,
        createdAt: "2026-07-02T09:00:00+08:00",
        updatedAt: "2026-07-02T09:00:00+08:00"
      }
    ];

    const sprint = buildTodaySprint(getScheduleData(), new Date("2026-07-02T12:15:00+08:00"), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback",
      coachScheduleEvents,
      activeProfileId: "profile-backend"
    });

    const titles = sprint.tasks.map((task) => task.title);
    expect(titles).toContain("后端画像补 MQ 边界");
    expect(titles).not.toContain("前端画像补性能指标");
  });

  it("merges completed state and legacy evidence without requiring a server", () => {
    const legacy: LegacySnapshot = {
      ...emptyLegacy,
      reviews: {
        "2026-07-02": {
          summary: "今天复盘了事务边界。"
        }
      }
    };
    const sprint = buildTodaySprint(
      getScheduleData(),
      new Date("2026-07-02T10:00:00+08:00"),
      {
        completed: { "2026-07-02-0930-java": true },
        evidenceByTaskId: {},
        syncState: "local_fallback"
      },
      legacy
    );
    const currentTask = sprint.tasks.find((task) => task.id === "2026-07-02-0930-java");
    const evidence = getEvidenceSummary("2026-07-02-0930-java", "2026-07-02", {}, legacy);

    expect(currentTask?.status).toBe("done");
    expect(evidence.hasEvidence).toBe(true);
    expect(evidence.summary).toContain("旧版每日复盘");
  });
});

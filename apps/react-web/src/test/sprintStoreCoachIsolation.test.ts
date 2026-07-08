import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileDraft, createScheduleDraft } from "../data/coachAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { sanitizePersistedSprintState } from "../stores/sprintStoreLegacyMigration";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint() {
  const completed = {};
  const evidenceByTaskId = {};
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: [],
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
  });
}

describe("sprintStore coach profile isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    resetSprint();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rebuilds today's sprint with only the active profile's custom schedules", () => {
    useSprintStore.getState().saveUserProfile({
      ...createProfileDraft(),
      name: "后端画像",
      targetRole: "后端工程师",
      experienceSummary: "7 年后端经验",
      dailyMinutes: "60"
    });
    const backendProfileId = useSprintStore.getState().userProfiles[0].id;

    useSprintStore.getState().saveCoachScheduleEvent({
      ...createScheduleDraft("2026-07-02"),
      title: "后端画像补 MQ 边界",
      reason: "后端岗位需要补消息可靠性证据"
    });
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).toContain("后端画像补 MQ 边界");

    vi.setSystemTime(new Date("2026-07-02T14:05:01+08:00"));
    useSprintStore.getState().saveUserProfile({
      ...createProfileDraft(),
      name: "前端画像",
      roleFamily: "frontend",
      targetRole: "前端工程师",
      experienceSummary: "6 年前端经验",
      dailyMinutes: "45"
    });
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).not.toContain("后端画像补 MQ 边界");

    useSprintStore.getState().saveCoachScheduleEvent({
      ...createScheduleDraft("2026-07-02"),
      title: "前端画像补性能指标",
      reason: "前端岗位需要补性能优化证据"
    });
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).toContain("前端画像补性能指标");
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).not.toContain("后端画像补 MQ 边界");

    useSprintStore.getState().activateUserProfile(backendProfileId);
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).toContain("后端画像补 MQ 边界");
    expect(useSprintStore.getState().sprint.tasks.map((task) => task.title)).not.toContain("前端画像补性能指标");
  });

  it("drops legacy demo sprint tasks from persisted browser state before hydration", () => {
    const sanitized = sanitizePersistedSprintState({
      sprint: {
        date: "2026-07-08",
        tasks: [
          {
            id: "2026-07-08-0930-java",
            title: "Spring 事务、MySQL、Redis：主线深挖"
          }
        ]
      },
      completed: { "2026-07-08-0930-java": true, "personal-task": true },
      evidenceByTaskId: {
        "2026-07-08-0930-java": [
          {
            id: "evidence-legacy",
            taskId: "2026-07-08-0930-java",
            type: "learning_note",
            title: "旧 Java 学习笔记",
            content: "旧数据",
            createdAt: "2026-07-08T09:30:00+08:00",
            verified: true
          }
        ]
      },
      userProfiles: [],
      coachScheduleEvents: [],
      syncState: "local_fallback"
    }, fixedNow);

    expect(sanitized.sprint.tasks).toHaveLength(0);
    expect(sanitized.completed).toEqual({ "personal-task": true });
    expect(sanitized.evidenceByTaskId).toEqual({});
    expect(JSON.stringify(sanitized)).not.toContain("Spring 事务");
  });

  it("removes legacy demo profile schedules while keeping user-created schedules", () => {
    const sanitized = sanitizePersistedSprintState({
      userProfiles: [
        {
          id: "resume-java-001",
          name: "高级 Java 后端主身份",
          roleFamily: "backend",
          targetRole: "高级 Java 后端",
          dailyMinutes: 120,
          active: true
        },
        {
          id: "profile-qa",
          name: "测试开发工程师求职画像",
          roleFamily: "qa",
          targetRole: "测试开发工程师",
          dailyMinutes: 60,
          active: true
        }
      ],
      coachScheduleEvents: [
        {
          id: "2026-07-08-0930-java",
          profileId: "resume-java-001",
          date: "2026-07-02",
          start: "09:30",
          end: "11:30",
          kind: "learning",
          title: "Spring 事务、MySQL、Redis：主线深挖",
          evidenceRequired: true
        },
        {
          id: "coach-event-qa-learning",
          profileId: "profile-qa",
          date: "2026-07-02",
          start: "09:30",
          end: "11:30",
          kind: "learning",
          title: "补接口自动化证据",
          evidenceRequired: true
        }
      ],
      syncState: "local_fallback"
    }, fixedNow);

    expect(sanitized.userProfiles.map((profile) => profile.id)).toEqual(["profile-qa"]);
    expect(sanitized.coachScheduleEvents.map((event) => event.id)).toEqual(["coach-event-qa-learning"]);
    expect(sanitized.sprint.tasks.map((task) => task.title)).toEqual(["补接口自动化证据"]);
    expect(JSON.stringify(sanitized)).not.toContain("Spring 事务");
  });
});

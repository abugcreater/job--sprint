import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileDraft, createScheduleDraft } from "../data/coachAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
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
});

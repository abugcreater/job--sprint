import { buildMoreDashboard, buildReactStateExportPayload, parseReactStateImportPayload } from "../data/moreAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { BoundarySuggestionFeedback, DelayRecord, LlmRun, ReviewEvidence } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

describe("moreAdapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("summarizes React local state and legacy storage keys", () => {
    window.localStorage.setItem("jobSprint.react.v1", JSON.stringify({ state: { completed: {} }, version: 2 }));
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const evidence: ReviewEvidence = {
      id: "evidence-1",
      taskId: "2026-07-02-1400-java",
      type: "review",
      title: "复盘证据",
      content: "本地复盘记录",
      createdAt: "2026-07-02T14:10:00+08:00",
      verified: true
    };
    const delayRecord: DelayRecord = {
      id: "delay-1",
      taskId: "2026-07-02-1400-java",
      date: "2026-07-02",
      minutes: 30,
      reason: "临时面试",
      recoveryAction: "晚上补复盘",
      createdAt: "2026-07-02T14:11:00+08:00"
    };
    const llmRun: LlmRun = {
      id: "llm-run-1",
      profileId: "profile-1",
      provider: "local-fallback",
      promptVersion: "coach-artifacts-v1",
      schemaVersion: "coach-artifact-list-v1",
      inputSummaryHash: "abc123",
      artifactCount: 3,
      schemaStatus: "pass",
      status: "fallback",
      createdAt: "2026-07-02T14:12:00+08:00"
    };
    const boundaryFeedback: BoundarySuggestionFeedback = {
      id: "boundary-feedback-1",
      profileId: "profile-1",
      suggestionId: "suggestion-1",
      topic: "MQ",
      decision: "rejected",
      reason: "已有更准确材料",
      createdAt: "2026-07-02T14:13:00+08:00"
    };

    const dashboard = buildMoreDashboard({
      sprint,
      completed: { "2026-07-02-1400-java": true },
      evidenceByTaskId: { "2026-07-02-1400-java": [evidence] },
      delayRecords: [delayRecord],
      boundarySuggestionFeedback: [boundaryFeedback],
      llmRuns: [llmRun],
      syncState: "local_fallback",
      lastSavedAt: "2026-07-02T14:10:00+08:00",
      legacyStatus: { available: true, detectedKeys: ["jobSprint.reviews.v1", "jobSprint.applications.v1"] },
      storage: window.localStorage
    });

    expect(dashboard.sync.label).toBe("本地模式，可继续记录");
    expect(dashboard.storage.completedCount).toBe(1);
    expect(dashboard.storage.evidenceCount).toBe(1);
    expect(dashboard.storage.delayCount).toBe(1);
    expect(dashboard.storage.boundaryFeedbackCount).toBe(1);
    expect(dashboard.storage.llmRunCount).toBe(1);
    expect(dashboard.storage.reactPersisted).toBe(true);
    expect(dashboard.storage.legacyDetectedLabels).toEqual(["旧版每日复盘", "旧版机会记录"]);
    expect(dashboard.exportItems[0].filename).toBe("job-sprint-react-state.json");
  });

  it("builds a bounded React state export payload", () => {
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const payload = buildReactStateExportPayload({
      sprint,
      completed: { "2026-07-02-1400-java": true },
      evidenceByTaskId: {},
      delayRecords: [
        {
          id: "delay-1",
          taskId: "2026-07-02-1400-java",
          date: "2026-07-02",
          minutes: 30,
          reason: "临时面试",
          recoveryAction: "晚上补复盘",
          createdAt: "2026-07-02T14:11:00+08:00"
        }
      ],
      llmRuns: [
        {
          id: "llm-run-1",
          provider: "local-fallback",
          promptVersion: "coach-artifacts-v1",
          schemaVersion: "coach-artifact-list-v1",
          inputSummaryHash: "abc123",
          artifactCount: 3,
          schemaStatus: "pass",
          status: "fallback",
          createdAt: "2026-07-02T14:12:00+08:00"
        }
      ],
      boundarySuggestionFeedback: [
        {
          id: "boundary-feedback-1",
          suggestionId: "suggestion-1",
          topic: "MQ",
          decision: "needs_revision",
          reason: "需要改成故障恢复",
          createdAt: "2026-07-02T14:13:00+08:00"
        }
      ],
      syncState: "local_fallback",
      lastSavedAt: "2026-07-02T14:10:00+08:00"
    });

    expect(payload.source).toBe("jobSprint.react.v1");
    expect(payload.sprint.date).toBe("2026-07-02");
    expect(payload.completed["2026-07-02-1400-java"]).toBe(true);
    expect(payload.delayRecords).toHaveLength(1);
    expect(payload.boundarySuggestionFeedback).toHaveLength(1);
    expect(payload.llmRuns).toHaveLength(1);
    expect(payload.lastSavedAt).toBe("2026-07-02T14:10:00+08:00");
  });

  it("parses a React state export back into a restorable snapshot", () => {
    const result = parseReactStateImportPayload({
      exportedAt: "2026-07-02T14:20:00+08:00",
      source: "jobSprint.react.v1",
      syncState: "online",
      sprint: { date: "2026-07-02", day: 2, totalDays: 30, currentTaskId: "task-1" },
      completed: { "task-1": true, "task-2": false, ignored: "yes" },
      evidenceByTaskId: {
        "task-1": [
          {
            id: "evidence-1",
            taskId: "task-1",
            type: "review",
            title: "导入复盘",
            content: "导入内容",
            createdAt: "2026-07-02T14:21:00+08:00",
            verified: true
          },
          { id: "bad-evidence" }
        ]
      },
      delayRecords: [
        {
          id: "delay-1",
          taskId: "task-1",
          date: "2026-07-02",
          minutes: 20,
          reason: "导入延期",
          recoveryAction: "导入后补救",
          createdAt: "2026-07-02T14:22:00+08:00"
        }
      ],
      llmRuns: [
        {
          id: "llm-run-1",
          provider: "local-fallback",
          promptVersion: "coach-artifacts-v1",
          schemaVersion: "coach-artifact-list-v1",
          inputSummaryHash: "abc123",
          artifactCount: 3,
          schemaStatus: "pass",
          status: "fallback",
          createdAt: "2026-07-02T14:23:00+08:00"
        },
        { id: "bad-run" }
      ],
      boundarySuggestionFeedback: [
        {
          id: "boundary-feedback-1",
          suggestionId: "suggestion-1",
          topic: "MQ",
          decision: "rejected",
          reason: "已有更准确材料",
          createdAt: "2026-07-02T14:24:00+08:00"
        },
        { id: "bad-boundary-feedback" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toEqual({ completedCount: 1, evidenceCount: 1, delayCount: 1, profileCount: 0, boundaryCount: 0, boundaryFeedbackCount: 1, scheduleEventCount: 0, aiArtifactCount: 0, llmRunCount: 1 });
    expect(result.snapshot.completed).toEqual({ "task-1": true, "task-2": false });
    expect(result.snapshot.evidenceByTaskId["task-1"]).toHaveLength(1);
    expect(result.snapshot.delayRecords[0].reason).toBe("导入延期");
    expect(result.snapshot.boundarySuggestionFeedback?.[0].reason).toBe("已有更准确材料");
    expect(result.snapshot.llmRuns?.[0].provider).toBe("local-fallback");
  });

  it("rejects unsupported import files", () => {
    expect(parseReactStateImportPayload({ source: "other" })).toEqual({
      ok: false,
      error: "只支持 jobSprint.react.v1 导出文件"
    });
  });
});

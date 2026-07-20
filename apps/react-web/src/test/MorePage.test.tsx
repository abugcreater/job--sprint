import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/more") {
  window.location.hash = hash;
  window.localStorage.clear();
  window.localStorage.setItem("jobSprint.reviews.v1", JSON.stringify({ "2026-07-02": { projectPoint: "旧复盘" } }));
  const completed = {};
  const evidenceByTaskId = {};
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [qaProfile],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: qaScheduleEvents,
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildQaSprint({ now: fixedNow, completed, evidenceByTaskId })
  });
}

describe("React Job Sprint more workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ordinary-user sync, account and export panels without admin tools", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "账号与数据" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "同步状态" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我的账号" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "备份" }));
    expect(screen.getByRole("heading", { name: "个人数据备份" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "localStorage 状态" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "旧版回滚说明" })).not.toBeInTheDocument();
    expect(screen.queryByText("旧版每日复盘")).not.toBeInTheDocument();
    expect(screen.queryByText("apps/android/app/src/main/assets/web/schedule.html")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "常用入口" }));
    expect(screen.getByRole("link", { name: "查看统计 集中查看个人进展和数据完整度。" })).toBeInTheDocument();
  });

  it("exports React local state and keeps navigation links working", async () => {
    const createObjectURL = vi.fn(() => "blob:job-sprint");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(window.URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(window.URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });

    const firstRender = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "备份" }));
    fireEvent.click(await screen.findByRole("button", { name: "导出 JSON" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:job-sprint");
    expect(screen.getByRole("status")).toHaveTextContent("个人数据备份已导出");

    fireEvent.click(screen.getByRole("button", { name: "常用入口" }));
    fireEvent.click(screen.getByRole("link", { name: "进入复盘 记录今日事实、卡点和明日行动。" }));
    expect(await screen.findByRole("heading", { name: "今日复盘" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/review");

    firstRender.unmount();
    resetSprint("#/more");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "常用入口" }));
    fireEvent.click(await screen.findByRole("link", { name: "回到今日 回到当前任务和 Evidence Gate。" }));
    expect(await screen.findByRole("heading", { name: "今日 AI 教练" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/today");
  });

  it("imports React state JSON and restores completed, evidence and delay records", async () => {
    render(<App />);

    const payload = {
      exportedAt: "2026-07-02T14:20:00+08:00",
      source: "jobSprint.react.v1",
      syncState: "online",
      sprint: { date: "2026-07-02", day: 2, totalDays: 30, currentTaskId: "task-imported" },
      completed: { "task-imported": true },
      evidenceByTaskId: {
        "task-imported": [
          {
            id: "evidence-imported",
            taskId: "task-imported",
            type: "review",
            title: "导入复盘证据",
            content: "导入复盘内容",
            createdAt: "2026-07-02T14:21:00+08:00",
            verified: true
          }
        ]
      },
      delayRecords: [
        {
          id: "delay-imported",
          taskId: "task-imported",
          date: "2026-07-02",
          minutes: 25,
          reason: "导入延期原因",
          recoveryAction: "导入补救动作",
          createdAt: "2026-07-02T14:22:00+08:00"
        }
      ],
      boundarySuggestionFeedback: [
        {
          id: "boundary-feedback-imported",
          suggestionId: "suggestion-imported",
          topic: "MQ",
          decision: "rejected",
          reason: "导入候选反馈",
          createdAt: "2026-07-02T14:22:30+08:00"
        }
      ],
      llmRuns: [
        {
          id: "llm-run-imported",
          provider: "local-fallback",
          promptVersion: "coach-artifacts-v1",
          schemaVersion: "coach-artifact-list-v1",
          inputSummaryHash: "abc123",
          artifactCount: 1,
          schemaStatus: "pass",
          status: "fallback",
          createdAt: "2026-07-02T14:23:00+08:00"
        }
      ]
    };
    const file = new File([JSON.stringify(payload)], "job-sprint-react-state.json", { type: "application/json" });

    fireEvent.click(screen.getByRole("button", { name: "备份" }));
    fireEvent.change(await screen.findByLabelText("导入个人数据备份"), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("个人数据备份已导入：完成 1 项，证据 1 条，延期 1 条，画像 0 个，知识边界 0 条，AI 建议 0 条");
    });
    const state = useSprintStore.getState();
    expect(state.completed["task-imported"]).toBe(true);
    expect(state.evidenceByTaskId["task-imported"][0].title).toBe("导入复盘证据");
    expect(state.delayRecords[0].reason).toBe("导入延期原因");
    expect(state.boundarySuggestionFeedback[0].reason).toBe("导入候选反馈");
    expect(state.llmRuns[0].provider).toBe("local-fallback");
    expect(state.syncState).toBe("local_fallback");
  });
});

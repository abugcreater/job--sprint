import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY } from "../data/interviewAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/interview", withProfile = true) {
  window.location.hash = hash;
  window.localStorage.clear();
  const completed = {};
  const evidenceByTaskId = {};
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: withProfile ? [qaProfile] : [],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: withProfile ? qaScheduleEvents : [],
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: withProfile
      ? buildQaSprint({ now: fixedNow, completed, evidenceByTaskId })
      : buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
  });
}

describe("React Job Sprint interview workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("shows a profile-first empty state for a new user", async () => {
    resetSprint("#/interview", false);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "先建立你的目标岗位" })).toBeInTheDocument();
    expect(screen.getByText(/候选题会围绕你的目标岗位、经验证据和知识边界呈现/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去创建画像" })).toHaveAttribute("href", "#/coach");
  });

  it("renders interview tasks, candidate questions and local recording entry", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "面试训练" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("查看今日任务与历史记录"));
    expect(screen.getByRole("heading", { name: "今日口述任务" })).toBeInTheDocument();
    expect(screen.getAllByText("练 Mock 服务边界 60 秒回答").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("我的口述回答")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "按规则自检" })).toBeInTheDocument();
  });

  it("supports candidate question search, category filter, detail hint and weak-question marks", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "面试训练" });
    fireEvent.click(screen.getByText("选择其他题目与筛选"));
    fireEvent.click(screen.getByText("查看回答提示、结构与关键词"));

    fireEvent.change(screen.getByLabelText("搜索候选题"), { target: { value: "Mock" } });
    fireEvent.change(screen.getByLabelText("候选题分类"), { target: { value: "current-task" } });

    expect(screen.getByText("匹配 1 题")).toBeInTheDocument();
    expect(screen.getAllByText(/练 Mock 服务边界 60 秒回答/).length).toBeGreaterThan(0);
    expect(screen.getByText("详情提示")).toBeInTheDocument();
    expect(screen.getByText("回答结构")).toBeInTheDocument();
    expect(screen.getByText("预期关键词")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /标记薄弱题：练 Mock 服务边界/ }));

    expect(screen.getByText("已标记薄弱题")).toBeInTheDocument();
    expect(screen.getByText("薄弱 1 题")).toBeInTheDocument();
    expect(window.localStorage.getItem(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY)).toContain(`${qaTaskIds.interview}-question-1`);

    fireEvent.click(screen.getByRole("button", { name: "只看薄弱题" }));

    expect(screen.getByText("匹配 1 题")).toBeInTheDocument();
    expect(screen.getAllByText(/练 Mock 服务边界 60 秒回答/).length).toBeGreaterThan(0);
  });

  it("records a local oral answer that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("我的口述回答"), {
      target: {
        value: "结论先说，Mock 服务边界要讲清请求入口、异常分支和接口证据。我的项目里会用失败样例、质量指标和复盘记录证明边界，不夸大线上所有权，下一步补恢复验证。"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "按规则自检" }));

    expect(await screen.findByLabelText("规则自检结果")).toHaveTextContent("本地 rubric · 非 AI 评分");
    expect(screen.getByText("已按本地规则检查结构、证据与风险覆盖；这不是 AI 评分。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存口述证据" }));

    expect(await screen.findByText("已记 1")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview]).toHaveLength(1);
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview][0].content).toContain("规则覆盖");
    expect(screen.getByRole("link", { name: "去复盘这次练习" })).toHaveAttribute("href", "#/review");

    fireEvent.click(screen.getByRole("link", { name: "回到今日" }));

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
    expect(screen.getByText("口述训练证据")).toBeInTheDocument();
  });
});

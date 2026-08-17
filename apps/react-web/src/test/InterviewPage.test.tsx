import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "../App";
import { interviewWeakQuestionMarksStorageKey } from "../data/interviewAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/interview", withProfile = true, initialEvidenceByTaskId: Record<string, ReviewEvidence[]> = {}) {
  window.location.hash = hash;
  window.localStorage.clear();
  const completed = {};
  const evidenceByTaskId = initialEvidenceByTaskId;
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
    storageOwner: undefined,
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
    expect(window.localStorage.getItem(interviewWeakQuestionMarksStorageKey())).toContain(`${qaTaskIds.interview}-question-1`);

    fireEvent.click(screen.getByRole("button", { name: "只看薄弱题" }));

    expect(screen.getByText("匹配 1 题")).toBeInTheDocument();
    expect(screen.getAllByText(/练 Mock 服务边界 60 秒回答/).length).toBeGreaterThan(0);
  });

  it("changes candidate questions for each practice mode using the current opportunity record", async () => {
    resetSprint("#/interview", true, {
      [qaTaskIds.opportunity]: [{
        id: "opportunity-evidence-1",
        taskId: qaTaskIds.opportunity,
        type: "delivery_record",
        title: "机会反馈证据",
        content: "React 机会页本地记录：围绕「记录测试开发岗位机会反馈」补一条机会反馈。公司：Example Cloud；岗位：测试开发工程师；状态：约面；JD 关键词：接口自动化、质量平台；命中点：工程质量、项目经验",
        createdAt: "2026-07-02T15:00:00+08:00",
        verified: true
      }]
    });
    render(<App />);

    await screen.findByRole("heading", { name: "面试训练" });
    fireEvent.click(screen.getByText("选择其他题目与筛选"));

    fireEvent.click(screen.getByRole("button", { name: "技术核心" }));
    expect(screen.getByText("匹配 2 题")).toBeInTheDocument();
    expect(screen.getAllByText(/核心机制或链路/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "项目经历" }));
    expect(screen.getAllByText(/测试平台用例/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "JD" }));
    expect(screen.getAllByText(/Example Cloud/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/接口自动化/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "AI" }));
    expect(screen.getAllByText(/AI 工具/).length).toBeGreaterThan(0);
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

  it("keeps an unfinished oral answer until the user explicitly discards it", async () => {
    render(<App />);

    const answer = "先保留这版口述回答，后面还要补异常分支和证据边界。";
    fireEvent.change(screen.getByLabelText("我的口述回答"), { target: { value: answer } });

    const nav = screen.getByRole("navigation", { name: "桌面模块导航" });
    fireEvent.click(within(nav).getByRole("link", { name: "机会" }));
    expect(screen.getByRole("alertdialog", { name: "离开当前页面？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.getByLabelText("我的口述回答")).toHaveValue(answer);

    fireEvent.click(screen.getByRole("button", { name: "清空回答" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的口述回答？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.getByLabelText("我的口述回答")).toHaveValue(answer);

    fireEvent.click(screen.getByText("选择其他题目与筛选"));
    fireEvent.click(screen.getByRole("button", { name: "技术核心" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的口述回答？" })).toBeInTheDocument();
    expect(screen.getByLabelText("我的口述回答")).toHaveValue(answer);
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));

    expect(screen.getByLabelText("我的口述回答")).toHaveValue("");
    expect(screen.getByRole("button", { name: "技术核心" })).toHaveAttribute("aria-pressed", "true");
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview]).toBeUndefined();
  });

  it("does not show another account's weak-question marks after the data scope changes", async () => {
    const targetId = `${qaTaskIds.interview}-question-1`;
    const kai = { username: "kai", dataScope: "kai" };
    const guest = { username: "guest", dataScope: "guest" };
    window.localStorage.setItem(interviewWeakQuestionMarksStorageKey(kai), JSON.stringify([targetId]));
    useSprintStore.setState({ storageOwner: guest });

    render(<App />);

    await screen.findByRole("heading", { name: "面试训练" });
    expect(screen.queryByText("薄弱 1 题")).not.toBeInTheDocument();
    act(() => useSprintStore.setState({ storageOwner: kai }));
    await waitFor(() => expect(screen.getByText("薄弱 1 题")).toBeInTheDocument());
    act(() => useSprintStore.setState({ storageOwner: guest }));
    await waitFor(() => expect(screen.queryByText("薄弱 1 题")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /标记薄弱题：练 Mock 服务边界/ }));

    expect(window.localStorage.getItem(interviewWeakQuestionMarksStorageKey(guest))).toContain(targetId);
    expect(window.localStorage.getItem(interviewWeakQuestionMarksStorageKey(kai))).toContain(targetId);
  });
});

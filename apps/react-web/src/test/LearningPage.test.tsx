import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY } from "../data/learningAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

function resetSprint(hash = "#/learn", withProfile = true) {
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

describe("React Job Sprint learning workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("shows a profile-first empty state for a new user", async () => {
    resetSprint("#/learn", false);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "先建立你的求职画像" })).toBeInTheDocument();
    expect(screen.getByText(/知识任务会围绕你的求职方向生成/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去创建画像" })).toHaveAttribute("href", "#/coach");
  });

  it("renders real learning tasks, resources and knowledge card summaries", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "知识边界" })).toBeInTheDocument();
    expect(screen.getAllByText("补 缺陷归因 面试表达").length).toBeGreaterThan(0);
    expect(screen.getAllByText("用户自定义").length).toBeGreaterThan(0);
    expect(screen.getAllByText("补一条 Evidence Gate 证据").length).toBeGreaterThan(0);
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("搜索知识卡")).toBeInTheDocument();
    expect(screen.getByLabelText("知识卡分类")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "只看重点" })).toBeInTheDocument();
  });

  it("opens resource details instead of rendering inert resource names", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /用户自定义/ }));

    expect(screen.getByLabelText("资料详情")).toHaveTextContent("用户自定义");
    expect(screen.getByLabelText("资料详情")).toHaveTextContent("缺少路径");
    expect(screen.getByLabelText("资料详情")).toHaveTextContent("补 缺陷归因 面试表达");
    expect(screen.getByText("已打开「用户自定义」资料摘要；当前缺少可打开路径。")).toBeInTheDocument();
  });

  it("filters knowledge cards and opens a safe detail summary", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("搜索知识卡"), { target: { value: "缺陷" } });
    expect(screen.getAllByText("补 缺陷归因 面试表达").length).toBeGreaterThan(0);
    expect(screen.queryByText("记录测试开发岗位机会反馈")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /查看详情：补 缺陷归因 面试表达/ }));

    expect(screen.getByLabelText("知识卡详情")).toHaveTextContent("详情摘要");
    expect(screen.getByLabelText("知识卡详情")).toHaveTextContent("由当前用户画像、知识边界或 AI 建议生成");
    expect(screen.getByLabelText("知识卡详情")).not.toHaveTextContent("/Users/");
    expect(screen.getByText("已打开「补 缺陷归因 面试表达」详情。")).toBeInTheDocument();
  });

  it("marks knowledge cards in React localStorage and filters marked cards only", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("搜索知识卡"), { target: { value: "缺陷" } });
    fireEvent.click(screen.getByRole("button", { name: "标记重点：补 缺陷归因 面试表达" }));

    expect(window.localStorage.getItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY)).toContain(`${qaTaskIds.learning}-knowledge-1`);

    fireEvent.click(screen.getByRole("button", { name: "只看重点" }));

    expect(screen.getByText("匹配 1 张")).toBeInTheDocument();
    expect(screen.getByText("重点 1 张")).toBeInTheDocument();
    expect(screen.getAllByText("补 缺陷归因 面试表达").length).toBeGreaterThan(0);
  });

  it("adds a learning note that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "为 补 缺陷归因 面试表达补学习笔记" }));
    fireEvent.change(screen.getByLabelText("学习笔记内容"), {
      target: { value: "手动补充：缺陷归因、失败样例、质量指标和项目证据。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存学习笔记" }));

    expect(await screen.findByText("已补 1 条学习笔记")).toBeInTheDocument();
    expect(screen.getByText("已保存到 学习 > 学习笔记，并同步到 Evidence Gate：补 缺陷归因 面试表达")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "学习笔记" })).toBeInTheDocument();
    expect(screen.getByText(/缺陷归因、失败样例、质量指标和项目证据/)).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.learning]).toHaveLength(1);

    fireEvent.click(screen.getAllByRole("link", { name: "回到今日" })[0]);

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
  });
});

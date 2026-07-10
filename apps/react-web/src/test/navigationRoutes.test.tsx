import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

function resetSprint(hash = "#/today") {
  window.location.hash = hash;
  window.localStorage.clear();
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

describe("React Job Sprint module routing", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("navigates from the mobile bottom nav to coach, stats and more workspaces", async () => {
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    const coachLink = within(nav).getByRole("link", { name: "画像" });

    fireEvent.click(coachLink);

    expect(await screen.findByRole("heading", { name: "AI 求职教练" })).toBeInTheDocument();
    expect(screen.getByText(/建议必须经你接受后才会写入日程或知识边界/)).toBeInTheDocument();
    expect(coachLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/coach");

    const statsLink = within(nav).getByRole("link", { name: "统计" });

    fireEvent.click(statsLink);

    expect(await screen.findByRole("heading", { name: "进展统计" })).toBeInTheDocument();
    expect(screen.getByText(/这里集中查看个人执行/)).toBeInTheDocument();
    expect(statsLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/stats");

    const moreLink = within(nav).getByRole("link", { name: "更多" });
    fireEvent.click(moreLink);

    expect(await screen.findByRole("heading", { name: "我的数据" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "进入复盘 记录今日事实、卡点和明日行动。" })).toBeInTheDocument();
    expect(moreLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/more");
  });

  it("keeps the more nav item active for the review route", async () => {
    resetSprint("#/review");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "今日复盘" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "复盘历史" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    expect(within(nav).getByRole("link", { name: "更多" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps centralized stats out of business module headers", async () => {
    const routes = [
      { hash: "#/coach", heading: "AI 求职教练" },
      { hash: "#/learn", heading: "知识边界" },
      { hash: "#/interview", heading: "面试训练" },
      { hash: "#/applications", heading: "机会验证" },
      { hash: "#/review", heading: "今日复盘" }
    ];

    for (const route of routes) {
      resetSprint(route.hash);
      const view = render(<App />);

      expect(await screen.findByRole("heading", { name: route.heading })).toBeInTheDocument();
      expect(screen.queryByText("集中统计")).not.toBeInTheDocument();

      view.unmount();
    }
  });

  it("redirects non-owner direct admin access to the ordinary more workspace", async () => {
    resetSprint("#/admin");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "我的数据" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "管理员中心" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我的账号" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/more");
  });
});

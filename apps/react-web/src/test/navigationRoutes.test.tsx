import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
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

  it("navigates through the five primary job-loop workspaces", async () => {
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    const coachLink = within(nav).getByRole("link", { name: "准备" });

    fireEvent.click(coachLink);

    expect(await screen.findByRole("heading", { name: "准备工作台" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "准备阶段" })).toBeInTheDocument();
    expect(coachLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/coach");

    const opportunitiesLink = within(nav).getByRole("link", { name: "机会" });
    fireEvent.click(opportunitiesLink);

    expect(await screen.findByRole("heading", { name: "机会工作台" })).toBeInTheDocument();
    expect(opportunitiesLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/applications");

    const interviewLink = within(nav).getByRole("link", { name: "面试" });
    fireEvent.click(interviewLink);

    expect(await screen.findByText("面试作战台")).toBeInTheDocument();
    expect(interviewLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/interview");

    const reviewLink = within(nav).getByRole("link", { name: "复盘" });
    fireEvent.click(reviewLink);

    expect(await screen.findByRole("heading", { name: "今日复盘" })).toBeInTheDocument();
    expect(reviewLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/review");

    expect(within(nav).queryByRole("link", { name: "统计" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "更多" })).not.toBeInTheDocument();
  });

  it("lands the resume import entry directly on the import workspace", async () => {
    resetSprint("#/today");
    useSprintStore.setState({ userProfiles: [] });

    render(<StrictMode><App /></StrictMode>);

    fireEvent.click(screen.getByRole("link", { name: /导入简历或 JD/ }));

    expect(window.location.hash).toBe("#/coach?entry=resume-import");
    expect(await screen.findByRole("heading", { name: "导入简历建档" })).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById("coach-quick-init")).toHaveFocus());
  });

  it("keeps the direct review nav item active for the review route", async () => {
    resetSprint("#/review");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "今日复盘" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "历史" }));
    expect(screen.getByRole("heading", { name: "复盘历史" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    expect(within(nav).getByRole("link", { name: "复盘" })).toHaveAttribute("aria-current", "page");
  });

  it("moves focus to the main content without changing the current hash route", async () => {
    resetSprint("#/interview");

    render(<App />);

    expect(screen.getByText("面试作战台")).toBeInTheDocument();
    const skipLink = screen.getByRole("link", { name: "跳到主要内容" });
    skipLink.focus();
    fireEvent.keyDown(skipLink, { key: "Enter" });

    expect(window.location.hash).toBe("#/interview");
    await waitFor(() => expect(document.getElementById("app-content")).toHaveFocus());
  });

  it("keeps centralized stats out of business module headers", async () => {
    const routes = [
      { hash: "#/coach", heading: "准备工作台" },
      { hash: "#/learn", heading: "学习工作台" },
      { hash: "#/interview", heading: "面试训练" },
      { hash: "#/applications", heading: "机会工作台" },
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

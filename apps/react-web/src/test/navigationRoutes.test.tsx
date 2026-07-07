import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { getScheduleData, buildTodaySprint } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

function resetSprint(hash = "#/today") {
  window.location.hash = hash;
  window.localStorage.clear();
  const completed = {};
  const evidenceByTaskId = {};
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
  });
}

describe("React Job Sprint module routing", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("navigates from the mobile bottom nav to the coach and learning workspaces", async () => {
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    const coachLink = within(nav).getByRole("link", { name: "画像" });

    fireEvent.click(coachLink);

    expect(await screen.findByRole("heading", { name: "AI 教练设置" })).toBeInTheDocument();
    expect(screen.getByText(/草稿必须经你接受后才会写入日程或知识边界/)).toBeInTheDocument();
    expect(coachLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/coach");

    const learnLink = within(nav).getByRole("link", { name: "知识" });

    fireEvent.click(learnLink);

    expect(await screen.findByRole("heading", { name: "知识边界" })).toBeInTheDocument();
    expect(screen.getByText(/学习笔记直接进入 Evidence Gate/)).toBeInTheDocument();
    expect(learnLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/learn");

    const moreLink = within(nav).getByRole("link", { name: "更多" });
    fireEvent.click(moreLink);

    expect(await screen.findByRole("heading", { name: "更多入口" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "进入复盘 查看今日证据、风险和本地复盘记录。" })).toBeInTheDocument();
    expect(moreLink).toHaveAttribute("aria-current", "page");
    expect(window.location.hash).toBe("#/more");
  });

  it("keeps the more nav item active for the review route", async () => {
    resetSprint("#/review");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "复盘归因" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本地复盘记录" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "移动端底部导航" });
    expect(within(nav).getByRole("link", { name: "更多" })).toHaveAttribute("aria-current", "page");
  });
});

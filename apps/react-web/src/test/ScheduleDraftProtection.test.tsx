import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { CoachScheduleEvent, UserProfile } from "../types/sprint";

const fixedNow = new Date("2026-07-30T14:05:00+08:00");

function resetSprint() {
  window.location.hash = "#/coach";
  window.localStorage.clear();
  const completed = {};
  const evidenceByTaskId = {};
  const profile: UserProfile = {
    id: "profile-schedule-protection",
    name: "日程保护画像",
    roleFamily: "backend",
    targetRole: "Java 工程师",
    targetLevel: "高级",
    cities: "杭州",
    salaryTarget: "面议",
    companyTypes: "产品公司",
    experienceSummary: "6 年服务端经验",
    projectEvidence: "订单与稳定性项目",
    nonClaims: "不包装管理经历",
    dailyMinutes: 60,
    active: true,
    createdAt: fixedNow.toISOString(),
    updatedAt: fixedNow.toISOString()
  };
  const event: CoachScheduleEvent = {
    id: "event-schedule-protection",
    profileId: profile.id,
    date: "2026-07-30",
    start: "20:00",
    end: "20:30",
    kind: "learning",
    title: "已保存日程",
    reason: "保存前的安排原因",
    evidenceRequired: true,
    createdAt: fixedNow.toISOString(),
    updatedAt: fixedNow.toISOString()
  };
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [profile],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: [event],
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
  });
}

function schedulePanel() {
  const panel = screen.getByRole("heading", { name: "我的日程" }).closest("article");
  if (!panel) throw new Error("Schedule panel not found");
  return within(panel);
}

describe("schedule draft protection", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("keeps new and existing schedule input until the user explicitly discards it", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "今日计划阶段" }));

    let panel = schedulePanel();
    fireEvent.change(panel.getByLabelText("日程标题"), { target: { value: "未保存新日程" } });
    fireEvent.change(panel.getByLabelText("安排原因"), { target: { value: "先整理项目成果" } });
    fireEvent.click(panel.getByRole("button", { name: "编辑日程：已保存日程" }));

    expect(screen.getByRole("alertdialog", { name: "放弃未保存的日程修改？" })).toBeInTheDocument();
    expect(panel.getByLabelText("日程标题")).toHaveValue("未保存新日程");
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(panel.getByLabelText("安排原因")).toHaveValue("先整理项目成果");

    fireEvent.click(panel.getByRole("button", { name: "编辑日程：已保存日程" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(panel.getByLabelText("日程标题")).toHaveValue("已保存日程");

    fireEvent.change(panel.getByLabelText("安排原因"), { target: { value: "未保存编辑原因" } });
    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的日程修改？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(panel.getByLabelText("安排原因")).toHaveValue("未保存编辑原因");

    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(panel.getByRole("button", { name: "新增日程" })).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents[0].reason).toBe("保存前的安排原因");

    fireEvent.click(panel.getByRole("button", { name: "编辑日程：已保存日程" }));
    fireEvent.change(panel.getByLabelText("安排原因"), { target: { value: "已保存更新原因" } });
    fireEvent.click(panel.getByRole("button", { name: "保存日程" }));
    expect(await screen.findByText("自定义日程已加入今日 AI 教练。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents[0].reason).toBe("已保存更新原因");

    fireEvent.click(screen.getByRole("button", { name: "今日计划阶段" }));
    panel = schedulePanel();
    fireEvent.click(panel.getByRole("button", { name: "编辑日程：已保存日程" }));
    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    expect(screen.queryByRole("alertdialog", { name: "放弃未保存的日程修改？" })).not.toBeInTheDocument();
    expect(panel.getByRole("button", { name: "新增日程" })).toBeInTheDocument();
  });
});

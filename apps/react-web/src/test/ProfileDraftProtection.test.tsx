import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { UserProfile } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint() {
  window.location.hash = "#/coach";
  window.localStorage.clear();
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

function profilePanel() {
  const panel = screen.getByRole("heading", { name: "求职画像" }).closest("article, section");
  if (!panel) throw new Error("Profile panel not found");
  return within(panel as HTMLElement);
}

describe("profile draft protection", () => {
  beforeEach(resetSprint);

  it("keeps changed inputs until the user explicitly discards them before creating a new profile", async () => {
    const profile: UserProfile = {
      id: "profile-guarded",
      name: "当前画像",
      roleFamily: "backend",
      targetRole: "后端工程师",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "面议",
      companyTypes: "产品型公司",
      experienceSummary: "6 年服务端稳定性经验",
      projectEvidence: "支付链路治理",
      nonClaims: "不包装算法训练经验",
      dailyMinutes: 60,
      active: true,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    };
    useSprintStore.setState({ userProfiles: [profile] });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "画像阶段" }));
    const panel = profilePanel();
    fireEvent.click(panel.getByRole("button", { name: "编辑当前画像" }));
    expect(screen.queryByRole("alertdialog", { name: "放弃未保存的画像修改？" })).not.toBeInTheDocument();
    expect(panel.getByLabelText("经验摘要")).toHaveValue("6 年服务端稳定性经验");

    fireEvent.change(panel.getByLabelText("经验摘要"), { target: { value: "未保存的画像修改" } });
    fireEvent.click(panel.getByRole("button", { name: "新建画像" }));

    expect(screen.getByRole("alertdialog", { name: "放弃未保存的画像修改？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(panel.getByLabelText("经验摘要")).toHaveValue("未保存的画像修改");
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);

    fireEvent.click(panel.getByRole("button", { name: "新建画像" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(panel.getByLabelText("目标岗位")).toHaveValue("");
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);
    expect(useSprintStore.getState().userProfiles[0].experienceSummary).toBe("6 年服务端稳定性经验");
  });

  it("does not switch or reload a profile until changed inputs are explicitly discarded", async () => {
    const first: UserProfile = {
      id: "profile-first",
      name: "后端画像",
      roleFamily: "backend",
      targetRole: "后端工程师",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "面议",
      companyTypes: "产品型公司",
      experienceSummary: "后端原始摘要",
      projectEvidence: "支付链路治理",
      nonClaims: "不包装算法训练经验",
      dailyMinutes: 60,
      active: true,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    };
    const second: UserProfile = {
      ...first,
      id: "profile-second",
      name: "前端画像",
      roleFamily: "frontend",
      targetRole: "前端工程师",
      experienceSummary: "前端原始摘要",
      active: false
    };
    useSprintStore.setState({ userProfiles: [first, second] });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "画像阶段" }));
    const panel = profilePanel();
    fireEvent.change(panel.getByLabelText("经验摘要"), { target: { value: "不应直接切换" } });
    fireEvent.click(panel.getByRole("button", { name: "前端画像" }));

    expect(screen.getByRole("alertdialog", { name: "放弃未保存的画像修改？" })).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles.find((profile) => profile.active)?.id).toBe("profile-first");
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(useSprintStore.getState().userProfiles.find((profile) => profile.active)?.id).toBe("profile-second");
    expect(await screen.findByDisplayValue("前端原始摘要")).toBeInTheDocument();

    fireEvent.change(panel.getByLabelText("经验摘要"), { target: { value: "不应直接重载" } });
    fireEvent.click(panel.getByRole("button", { name: "编辑当前画像" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的画像修改？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(await screen.findByDisplayValue("前端原始摘要")).toBeInTheDocument();
  });

  it("refreshes the baseline after saving so the next profile action stays direct", async () => {
    const profile: UserProfile = {
      id: "profile-save-baseline",
      name: "待保存画像",
      roleFamily: "backend",
      targetRole: "后端工程师",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "面议",
      companyTypes: "产品型公司",
      experienceSummary: "保存前摘要",
      projectEvidence: "支付链路治理",
      nonClaims: "不包装算法训练经验",
      dailyMinutes: 60,
      active: true,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    };
    useSprintStore.setState({ userProfiles: [profile] });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "画像阶段" }));
    const panel = profilePanel();
    fireEvent.change(panel.getByLabelText("经验摘要"), { target: { value: "保存后摘要" } });
    fireEvent.click(panel.getByRole("button", { name: /^保存画像/ }));
    expect(await screen.findByText("求职画像已保存，后续 AI 建议会引用这份画像。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "画像阶段" }));
    const returnedPanel = profilePanel();
    fireEvent.click(returnedPanel.getByRole("button", { name: "新建画像" }));
    expect(screen.queryByRole("alertdialog", { name: "放弃未保存的画像修改？" })).not.toBeInTheDocument();
    expect(returnedPanel.getByLabelText("目标岗位")).toHaveValue("");
    expect(useSprintStore.getState().userProfiles[0].experienceSummary).toBe("保存后摘要");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/applications", withProfile = true) {
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

describe("React Job Sprint applications workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("shows a profile-first empty state for a new user", async () => {
    resetSprint("#/applications", false);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "先建立你的求职画像" })).toBeInTheDocument();
    expect(screen.getByText(/机会记录才会绑定到你的岗位、公司和 Evidence Gate/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去创建画像" })).toHaveAttribute("href", "#/coach");
  });

  it("renders opportunity targets, record list first and opens the local form on demand", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "机会验证" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日机会目标" })).toBeInTheDocument();
    expect(screen.getAllByText("记录测试开发岗位机会反馈").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("公司")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增机会记录" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增机会记录" }));

    expect(screen.getByLabelText("公司")).toBeInTheDocument();
    expect(screen.getByText("新增机会记录会写入当前机会任务的 Evidence Gate，并成为 AI 教练的机会/JD 信号。")).toBeInTheDocument();
    expect(screen.getByLabelText("来源")).toBeInTheDocument();
    expect(screen.getByLabelText("薪资范围")).toBeInTheDocument();
    expect(screen.getByLabelText("沟通反馈")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "状态摘要" })).toBeInTheDocument();
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
  });

  it("records a local application feedback item that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "新增机会记录" }));

    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Example Cloud" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "Boss 直聘" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "25-35K · 14薪" } });
    fireEvent.change(screen.getByLabelText("JD 关键词"), { target: { value: "自动化 质量平台 Mock" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约下周一技术面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "HR 要求补充质量平台项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("已新增机会验证记录。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.opportunity]).toHaveLength(1);
    expect(screen.getByText(/Example Cloud/)).toBeInTheDocument();
    expect(screen.getByText(/Boss 直聘/)).toBeInTheDocument();
    expect(screen.getByText(/HR 约下周一技术面/)).toBeInTheDocument();

    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview]).toBeUndefined();
  });

  it("filters, edits, deletes and exports local application records", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "机会验证" });

    fireEvent.click(screen.getByRole("button", { name: "新增机会记录" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Alpha Cloud" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "官网" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "20-30K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "已记录" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "等待 HR 筛选" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "待 HR 反馈" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    fireEvent.click(await screen.findByRole("button", { name: "新增机会记录" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Beta AI" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "质量平台工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "内推" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "30-40K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "约面" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约周三一面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "准备一面项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("共 2 条，当前显示 2 条。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "约面" } });

    expect(screen.getByText("共 2 条，当前显示 1 条。")).toBeInTheDocument();
    expect(screen.getByText(/Beta AI · 质量平台工程师/)).toBeInTheDocument();
    expect(screen.getByText(/内推 \/ 30-40K/)).toBeInTheDocument();
    expect(screen.getByText(/沟通反馈：HR 约周三一面/)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha Cloud · 测试开发工程师/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "编辑机会记录：Beta AI" }));
    expect(screen.getByText("正在编辑「Beta AI · 质量平台工程师」，保存后会更新这条机会记录和 Evidence Gate 证据。")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "质量平台负责人" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 改约周四二面" } });
    fireEvent.click(screen.getByRole("button", { name: "保存机会反馈" }));

    expect(screen.getByText(/Beta AI · 质量平台负责人/)).toBeInTheDocument();
    expect(screen.getByText(/沟通反馈：HR 改约周四二面/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" }));

    expect(screen.getByText("确认删除「Alpha Cloud · 测试开发工程师」机会记录？删除后会从今日 Evidence Gate 移除，并且后续 AI 教练不会再引用这条 JD/沟通信号。")).toBeInTheDocument();
    expect(screen.getByText("共 2 条，当前显示 2 条。")).toBeInTheDocument();
    expect(screen.getAllByText(/Alpha Cloud · 测试开发工程师/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /取消删除机会记录 Alpha Cloud/ }));
    expect(screen.queryByText("确认删除「Alpha Cloud · 测试开发工程师」机会记录？删除后会从今日 Evidence Gate 移除，并且后续 AI 教练不会再引用这条 JD/沟通信号。")).not.toBeInTheDocument();
    expect(screen.getByText(/Alpha Cloud · 测试开发工程师/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除机会记录 Alpha Cloud/ }));

    expect(screen.getByText("共 1 条，当前显示 1 条。")).toBeInTheDocument();
    expect(screen.getByText("已删除「Alpha Cloud · 测试开发工程师」，可立即撤销并恢复到今日 Evidence Gate 和 AI 机会信号。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除机会记录：Alpha Cloud" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "撤销删除" }));

    expect(screen.getByText("已恢复刚删除的机会记录。")).toBeInTheDocument();
    expect(screen.getByText("共 2 条，当前显示 2 条。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" })).toBeInTheDocument();
    expect(screen.queryByText("已删除「Alpha Cloud · 测试开发工程师」，可立即撤销并恢复到今日 Evidence Gate 和 AI 机会信号。")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成本地导出" }));

    expect(screen.getByText("已生成导出 2 条，本地 JSON 已准备。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.opportunity]).toHaveLength(2);
  });
});

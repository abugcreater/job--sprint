import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
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

    expect(await screen.findByRole("heading", { name: "机会工作台" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日机会目标" })).toBeInTheDocument();
    expect(screen.getAllByText("记录测试开发岗位机会反馈").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("公司")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "机会清单" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "状态摘要" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增机会" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增机会" }));

    expect(screen.getByLabelText("公司")).toBeInTheDocument();
    expect(screen.getByLabelText("来源")).toBeInTheDocument();
    expect(screen.getByLabelText("薪资范围")).toBeInTheDocument();
    expect(screen.getByLabelText("沟通反馈")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本地机会记录" })).toBeInTheDocument();
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
  });

  it("records a local application feedback item that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "新增机会" }));

    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Example Cloud" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "Boss 直聘" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "25-35K · 14薪" } });
    fireEvent.change(screen.getByLabelText("JD 关键词"), { target: { value: "自动化 质量平台 Mock" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约下周一技术面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "HR 要求补充质量平台项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("已新增机会记录，并写入当前任务 Evidence Gate。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.opportunity]).toHaveLength(1);
    expect(screen.getAllByText(/Example Cloud/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Boss 直聘/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HR 约下周一技术面/).length).toBeGreaterThan(0);

    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview]).toBeUndefined();
  });

  it("filters, edits, deletes and exports local application records", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "机会工作台" });

    fireEvent.click(screen.getByRole("button", { name: "新增机会" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Alpha Cloud" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "官网" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "20-30K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "已记录" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "等待 HR 筛选" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "待 HR 反馈" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    fireEvent.click(await screen.findByRole("button", { name: "新增机会" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Beta AI" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "质量平台工程师" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "内推" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "30-40K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "约面" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约周三一面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "准备一面项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("共 2 条，当前显示 2 条")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "约面" } });

    expect(screen.getByText("共 2 条，当前显示 1 条")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta AI" })).toBeInTheDocument();
    expect(screen.getAllByText(/内推/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HR 约周三一面/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "查看机会详情：Alpha Cloud" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "编辑机会记录：Beta AI" }));
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "质量平台负责人" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 改约周四二面" } });
    fireEvent.click(screen.getByRole("button", { name: "保存机会反馈" }));

    expect(screen.getAllByText(/质量平台负责人/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HR 改约周四二面/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "查看机会详情：Alpha Cloud" }));
    fireEvent.click(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" }));
    expect(screen.getByText("共 2 条，当前显示 2 条")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /取消删除机会记录 Alpha Cloud/ }));
    fireEvent.click(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除机会记录 Alpha Cloud/ }));

    expect(screen.getByText("共 1 条，当前显示 1 条")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "查看机会详情：Alpha Cloud" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成本地导出" }));

    expect(screen.getByText("当前环境无法生成下载，请稍后重试。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.opportunity]).toHaveLength(1);
  });

  it("opens factual detail and limits comparison to two opportunities", async () => {
    render(<App />);

    for (const [company, role, status] of [
      ["Alpha Cloud", "测试开发工程师", "已沟通"],
      ["Beta AI", "质量平台工程师", "约面"],
      ["Gamma Data", "测试架构师", "待沟通"]
    ] as const) {
      fireEvent.click(await screen.findByRole("button", { name: "新增机会" }));
      fireEvent.change(screen.getByLabelText("公司"), { target: { value: company } });
      fireEvent.change(screen.getByLabelText("岗位"), { target: { value: role } });
      fireEvent.change(screen.getByLabelText("状态"), { target: { value: status } });
      fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: `${company} 的真实招聘反馈` } });
      fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "查看机会详情：Alpha Cloud" }));
    expect(screen.getByRole("heading", { name: "Alpha Cloud" })).toBeInTheDocument();
    expect(screen.getAllByText("已沟通").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alpha Cloud 的真实招聘反馈").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "加入对照：Alpha Cloud" }));
    fireEvent.click(screen.getByRole("button", { name: "加入对照：Beta AI" }));

    expect(screen.getByRole("heading", { name: "机会事实对照" })).toBeInTheDocument();
    expect(screen.getByText("只对照已记录事实，不生成匹配分或推荐排序")).toBeInTheDocument();
    expect(screen.getByText("已选 2/2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "加入对照：Gamma Data" }));
    expect(screen.getByText("最多比较 2 条，请先移除一条。")).toBeInTheDocument();
    expect(screen.getByText("已选 2/2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索机会记录"), { target: { value: "不存在的公司" } });
    expect(screen.getByText("当前筛选没有记录")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(screen.getByText("共 3 条，当前显示 3 条")).toBeInTheDocument();
  });
});

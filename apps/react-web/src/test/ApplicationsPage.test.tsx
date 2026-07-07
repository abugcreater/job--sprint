import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/applications") {
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

describe("React Job Sprint applications workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("renders opportunity targets, record list first and opens the local form on demand", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "机会验证" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日机会目标" })).toBeInTheDocument();
    expect(screen.getByText("一条证据/简历/机会更新")).toBeInTheDocument();
    expect(screen.queryByLabelText("公司")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增机会记录" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增机会记录" }));

    expect(screen.getByLabelText("公司")).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "Senior Java Backend" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "Boss 直聘" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "25-35K · 14薪" } });
    fireEvent.change(screen.getByLabelText("JD 关键词"), { target: { value: "Java MQ Redis" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约下周一技术面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "HR 要求补充高并发项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("已新增机会验证记录。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-2130-delivery"]).toHaveLength(1);
    expect(screen.getByText(/Example Cloud/)).toBeInTheDocument();
    expect(screen.getByText(/Boss 直聘/)).toBeInTheDocument();
    expect(screen.getByText(/HR 约下周一技术面/)).toBeInTheDocument();

    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-1400-java"]).toBeUndefined();
  });

  it("filters, edits, deletes and exports local application records", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "机会验证" });

    fireEvent.click(screen.getByRole("button", { name: "新增机会记录" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Alpha Cloud" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "Senior Java Backend" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "官网" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "20-30K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "已记录" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "等待 HR 筛选" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "待 HR 反馈" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    fireEvent.click(await screen.findByRole("button", { name: "新增机会记录" }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "Beta AI" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "Platform Backend" } });
    fireEvent.change(screen.getByLabelText("来源"), { target: { value: "内推" } });
    fireEvent.change(screen.getByLabelText("薪资范围"), { target: { value: "30-40K" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "约面" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 约周三一面" } });
    fireEvent.change(screen.getByLabelText("反馈摘要"), { target: { value: "准备一面项目证据" } });
    fireEvent.click(screen.getByRole("button", { name: "记录机会反馈" }));

    expect(await screen.findByText("共 2 条，当前显示 2 条。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "约面" } });

    expect(screen.getByText("共 2 条，当前显示 1 条。")).toBeInTheDocument();
    expect(screen.getByText(/Beta AI · Platform Backend/)).toBeInTheDocument();
    expect(screen.getByText(/内推 \/ 30-40K/)).toBeInTheDocument();
    expect(screen.getByText(/沟通反馈：HR 约周三一面/)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha Cloud · Senior Java Backend/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "编辑机会记录：Beta AI" }));
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "Lead Java Backend" } });
    fireEvent.change(screen.getByLabelText("沟通反馈"), { target: { value: "HR 改约周四二面" } });
    fireEvent.click(screen.getByRole("button", { name: "保存机会反馈" }));

    expect(screen.getByText(/Beta AI · Lead Java Backend/)).toBeInTheDocument();
    expect(screen.getByText(/沟通反馈：HR 改约周四二面/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("机会状态筛选"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "删除机会记录：Alpha Cloud" }));

    expect(screen.getByText("共 1 条，当前显示 1 条。")).toBeInTheDocument();
    expect(screen.queryByText(/Alpha Cloud · Senior Java Backend/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成本地导出" }));

    expect(screen.getByText("已生成导出 1 条，本地 JSON 已准备。")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-2130-delivery"]).toHaveLength(1);
  });
});

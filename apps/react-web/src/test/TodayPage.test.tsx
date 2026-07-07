import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { getScheduleData, buildTodaySprint } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

describe("React Job Sprint today workspace", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
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
  });

  it("renders the command workspace from schedule data", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "今日 AI 教练" })).toBeInTheDocument();
    expect(screen.getByText("Spring 事务与搜索链路边界")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看原因" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试同步" })).toBeInTheDocument();
    expect(screen.getByText("今日风险")).toBeInTheDocument();
    expect(screen.getByText("今日口述入口")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记机会反馈" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "移动端底部导航" })).toBeInTheDocument();
  });

  it("requires evidence before marking the current task complete", async () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "先补证据" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), {
      target: { value: "手动学习笔记：事务边界、搜索链路和异常回滚已经整理成面试表达。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    expect(await screen.findByText("学习笔记证据")).toBeInTheDocument();
    expect(screen.getByText(/手动学习笔记/)).toBeInTheDocument();
    const completeButton = screen.getByRole("button", { name: "标记完成" });
    expect(completeButton).toBeEnabled();

    fireEvent.click(completeButton);

    expect(screen.getByRole("button", { name: "取消完成" })).toBeInTheDocument();
  });

  it("records oral text, delay feedback and opens compact evidence details", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第一条学习证据，来自测试输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "记录口述" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第二条口述证据，来自 Evidence Gate 输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第三条学习证据，来自 Evidence Gate 输入。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "补学习笔记" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第四条学习证据，验证证据列表。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    fireEvent.click(screen.getByRole("button", { name: "记录口述" }));
    fireEvent.change(screen.getByLabelText("证据内容"), { target: { value: "第五条口述证据，验证查看全部。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证据" }));

    expect(await screen.findByRole("button", { name: /查看全部证据（5）/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /查看全部证据（5）/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /展开详情/ })[0]);
    expect(screen.getAllByText(/第五条口述证据/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "开始口述一题" }));
    fireEvent.change(screen.getByLabelText("口述文本记录"), {
      target: { value: "文本口述：先讲结论，再讲链路、异常分支、指标和复盘动作。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存口述证据" }));
    expect(await screen.findByText("已保存口述文本，并写入 Evidence Gate。")).toBeInTheDocument();
    expect(screen.getByText(/文本口述/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "登记延期" }));
    expect(await screen.findByText("请填写延期原因和补救动作。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("延期分钟"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("延期原因"), { target: { value: "测试登记延期原因" } });
    fireEvent.change(screen.getByLabelText("补救动作"), { target: { value: "测试补救动作" } });
    fireEvent.click(screen.getByRole("button", { name: "登记延期" }));
    expect(await screen.findByText(/已登记延期：45 分钟，测试登记延期原因。/)).toBeInTheDocument();
    expect(screen.getByText("45 分钟 · 测试登记延期原因")).toBeInTheDocument();
  });
});

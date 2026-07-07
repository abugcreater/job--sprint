import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY } from "../data/interviewAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/interview") {
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

describe("React Job Sprint interview workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("renders interview tasks, candidate questions and local recording entry", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "面试训练" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日口述任务" })).toBeInTheDocument();
    expect(screen.getAllByText("JVM G1/ZGC 与线上抖动排查").length).toBeGreaterThan(0);
    expect(screen.getAllByText("G1 和 ZGC 的底层差异是什么？").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("我的口述回答")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI评分并生成复盘" })).toBeInTheDocument();
  });

  it("supports candidate question search, category filter, detail hint and weak-question marks", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "面试训练" });

    fireEvent.change(screen.getByLabelText("搜索候选题"), { target: { value: "RabbitMQ" } });
    fireEvent.change(screen.getByLabelText("候选题分类"), { target: { value: "java-core" } });

    expect(screen.getByText("匹配 1 题")).toBeInTheDocument();
    expect(screen.getAllByText(/RabbitMQ、RocketMQ、Kafka/).length).toBeGreaterThan(0);
    expect(screen.getByText("详情提示")).toBeInTheDocument();
    expect(screen.getByText("回答结构")).toBeInTheDocument();
    expect(screen.getByText("预期关键词")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /标记薄弱题：RabbitMQ/ }));

    expect(screen.getByText("已标记薄弱题")).toBeInTheDocument();
    expect(screen.getByText("薄弱 1 题")).toBeInTheDocument();
    expect(window.localStorage.getItem(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY)).toContain("java-core-003");

    fireEvent.click(screen.getByRole("button", { name: "只看薄弱题" }));

    expect(screen.getByText("匹配 1 题")).toBeInTheDocument();
    expect(screen.getAllByText(/RabbitMQ、RocketMQ、Kafka/).length).toBeGreaterThan(0);
  });

  it("records a local oral answer that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("我的口述回答"), {
      target: {
        value: "第一，G1 关注可预测停顿，ZGC 关注低停顿；第二，我会用 JFR、jcmd、GC log 和线程池指标排查 P99；第三，最后落到外部依赖和证据链。"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "AI评分并生成复盘" }));

    expect(await screen.findByLabelText("AI评分结果")).toHaveTextContent("本地规则版");
    expect(screen.getByText("AI 不可用，已按本地 rubric 给出自检结果。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存口述与AI分析" }));

    expect(await screen.findByText("已记 1")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-1400-java"]).toHaveLength(1);
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-1400-java"][0].content).toContain("AI评分");

    fireEvent.click(screen.getByRole("link", { name: "回到今日" }));

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
    expect(screen.getByText("口述训练证据")).toBeInTheDocument();
  });
});

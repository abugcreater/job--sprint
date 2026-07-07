import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY } from "../data/learningAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

function resetSprint(hash = "#/learn") {
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

describe("React Job Sprint learning workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("renders real learning tasks, resources and knowledge card summaries", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "知识边界" })).toBeInTheDocument();
    expect(screen.getAllByText("Spring 事务与搜索链路边界").length).toBeGreaterThan(0);
    expect(screen.getByText("SpringBoot 工程入口 XMind")).toBeInTheDocument();
    expect(screen.getByText("Spring 事务、MySQL、Redis 高频追问")).toBeInTheDocument();
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("搜索知识卡")).toBeInTheDocument();
    expect(screen.getByLabelText("知识卡分类")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "只看重点" })).toBeInTheDocument();
  });

  it("opens resource details instead of rendering inert resource names", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /SpringBoot 工程入口 XMind/ }));

    expect(screen.getByLabelText("资料详情")).toHaveTextContent("SpringBoot 工程入口 XMind");
    expect(screen.getByLabelText("资料详情")).toHaveTextContent("缺少路径");
    expect(screen.getByLabelText("资料详情")).toHaveTextContent("Spring 事务与搜索链路边界");
    expect(screen.getByText("已打开「SpringBoot 工程入口 XMind」资料摘要；当前缺少可打开路径。")).toBeInTheDocument();
  });

  it("filters knowledge cards and opens a safe detail summary", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("搜索知识卡"), { target: { value: "G1" } });
    expect(screen.getAllByText("G1/ZGC 与线上 P99 抖动排查").length).toBeGreaterThan(0);
    expect(screen.queryByText("MQ 不丢不重与幂等消费")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /查看详情：G1\/ZGC 与线上 P99 抖动排查/ }));

    expect(screen.getByLabelText("知识卡详情")).toHaveTextContent("详情摘要");
    expect(screen.getByLabelText("知识卡详情")).toHaveTextContent("JVM、GC、JFR、jcmd、线上稳定性");
    expect(screen.getByLabelText("知识卡详情")).not.toHaveTextContent("/Users/");
    expect(screen.getByText("已打开「G1/ZGC 与线上 P99 抖动排查」详情。")).toBeInTheDocument();
  });

  it("marks knowledge cards in React localStorage and filters marked cards only", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("搜索知识卡"), { target: { value: "Spring 事务" } });
    fireEvent.click(screen.getByRole("button", { name: "标记重点：Spring 事务、MySQL、Redis 高频追问" }));

    expect(window.localStorage.getItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY)).toContain("kb-spring-db-cache-001");

    fireEvent.click(screen.getByRole("button", { name: "只看重点" }));

    expect(screen.getByText("匹配 1 张")).toBeInTheDocument();
    expect(screen.getByText("重点 1 张")).toBeInTheDocument();
    expect(screen.getAllByText("Spring 事务、MySQL、Redis 高频追问").length).toBeGreaterThan(0);
  });

  it("adds a learning note that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "为 Spring 事务与搜索链路边界补学习笔记" }));
    fireEvent.change(screen.getByLabelText("学习笔记内容"), {
      target: { value: "手动补充：Spring 事务传播、回滚边界、搜索链路异常补偿。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存学习笔记" }));

    expect(await screen.findByText("已补 1 条学习笔记")).toBeInTheDocument();
    expect(screen.getByText("已保存到 学习 > 学习笔记，并同步到 Evidence Gate：Spring 事务与搜索链路边界")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "学习笔记" })).toBeInTheDocument();
    expect(screen.getByText(/Spring 事务传播、回滚边界、搜索链路异常补偿/)).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-0930-java"]).toHaveLength(1);

    fireEvent.click(screen.getAllByRole("link", { name: "回到今日" })[0]);

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
  });
});

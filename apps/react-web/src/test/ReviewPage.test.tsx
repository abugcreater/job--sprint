import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/review") {
  window.history.replaceState(null, "", hash);
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

describe("React Job Sprint review workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("renders completion, evidence, risks, tomorrow advice and the local review form", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "复盘归因" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日完成情况" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence Gate 证据列表" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日风险总结" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "明日建议" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本地规则版 AI 分析" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "周复盘归因" })).toBeInTheDocument();
    expect(screen.getByText("服务端周结果归因")).toBeInTheDocument();
    expect(await screen.findByText("本地模式，可继续记录；上线后会读取服务端持久快照。")).toBeInTheDocument();
    expect(screen.getByLabelText("今天能讲的一个项目点是什么？")).toBeInTheDocument();
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
  });

  it("records a local review that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("今天能讲的一个项目点是什么？"), {
      target: { value: "G1/ZGC 抖动排查证据已经能讲清入口、指标和边界。" }
    });
    fireEvent.change(screen.getByLabelText("明天最优先补什么？"), {
      target: { value: "补线程池、外部依赖和 P99 抖动的复盘话术。" }
    });
    fireEvent.change(screen.getByLabelText("今天哪些回答还容易被面试官追问穿？"), {
      target: { value: "G1/ZGC 选择边界还不够清楚。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存本地复盘" }));

    expect(await screen.findByText("已写 1")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId["2026-07-02-1400-java"]).toHaveLength(1);
    expect(screen.getAllByText("复盘证据").length).toBeGreaterThan(0);
    expect(screen.getByText("本地规则版 AI 分析已生成，可用于明日计划和提示词校准。")).toBeInTheDocument();
    expect(screen.getByText(/本周闭环/)).toBeInTheDocument();
    expect(screen.getAllByText(/G1\/ZGC 选择边界还不够清楚/).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "回到今日" }));
    });

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
    expect(screen.getAllByText("复盘证据").length).toBeGreaterThan(0);
  });

  it("filters, edits, deletes and exports local review records", async () => {
    render(<App />);

    const localRecords = () => screen.getByRole("heading", { name: "本地复盘证据" }).closest("article") as HTMLElement;

    fireEvent.change(screen.getByLabelText("今天能讲的一个项目点是什么？"), {
      target: { value: "Step14 KeepMe 项目点" }
    });
    fireEvent.change(screen.getByLabelText("今天发现了哪些路径问题？"), {
      target: { value: "Step14 KeepMe 路径问题" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存本地复盘" }));

    await new Promise((resolve) => setTimeout(resolve, 1));

    fireEvent.change(screen.getByLabelText("今天能讲的一个项目点是什么？"), {
      target: { value: "Step14 DeleteMe 项目点" }
    });
    fireEvent.change(screen.getByLabelText("明天最优先补什么？"), {
      target: { value: "Step14 DeleteMe 明日优先" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存本地复盘" }));

    fireEvent.change(screen.getByLabelText("复盘记录筛选"), { target: { value: "has_path_issue" } });
    expect(within(localRecords()).getAllByText(/Step14 KeepMe 项目点/).length).toBeGreaterThan(0);
    expect(within(localRecords()).queryAllByText(/Step14 DeleteMe 项目点/)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /编辑复盘记录 Step14 KeepMe 项目点/ }));
    expect(screen.getByRole("heading", { name: "编辑本地复盘记录" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("今天能讲的一个项目点是什么？"), {
      target: { value: "Step14 KeepMe Edited" }
    });
    fireEvent.click(screen.getByRole("button", { name: "更新本地复盘" }));

    expect(within(localRecords()).getAllByText(/Step14 KeepMe Edited/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("复盘记录筛选"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: /删除复盘记录 Step14 DeleteMe 项目点/ }));
    expect(within(localRecords()).queryAllByText(/Step14 DeleteMe 项目点/)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "导出当前筛选复盘 JSON" }));
    expect(screen.getByText(/react-review-export-v1/)).toBeInTheDocument();
    expect(screen.getAllByText(/Step14 KeepMe Edited/).length).toBeGreaterThan(0);

    const evidence = useSprintStore.getState().evidenceByTaskId["2026-07-02-1400-java"] ?? [];
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.content).toContain("Step14 KeepMe Edited");
  });
});

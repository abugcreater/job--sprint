import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";
import { App } from "../App";
import { useSprintStore } from "../stores/sprintStore";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

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
    userProfiles: [qaProfile],
    knowledgeBoundaries: [],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: qaScheduleEvents,
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildQaSprint({ now: fixedNow, completed, evidenceByTaskId })
  });
}

describe("React Job Sprint review workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("renders completion, evidence, risks, tomorrow advice and the local review form", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "今日复盘" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日完成情况" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "明日建议" })).toBeInTheDocument();
    expect(screen.getByLabelText("今天完成了什么可证明的结果？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "看整理" }));
    expect(screen.getByRole("heading", { name: "Evidence Gate 证据列表" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日风险总结" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "规则整理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本周复盘" })).toBeInTheDocument();
    expect(screen.getByText("结果归因")).toBeInTheDocument();
    expect(await screen.findByText("当前可继续记录，稍后可同步结果快照。")).toBeInTheDocument();
    expect(screen.getAllByText("本地模式，可继续记录").length).toBeGreaterThan(0);
  });

  it("records a local review that feeds the today Evidence Gate", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("今天完成了什么可证明的结果？"), {
      target: { value: "Mock 服务边界已经能讲清入口、指标和证据。" }
    });
    fireEvent.change(screen.getByLabelText("明天第一件事是什么？"), {
      target: { value: "补异常分支、失败样例和恢复验证的话术。" }
    });
    fireEvent.click(screen.getByText("补充面试与知识细节（可选）"));
    fireEvent.change(screen.getByLabelText("哪个回答还容易被追问？"), {
      target: { value: "Mock 服务边界和线上所有权还要说清楚。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存复盘" }));

    expect(await screen.findByText("已写 1")).toBeInTheDocument();
    expect(useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview]).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "看整理" }));
    expect(screen.getAllByText("复盘证据").length).toBeGreaterThan(0);
    expect(screen.getByText("已按当前记录完成规则整理，可用于明日计划和提示词校准。")).toBeInTheDocument();
    expect(screen.getByText(/本周记录/)).toBeInTheDocument();
    expect(screen.getAllByText(/Mock 服务边界和线上所有权还要说清楚/).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "回到 Evidence Gate" }));
    });

    expect(await screen.findByRole("heading", { name: "Evidence Gate（证据门）" })).toBeInTheDocument();
    expect(screen.getByText(/已沉淀 1 条证据/)).toBeInTheDocument();
    expect(screen.getAllByText("复盘证据").length).toBeGreaterThan(0);
  });

  it("filters, edits, deletes and exports local review records", async () => {
    render(<App />);

    const localRecords = () => screen.getByRole("heading", { name: "复盘历史" }).closest("article") as HTMLElement;

    fireEvent.change(screen.getByLabelText("今天完成了什么可证明的结果？"), {
      target: { value: "Step14 KeepMe 项目点" }
    });
    fireEvent.change(screen.getByLabelText("今天最大的卡点是什么？"), {
      target: { value: "Step14 KeepMe 路径问题" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存复盘" }));

    await new Promise((resolve) => setTimeout(resolve, 1));

    fireEvent.change(screen.getByLabelText("今天完成了什么可证明的结果？"), {
      target: { value: "Step14 DeleteMe 项目点" }
    });
    fireEvent.change(screen.getByLabelText("明天第一件事是什么？"), {
      target: { value: "Step14 DeleteMe 明日优先" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存复盘" }));

    fireEvent.click(screen.getByRole("button", { name: "历史" }));
    fireEvent.change(screen.getByLabelText("复盘记录筛选"), { target: { value: "has_path_issue" } });
    expect(within(localRecords()).getAllByText(/Step14 KeepMe 项目点/).length).toBeGreaterThan(0);
    expect(within(localRecords()).queryAllByText(/Step14 DeleteMe 项目点/)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /编辑复盘记录 Step14 KeepMe 项目点/ }));
    expect(screen.getByRole("heading", { name: "编辑今日复盘" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("今天完成了什么可证明的结果？"), {
      target: { value: "Step14 KeepMe Edited" }
    });
    fireEvent.click(screen.getByRole("button", { name: "更新复盘" }));

    expect(within(localRecords()).getAllByText(/Step14 KeepMe Edited/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("复盘记录筛选"), { target: { value: "all" } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /删除复盘记录 Step14 DeleteMe 项目点/ }));
    expect(within(localRecords()).queryAllByText(/Step14 DeleteMe 项目点/)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "导出当前筛选" }));
    expect(screen.getByText(/react-review-export-v1/)).toBeInTheDocument();
    expect(screen.getAllByText(/Step14 KeepMe Edited/).length).toBeGreaterThan(0);

    const evidence = useSprintStore.getState().evidenceByTaskId[qaTaskIds.interview] ?? [];
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.content).toContain("Step14 KeepMe Edited");
  });
});

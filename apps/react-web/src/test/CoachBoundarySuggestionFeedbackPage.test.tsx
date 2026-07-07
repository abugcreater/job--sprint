import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";

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

describe("React coach boundary suggestion feedback", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("records rejected and revised boundary suggestions before they become formal boundaries", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("画像名称"), { target: { value: "后端画像" } });
    fireEvent.change(screen.getByLabelText("目标岗位"), { target: { value: "后端工程师" } });
    fireEvent.change(screen.getByLabelText("经验摘要"), { target: { value: "7 年后端稳定性治理经验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存画像" }));

    fireEvent.change(await screen.findByLabelText("边界提取素材"), {
      target: { value: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提取边界草稿" }));

    expect(await screen.findByText("服务端边界提取暂不可用，已用本地规则生成候选。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("候选反馈原因：Redis"), { target: { value: "缓存边界已有更准确材料" } });
    fireEvent.click(screen.getByRole("button", { name: "不采纳边界：Redis" }));
    expect(await screen.findByText("已记录「Redis」不采纳原因。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("候选反馈原因：MQ"), { target: { value: "需要改成可靠消息故障恢复" } });
    fireEvent.click(screen.getByRole("button", { name: "修订边界：MQ" }));
    expect(await screen.findByText("已把「MQ」载入知识边界表单，请修订后保存。")).toBeInTheDocument();

    const feedback = useSprintStore.getState().boundarySuggestionFeedback;
    expect(feedback).toHaveLength(2);
    expect(feedback).toEqual(expect.arrayContaining([
      expect.objectContaining({ topic: "Redis", decision: "rejected", reason: "缓存边界已有更准确材料" }),
      expect.objectContaining({ topic: "MQ", decision: "needs_revision", reason: "需要改成可靠消息故障恢复" })
    ]));
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(0);
    expect(screen.getByLabelText("知识主题")).toHaveValue("MQ");
    expect(screen.getByText("采纳 0，修订 1，不采纳 1，需校准 100%")).toBeInTheDocument();
  });
});

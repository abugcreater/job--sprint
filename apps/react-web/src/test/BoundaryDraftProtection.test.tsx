import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { KnowledgeBoundary, UserProfile } from "../types/sprint";

const fixedNow = new Date("2026-07-31T14:05:00+08:00");

function resetSprint() {
  window.location.hash = "#/coach";
  window.localStorage.clear();
  const completed = {};
  const evidenceByTaskId = {};
  const profile: UserProfile = {
    id: "profile-boundary-protection",
    name: "边界保护画像",
    roleFamily: "backend",
    targetRole: "Java 工程师",
    targetLevel: "高级",
    cities: "杭州",
    salaryTarget: "面议",
    companyTypes: "产品公司",
    experienceSummary: "6 年服务端经验",
    projectEvidence: "订单与稳定性项目",
    nonClaims: "不包装管理经历",
    dailyMinutes: 60,
    active: true,
    createdAt: fixedNow.toISOString(),
    updatedAt: fixedNow.toISOString()
  };
  const boundary: KnowledgeBoundary = {
    id: "boundary-draft-protection",
    profileId: profile.id,
    topic: "已保存边界",
    level: "了解",
    gap: "保存前的当前缺口",
    evidence: "项目复盘",
    targetUse: "后端面试",
    lastValidatedAt: fixedNow.toISOString(),
    createdAt: fixedNow.toISOString(),
    updatedAt: fixedNow.toISOString()
  };
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [profile],
    knowledgeBoundaries: [boundary],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: [],
    aiArtifacts: [],
    llmRuns: [],
    syncState: "local_fallback",
    lastSavedAt: undefined,
    sprint: buildTodaySprint(getScheduleData(), fixedNow, { completed, evidenceByTaskId, syncState: "local_fallback" })
  });
}

function boundaryPanel() {
  const panel = screen.getByRole("heading", { name: "知识边界" }).closest("article");
  if (!panel) throw new Error("Boundary panel not found");
  return within(panel);
}

describe("boundary draft protection", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("keeps new and existing boundary input until the user explicitly discards it", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "知识边界阶段" }));

    let panel = boundaryPanel();
    fireEvent.change(panel.getByLabelText("知识主题"), { target: { value: "未保存边界" } });
    fireEvent.change(panel.getByLabelText("当前缺口"), { target: { value: "先补齐真实项目证据" } });
    fireEvent.click(panel.getByRole("button", { name: "编辑知识边界：已保存边界" }));

    expect(screen.getByRole("alertdialog", { name: "放弃未保存的知识边界修改？" })).toBeInTheDocument();
    expect(panel.getByLabelText("知识主题")).toHaveValue("未保存边界");
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(panel.getByLabelText("当前缺口")).toHaveValue("先补齐真实项目证据");

    fireEvent.click(panel.getByRole("button", { name: "编辑知识边界：已保存边界" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(panel.getByLabelText("知识主题")).toHaveValue("已保存边界");

    fireEvent.change(panel.getByLabelText("当前缺口"), { target: { value: "未保存的编辑缺口" } });
    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的知识边界修改？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(panel.getByLabelText("当前缺口")).toHaveValue("未保存的编辑缺口");

    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(panel.getByRole("button", { name: "新增边界" })).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries[0].gap).toBe("保存前的当前缺口");

    fireEvent.click(panel.getByRole("button", { name: "编辑知识边界：已保存边界" }));
    fireEvent.change(panel.getByLabelText("当前缺口"), { target: { value: "已保存更新缺口" } });
    fireEvent.click(panel.getByRole("button", { name: "保存边界" }));
    expect(await screen.findByText("知识边界已保存。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries[0].gap).toBe("已保存更新缺口");

    fireEvent.click(screen.getByRole("button", { name: "知识边界阶段" }));
    panel = boundaryPanel();
    fireEvent.click(panel.getByRole("button", { name: "编辑知识边界：已保存边界" }));
    fireEvent.click(panel.getByRole("button", { name: "取消编辑" }));
    expect(screen.queryByRole("alertdialog", { name: "放弃未保存的知识边界修改？" })).not.toBeInTheDocument();
    expect(panel.getByRole("button", { name: "新增边界" })).toBeInTheDocument();
  });

  it("does not record or remove an AI suggestion before the user discards the current boundary draft", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "知识边界阶段" }));

    const panel = boundaryPanel();
    fireEvent.change(panel.getByLabelText("知识主题"), { target: { value: "未保存人工边界" } });
    fireEvent.change(panel.getByLabelText("当前缺口"), { target: { value: "先整理当前项目边界" } });
    fireEvent.change(screen.getByLabelText("边界提取素材"), {
      target: { value: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提取边界草稿" }));
    expect(await screen.findByText("服务端边界提取暂不可用，已用本地规则生成候选。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("候选反馈原因：MQ"), { target: { value: "需要改成可靠消息故障恢复" } });
    fireEvent.click(screen.getByRole("button", { name: "修订边界：MQ" }));
    expect(screen.getByRole("alertdialog", { name: "放弃未保存的知识边界修改？" })).toBeInTheDocument();
    expect(useSprintStore.getState().boundarySuggestionFeedback).toHaveLength(0);
    expect(screen.getByRole("button", { name: "修订边界：MQ" })).toBeInTheDocument();
    expect(panel.getByLabelText("知识主题")).toHaveValue("未保存人工边界");

    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "修订边界：MQ" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));

    expect(useSprintStore.getState().boundarySuggestionFeedback).toEqual([
      expect.objectContaining({ topic: "MQ", decision: "needs_revision", reason: "需要改成可靠消息故障恢复" })
    ]);
    expect(screen.queryByRole("button", { name: "修订边界：MQ" })).not.toBeInTheDocument();
    expect(panel.getByLabelText("知识主题")).toHaveValue("MQ");
  });
});

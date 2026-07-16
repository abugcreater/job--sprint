import { render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { useSprintStore } from "../stores/sprintStore";
import type { AiArtifact, LlmRun, ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaProfile, qaScheduleEvents, qaTaskIds } from "./fixtures/coachFlow";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetStatsSprint() {
  window.location.hash = "#/stats";
  window.localStorage.clear();
  const completed = {
    [qaTaskIds.learning]: true,
    [qaTaskIds.interview]: true
  };
  const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
    [qaTaskIds.learning]: [
      evidence(qaTaskIds.learning, "learning_note", "缺陷归因学习笔记")
    ],
    [qaTaskIds.interview]: [
      evidence(qaTaskIds.interview, "interview_answer", "Mock 服务边界口述")
    ]
  };
  const scheduleEvents = qaScheduleEvents.map((event) => event.id === "qa-learning" ? { ...event, acceptedFromArtifactId: "artifact-schedule" } : event);
  useSprintStore.setState({
    completed,
    evidenceByTaskId,
    delayRecords: [],
    userProfiles: [qaProfile],
    knowledgeBoundaries: [
      {
        id: "boundary-quality-platform",
        profileId: qaProfile.id,
        topic: "质量平台",
        level: "可讲",
        gap: "补齐指标口径",
        evidence: "缺陷归因和质量报表",
        targetUse: "面试项目复盘",
        createdAt: "2026-07-02T09:00:00+08:00",
        updatedAt: "2026-07-02T09:00:00+08:00"
      }
    ],
    boundarySuggestionFeedback: [],
    coachScheduleEvents: scheduleEvents,
    aiArtifacts: aiArtifacts(),
    llmRuns: llmRuns(),
    syncState: "local_fallback",
    lastSavedAt: "2026-07-02T14:30:00+08:00",
    sprint: buildQaSprint({ now: fixedNow, completed, evidenceByTaskId })
  });
}

describe("React Job Sprint stats workspace", () => {
  beforeEach(() => {
    resetStatsSprint();
  });

  it("centralizes outcome and AI run quality metrics", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "进展统计" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "关键结果" })).toBeInTheDocument();
    expect(screen.getByText("优先看推进质量、AI 采纳后执行和面试复盘，不再只分散看各模块头部数字。")).toBeInTheDocument();

    const outcomePanel = screen.getByRole("heading", { name: "结果闭环" }).closest("article");
    expect(outcomePanel).not.toBeNull();
    expect(within(outcomePanel!).getByText("有效推进")).toBeInTheDocument();
    expect(within(outcomePanel!).getByText("采纳日程完成")).toBeInTheDocument();
    expect(within(outcomePanel!).getByText("面试复盘率")).toBeInTheDocument();
    expect(within(outcomePanel!).getAllByText("100%")).toHaveLength(2);

    const aiRunPanel = screen.getByRole("heading", { name: "AI 运行质量" }).closest("article");
    expect(aiRunPanel).not.toBeNull();
    expect(within(aiRunPanel!).getByText("运行总数")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("3 次")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("成功 / 降级")).toBeInTheDocument();
    expect(within(aiRunPanel!).getAllByText("1 / 1")).toHaveLength(2);
    expect(within(aiRunPanel!).getByText("失败 / Schema 异常")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("Schema 失败 · anthropic-compatible")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("最新诊断")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("模型响应未通过结构校验")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("建议动作")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("检查 schema、prompt version 和服务端 llm_runs 日志。")).toBeInTheDocument();
  });

  it("explains a local runtime fallback without calling it a provider failure", async () => {
    useSprintStore.setState({
      llmRuns: [
        {
          ...llmRuns()[1],
          provider: "local-fallback",
          warning: "server_unavailable",
          createdAt: "2026-07-02T13:30:00+08:00"
        }
      ]
    });
    render(<App />);

    const aiRunPanel = (await screen.findByRole("heading", { name: "AI 运行质量" })).closest("article");
    expect(aiRunPanel).not.toBeNull();
    expect(within(aiRunPanel!).getByText("本地模式 · local-fallback")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("本地前端未连接后端 AI API")).toBeInTheDocument();
    expect(within(aiRunPanel!).getByText("用服务端 runtime 或远端环境复验 /api/coach/artifacts。")).toBeInTheDocument();
  });
});

function evidence(taskId: string, type: ReviewEvidence["type"], title: string): ReviewEvidence {
  return {
    id: `${taskId}-${type}`,
    taskId,
    type,
    title,
    content: `${title} 内容`,
    createdAt: "2026-07-02T14:10:00+08:00",
    verified: true
  };
}

function aiArtifacts(): AiArtifact[] {
  return [
    artifact("artifact-schedule", "schedule_suggestion", "accepted"),
    artifact("artifact-question", "interview_question", "rejected", "题目太泛"),
    artifact("artifact-draft", "knowledge_card", "draft")
  ];
}

function artifact(id: string, type: AiArtifact["type"], status: AiArtifact["status"], rejectionReason = ""): AiArtifact {
  return {
    id,
    profileId: qaProfile.id,
    type,
    title: id,
    body: "AI 建议内容",
    reason: "围绕测试开发画像生成",
    sources: ["QA 画像"],
    confidence: "medium",
    status,
    rejectionReason,
    createdAt: "2026-07-02T13:00:00+08:00",
    updatedAt: "2026-07-02T13:00:00+08:00"
  };
}

function llmRuns(): LlmRun[] {
  return [
    llmRun("llm-success", "success", "pass", "2026-07-02T13:00:00+08:00"),
    llmRun("llm-fallback", "fallback", "not_checked", "2026-07-02T13:10:00+08:00"),
    llmRun("llm-failed", "failed", "failed", "2026-07-02T13:20:00+08:00")
  ];
}

function llmRun(id: string, status: LlmRun["status"], schemaStatus: LlmRun["schemaStatus"], createdAt: string): LlmRun {
  return {
    id,
    profileId: qaProfile.id,
    provider: "anthropic-compatible",
    model: "deepseek-v4-flash",
    promptVersion: "coach-artifacts-v1",
    schemaVersion: "coach-artifact-list-v1",
    inputSummaryHash: id,
    artifactCount: status === "success" ? 2 : 0,
    schemaStatus,
    status,
    createdAt
  };
}

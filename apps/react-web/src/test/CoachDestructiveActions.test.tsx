import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, KnowledgeBoundary, LlmRun, UserProfile } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

function resetSprint(hash = "#/coach") {
  window.location.hash = hash;
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

function panelByHeading(name: string) {
  const panel = screen.getByRole("heading", { name }).closest("article, section");
  if (!panel) throw new Error(`Panel not found: ${name}`);
  return within(panel as HTMLElement);
}

describe("React Job Sprint coach destructive actions", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("requires confirmation before deleting knowledge boundaries and schedule events", async () => {
    render(<App />);

    const profilePanel = panelByHeading("求职画像");
    fireEvent.change(await profilePanel.findByLabelText("画像名称"), { target: { value: "删除确认画像" } });
    fireEvent.change(profilePanel.getByLabelText("目标岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(profilePanel.getByLabelText("每日分钟"), { target: { value: "45" } });
    fireEvent.change(profilePanel.getByLabelText("经验摘要"), { target: { value: "5 年测试平台经验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存画像" }));
    expect(await screen.findByText("画像已保存。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("知识主题"), { target: { value: "可删除知识边界" } });
    fireEvent.change(screen.getByLabelText("当前缺口"), { target: { value: "需要补齐边界删除确认" } });
    fireEvent.change(screen.getByLabelText("已有证据"), { target: { value: "确认测试证据" } });
    fireEvent.change(screen.getByLabelText("岗位用途"), { target: { value: "测试开发 JD" } });
    fireEvent.click(screen.getByRole("button", { name: "新增边界" }));
    expect(await screen.findByText("知识边界已保存。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /删除知识边界：可删除知识边界/ }));
    expect(screen.getByText("确认删除「可删除知识边界」知识边界？删除后 AI 建议、知识卡和面试训练不会再引用这条边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /取消删除知识边界 可删除知识边界/ }));
    expect(screen.queryByText("确认删除「可删除知识边界」知识边界？删除后 AI 建议、知识卡和面试训练不会再引用这条边界。")).not.toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /删除知识边界：可删除知识边界/ }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除知识边界 可删除知识边界/ }));
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(0);
    expect(screen.getByText("已删除「可删除知识边界」知识边界，可立即撤销并恢复到 AI 建议、知识卡和面试训练上下文。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /删除知识边界：可删除知识边界/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "撤销删除" }));

    expect(await screen.findByText("已恢复刚删除的知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);
    expect(screen.getByRole("button", { name: /删除知识边界：可删除知识边界/ })).toBeInTheDocument();
    expect(screen.queryByText("已删除「可删除知识边界」知识边界，可立即撤销并恢复到 AI 建议、知识卡和面试训练上下文。")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("日程标题"), { target: { value: "可删除个人日程" } });
    fireEvent.change(screen.getByLabelText("安排原因"), { target: { value: "验证日程删除确认" } });
    fireEvent.click(screen.getByRole("button", { name: "新增日程" }));
    expect(await screen.findByText("自定义日程已加入今日 AI 教练。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /删除日程：可删除个人日程/ }));
    expect(screen.getByText("确认删除「可删除个人日程」日程？删除后今日页不再展示这条个人行动，相关 Evidence Gate 不会自动补回。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /取消删除日程 可删除个人日程/ }));
    expect(screen.queryByText("确认删除「可删除个人日程」日程？删除后今日页不再展示这条个人行动，相关 Evidence Gate 不会自动补回。")).not.toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /删除日程：可删除个人日程/ }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除日程 可删除个人日程/ }));
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(0);
    expect(screen.getByText("已删除「可删除个人日程」个人日程，可立即撤销并恢复到今日页行动和 AI 教练日程上下文。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /删除日程：可删除个人日程/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "撤销删除" }));

    expect(await screen.findByText("已恢复刚删除的个人日程。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    expect(screen.getByRole("button", { name: /删除日程：可删除个人日程/ })).toBeInTheDocument();
    expect(screen.queryByText("已删除「可删除个人日程」个人日程，可立即撤销并恢复到今日页行动和 AI 教练日程上下文。")).not.toBeInTheDocument();
  });

  it("restores deleted profile bundles with related coach context", async () => {
    const createdAt = fixedNow.toISOString();
    const profile: UserProfile = {
      id: "profile-restorable",
      name: "可恢复画像",
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "28-35K",
      companyTypes: "平台型公司",
      experienceSummary: "6 年测试平台和接口自动化经验",
      projectEvidence: "接口自动化平台",
      nonClaims: "不包装算法训练经验",
      dailyMinutes: 60,
      active: true,
      createdAt,
      updatedAt: createdAt
    };
    const boundary: KnowledgeBoundary = {
      id: "boundary-restorable",
      profileId: profile.id,
      topic: "接口自动化稳定性",
      level: "可讲",
      gap: "需要补齐 flaky 治理证据",
      evidence: "接口自动化报表",
      targetUse: "测试开发 JD",
      sourceSummary: "来自简历导入",
      sourceConfidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "boundary-suggestions-v1",
      sourceInputHash: "input-hash-profile",
      createdAt,
      updatedAt: createdAt
    };
    const feedback: BoundarySuggestionFeedback = {
      id: "feedback-restorable",
      profileId: profile.id,
      suggestionId: "suggestion-restorable",
      topic: boundary.topic,
      decision: "accepted",
      reason: "贴合当前目标",
      sourceSummary: "来自简历导入",
      sourceConfidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "boundary-suggestions-v1",
      sourceInputHash: "input-hash-profile",
      createdAt
    };
    const scheduleEvent: CoachScheduleEvent = {
      id: "schedule-restorable",
      profileId: profile.id,
      date: "2026-07-02",
      start: "15:00",
      end: "15:30",
      kind: "learning",
      title: "补接口自动化证据",
      reason: "恢复画像后今日页仍要展示这条行动",
      evidenceRequired: true,
      acceptedFromArtifactId: "artifact-restorable",
      createdAt,
      updatedAt: createdAt
    };
    const artifact: AiArtifact = {
      id: "artifact-restorable",
      profileId: profile.id,
      type: "schedule_suggestion",
      title: "补接口自动化证据",
      body: "围绕测试开发岗位补一条可验证证据。",
      reason: "来自画像和知识边界",
      sources: ["画像：测试开发工程师"],
      confidence: "high",
      status: "accepted",
      targetDate: "2026-07-02",
      createdAt,
      updatedAt: createdAt
    };
    const llmRun: LlmRun = {
      id: "llm-run-restorable",
      profileId: profile.id,
      provider: "local-fallback",
      promptVersion: "coach-artifacts-v1",
      schemaVersion: "coach-artifact-list-v1",
      inputSummaryHash: "summary-hash-restorable",
      artifactCount: 1,
      schemaStatus: "pass",
      status: "fallback",
      createdAt
    };
    const completed = {};
    const evidenceByTaskId = {};

    useSprintStore.setState({
      completed,
      evidenceByTaskId,
      userProfiles: [profile],
      knowledgeBoundaries: [boundary],
      boundarySuggestionFeedback: [feedback],
      coachScheduleEvents: [scheduleEvent],
      aiArtifacts: [artifact],
      llmRuns: [llmRun],
      sprint: buildTodaySprint(getScheduleData(), fixedNow, {
        completed,
        evidenceByTaskId,
        syncState: "local_fallback",
        coachScheduleEvents: [scheduleEvent],
        activeProfileId: profile.id
      })
    });

    render(<App />);

    expect(await screen.findByText("补接口自动化证据")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除此画像" }));
    expect(screen.getByText("确认删除「可恢复画像」画像？关联知识边界、个人日程、AI 建议、AI 运行记录和候选反馈会一起移除；删除后可在本面板短时撤销整包恢复。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /确认删除画像 可恢复画像/ }));

    expect(await screen.findByText("已删除「可恢复画像」，关联上下文已同步清理，可短时撤销。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(0);
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(0);
    expect(useSprintStore.getState().boundarySuggestionFeedback).toHaveLength(0);
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(0);
    expect(useSprintStore.getState().aiArtifacts).toHaveLength(0);
    expect(useSprintStore.getState().llmRuns).toHaveLength(0);
    expect(useSprintStore.getState().sprint.tasks.some((task) => task.title === "补接口自动化证据")).toBe(false);
    expect(screen.getByText("已删除「可恢复画像」画像，可立即撤销并恢复画像本身、1 条知识边界、1 条个人日程、1 条 AI 建议、1 条 AI 运行记录、1 条候选反馈到 AI 教练上下文。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "撤销删除" }));

    expect(await screen.findByText("已恢复「可恢复画像」画像及关联上下文。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);
    expect(useSprintStore.getState().boundarySuggestionFeedback).toHaveLength(1);
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    expect(useSprintStore.getState().aiArtifacts).toHaveLength(1);
    expect(useSprintStore.getState().llmRuns).toHaveLength(1);
    expect(useSprintStore.getState().userProfiles[0]).toMatchObject({ id: profile.id, active: true });
    expect(useSprintStore.getState().coachScheduleEvents[0].acceptedFromArtifactId).toBe("artifact-restorable");
    expect(useSprintStore.getState().sprint.tasks.some((task) => task.title === "补接口自动化证据")).toBe(true);
    expect(screen.queryByText("已删除「可恢复画像」画像，可立即撤销并恢复画像本身、1 条知识边界、1 条个人日程、1 条 AI 建议、1 条 AI 运行记录、1 条候选反馈到 AI 教练上下文。")).not.toBeInTheDocument();
  });
});

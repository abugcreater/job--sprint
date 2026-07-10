import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { AiArtifact, CoachScheduleEvent, LlmRun, UserProfile } from "../types/sprint";

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

describe("React Job Sprint AI coach workspace", () => {
  beforeEach(() => {
    resetSprint();
  });

  it("saves a profile, knowledge boundary, schedule event and AI artifact decisions", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "AI 求职教练" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "求职画像" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邀请批次首登看板" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邀请账号管理" })).not.toBeInTheDocument();
    expect(screen.queryByText("集中统计")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "统计" }).some((link) => link.getAttribute("href") === "#/stats")).toBe(true);
    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getByText("建档完成度 20%")).toBeInTheDocument();
    expect(screen.getByText("下一项 求职画像")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "记录建档进度" }));
    expect(await screen.findByText("当前处于本地模式，建档进度未写入服务端。")).toBeInTheDocument();

    const profilePanel = panelByHeading("求职画像");
    fireEvent.change(profilePanel.getByLabelText("画像名称"), { target: { value: "测试开发画像" } });
    fireEvent.change(profilePanel.getByLabelText("角色族"), { target: { value: "implementation" } });
    fireEvent.change(profilePanel.getByLabelText("目标岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(profilePanel.getByLabelText("目标等级"), { target: { value: "高级" } });
    fireEvent.change(profilePanel.getByLabelText("每日分钟"), { target: { value: "45" } });
    fireEvent.change(profilePanel.getByLabelText("经验摘要"), { target: { value: "5 年测试平台和自动化经验" } });
    fireEvent.change(profilePanel.getByLabelText("项目证据"), { target: { value: "接口自动化平台、稳定性报表" } });
    fireEvent.change(profilePanel.getByLabelText("不可夸大边界"), { target: { value: "不包装算法训练经验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存画像" }));

    expect(await screen.findByText("求职画像已保存，后续 AI 建议会引用这份画像。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);
    expect(useSprintStore.getState().userProfiles[0].roleFamily).toBe("implementation");
    expect(screen.getByText("画像已保存。")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("边界提取素材"), { target: { value: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。" } });
    fireEvent.click(screen.getByRole("button", { name: "提取边界草稿" }));

    expect(await screen.findByText("服务端边界提取暂不可用，已用本地规则生成候选。")).toBeInTheDocument();
    expect(screen.getAllByText(/来源摘要：JD 要求 MQ、Redis、稳定性/).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: "采纳边界：MQ" }));
    expect(await screen.findByText("已采纳「MQ」知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(1);
    expect(useSprintStore.getState().knowledgeBoundaries[0]).toMatchObject({
      topic: "MQ",
      sourceConfidence: "high",
      sourceProvider: "local-fallback"
    });
	    expect(useSprintStore.getState().boundarySuggestionFeedback[0]).toMatchObject({
	      topic: "MQ",
	      decision: "accepted",
	      sourceProvider: "local-fallback"
	    });
	    expect(screen.getByText("AI high")).toBeInTheDocument();
	    expect(screen.getByText("新增边界会进入你的个人画像上下文，后续知识、面试和 AI 建议都会引用。")).toBeInTheDocument();

	    fireEvent.change(screen.getByLabelText("知识主题"), { target: { value: "接口自动化稳定性" } });
	    fireEvent.change(screen.getByLabelText("掌握程度"), { target: { value: "了解" } });
	    fireEvent.change(screen.getByLabelText("当前缺口"), { target: { value: "讲不清分层、失败重试和 flaky 治理" } });
	    fireEvent.change(screen.getByLabelText("已有证据"), { target: { value: "pytest 用例和报表" } });
    fireEvent.change(screen.getByLabelText("岗位用途"), { target: { value: "测试开发 JD" } });
    fireEvent.click(screen.getByRole("button", { name: "新增边界" }));

	    expect(await screen.findByText("知识边界已保存。")).toBeInTheDocument();
	    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(2);
	    fireEvent.click(screen.getByRole("button", { name: "编辑知识边界：接口自动化稳定性" }));
	    expect(screen.getByText("正在编辑「接口自动化稳定性」，保存后会更新这条知识边界。")).toBeInTheDocument();
	    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
	    expect(screen.getByText("新增边界会进入你的个人画像上下文，后续知识、面试和 AI 建议都会引用。")).toBeInTheDocument();
	    expect(screen.getByRole("button", { name: "新增边界" })).toBeInTheDocument();

	    expect(screen.getByText("新增日程会进入今日页，只展示当前画像自己的行动。")).toBeInTheDocument();
	    fireEvent.change(screen.getByLabelText("日程标题"), { target: { value: "补接口自动化证据" } });
	    fireEvent.change(screen.getByLabelText("安排原因"), { target: { value: "今天需要补齐测试开发画像证据" } });
	    fireEvent.click(screen.getByRole("button", { name: "新增日程" }));

	    expect(await screen.findByText("自定义日程已加入今日 AI 教练。")).toBeInTheDocument();
	    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
	    expect(useSprintStore.getState().sprint.tasks.some((task) => task.title === "补接口自动化证据")).toBe(true);
	    expect(screen.getByText("3/5")).toBeInTheDocument();
	    fireEvent.click(screen.getByRole("button", { name: "编辑日程：补接口自动化证据" }));
	    expect(screen.getByText("正在编辑「补接口自动化证据」，保存后会更新这条个人日程。")).toBeInTheDocument();
	    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
	    expect(screen.getByText("新增日程会进入今日页，只展示当前画像自己的行动。")).toBeInTheDocument();
	    expect(screen.getByRole("button", { name: "新增日程" })).toBeInTheDocument();

	    fireEvent.click(screen.getByRole("button", { name: "生成 AI 建议" }));

    expect(await screen.findByText("服务端 AI 暂不可用，已使用本地规则生成 AI 建议。")).toBeInTheDocument();
    expect(useSprintStore.getState().aiArtifacts.length).toBeGreaterThanOrEqual(3);
    expect(useSprintStore.getState().llmRuns[0]).toMatchObject({
      provider: "local-fallback",
      promptVersion: "coach-artifacts-v1",
      schemaStatus: "pass",
      status: "fallback"
    });
    expect(screen.getByRole("heading", { name: "AI 运行记录" })).toBeInTheDocument();
    expect(screen.getByText("诊断：本地前端未连接后端 AI API")).toBeInTheDocument();
    expect(screen.getByText("当前页面已用本地规则生成草稿，不代表远端大模型或 provider 本身失败。")).toBeInTheDocument();

    const firstDraftTitle = useSprintStore.getState().aiArtifacts[0].title;
    fireEvent.click(screen.getByRole("button", { name: `接受 AI 建议：${firstDraftTitle}` }));
    expect(await screen.findByText("已接受知识卡建议，并写入知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().aiArtifacts.some((artifact) => artifact.status === "accepted")).toBe(true);
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getAllByText("建档完成").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("建档完成度 100%")).toBeInTheDocument();
    expect(screen.getByText("下一项 无待办")).toBeInTheDocument();

    const draft = useSprintStore.getState().aiArtifacts.find((artifact) => artifact.status === "draft" || artifact.status === "edited");
    expect(draft).toBeDefined();
    if (!draft) return;
    fireEvent.change(screen.getByLabelText(`拒绝原因：${draft.title}`), { target: { value: "这条不贴合今天目标" } });
    fireEvent.click(screen.getByRole("button", { name: `拒绝 AI 建议：${draft.title}` }));

    expect(useSprintStore.getState().aiArtifacts.some((artifact) => artifact.status === "rejected")).toBe(true);
    expect(await screen.findByRole("heading", { name: "AI 反馈复盘" })).toBeInTheDocument();
    expect(screen.getByText("采纳率")).toBeInTheDocument();
    expect(screen.getByText("采纳日程完成")).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("这条不贴合今天目标")).toBeInTheDocument();
  }, 10000);

  it("runs the quick initialization flow from profile to boundaries and first schedule", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "导入简历建档" })).toBeInTheDocument();

    const wizardPanel = panelByHeading("导入简历建档");
    fireEvent.change(wizardPanel.getByLabelText("建档模板"), { target: { value: "qa" } });
    fireEvent.click(wizardPanel.getByRole("button", { name: "套用模板" }));
    expect(await screen.findByText("已套用「测试求职者」建档模板。")).toBeInTheDocument();
    expect(wizardPanel.getByLabelText("快速建档目标岗位")).toHaveValue("测试开发工程师");
    expect((wizardPanel.getByLabelText("导入素材") as HTMLTextAreaElement).value).toContain("接口自动化");
    expect(screen.getByText("已识别 1 段素材：其它")).toBeInTheDocument();

    fireEvent.click(wizardPanel.getByRole("button", { name: "追加面试反馈" }));
    expect(await screen.findByText("已追加「面试反馈」素材段。")).toBeInTheDocument();
    expect((wizardPanel.getByLabelText("导入素材") as HTMLTextAreaElement).value).toContain("面试反馈");
    expect(screen.getByText("已识别 2 段素材：其它、面试反馈")).toBeInTheDocument();

    fireEvent.change(wizardPanel.getByLabelText("快速建档每日分钟"), { target: { value: "60" } });
    fireEvent.change(wizardPanel.getByLabelText("快速建档经验摘要"), { target: { value: "5 年测试开发，做过接口自动化平台和稳定性治理" } });
    fireEvent.click(wizardPanel.getByRole("button", { name: "生成画像建议" }));
    expect(await screen.findByText(/已生成画像建议/)).toBeInTheDocument();
    fireEvent.click(wizardPanel.getByRole("button", { name: "确认写入画像" }));

    expect(await screen.findByText("求职画像已保存，已准备好可确认的知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(0);

    fireEvent.click(wizardPanel.getByRole("button", { name: "采纳建议边界" }));
    expect(await screen.findByText("已采纳 3 条知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(3);

    fireEvent.click(wizardPanel.getByRole("button", { name: "生成今日行动" }));
    expect(await screen.findByText("已生成今天的第一条行动。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    expect(useSprintStore.getState().coachScheduleEvents[0].title).toMatch(/^补 .+ 面试表达$/);
    expect(screen.getByText("4/5")).toBeInTheDocument();
  });

  it("deletes a profile from the redesigned profile panel and clears related data", async () => {
    render(<App />);

    const profilePanel = panelByHeading("求职画像");
    fireEvent.change(await profilePanel.findByLabelText("画像名称"), { target: { value: "可删除画像" } });
    fireEvent.change(profilePanel.getByLabelText("目标岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(profilePanel.getByLabelText("每日分钟"), { target: { value: "45" } });
    fireEvent.change(profilePanel.getByLabelText("经验摘要"), { target: { value: "5 年测试平台经验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存画像" }));

    expect(await screen.findByText("画像已保存。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "删除此画像" }));
    expect(screen.getByText("确认删除「可删除画像」画像？关联知识边界、个人日程、AI 建议、AI 运行记录和候选反馈会一起移除；删除后可在本面板短时撤销整包恢复。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /取消删除画像 可删除画像/ }));
    expect(screen.queryByText("确认删除「可删除画像」画像？关联知识边界、个人日程、AI 建议、AI 运行记录和候选反馈会一起移除；删除后可在本面板短时撤销整包恢复。")).not.toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "删除此画像" }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除画像 可删除画像/ }));
    expect(await screen.findByText("已删除「可删除画像」，关联上下文已同步清理，可短时撤销。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(0);
    expect(screen.getByText("尚未创建画像")).toBeInTheDocument();
  });

  it("shows explicit expand controls when coach schedules and AI drafts exceed the compact list", async () => {
    const profile: UserProfile = {
      id: "profile-many",
      name: "泛 IT 求职画像",
      roleFamily: "frontend",
      targetRole: "前端工程师",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "面议",
      companyTypes: "产品型公司",
      experienceSummary: "6 年前端和工程效率经验",
      projectEvidence: "组件库和性能优化项目",
      nonClaims: "不包装后端主导经验",
      dailyMinutes: 60,
      active: true,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    };
    const scheduleEvents: CoachScheduleEvent[] = Array.from({ length: 6 }, (_, index) => ({
      id: `event-many-${index + 1}`,
      profileId: profile.id,
      date: "2026-07-02",
      start: `2${index}:00`,
      end: `2${index}:30`,
      kind: "learning",
      title: `第${index + 1}条自定义日程`,
      reason: "验证长列表有明确展开入口",
      evidenceRequired: true,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    }));
    const aiArtifacts: AiArtifact[] = Array.from({ length: 9 }, (_, index) => ({
      id: `artifact-many-${index + 1}`,
      profileId: profile.id,
      type: index % 3 === 0 ? "knowledge_card" : index % 3 === 1 ? "schedule_suggestion" : "interview_question",
      title: `候选 AI 建议 ${index + 1}`,
      body: "验证 AI 建议长列表有明确展开入口",
      reason: "来自画像和知识边界",
      sources: ["画像：前端工程师"],
      confidence: "medium",
      status: "draft",
      targetDate: "2026-07-02",
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    }));
    const llmRuns: LlmRun[] = Array.from({ length: 6 }, (_, index) => ({
      id: `llm-run-many-${index + 1}`,
      profileId: profile.id,
      provider: index % 2 === 0 ? "anthropic-compatible" : "local-fallback",
      model: index % 2 === 0 ? "deepseek-v4-flash" : undefined,
      promptVersion: `coach-artifacts-v${index + 1}`,
      schemaVersion: "coach-artifact-list-v1",
      inputSummaryHash: `summary-hash-${index + 1}`,
      artifactCount: 3,
      schemaStatus: "pass",
      status: index % 2 === 0 ? "success" : "fallback",
      createdAt: fixedNow.toISOString()
    }));

    useSprintStore.setState({
      userProfiles: [profile],
      boundarySuggestionFeedback: [],
      coachScheduleEvents: scheduleEvents,
      aiArtifacts,
      llmRuns
    });
    render(<App />);

    expect(await screen.findByText("还有 1 条日程未显示，避免今日页被长列表拖垮。")).toBeInTheDocument();
    expect(screen.queryByText("第6条自定义日程")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看全部日程" }));
    expect(await screen.findByText("第6条自定义日程")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 6 条日程。")).toBeInTheDocument();

    expect(screen.getByText("还有 1 条 AI 建议未显示，先处理最靠前的建议。")).toBeInTheDocument();
    expect(screen.queryByLabelText("AI 建议标题：候选 AI 建议 9")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看全部 AI 建议" }));
    expect(await screen.findByLabelText("AI 建议标题：候选 AI 建议 9")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 9 条 AI 建议。")).toBeInTheDocument();

    expect(screen.getByText("还有 1 条 AI 运行记录未显示，先看最近生成和降级状态。")).toBeInTheDocument();
    expect(screen.queryByText("coach-artifacts-v6 · 3 条草稿")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看全部运行记录" }));
    expect(await screen.findByText("coach-artifacts-v6 · 3 条草稿")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 6 条 AI 运行记录。")).toBeInTheDocument();
  });
});

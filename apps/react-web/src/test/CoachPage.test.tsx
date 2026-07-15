import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "../App";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { useSprintStore } from "../stores/sprintStore";
import type { AiArtifact, CoachScheduleEvent, UserProfile } from "../types/sprint";

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

    expect(await screen.findByRole("heading", { name: "准备工作台" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "准备阶段" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "知识边界" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "改用详细画像表单" }));
    expect(screen.getByRole("heading", { name: "求职画像" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邀请批次首登看板" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邀请账号管理" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回到今日" })).toHaveAttribute("href", "#/today");
    expect(screen.getByText("0/4")).toBeInTheDocument();
    expect(screen.getByText(/下一步：/)).toBeInTheDocument();
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
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "知识边界阶段" })).toHaveAttribute("aria-current", "step");

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
    fireEvent.click(screen.getByRole("button", { name: "知识边界阶段" }));
    expect(screen.getByText("AI high")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("知识主题"), { target: { value: "接口自动化稳定性" } });
    fireEvent.change(screen.getByLabelText("掌握程度"), { target: { value: "了解" } });
    fireEvent.change(screen.getByLabelText("当前缺口"), { target: { value: "讲不清分层、失败重试和 flaky 治理" } });
    fireEvent.change(screen.getByLabelText("已有证据"), { target: { value: "pytest 用例和报表" } });
    fireEvent.change(screen.getByLabelText("岗位用途"), { target: { value: "测试开发 JD" } });
    fireEvent.click(screen.getByRole("button", { name: "新增边界" }));

    expect(await screen.findByText("知识边界已保存。")).toBeInTheDocument();
    expect(useSprintStore.getState().knowledgeBoundaries).toHaveLength(2);
    expect(screen.getByRole("button", { name: "今日计划阶段" })).toHaveAttribute("aria-current", "step");

    fireEvent.change(screen.getByLabelText("日程标题"), { target: { value: "补接口自动化证据" } });
    fireEvent.change(screen.getByLabelText("安排原因"), { target: { value: "今天需要补齐测试开发画像证据" } });
    fireEvent.click(screen.getByRole("button", { name: "新增日程" }));

    expect(await screen.findByText("自定义日程已加入今日 AI 教练。")).toBeInTheDocument();
    expect(useSprintStore.getState().coachScheduleEvents).toHaveLength(1);
    expect(useSprintStore.getState().sprint.tasks.some((task) => task.title === "补接口自动化证据")).toBe(true);
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 建议阶段" })).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: "生成 AI 建议" }));

    expect(await screen.findByText("服务端 AI 暂不可用，已使用本地规则生成 AI 建议。")).toBeInTheDocument();
    expect(useSprintStore.getState().aiArtifacts.length).toBeGreaterThanOrEqual(3);
    expect(useSprintStore.getState().llmRuns[0]).toMatchObject({
      provider: "local-fallback",
      promptVersion: "coach-artifacts-v1",
      schemaStatus: "pass",
      status: "fallback"
    });
    fireEvent.click(screen.getAllByText("AI 运行记录")[0]);
    expect(screen.getByRole("heading", { name: "AI 运行记录" })).toBeInTheDocument();

    const firstDraftTitle = useSprintStore.getState().aiArtifacts[0].title;
    fireEvent.click(screen.getByRole("button", { name: `接受 AI 建议：${firstDraftTitle}` }));
    expect(await screen.findByText("已接受知识卡建议，并写入知识边界。")).toBeInTheDocument();
    expect(useSprintStore.getState().aiArtifacts.some((artifact) => artifact.status === "accepted")).toBe(true);
    expect(screen.getByText("4/4")).toBeInTheDocument();

    const draft = useSprintStore.getState().aiArtifacts.find((artifact) => artifact.status === "draft" || artifact.status === "edited");
    expect(draft).toBeDefined();
    if (!draft) return;
    fireEvent.change(screen.getByLabelText(`拒绝原因：${draft.title}`), { target: { value: "这条不贴合今天目标" } });
    fireEvent.click(screen.getByRole("button", { name: `拒绝 AI 建议：${draft.title}` }));

    expect(useSprintStore.getState().aiArtifacts.some((artifact) => artifact.status === "rejected")).toBe(true);
    fireEvent.click(screen.getAllByText("AI 反馈复盘")[0]);
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
    expect(wizardPanel.getByLabelText("导入素材")).toHaveValue("");
    expect(screen.getByText("尚未识别到可导入素材")).toBeInTheDocument();

    fireEvent.change(wizardPanel.getByLabelText("导入素材"), { target: { value: "5 年测试开发，负责接口自动化平台、Redis 缓存、MQ 消息队列与稳定性质量指标。" } });
    expect(wizardPanel.getByLabelText("导入素材")).toHaveValue("5 年测试开发，负责接口自动化平台、Redis 缓存、MQ 消息队列与稳定性质量指标。");
    expect((wizardPanel.getByLabelText("导入素材") as HTMLTextAreaElement).value).not.toContain("请结合真实 JD");

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
    expect(screen.getByText("3/4")).toBeInTheDocument();
  });

  it("deletes a profile from the redesigned profile panel and clears related data", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "改用详细画像表单" }));
    const profilePanel = panelByHeading("求职画像");
    fireEvent.change(await profilePanel.findByLabelText("画像名称"), { target: { value: "可删除画像" } });
    fireEvent.change(profilePanel.getByLabelText("目标岗位"), { target: { value: "测试开发工程师" } });
    fireEvent.change(profilePanel.getByLabelText("每日分钟"), { target: { value: "45" } });
    fireEvent.change(profilePanel.getByLabelText("经验摘要"), { target: { value: "5 年测试平台经验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存画像" }));

    expect(await screen.findByText("求职画像已保存，后续 AI 建议会引用这份画像。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "画像阶段" }));
    fireEvent.click(screen.getByRole("button", { name: "删除此画像" }));
    fireEvent.click(screen.getByRole("button", { name: /确认删除画像 可删除画像/ }));
    expect(await screen.findByText("已删除「可删除画像」，关联上下文已同步清理，可短时撤销。")).toBeInTheDocument();
    expect(useSprintStore.getState().userProfiles).toHaveLength(0);
    expect(screen.getByText(/可立即撤销并恢复画像本身/)).toBeInTheDocument();
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

    useSprintStore.setState({
      userProfiles: [profile],
      boundarySuggestionFeedback: [],
      coachScheduleEvents: scheduleEvents,
      aiArtifacts,
      llmRuns: []
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "今日计划阶段" }));
    expect(await screen.findByText("还有 1 条日程未显示，避免今日页被长列表拖垮。")).toBeInTheDocument();
    expect(screen.queryByText("第6条自定义日程")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看全部日程" }));
    expect(await screen.findByText("第6条自定义日程")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 6 条日程。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI 建议阶段" }));
    expect(screen.getByText("还有 1 条 AI 建议未显示，先处理最靠前的建议。")).toBeInTheDocument();
    expect(screen.queryByLabelText("AI 建议标题：候选 AI 建议 9")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看全部 AI 建议" }));
    expect(await screen.findByLabelText("AI 建议标题：候选 AI 建议 9")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 9 条 AI 建议。")).toBeInTheDocument();
  });
});

import {
  acceptArtifact,
  buildCoachDashboard,
  canSaveBoundary,
  canSaveProfile,
  createBoundaryDraft,
  createProfileDraft,
  createScheduleDraft,
  generateCoachArtifacts,
  profileRoleFamilies,
  rejectArtifact,
  roleFamilyLabel,
  upsertCoachScheduleEvent,
  upsertKnowledgeBoundary,
  upsertProfile
} from "../data/coachAdapter";
import { roleFamilyPlaybookFor } from "../data/roleFamilyPlaybook";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";

const now = "2026-07-02T14:05:00+08:00";

describe("coachAdapter", () => {
  it("keeps the frozen MVP role families available to profile and AI labels", () => {
    expect(profileRoleFamilies.map((role) => role.value)).toEqual([
      "backend",
      "frontend",
      "qa",
      "ops",
      "data",
      "mobile",
      "product",
      "project",
      "implementation",
      "support",
      "other"
    ]);
    expect(roleFamilyLabel("implementation")).toBe("实施");
    for (const role of profileRoleFamilies) {
      expect([roleFamilyPlaybookFor(role.value).lens, roleFamilyPlaybookFor(role.value).answerFrame, roleFamilyPlaybookFor(role.value).questionBank.length >= 2]).toEqual([expect.any(String), expect.any(String), true]);
    }
  });

  it("creates a profile and knowledge boundary dashboard", () => {
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "测试开发",
      experienceSummary: "5 年测试和自动化经验",
      dailyMinutes: "45"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "接口自动化",
      level: "了解",
      gap: "讲不清分层和稳定性策略",
      evidence: "已有 pytest 用例",
      targetUse: "测试开发 JD"
    }, now);
    const dashboard = buildCoachDashboard({ profiles, boundaries, scheduleEvents: [], artifacts: [] });

    expect(canSaveProfile(createProfileDraft(profiles[0]))).toBe(true);
    expect(canSaveBoundary(createBoundaryDraft(boundaries[0]))).toBe(true);
    expect(dashboard.activeProfile?.targetRole).toBe("测试开发");
    expect(dashboard.readiness.status).toBe("ready");
    expect(dashboard.metrics.boundaryCount).toBe(1);
  });

  it("builds a first-use setup checklist for the coach product loop", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端和稳定性治理经验",
      nonClaims: "不夸大主导算法训练",
      dailyMinutes: "60"
    }, now);
    const boundaries = ["MQ 幂等", "Redis 缓存", "线上稳定性"].reduce(
      (current, topic) =>
        upsertKnowledgeBoundary(current, profiles[0].id, {
          ...createBoundaryDraft(),
          topic,
          level: "了解",
          gap: `${topic} 的场景边界还需要补证据`,
          evidence: "项目复盘",
          targetUse: "高级 Java JD"
        }, now),
      [] as ReturnType<typeof upsertKnowledgeBoundary>
    );
    const scheduleEvents = upsertCoachScheduleEvent([], profiles[0].id, {
      ...createScheduleDraft("2026-07-02"),
      title: "补 MQ 可靠消息表达",
      reason: "服务高级 Java 面试"
    }, undefined, now);
    const acceptedArtifact = acceptArtifact({
      artifact: generateCoachArtifacts({ profile: profiles[0], boundaries, sprint, now })[0],
      boundaries,
      scheduleEvents,
      sprint,
      now
    }).artifact;

    const dashboard = buildCoachDashboard({ profiles, boundaries, scheduleEvents, artifacts: [acceptedArtifact] });

    expect(dashboard.setupChecklist.status).toBe("ready");
    expect(dashboard.setupChecklist.progressLabel).toBe("4/4");
    expect(dashboard.setupChecklist.nextStep).toBeUndefined();
    expect(dashboard.setupChecklist.steps.map((step) => [step.id, step.status])).toEqual([
      ["profile", "done"],
      ["boundaries", "done"],
      ["schedule", "done"],
      ["ai_review", "done"]
    ]);
  });

  it("generates local AI drafts and accepts them into formal records", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "MQ 幂等",
      level: "了解",
      gap: "失败重试和去重表还说不清",
      evidence: "订单异步链路",
      targetUse: "后端 JD"
    }, now);
    const artifacts = generateCoachArtifacts({ profile: profiles[0], boundaries, sprint, now });

    expect(artifacts).toHaveLength(3);
    expect(artifacts[0].sources.join(" ")).toContain("知识边界：MQ 幂等");

    const scheduleResult = acceptArtifact({ artifact: artifacts.find((item) => item.type === "schedule_suggestion")!, boundaries, scheduleEvents: [], sprint, now });
    expect(scheduleResult.scheduleEvents).toHaveLength(1);
    expect(scheduleResult.artifact.status).toBe("accepted");

    const knowledgeResult = acceptArtifact({ artifact: artifacts.find((item) => item.type === "knowledge_card")!, boundaries, scheduleEvents: [], sprint, now });
    expect(knowledgeResult.boundaries[0].topic).toContain("MQ 幂等");

    const rejected = rejectArtifact(artifacts[0], "今天不投这个方向", now);
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("今天不投这个方向");
  });

  it("tailors local AI drafts by role family playbook", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const frontendProfiles = upsertProfile([], {
      ...createProfileDraft(),
      roleFamily: "frontend",
      targetRole: "前端工程师",
      experienceSummary: "6 年前端和工程效率经验",
      dailyMinutes: "45"
    }, now);
    const frontendBoundaries = upsertKnowledgeBoundary([], frontendProfiles[0].id, {
      ...createBoundaryDraft(),
      topic: "首屏性能",
      level: "了解",
      gap: "缺少真实指标和发布验证",
      evidence: "性能看板",
      targetUse: "前端 JD"
    }, now);
    const frontendArtifacts = generateCoachArtifacts({ profile: frontendProfiles[0], boundaries: frontendBoundaries, sprint, now });

    expect(frontendArtifacts[0].sources.join(" ")).toContain("角色视角：交互状态");
    expect(frontendArtifacts[0].body).toContain("用户场景、状态流、性能取舍");
    expect(frontendArtifacts[2].body).toContain("组件边界");

    const qaProfiles = upsertProfile([], {
      ...createProfileDraft(),
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      experienceSummary: "5 年测试开发经验",
      dailyMinutes: "45"
    }, now);
    const qaBoundaries = upsertKnowledgeBoundary([], qaProfiles[0].id, {
      ...createBoundaryDraft(),
      topic: "接口自动化稳定性",
      level: "了解",
      gap: "缺少质量指标",
      evidence: "pytest 用例",
      targetUse: "测试开发 JD"
    }, now);
    const qaArtifacts = generateCoachArtifacts({ profile: qaProfiles[0], boundaries: qaBoundaries, sprint, now });

    expect(qaArtifacts[0].sources.join(" ")).toContain("角色视角：测试策略");
    expect(qaArtifacts[0].body).toContain("测试矩阵");
    expect(qaArtifacts[2].body).toContain("自动化收益");
  });

  it("uses opportunity signals to focus local AI drafts on active job targets", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "MQ 可靠消息",
      level: "了解",
      gap: "缺少线上补偿证据",
      evidence: "订单异步链路",
      targetUse: "后端 JD"
    }, now);
    const artifacts = generateCoachArtifacts({
      profile: profiles[0],
      boundaries,
      opportunitySignals: [{
        id: "opp-1",
        company: "杭研平台",
        role: "高级 Java 后端",
        status: "约面",
        city: "杭州",
        keywords: ["MQ", "Redis", "稳定性"],
        tags: ["Spring"],
        feedback: "面试官关注故障恢复",
        notes: "",
        resumeVersion: "v2",
        createdAt: now
      }],
      sprint,
      now
    });

    expect(artifacts[0].sources.join(" ")).toContain("机会：杭研平台-高级 Java 后端(约面) JD:MQ、Redis、稳定性");
    expect(artifacts[0].sources.join(" ")).toContain("JD焦点：MQ 的故障恢复");
    expect(artifacts[0].sources.join(" ")).toContain("JD解析：硬技能 MQ、Redis、稳定性");
    expect(artifacts[0].body).toContain("当前机会「杭研平台-高级 Java 后端」");
    expect(artifacts[0].body).toContain("证据要求「准备故障恢复案例、影响范围、定位链路和复盘动作」");
    ["JD 焦点「MQ 的故障恢复」", "JD 解析题「你如何在 MQ 场景处理故障恢复？」", "追问库："].forEach((text) => expect(artifacts[2].body).toContain(text));
    expect(artifacts[1].reason).toContain("面试官关注故障恢复");
    expect(artifacts[1].reason).toContain("JD 解析「硬技能 MQ、Redis、稳定性");
  });

  it("summarizes accepted and rejected AI drafts for the next prompt calibration", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "MQ 幂等",
      level: "了解",
      gap: "失败重试和去重表还说不清",
      evidence: "订单异步链路",
      targetUse: "后端 JD"
    }, now);
    const drafts = generateCoachArtifacts({ profile: profiles[0], boundaries, sprint, now });
    const accepted = acceptArtifact({ artifact: drafts[0], boundaries, scheduleEvents: [], sprint, now }).artifact;
    const rejectedSchedule = rejectArtifact(drafts[1], "今天不需要新增日程", now);
    const rejectedQuestion = rejectArtifact(drafts[2], "候选题太泛", now);
    const dashboard = buildCoachDashboard({
      profiles,
      boundaries,
      scheduleEvents: [],
      artifacts: [accepted, rejectedSchedule, rejectedQuestion]
    });

    expect(dashboard.feedbackSummary.reviewedCount).toBe(3);
    expect(dashboard.feedbackSummary.acceptanceRateLabel).toBe("33%");
    expect(dashboard.feedbackSummary.qualityLabel).toBe("偏离目标");
    expect(dashboard.feedbackSummary.topRejectedTypes.map((item) => item.label)).toEqual(expect.arrayContaining(["候选题", "日程建议"]));
    expect(dashboard.feedbackSummary.recentRejectionReasons).toEqual(["今天不需要新增日程", "候选题太泛"]);
    expect(dashboard.feedbackSummary.nextPromptHint).toContain("低贴合建议");
  });

  it("attributes accepted AI schedule drafts to completed coach tasks", () => {
    const baseSprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "MQ 幂等",
      level: "了解",
      gap: "失败重试和去重表还说不清",
      evidence: "订单异步链路",
      targetUse: "后端 JD"
    }, now);
    const drafts = generateCoachArtifacts({ profile: profiles[0], boundaries, sprint: baseSprint, now });
    const scheduleDraft = drafts.find((artifact) => artifact.type === "schedule_suggestion");
    expect(scheduleDraft).toBeDefined();
    if (!scheduleDraft) return;

    const accepted = acceptArtifact({ artifact: scheduleDraft, boundaries, scheduleEvents: [], sprint: baseSprint, now });
    const taskId = `coach-event-${accepted.scheduleEvents[0].id}`;
    const pendingSprint = buildTodaySprint(getScheduleData(), new Date(now), {
      completed: {},
      evidenceByTaskId: {},
      syncState: "local_fallback",
      coachScheduleEvents: accepted.scheduleEvents,
      activeProfileId: profiles[0].id
    });
    const pendingDashboard = buildCoachDashboard({
      profiles,
      boundaries,
      scheduleEvents: accepted.scheduleEvents,
      artifacts: [accepted.artifact],
      sprint: pendingSprint
    });

    expect(pendingDashboard.feedbackSummary.reviewedCount).toBe(1);
    expect(pendingDashboard.feedbackSummary.acceptanceRateLabel).toBe("100%");
    expect(pendingDashboard.feedbackSummary.acceptedOutcomeCount).toBe(1);
    expect(pendingDashboard.feedbackSummary.completedAcceptedOutcomeCount).toBe(0);
    expect(pendingDashboard.feedbackSummary.acceptedOutcomeRateLabel).toBe("0%");
    expect(pendingDashboard.feedbackSummary.outcomeLabel).toBe("采纳未执行");
    expect(pendingDashboard.feedbackSummary.nextPromptHint).toContain("完成率偏低");

    const doneSprint = buildTodaySprint(getScheduleData(), new Date(now), {
      completed: { [taskId]: true },
      evidenceByTaskId: {},
      syncState: "local_fallback",
      coachScheduleEvents: accepted.scheduleEvents,
      activeProfileId: profiles[0].id
    });
    const doneDashboard = buildCoachDashboard({
      profiles,
      boundaries,
      scheduleEvents: accepted.scheduleEvents,
      artifacts: [accepted.artifact],
      sprint: doneSprint
    });

    expect(doneDashboard.feedbackSummary.completedAcceptedOutcomeCount).toBe(1);
    expect(doneDashboard.feedbackSummary.acceptedOutcomeRateLabel).toBe("100%");
    expect(doneDashboard.feedbackSummary.outcomeLabel).toBe("执行有效");
    expect(doneDashboard.feedbackSummary.nextPromptHint).toContain("已有完成记录");
  });

});

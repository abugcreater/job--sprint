import { buildCoachFirstLoginFlow } from "../data/coachFirstLoginFlowAdapter";
import {
  acceptArtifact,
  createBoundaryDraft,
  createProfileDraft,
  createScheduleDraft,
  generateCoachArtifacts,
  upsertCoachScheduleEvent,
  upsertKnowledgeBoundary,
  upsertProfile
} from "../data/coachAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";

const now = "2026-07-02T14:05:00+08:00";

describe("coachFirstLoginFlowAdapter", () => {
  it("orchestrates invitation-first onboarding from account scope to AI review", () => {
    const sprint = buildTodaySprint(getScheduleData(), new Date(now), { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const initialFlow = buildCoachFirstLoginFlow({
      syncState: "local_fallback",
      boundaries: [],
      scheduleEvents: [],
      artifacts: []
    });
    expect(initialFlow.progressLabel).toBe("1/5");
    expect(initialFlow.nextStep?.id).toBe("profile_template");
    expect(initialFlow.insight).toMatchObject({
      completionRate: 20,
      completionRateLabel: "20%",
      dropOffLabel: "首登画像模板",
      riskLabel: "高风险",
      nextActionLabel: "进入首登模板"
    });

    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      experienceSummary: "5 年测试平台经验",
      nonClaims: "不包装算法训练经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = ["接口自动化", "质量指标", "稳定性"].reduce(
      (current, topic) =>
        upsertKnowledgeBoundary(current, profiles[0].id, {
          ...createBoundaryDraft(),
          topic,
          gap: `${topic} 还缺面试证据`
        }, now),
      [] as ReturnType<typeof upsertKnowledgeBoundary>
    );
    const scheduleEvents = upsertCoachScheduleEvent([], profiles[0].id, {
      ...createScheduleDraft("2026-07-02"),
      title: "补接口自动化证据",
      reason: "首登后的第一条行动"
    }, undefined, now);
    const acceptedArtifact = acceptArtifact({
      artifact: generateCoachArtifacts({ profile: profiles[0], boundaries, sprint, now })[0],
      boundaries,
      scheduleEvents,
      sprint,
      now
    }).artifact;

    const readyFlow = buildCoachFirstLoginFlow({
      syncState: "online",
      activeProfile: profiles[0],
      boundaries,
      scheduleEvents,
      artifacts: [acceptedArtifact]
    });
    expect(readyFlow.status).toBe("ready");
    expect(readyFlow.progressLabel).toBe("5/5");
    expect(readyFlow.nextStep).toBeUndefined();
    expect(readyFlow.insight).toMatchObject({
      completionRate: 100,
      completionRateLabel: "100%",
      dropOffLabel: "无放弃点",
      riskLabel: "无风险",
      nextActionLabel: "进入日常迭代"
    });
  });
});

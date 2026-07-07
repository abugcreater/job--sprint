import {
  createBoundaryDraft,
  createProfileDraft,
  upsertKnowledgeBoundary,
  upsertProfile
} from "../data/coachAdapter";

const now = "2026-07-02T14:05:00+08:00";

describe("coach boundary provenance", () => {
  it("keeps AI boundary suggestion provenance after acceptance", () => {
    const profiles = upsertProfile([], {
      ...createProfileDraft(),
      targetRole: "后端工程师",
      experienceSummary: "7 年后端和稳定性治理经验",
      dailyMinutes: "60"
    }, now);
    const boundaries = upsertKnowledgeBoundary([], profiles[0].id, {
      ...createBoundaryDraft(),
      topic: "MQ",
      level: "了解",
      gap: "需要补齐故障恢复和补偿证据",
      evidence: "订单链路复盘",
      targetUse: "高级 Java JD",
      sourceSummary: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复。",
      confidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1",
      sourceInputHash: "2f3a4b5c"
    }, now);

    expect(boundaries[0]).toMatchObject({
      topic: "MQ",
      sourceSummary: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复。",
      sourceConfidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1",
      sourceInputHash: "2f3a4b5c"
    });
  });
});

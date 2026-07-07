import {
  createBoundarySuggestionFeedback,
  summarizeBoundarySuggestionFeedback
} from "../data/boundarySuggestionFeedbackAdapter";

describe("boundarySuggestionFeedbackAdapter", () => {
  it("creates feedback records and summarizes boundary suggestion calibration", () => {
    const accepted = createBoundarySuggestionFeedback({
      profileId: "profile-1",
      suggestionId: "suggestion-1",
      topic: "MQ",
      decision: "accepted",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1",
      sourceInputHash: "abc123"
    }, "2026-07-02T14:05:00+08:00");
    const rejected = createBoundarySuggestionFeedback({
      profileId: "profile-1",
      suggestionId: "suggestion-2",
      topic: "Redis",
      decision: "rejected",
      reason: "已经有更准确的缓存边界"
    }, "2026-07-02T14:06:00+08:00");
    const revised = createBoundarySuggestionFeedback({
      profileId: "profile-1",
      suggestionId: "suggestion-3",
      topic: "稳定性",
      decision: "needs_revision",
      reason: "需要改成故障恢复场景"
    }, "2026-07-02T14:07:00+08:00");

    expect(accepted).toMatchObject({
      decision: "accepted",
      reason: "已采纳",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1",
      sourceInputHash: "abc123"
    });

    expect(summarizeBoundarySuggestionFeedback([revised, rejected, accepted])).toMatchObject({
      totalCount: 3,
      acceptedCount: 1,
      rejectedCount: 1,
      revisionCount: 1,
      revisionRateLabel: "67%",
      recentReasons: ["需要改成故障恢复场景", "已经有更准确的缓存边界"]
    });
  });
});

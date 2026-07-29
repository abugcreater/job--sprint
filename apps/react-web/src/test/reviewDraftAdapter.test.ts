import { cloneReviewDraft, isReviewDraftDirty } from "../data/reviewDraftAdapter";
import { createReviewDraft, type ReviewFormDraft } from "../data/reviewAdapter";

describe("reviewDraftAdapter", () => {
  it("compares every editable review field without sharing the baseline", () => {
    const baseline = createReviewDraft();
    const changes: Partial<ReviewFormDraft>[] = [
      { projectPoint: "项目结果" },
      { interviewQuestions: "面试题" },
      { javaPoint: "知识点" },
      { pathIssues: "路径问题" },
      { fragileAnswers: "薄弱回答" },
      { tomorrowPriority: "明日优先" }
    ];

    expect(isReviewDraftDirty(cloneReviewDraft(baseline), baseline)).toBe(false);
    for (const change of changes) {
      expect(isReviewDraftDirty({ ...baseline, ...change }, baseline)).toBe(true);
    }

    const draft = cloneReviewDraft(baseline);
    draft.pathIssues = "不共享基线";
    expect(baseline.pathIssues).toBe("");
  });
});

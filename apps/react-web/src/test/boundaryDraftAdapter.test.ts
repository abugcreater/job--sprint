import { createBoundaryDraft, type KnowledgeBoundaryDraft } from "../data/coachAdapter";
import { cloneBoundaryDraft, isBoundaryDraftDirty } from "../data/boundaryDraftAdapter";

describe("boundaryDraftAdapter", () => {
  it("compares every editable boundary field without sharing the baseline", () => {
    const baseline = createBoundaryDraft();
    const changes: Partial<KnowledgeBoundaryDraft>[] = [
      { id: "boundary-1" },
      { topic: "可靠消息" },
      { level: "可讲" },
      { gap: "补齐故障恢复" },
      { evidence: "线上复盘" },
      { targetUse: "后端面试" },
      { sourceSummary: "JD 摘要" },
      { sourceConfidence: "high" },
      { confidence: "medium" },
      { sourceProvider: "local-fallback" },
      { sourcePromptVersion: "boundary-v1" },
      { sourceInputHash: "input-hash" }
    ];

    expect(isBoundaryDraftDirty(cloneBoundaryDraft(baseline), baseline)).toBe(false);
    for (const change of changes) {
      expect(isBoundaryDraftDirty({ ...baseline, ...change }, baseline)).toBe(true);
    }

    const draft = cloneBoundaryDraft(baseline);
    draft.gap = "不共享基线";
    expect(baseline.gap).toBe("");
  });
});

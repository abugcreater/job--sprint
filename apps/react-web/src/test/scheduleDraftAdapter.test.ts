import { createScheduleDraft, type CoachScheduleDraft } from "../data/coachAdapter";
import { cloneScheduleDraft, isScheduleDraftDirty } from "../data/scheduleDraftAdapter";

describe("scheduleDraftAdapter", () => {
  it("compares every editable schedule field without sharing the baseline", () => {
    const baseline = createScheduleDraft("2026-07-30");
    const changes: Partial<CoachScheduleDraft>[] = [
      { id: "event-1" },
      { title: "补充项目证据" },
      { date: "2026-07-31" },
      { start: "09:00" },
      { end: "10:00" },
      { kind: "interview" },
      { reason: "准备真实面试材料" },
      { evidenceRequired: false }
    ];

    expect(isScheduleDraftDirty(cloneScheduleDraft(baseline), baseline)).toBe(false);
    for (const change of changes) {
      expect(isScheduleDraftDirty({ ...baseline, ...change }, baseline)).toBe(true);
    }

    const draft = cloneScheduleDraft(baseline);
    draft.reason = "不共享基线";
    expect(baseline.reason).toBe("");
  });
});

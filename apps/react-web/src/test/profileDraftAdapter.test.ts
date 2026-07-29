import { cloneProfileDraft, createProfileDraft, isProfileDraftDirty, type ProfileDraft } from "../data/profileDraftAdapter";

describe("profileDraftAdapter", () => {
  it("compares cloned drafts across every editable field without sharing state", () => {
    const baseline = createProfileDraft();
    const changes: Partial<ProfileDraft>[] = [
      { id: "profile-1" },
      { name: "新画像" },
      { roleFamily: "frontend" },
      { targetRole: "前端工程师" },
      { targetLevel: "高级" },
      { cities: "杭州" },
      { salaryTarget: "30K" },
      { companyTypes: "产品公司" },
      { experienceSummary: "6 年前端经验" },
      { projectEvidence: "性能治理" },
      { nonClaims: "不包装带团队经历" },
      { dailyMinutes: "90" }
    ];

    expect(isProfileDraftDirty(cloneProfileDraft(baseline), baseline)).toBe(false);
    for (const change of changes) {
      expect(isProfileDraftDirty({ ...baseline, ...change }, baseline)).toBe(true);
    }

    const draft = cloneProfileDraft(baseline);
    draft.nonClaims = "不包装不存在的带团队经历";
    expect(baseline.nonClaims).toBe("");
  });
});

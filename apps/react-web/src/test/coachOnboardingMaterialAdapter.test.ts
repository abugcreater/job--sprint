import { appendOnboardingMaterialBlock, onboardingMaterialBlocks, splitOnboardingMaterial, summarizeOnboardingMaterial } from "../data/coachOnboardingMaterialAdapter";

describe("coachOnboardingMaterialAdapter", () => {
  it("splits pasted onboarding materials into typed sections", () => {
    const text = [
      "JD：要求接口自动化、稳定性和质量指标。",
      "简历：测试平台项目，有质量报表和接口用例。",
      "面试反馈：被追问 Mock 和缺陷归因。"
    ].join("\n---\n");
    const sections = splitOnboardingMaterial(text);

    expect(sections.map((section) => section.kind)).toEqual(["jd", "resume", "interview"]);
    expect(summarizeOnboardingMaterial(text).statusLabel).toBe("已识别 3 段素材：JD、简历、面试反馈");
  });

  it("appends reusable material blocks without overwriting existing pasted content", () => {
    const result = appendOnboardingMaterialBlock("已有素材：Redis 和 MQ。", onboardingMaterialBlocks[0]);

    expect(result).toContain("已有素材：Redis 和 MQ。");
    expect(result).toContain("JD：粘贴目标岗位职责");
    expect(result).toContain("---");
  });
});

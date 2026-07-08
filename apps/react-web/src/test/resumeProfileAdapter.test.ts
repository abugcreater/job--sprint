import { describe, expect, it } from "vitest";
import { buildResumeProfilePreview } from "../data/resumeProfileAdapter";

describe("resumeProfileAdapter", () => {
  it("builds a confirmed profile preview from a normal QA resume", () => {
    const preview = buildResumeProfilePreview(`
求职意向：测试开发工程师
目标城市：杭州、上海
期望薪资：28-35K
6 年测试平台和接口自动化经验，熟悉 Java、Python、Spring Boot、pytest、Jenkins、MySQL、Redis。
项目经历：质量平台，负责接口自动化分层、CI 接入、稳定性报表和缺陷归因。
项目经历：交易链路压测，负责用例治理、Mock 服务、失败重试和发布质量看板。
不可包装：不包装算法训练经验，不包装未实际主导的线上架构改造。
`);

    expect(preview.draft.targetRole).toBe("测试开发工程师");
    expect(preview.draft.roleFamily).toBe("qa");
    expect(preview.draft.cities).toBe("杭州、上海");
    expect(preview.draft.salaryTarget).toBe("28-35K");
    expect(preview.draft.experienceSummary).toContain("6 年测试平台");
    expect(preview.draft.projectEvidence).toContain("质量平台");
    expect(preview.highlights.join(" ")).toContain("识别");
    expect(preview.boundarySuggestions.length).toBeGreaterThan(0);
    expect(preview.warnings).not.toContain("未识别到明确目标岗位，请手动补充。");
  });
});

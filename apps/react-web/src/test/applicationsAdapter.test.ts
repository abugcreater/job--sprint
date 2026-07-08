import {
  applicationRecordToDraft,
  buildApplicationEvidenceContent,
  buildApplicationsDashboard,
  buildApplicationsExportPayload,
  createApplicationDraft,
  filterApplicationRecords
} from "../data/applicationsAdapter";
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaTaskIds } from "./fixtures/coachFlow";

describe("applicationsAdapter", () => {
  it("builds opportunity dashboard from generated opportunity tasks", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.id).toBe(qaTaskIds.opportunity);
    expect(dashboard.deliveryTasks.map((task) => task.id)).toEqual([qaTaskIds.opportunity]);
    expect(dashboard.targetTaskTitle).toBe("记录测试开发岗位机会反馈");
    expect(JSON.stringify(dashboard)).not.toContain("2026-07-02-1400-java");
  });

  it("counts local delivery evidence and derives the status summary", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.opportunity]: [
        {
          id: "delivery-1",
          taskId: qaTaskIds.opportunity,
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：公司：Example；岗位：测试开发；状态：已沟通",
          createdAt: "2026-07-02T16:20:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);

    expect(dashboard.recordCount).toBe(1);
    expect(dashboard.deliveryTasks[0]?.recordCount).toBe(1);
    expect(dashboard.statusSummary.find((item) => item.status === "已沟通")?.count).toBe(1);
    expect(dashboard.recentRecords[0]).toMatchObject({
      company: "Example",
      role: "测试开发",
      status: "已沟通"
    });
  });

  it("serializes application feedback into a generated delivery evidence record", () => {
    const sprint = buildQaSprint();
    const task = sprint.tasks.find((item) => item.id === qaTaskIds.opportunity);
    const draft = {
      ...createApplicationDraft(),
      company: "Example Cloud",
      role: "测试开发工程师",
      source: "Boss 直聘",
      salaryRange: "20-30K",
      city: "杭州",
      keywords: "自动化 质量平台",
      resumeVersion: "qa-v1",
      status: "约面" as const,
      tags: ["工程质量"],
      hrFeedback: "沟通反馈：HR 约下周一一面",
      notes: "反馈摘要：准备 Mock 服务边界案例"
    };

    expect(task).toBeDefined();
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("公司：Example Cloud");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("岗位：测试开发工程师");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("状态：约面");
    expect(buildApplicationEvidenceContent(task!, draft)).not.toContain("沟通反馈：沟通反馈：");
  });

  it("filters, edits and exports local application records from generated evidence", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.opportunity]: [
        {
          id: "delivery-1",
          taskId: qaTaskIds.opportunity,
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：围绕「任务」补一条机会反馈。公司：Alpha；岗位：测试开发；来源：官网；薪资范围：20-30K；城市：杭州；状态：已投递；JD 关键词：自动化；命中点：工程质量；简历版本：qa-v1；沟通反馈：等待筛选；反馈摘要：待跟进",
          createdAt: "2026-07-02T16:20:00+08:00",
          verified: true
        },
        {
          id: "delivery-2",
          taskId: qaTaskIds.opportunity,
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：围绕「任务」补一条机会反馈。公司：Beta；岗位：质量平台；来源：内推；薪资范围：25-35K；状态：约面；命中点：项目经验、工程质量；沟通反馈：约周三技术面；反馈摘要：准备一面",
          createdAt: "2026-07-02T16:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);
    const interviewRecords = filterApplicationRecords(dashboard.recentRecords, "约面");
    const exportPayload = buildApplicationsExportPayload(interviewRecords, sprint.date, "2026-07-02T16:40:00+08:00");

    expect(interviewRecords).toHaveLength(1);
    expect(applicationRecordToDraft(interviewRecords[0])).toMatchObject({
      company: "Beta",
      role: "质量平台",
      source: "内推",
      salaryRange: "25-35K",
      status: "约面",
      tags: ["项目经验", "工程质量"],
      hrFeedback: "约周三技术面"
    });
    expect(exportPayload).toMatchObject({
      version: "react-applications-export-v1",
      count: 1,
      date: "2026-07-02"
    });
    expect(JSON.stringify(exportPayload)).not.toContain("/Users/");
  });
});

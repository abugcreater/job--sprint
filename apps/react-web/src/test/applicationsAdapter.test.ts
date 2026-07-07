import {
  applicationRecordToDraft,
  buildApplicationEvidenceContent,
  buildApplicationsDashboard,
  buildApplicationsExportPayload,
  createApplicationDraft,
  filterApplicationRecords
} from "../data/applicationsAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { ReviewEvidence } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

describe("applicationsAdapter", () => {
  it("builds the applications dashboard from opportunity-like tasks without hijacking the current learning task", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.id).toBe("2026-07-02-2130-delivery");
    expect(dashboard.todaySignals).toContain("一条证据/简历/机会更新");
    expect(dashboard.deliveryTasks[0]?.isCurrent).toBe(false);
    expect(dashboard.deliveryTasks.map((task) => task.id)).not.toContain("2026-07-02-1400-java");
  });

  it("counts local delivery evidence and derives the status summary", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-2130-delivery": [
        {
          id: "delivery-1",
          taskId: "2026-07-02-2130-delivery",
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：公司：Example；岗位：Java；状态：已沟通",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);

    expect(dashboard.recordCount).toBe(1);
    expect(dashboard.deliveryTasks[0]?.recordCount).toBe(1);
    expect(dashboard.statusSummary.find((item) => item.status === "已沟通")?.count).toBe(1);
    expect(dashboard.recentRecords[0]).toMatchObject({
      company: "Example",
      role: "Java",
      status: "已沟通"
    });
  });

  it("serializes application feedback into a delivery evidence record", () => {
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const task = sprint.tasks.find((item) => item.id === sprint.currentTaskId);
    const draft = {
      ...createApplicationDraft(),
      company: "Example Cloud",
      role: "Senior Java Backend",
      source: "Boss 直聘",
      salaryRange: "25-35K · 14薪",
      city: "Hangzhou",
      keywords: "Java MQ Redis",
      resumeVersion: "backend-v6",
      status: "约面" as const,
      tags: ["Java", "MQ"],
      hrFeedback: "沟通反馈：HR 约下周一一面",
      notes: "反馈摘要：HR 要求补充高并发项目证据"
    };

    expect(task).toBeDefined();
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("公司：Example Cloud");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("来源：Boss 直聘");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("薪资范围：25-35K · 14薪");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("状态：约面");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("沟通反馈：HR 约下周一一面");
    expect(buildApplicationEvidenceContent(task!, draft)).not.toContain("沟通反馈：沟通反馈：");
    expect(buildApplicationEvidenceContent(task!, draft)).toContain("反馈摘要：HR 要求补充高并发项目证据");
    expect(buildApplicationEvidenceContent(task!, draft)).not.toContain("反馈摘要：反馈摘要：");
  });

  it("filters, edits and exports local application records from evidence content", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-2130-delivery": [
        {
          id: "delivery-1",
          taskId: "2026-07-02-2130-delivery",
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：围绕「任务」补一条机会反馈。公司：Alpha；岗位：Java 后端；来源：官网；薪资范围：20-30K；城市：杭州；状态：已投递；JD 关键词：MQ；命中点：Java、MQ；简历版本：backend-v6；沟通反馈：等待筛选；反馈摘要：待跟进",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        },
        {
          id: "delivery-2",
          taskId: "2026-07-02-2130-delivery",
          type: "delivery_record",
          title: "机会反馈证据",
          content: "React 机会页本地记录：围绕「任务」补一条机会反馈。公司：Beta；岗位：平台后端；来源：内推；薪资范围：30-40K；状态：约面；命中点：Java、稳定性治理；沟通反馈：约周三技术面；反馈摘要：准备一面",
          createdAt: "2026-07-02T14:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildApplicationsDashboard(sprint, evidenceByTaskId);
    const interviewRecords = filterApplicationRecords(dashboard.recentRecords, "约面");
    const exportPayload = buildApplicationsExportPayload(interviewRecords, sprint.date, "2026-07-02T16:30:00+08:00");

    expect(interviewRecords).toHaveLength(1);
    expect(applicationRecordToDraft(interviewRecords[0])).toMatchObject({
      company: "Beta",
      role: "平台后端",
      source: "内推",
      salaryRange: "30-40K",
      status: "约面",
      tags: ["Java", "稳定性治理"],
      hrFeedback: "约周三技术面"
    });
    expect(exportPayload).toMatchObject({
      version: "react-applications-export-v1",
      count: 1,
      date: "2026-07-02"
    });
    expect(exportPayload.records[0]).toMatchObject({
      source: "内推",
      salaryRange: "30-40K",
      hrFeedback: "约周三技术面"
    });
    expect(JSON.stringify(exportPayload)).not.toContain("/Users/");
  });
});

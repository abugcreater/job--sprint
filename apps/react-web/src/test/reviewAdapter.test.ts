import {
  buildReviewAiAnalysis,
  buildReviewDashboard,
  buildReviewEvidenceContent,
  buildReviewExportPayload,
  createReviewDraft,
  filterReviewRecords,
  reviewRecordToDraft
} from "../data/reviewAdapter";
import { buildWeeklyReviewAnalysis } from "../data/weeklyReviewAdapter";
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaTaskIds } from "./fixtures/coachFlow";

describe("reviewAdapter", () => {
  it("builds the review dashboard from generated sprint tasks", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.id).toBe(qaTaskIds.interview);
    expect(dashboard.reviewTasks.map((task) => task.id)).toContain(qaTaskIds.review);
    expect(dashboard.reviewTasks[0]?.isCurrent).toBe(true);
    expect(dashboard.tomorrowAdvice.length).toBeGreaterThan(0);
    expect(JSON.stringify(dashboard)).not.toContain("Spring 事务");
  });

  it("collects local review evidence and completion stats", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [
        {
          id: "review-1",
          taskId: qaTaskIds.interview,
          type: "review",
          title: "复盘证据",
          content: "复盘记录：项目点：Mock 服务边界；明日优先：补缺陷归因案例",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.reviewRecords).toHaveLength(1);
    expect(dashboard.evidenceRecords[0]?.title).toBe("复盘证据");
    expect(dashboard.completion.total).toBe(4);
  });

  it("serializes review answers into a generated review evidence record", () => {
    const sprint = buildQaSprint();
    const task = sprint.tasks.find((item) => item.id === qaTaskIds.interview);
    const draft = {
      ...createReviewDraft(),
      projectPoint: "Mock 服务边界证据",
      interviewQuestions: "如何说明 Mock 不替代真实联调",
      javaPoint: "技术知识点：接口契约和失败恢复",
      tomorrowPriority: "补缺陷归因案例"
    };

    expect(task).toBeDefined();
    expect(buildReviewEvidenceContent(sprint, task!, draft)).toContain("项目点：Mock 服务边界证据");
    expect(buildReviewEvidenceContent(sprint, task!, draft)).toContain("技术知识点：接口契约和失败恢复");
    expect(buildReviewEvidenceContent(sprint, task!, draft)).toContain("明日优先：补缺陷归因案例");
  });

  it("filters, edits and exports local review records from generated content", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [
        {
          id: "review-keep",
          taskId: qaTaskIds.interview,
          type: "review",
          title: "复盘证据",
          content:
            "复盘记录：当前任务：练 Mock 服务边界 60 秒回答；完成进度：1/4；项目点：Mock 边界复盘；路径问题：缺少真实联调边界；明日优先：补缺陷归因案例",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        },
        {
          id: "review-fragile",
          taskId: qaTaskIds.interview,
          type: "review",
          title: "复盘证据",
          content: "复盘记录：当前任务：练 Mock 服务边界 60 秒回答；完成进度：1/4；易被追问：Mock 和真实联调边界容易混",
          createdAt: "2026-07-02T14:10:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(filterReviewRecords(dashboard.reviewRecords, "has_path_issue").map((record) => record.id)).toEqual(["review-keep"]);
    expect(filterReviewRecords(dashboard.reviewRecords, "has_fragile_answer").map((record) => record.id)).toEqual(["review-fragile"]);
    expect(reviewRecordToDraft(dashboard.reviewRecords[0]!).pathIssues).toBe("缺少真实联调边界");

    const payload = buildReviewExportPayload(dashboard.reviewRecords, sprint.date, "2026-07-02T16:40:00+08:00");
    expect(payload).toMatchObject({
      version: "react-review-export-v1",
      source: "job-sprint-react",
      date: "2026-07-02",
      count: 2
    });
    expect(payload.records[0]).toMatchObject({
      id: "review-keep",
      projectPoint: "Mock 边界复盘",
      pathIssues: "缺少真实联调边界",
      tomorrowPriority: "补缺陷归因案例"
    });
    expect(JSON.stringify(payload)).not.toContain("/Users/");
  });

  it("generates a local AI review analysis from evidence, weak answers and AI feedback", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [
        {
          id: "review-ai",
          taskId: qaTaskIds.interview,
          type: "review",
          title: "复盘证据",
          content:
            "复盘记录：当前任务：练 Mock 服务边界 60 秒回答；完成进度：1/4；路径问题：缺少真实联调边界；易被追问：Mock 和真实联调边界容易混；明日优先：补缺陷归因案例",
          createdAt: "2026-07-02T14:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);
    const analysis = buildReviewAiAnalysis(dashboard, {
      reviewedCount: 2,
      acceptedCount: 1,
      rejectedCount: 1,
      acceptanceRate: 50,
      acceptanceRateLabel: "50%",
      acceptedOutcomeCount: 1,
      completedAcceptedOutcomeCount: 0,
      acceptedOutcomeRate: 0,
      acceptedOutcomeRateLabel: "0%",
      outcomeLabel: "采纳未执行",
      qualityLabel: "需要校准",
      topRejectedTypes: [],
      recentRejectionReasons: [],
      nextPromptHint: "已采纳日程完成率偏低"
    });

    expect(analysis.readiness).toBe("ready");
    expect(analysis.facts.join(" ")).toContain("AI 建议反馈 2 条");
    expect(analysis.gaps.join(" ")).toContain("Mock 和真实联调边界容易混");
    expect(analysis.recommendations.join(" ")).toContain("60 秒回答");
    expect(analysis.recommendations.join(" ")).toContain("30 分钟内可完成");
  });

  it("builds a weekly local attribution from generated evidence and completion", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [
        {
          id: "review-weekly",
          taskId: qaTaskIds.interview,
          type: "review",
          title: "复盘证据",
          content:
            "复盘记录：路径问题：缺少真实联调边界；易被追问：Mock 和真实联调边界容易混；明日优先：补缺陷归因案例",
          createdAt: "2026-07-02T14:30:00+08:00",
          verified: true
        },
        {
          id: "oral-weekly",
          taskId: qaTaskIds.interview,
          type: "oral_score",
          title: "口述训练证据",
          content: "回答摘要：已练习 Mock 服务边界。",
          createdAt: "2026-07-01T20:30:00+08:00",
          verified: true
        },
        {
          id: "application-weekly",
          taskId: qaTaskIds.opportunity,
          type: "delivery_record",
          title: "机会反馈证据",
          content: "公司：样例公司；岗位：测试开发；状态：已沟通",
          createdAt: "2026-07-01T21:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({
      completed: { [qaTaskIds.interview]: true },
      evidenceByTaskId
    });
    const analysis = buildWeeklyReviewAnalysis({
      sprint,
      evidenceByTaskId,
      completed: { [qaTaskIds.interview]: true },
      delayRecords: [
        {
          id: "delay-weekly",
          taskId: qaTaskIds.interview,
          date: "2026-07-02",
          minutes: 15,
          reason: "面试打断",
          recoveryAction: "晚间补证据",
          createdAt: "2026-07-02T18:00:00+08:00"
        }
      ]
    });

    expect(analysis.dateRangeLabel).toBe("2026-06-26 至 2026-07-02");
    expect(analysis.summary).toContain("本周记录");
    expect(analysis.metrics).toContainEqual({ label: "证据", value: "3 条" });
    expect(analysis.signals.join(" ")).toContain("机会反馈 1 条");
    expect(analysis.risks.join(" ")).toContain("延期记录");
    expect(analysis.nextWeekFocus.join(" ")).toContain("60 秒可复述答案");
  });
});

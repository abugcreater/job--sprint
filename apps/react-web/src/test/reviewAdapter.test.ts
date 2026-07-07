import {
  buildReviewDashboard,
  buildReviewAiAnalysis,
  buildReviewEvidenceContent,
  buildReviewExportPayload,
  createReviewDraft,
  filterReviewRecords,
  reviewRecordToDraft
} from "../data/reviewAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import { buildWeeklyReviewAnalysis } from "../data/weeklyReviewAdapter";
import type { ReviewEvidence } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

describe("reviewAdapter", () => {
  it("builds the review dashboard from today's sprint and targets the current Evidence Gate task", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.id).toBe("2026-07-02-1400-java");
    expect(dashboard.reviewTasks[0]?.isCurrent).toBe(true);
    expect(dashboard.reviewTasks.map((task) => task.title)).toContain("当日复盘");
    expect(dashboard.tomorrowAdvice.length).toBeGreaterThan(0);
  });

  it("collects local review evidence and completion stats", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [
        {
          id: "review-1",
          taskId: "2026-07-02-1400-java",
          type: "review",
          title: "复盘证据",
          content: "React 复盘页本地记录：项目点：JVM 抖动排查",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.reviewRecords).toHaveLength(1);
    expect(dashboard.evidenceRecords[0]?.title).toBe("复盘证据");
    expect(dashboard.completion.total).toBeGreaterThan(0);
  });

  it("serializes six-question review answers into a review evidence record", () => {
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId: {}, syncState: "local_fallback" });
    const task = sprint.tasks.find((item) => item.id === sprint.currentTaskId);
    const draft = {
      ...createReviewDraft(),
      projectPoint: "G1/ZGC 抖动排查证据",
      interviewQuestions: "G1 和 ZGC 的底层差异；P99 抖动怎么排",
      javaPoint: "JFR 与 GC log 联动",
      tomorrowPriority: "补线程池和外部依赖边界"
    };

    expect(task).toBeDefined();
    expect(buildReviewEvidenceContent(sprint, task!, draft)).toContain("项目点：G1/ZGC 抖动排查证据");
    expect(buildReviewEvidenceContent(sprint, task!, draft)).toContain("明日优先：补线程池和外部依赖边界");
  });

  it("filters, edits and exports local review records from evidence content", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [
        {
          id: "review-keep",
          taskId: "2026-07-02-1400-java",
          type: "review",
          title: "复盘证据",
          content:
            "React 复盘页本地记录：当前任务：Spring 事务与搜索链路边界；完成进度：2/7；项目点：事务边界复盘；路径问题：搜索链路边界还不稳；明日优先：补 MQ 到 Redis 链路",
          createdAt: "2026-07-02T14:20:00+08:00",
          verified: true
        },
        {
          id: "review-fragile",
          taskId: "2026-07-02-1400-java",
          type: "review",
          title: "复盘证据",
          content: "React 复盘页本地记录：当前任务：Spring 事务与搜索链路边界；完成进度：2/7；易被追问：事务传播和索引边界容易混",
          createdAt: "2026-07-02T14:10:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildReviewDashboard(sprint, evidenceByTaskId);

    expect(filterReviewRecords(dashboard.reviewRecords, "has_path_issue").map((record) => record.id)).toEqual(["review-keep"]);
    expect(filterReviewRecords(dashboard.reviewRecords, "has_fragile_answer").map((record) => record.id)).toEqual(["review-fragile"]);
    expect(reviewRecordToDraft(dashboard.reviewRecords[0]!).pathIssues).toBe("搜索链路边界还不稳");

    const payload = buildReviewExportPayload(dashboard.reviewRecords, sprint.date, "2026-07-02T16:40:00+08:00");
    expect(payload).toMatchObject({
      version: "react-review-export-v1",
      source: "job-sprint-react",
      date: "2026-07-02",
      count: 2
    });
    expect(payload.records[0]).toMatchObject({
      id: "review-keep",
      projectPoint: "事务边界复盘",
      pathIssues: "搜索链路边界还不稳",
      tomorrowPriority: "补 MQ 到 Redis 链路"
    });
    expect(JSON.stringify(payload)).not.toContain("/Users/");
  });

  it("generates a local AI review analysis from evidence, weak answers and AI feedback", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [
        {
          id: "review-ai",
          taskId: "2026-07-02-1400-java",
          type: "review",
          title: "复盘证据",
          content:
            "React 复盘页本地记录：当前任务：Spring 事务与搜索链路边界；完成进度：1/7；路径问题：搜索链路边界还不稳；易被追问：事务传播和索引边界容易混；明日优先：补 MQ 到 Redis 链路",
          createdAt: "2026-07-02T14:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
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
    expect(analysis.gaps.join(" ")).toContain("事务传播和索引边界容易混");
    expect(analysis.recommendations.join(" ")).toContain("60 秒回答");
    expect(analysis.recommendations.join(" ")).toContain("30 分钟内可完成");
  });

  it("builds a weekly local attribution from evidence, AI feedback and completion", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [
        {
          id: "review-weekly",
          taskId: "2026-07-02-1400-java",
          type: "review",
          title: "复盘证据",
          content:
            "React 复盘页本地记录：路径问题：搜索链路边界还不稳；易被追问：事务传播和索引边界容易混；明日优先：补 MQ 到 Redis 链路",
          createdAt: "2026-07-02T14:30:00+08:00",
          verified: true
        },
        {
          id: "oral-weekly",
          taskId: "2026-07-02-1400-java",
          type: "oral_score",
          title: "口述训练证据",
          content: "回答摘要：已练习事务边界。",
          createdAt: "2026-07-01T20:30:00+08:00",
          verified: true
        },
        {
          id: "application-weekly",
          taskId: "2026-07-02-1400-java",
          type: "delivery_record",
          title: "机会反馈证据",
          content: "公司：样例公司；岗位：后端；状态：已沟通",
          createdAt: "2026-07-01T21:30:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, {
      completed: { "2026-07-02-1400-java": true },
      evidenceByTaskId,
      syncState: "local_fallback"
    });
    const analysis = buildWeeklyReviewAnalysis({
      sprint,
      evidenceByTaskId,
      completed: { "2026-07-02-1400-java": true },
      delayRecords: [
        {
          id: "delay-weekly",
          taskId: "2026-07-02-1400-java",
          date: "2026-07-02",
          minutes: 15,
          reason: "面试打断",
          recoveryAction: "晚间补证据",
          createdAt: "2026-07-02T18:00:00+08:00"
        }
      ],
      aiFeedback: {
        reviewedCount: 1,
        acceptedCount: 1,
        rejectedCount: 0,
        acceptanceRate: 100,
        acceptanceRateLabel: "100%",
        acceptedOutcomeCount: 1,
        completedAcceptedOutcomeCount: 0,
        acceptedOutcomeRate: 0,
        acceptedOutcomeRateLabel: "0%",
        outcomeLabel: "采纳未执行",
        qualityLabel: "需要校准",
        topRejectedTypes: [],
        recentRejectionReasons: [],
        nextPromptHint: "收窄任务"
      }
    });

    expect(analysis.dateRangeLabel).toBe("2026-06-26 至 2026-07-02");
    expect(analysis.summary).toContain("本周闭环");
    expect(analysis.metrics).toContainEqual({ label: "证据", value: "3 条" });
    expect(analysis.signals.join(" ")).toContain("机会反馈 1 条");
    expect(analysis.risks.join(" ")).toContain("延期记录");
    expect(analysis.nextWeekFocus.join(" ")).toContain("60 秒可复述答案");
    expect(analysis.nextWeekFocus.join(" ")).toContain("30 分钟修复任务");
  });
});

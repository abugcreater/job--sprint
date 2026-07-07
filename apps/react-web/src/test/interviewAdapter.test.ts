import {
  INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY,
  buildInterviewDashboard,
  filterInterviewQuestions,
  interviewQuestionCategories,
  readInterviewWeakQuestionMarks,
  scoreOralAnswer,
  toggleInterviewWeakQuestion,
  writeInterviewWeakQuestionMarks
} from "../data/interviewAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { ReviewEvidence } from "../types/sprint";

const fixedNow = new Date("2026-07-02T14:05:00+08:00");

describe("interviewAdapter", () => {
  it("builds interview dashboard from schedule questions and sanitized question bank", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.title).toBe("JVM G1/ZGC 与线上抖动排查");
    expect(dashboard.oralTasks.map((task) => task.title)).toContain("压力小面：Spring/JVM/MQ 三连");
    expect(dashboard.candidateQuestions.map((question) => question.question)).toContain("G1 和 ZGC 的底层差异是什么？");
    expect(JSON.stringify(dashboard.candidateQuestions)).not.toContain("/Users/");
  });

  it("counts oral evidence records for today tasks", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-1400-java": [
        {
          id: "oral-1",
          taskId: "2026-07-02-1400-java",
          type: "oral_score",
          title: "口述训练证据",
          content: "已完成本地口述",
          createdAt: "2026-07-02T14:10:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.recordCount).toBe(1);
    expect(dashboard.oralTasks.find((task) => task.id === "2026-07-02-1400-java")?.evidenceCount).toBe(1);
  });

  it("scores oral answers with local rubric fallback", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);
    const question = dashboard.candidateQuestions[0];

    const analysis = scoreOralAnswer(
      dashboard.targetTask!,
      question,
      "先说结论，G1 和 ZGC 的边界不同。我的项目里会按 JFR、jcmd、GC log、P99 指标和线程池链路排查，再看异常分支、降级和复盘验证。"
    );

    expect(analysis.provider).toBe("local_rubric");
    expect(analysis.score).toBeGreaterThanOrEqual(65);
    expect(analysis.summary).toContain("本地规则评分");
    expect(analysis.nextQuestions).toHaveLength(3);
  });

  it("filters candidate questions by search, category and weak marks", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);

    expect(interviewQuestionCategories(dashboard.candidateQuestions).map((item) => item.label)).toContain("Java");

    const rabbitQuestions = filterInterviewQuestions(dashboard.candidateQuestions, { query: "RabbitMQ" });
    expect(rabbitQuestions).toHaveLength(1);
    expect(rabbitQuestions[0].id).toBe("java-core-003");

    const weakQuestionIds = toggleInterviewWeakQuestion(new Set<string>(), "java-core-003");
    const weakQuestions = filterInterviewQuestions(dashboard.candidateQuestions, {
      category: "java-core",
      weakOnly: true,
      weakQuestionIds
    });

    expect(weakQuestions.map((question) => question.id)).toEqual(["java-core-003"]);
  });

  it("persists React weak-question marks without touching legacy mistake storage", () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      }
    };

    writeInterviewWeakQuestionMarks(new Set(["java-core-003", "java-core-001"]), storage);

    expect(readInterviewWeakQuestionMarks(storage)).toEqual(new Set(["java-core-001", "java-core-003"]));
    expect(items.get(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY)).toBe(JSON.stringify(["java-core-001", "java-core-003"]));
    expect(items.has("jobSprint.interviewMistakes.v1")).toBe(false);
  });
});

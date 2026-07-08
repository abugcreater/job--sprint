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
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaTaskIds } from "./fixtures/coachFlow";

describe("interviewAdapter", () => {
  it("builds questions from the current generated interview task", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.targetTask?.id).toBe(qaTaskIds.interview);
    expect(dashboard.targetTask?.title).toBe("练 Mock 服务边界 60 秒回答");
    expect(dashboard.candidateQuestions.map((question) => question.question)).toEqual(["练 Mock 服务边界 60 秒回答"]);
    expect(interviewQuestionCategories(dashboard.candidateQuestions).map((item) => item.label)).toEqual(["当前任务"]);
    expect(JSON.stringify(dashboard)).not.toContain("G1/ZGC");
    expect(JSON.stringify(dashboard)).not.toContain("Spring 事务");
  });

  it("counts oral evidence records for generated tasks", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.interview]: [
        {
          id: "oral-1",
          taskId: qaTaskIds.interview,
          type: "oral_score",
          title: "口述训练证据",
          content: "已完成 Mock 服务边界口述。",
          createdAt: "2026-07-02T14:10:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ evidenceByTaskId });
    const dashboard = buildInterviewDashboard(sprint, evidenceByTaskId);

    expect(dashboard.recordCount).toBe(1);
    expect(dashboard.oralTasks.find((task) => task.id === qaTaskIds.interview)?.evidenceCount).toBe(1);
  });

  it("scores oral answers with the local rubric", () => {
    const dashboard = buildInterviewDashboard(buildQaSprint(), {});
    const question = dashboard.candidateQuestions[0];

    const analysis = scoreOralAnswer(
      dashboard.targetTask!,
      question,
      "先说结论，Mock 服务边界是只模拟外部依赖响应，不替代真实联调。我的证据包括接口用例、缺陷记录、失败恢复、验证指标和复盘下一步。"
    );

    expect(analysis.provider).toBe("local_rubric");
    expect(analysis.score).toBeGreaterThanOrEqual(65);
    expect(analysis.summary).toContain("本地规则评分");
    expect(analysis.nextQuestions).toHaveLength(3);
  });

  it("filters generated candidate questions by search and weak marks", () => {
    const dashboard = buildInterviewDashboard(buildQaSprint(), {});
    const targetId = `${qaTaskIds.interview}-question-1`;

    expect(filterInterviewQuestions(dashboard.candidateQuestions, { query: "Mock" }).map((question) => question.id)).toEqual([targetId]);

    const weakQuestionIds = toggleInterviewWeakQuestion(new Set<string>(), targetId);
    const weakQuestions = filterInterviewQuestions(dashboard.candidateQuestions, {
      category: "current-task",
      weakOnly: true,
      weakQuestionIds
    });

    expect(weakQuestions.map((question) => question.id)).toEqual([targetId]);
  });

  it("persists React weak-question marks without touching legacy mistake storage", () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, value);
      }
    };
    const targetId = `${qaTaskIds.interview}-question-1`;

    writeInterviewWeakQuestionMarks(new Set([targetId]), storage);

    expect(readInterviewWeakQuestionMarks(storage)).toEqual(new Set([targetId]));
    expect(items.get(INTERVIEW_WEAK_QUESTION_MARKS_STORAGE_KEY)).toBe(JSON.stringify([targetId]));
    expect(items.has("jobSprint.interviewMistakes.v1")).toBe(false);
  });
});

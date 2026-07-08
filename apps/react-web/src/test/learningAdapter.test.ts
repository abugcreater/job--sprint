import {
  LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY,
  buildLearningDashboard,
  filterLearningKnowledgeCards,
  readLearningKnowledgeMarks,
  toggleLearningKnowledgeMark,
  writeLearningKnowledgeMarks
} from "../data/learningAdapter";
import type { ReviewEvidence } from "../types/sprint";
import { buildQaSprint, qaTaskIds } from "./fixtures/coachFlow";

describe("learningAdapter", () => {
  it("stays empty before a profile-generated learning task exists", () => {
    const dashboard = buildLearningDashboard(buildQaSprint({ now: new Date("2026-07-03T10:00:00+08:00") }), {});

    expect(dashboard.learningTasks).toEqual([]);
    expect(dashboard.knowledgeCards).toEqual([]);
  });

  it("builds learning cards from the active profile calendar only", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildQaSprint({ now: new Date("2026-07-02T10:00:00+08:00"), evidenceByTaskId });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);

    expect(dashboard.learningTasks.map((task) => task.title)).toContain("补 缺陷归因 面试表达");
    expect(dashboard.knowledgeCards.map((card) => card.title)).toEqual(["补 缺陷归因 面试表达"]);
    expect(dashboard.knowledgeCards[0]).toMatchObject({
      category: "知识任务",
      javaMapping: "由当前用户画像、知识边界或 AI 建议生成"
    });
    expect(JSON.stringify(dashboard)).not.toContain("Spring 事务");
    expect(JSON.stringify(dashboard)).not.toContain("/Users/");
  });

  it("counts local learning notes against generated task ids", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      [qaTaskIds.learning]: [
        {
          id: "note-1",
          taskId: qaTaskIds.learning,
          type: "learning_note",
          title: "学习笔记证据",
          content: "手动笔记：缺陷归因需要包含复现、影响面、定位过程和修复验证。",
          createdAt: "2026-07-02T10:05:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildQaSprint({ now: new Date("2026-07-02T10:00:00+08:00"), evidenceByTaskId });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);

    expect(dashboard.noteCount).toBe(1);
    expect(dashboard.learningTasks.find((task) => task.id === qaTaskIds.learning)?.statusLabel).toBe("已补 1 条学习笔记");
    expect(dashboard.recentNotes[0]?.preview).toContain("缺陷归因");
  });

  it("filters generated knowledge cards by query, category and local marked state", () => {
    const dashboard = buildLearningDashboard(buildQaSprint({ now: new Date("2026-07-02T10:00:00+08:00") }), {});
    const target = dashboard.knowledgeCards[0];

    expect(filterLearningKnowledgeCards(dashboard.knowledgeCards, { query: "缺陷归因" })).toEqual([target]);
    expect(dashboard.knowledgeCategories).toEqual(["知识任务"]);
    expect(filterLearningKnowledgeCards(dashboard.knowledgeCards, { category: "知识任务" })).toEqual([target]);
    expect(filterLearningKnowledgeCards(dashboard.knowledgeCards, { markedOnly: true, markedIds: new Set([target.id]) })).toEqual([target]);
  });

  it("persists local knowledge marks without touching the legacy favorite key", () => {
    window.localStorage.clear();
    const marked = toggleLearningKnowledgeMark(new Set<string>(), `${qaTaskIds.learning}-knowledge-1`);

    writeLearningKnowledgeMarks(marked, window.localStorage);

    expect(readLearningKnowledgeMarks(window.localStorage).has(`${qaTaskIds.learning}-knowledge-1`)).toBe(true);
    expect(window.localStorage.getItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY)).toBe(JSON.stringify([`${qaTaskIds.learning}-knowledge-1`]));
    expect(window.localStorage.getItem("jobSprint.kbFavorites.v1")).toBeNull();
  });
});

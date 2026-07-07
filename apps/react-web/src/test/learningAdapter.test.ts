import {
  LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY,
  buildLearningDashboard,
  filterLearningKnowledgeCards,
  readLearningKnowledgeMarks,
  toggleLearningKnowledgeMark,
  writeLearningKnowledgeMarks
} from "../data/learningAdapter";
import { buildTodaySprint, getScheduleData } from "../data/scheduleAdapter";
import type { ReviewEvidence } from "../types/sprint";

const fixedNow = new Date("2026-07-02T10:00:00+08:00");

describe("learningAdapter", () => {
  it("builds the learning dashboard from real schedule and sanitized knowledge data", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);

    expect(dashboard.learningTasks.map((task) => task.title)).toContain("Spring 事务与搜索链路边界");
    expect(dashboard.resources.map((resource) => resource.label)).toContain("SpringBoot 工程入口 XMind");
    expect(dashboard.knowledgeCards.map((card) => card.title)).toContain("Spring 事务、MySQL、Redis 高频追问");
    expect(JSON.stringify(dashboard.knowledgeCards)).not.toContain("/Users/");
  });

  it("counts local learning note evidence per task", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {
      "2026-07-02-0930-java": [
        {
          id: "note-1",
          taskId: "2026-07-02-0930-java",
          type: "learning_note",
          title: "学习笔记证据",
          content: "已补笔记",
          createdAt: "2026-07-02T10:05:00+08:00",
          verified: true
        }
      ]
    };
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);

    expect(dashboard.noteCount).toBe(1);
    expect(dashboard.learningTasks.find((task) => task.id === "2026-07-02-0930-java")?.statusLabel).toBe("已补 1 条学习笔记");
  });

  it("prioritizes the current task when the Evidence Gate points at a learning task", () => {
    const now = new Date("2026-07-02T14:05:00+08:00");
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), now, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);

    expect(dashboard.learningTasks[0]?.id).toBe(sprint.currentTaskId);
    expect(dashboard.learningTasks[0]?.isCurrent).toBe(true);
  });

  it("filters sanitized knowledge cards by query, category and local marked state", () => {
    const evidenceByTaskId: Record<string, ReviewEvidence[]> = {};
    const sprint = buildTodaySprint(getScheduleData(), fixedNow, { completed: {}, evidenceByTaskId, syncState: "local_fallback" });
    const dashboard = buildLearningDashboard(sprint, evidenceByTaskId);
    const springCards = filterLearningKnowledgeCards(dashboard.knowledgeCards, { query: "Spring" });
    const target = springCards.find((card) => card.title === "Spring 事务、MySQL、Redis 高频追问");

    expect(target).toBeDefined();
    expect(dashboard.knowledgeCategories).toContain("Spring / MySQL / Redis / MQ 经验");
    expect(filterLearningKnowledgeCards(dashboard.knowledgeCards, { category: "Spring / MySQL / Redis / MQ 经验" }).every((card) => card.category === "Spring / MySQL / Redis / MQ 经验")).toBe(true);
    expect(filterLearningKnowledgeCards(dashboard.knowledgeCards, { markedOnly: true, markedIds: new Set([target?.id ?? ""]) })).toEqual([target]);
    expect(JSON.stringify(dashboard.knowledgeCards)).not.toContain("/Users/");
  });

  it("persists local knowledge marks without touching the legacy favorite key", () => {
    window.localStorage.clear();
    const marked = toggleLearningKnowledgeMark(new Set<string>(), "kb-spring-db-cache-001");

    writeLearningKnowledgeMarks(marked, window.localStorage);

    expect(readLearningKnowledgeMarks(window.localStorage).has("kb-spring-db-cache-001")).toBe(true);
    expect(window.localStorage.getItem(LEARNING_KNOWLEDGE_MARKS_STORAGE_KEY)).toBe(JSON.stringify(["kb-spring-db-cache-001"]));
    expect(window.localStorage.getItem("jobSprint.kbFavorites.v1")).toBeNull();
  });
});

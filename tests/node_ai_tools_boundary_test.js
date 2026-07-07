const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("apps/server/app.js", "utf8");
const aiTools = fs.readFileSync("apps/server/ai_tools.js", "utf8");
const coachAiTools = fs.readFileSync("apps/server/coach_ai_tools.js", "utf8");
const coachBoundarySuggestions = fs.readFileSync("apps/server/coach_boundary_suggestions.js", "utf8");
const tools = require("../apps/server/ai_tools.js");
const coachTools = require("../apps/server/coach_ai_tools.js");
const boundaryTools = require("../apps/server/coach_boundary_suggestions.js");

assert.match(app, /require\("\.\/ai_routes"\)/);
assert.match(app, /require\("\.\/ai_tools"\)/);
assert.match(app, /localScore/);
assert.match(app, /scoreWithAnthropic/);
assert.match(app, /handleScore/);
assert.match(app, /handleGenerateKb/);
assert.match(app, /handleTranscribe/);

assert.match(aiTools, /function localScore\(/);
assert.match(aiTools, /function extractJson\(/);
assert.match(aiTools, /async function fetchWithTimeout\(/);
assert.match(aiTools, /async function scoreWithAnthropic\(/);
assert.match(aiTools, /function normalizeKbEntry\(/);
assert.match(aiTools, /function localGenerateKb\(/);
assert.match(aiTools, /async function generateKbWithAnthropic\(/);
assert.match(aiTools, /module\.exports = \{/);
assert.match(app, /handleGenerateCoachArtifacts/);
assert.match(app, /handleGenerateBoundarySuggestions/);
assert.match(coachAiTools, /function localGenerateCoachArtifacts/);
assert.match(coachAiTools, /async function generateCoachArtifactsWithAnthropic/);
assert.match(coachAiTools, /function normalizeCoachArtifact/);
assert.match(coachBoundarySuggestions, /function localGenerateBoundarySuggestions/);
assert.match(coachBoundarySuggestions, /async function generateBoundarySuggestionsWithAnthropic/);
assert.match(coachBoundarySuggestions, /coach-boundary-suggestions-v1/);

assert.doesNotMatch(app, /function localScore\(/);
assert.doesNotMatch(app, /function extractJson\(/);
assert.doesNotMatch(app, /async function fetchWithTimeout\(/);
assert.doesNotMatch(app, /async function scoreWithAnthropic\(/);
assert.doesNotMatch(app, /function normalizeKbEntry\(/);
assert.doesNotMatch(app, /function localGenerateKb\(/);
assert.doesNotMatch(app, /async function generateKbWithAnthropic\(/);
assert.doesNotMatch(app, /async function handleScore\(/);
assert.doesNotMatch(app, /async function handleGenerateKb\(/);
assert.doesNotMatch(app, /async function handleTranscribe\(/);
assert.doesNotMatch(app, /function loadInterviewContext\(/);
assert.doesNotMatch(app, /function requirePermission\(/);

assert.doesNotMatch(aiTools, /http\.createServer/);
assert.doesNotMatch(aiTools, /async function route/);
assert.doesNotMatch(aiTools, /async function handleScore/);
assert.doesNotMatch(aiTools, /async function handleGenerateKb/);
assert.doesNotMatch(aiTools, /function readBody/);
assert.doesNotMatch(aiTools, /function requirePermission/);
assert.doesNotMatch(aiTools, /function sendJson/);
assert.doesNotMatch(aiTools, /function loadInterviewContext/);
assert.doesNotMatch(coachAiTools, /requirePermission/);
assert.doesNotMatch(coachAiTools, /sendJson/);
assert.doesNotMatch(coachAiTools, /http\.createServer/);
assert.doesNotMatch(coachBoundarySuggestions, /requirePermission/);
assert.doesNotMatch(coachBoundarySuggestions, /sendJson/);
assert.doesNotMatch(coachBoundarySuggestions, /http\.createServer/);

const score = tools.localScore({
  question: "请解释 Redis 和 MQ 在这个项目中的边界。",
  answer: "首先我会说明 Redis 缓存边界，其次说明 MQ 异步链路，最后补充排查证据。",
  expectedKeywords: ["Redis", "MQ", "边界"]
});
assert.strictEqual(score.provider, "local-fallback");
assert.ok(score.score > 50);
assert.deepStrictEqual(score.weaknesses, []);

const kb = tools.localGenerateKb(
  {
    topic: "JVM 调优",
    currentTask: { title: "JVM G1/ZGC 面试准备", javaMapping: "JVM" }
  },
  {
    profile: { target: "高级 Java 后端", strengths: [], boundaries: [] },
    jdSignals: [],
    scoringRubric: {}
  }
);
assert.strictEqual(kb.provider, "local-fallback");
assert.ok(kb.entries.length >= 2);
assert.match(kb.entries[0].id, /^generated-/);
assert.strictEqual(kb.entries[0].sourceType, "generated-local");

const coach = coachTools.localGenerateCoachArtifacts({
  profile: {
    id: "profile-kai",
    targetRole: "后端工程师",
    roleFamily: "backend",
    dailyMinutes: 60
  },
  knowledgeBoundaries: [{
    topic: "MQ 幂等",
    level: "了解",
    gap: "缺少故障证据",
    targetUse: "后端 JD"
  }],
  opportunitySignals: [{
    company: "杭研平台",
    role: "高级 Java 后端",
    status: "约面",
    keywords: ["MQ", "Redis", "稳定性"],
    feedback: "面试官关注故障恢复"
  }],
  sprint: { date: "2026-07-06", currentTask: { title: "补 MQ 幂等证据" } }
});
assert.strictEqual(coach.provider, "local-fallback");
assert.strictEqual(coach.promptVersion, "coach-artifacts-v1");
assert.strictEqual(coach.schemaVersion, "coach-artifact-list-v1");
assert.match(coach.inputSummaryHash, /^[a-f0-9]{16}$/);
assert.strictEqual(coach.artifacts.length, 3);
assert.strictEqual(coach.artifacts[0].profileId, "profile-kai");
assert.strictEqual(coach.artifacts[0].status, "draft");
assert.match(coach.artifacts[0].title, /MQ 幂等/);
assert.ok(coach.artifacts[0].sources.some((source) => source.includes("角色视角：服务链路")));
assert.ok(coach.artifacts[0].sources.some((source) => source.includes("机会：杭研平台-高级 Java 后端")));
assert.ok(coach.artifacts[0].sources.some((source) => source.includes("JD焦点：MQ 的故障恢复")));
assert.ok(coach.artifacts[0].sources.some((source) => source.includes("JD解析：硬技能 MQ、Redis、稳定性")));
assert.match(coach.artifacts[0].body, /接口\/任务链路/);
assert.match(coach.artifacts[0].body, /证据要求「准备故障恢复案例、影响范围、定位链路和复盘动作」/);
assert.match(coach.artifacts[2].body, /JD 焦点「MQ 的故障恢复」/);
assert.match(coach.artifacts[2].body, /JD 解析题「你如何在 MQ 场景处理故障恢复？」/);
assert.match(coach.artifacts[2].body, /追问库：/);
assert.match(coach.artifacts[2].body, /上下游系统的边界/);
assert.match(coach.artifacts[0].reason, /面试官关注故障恢复/);
assert.match(coach.artifacts[0].reason, /JD 解析「硬技能 MQ、Redis、稳定性/);
assert.match(coach.artifacts[2].reason, /角色题卡库/);

const unknownCoach = coachTools.localGenerateCoachArtifacts({
  profile: { id: "profile-empty", targetRole: "前端工程师", roleFamily: "frontend" },
  knowledgeBoundaries: [],
  sprint: { date: "2026-07-06" }
});
assert.strictEqual(unknownCoach.artifacts[0].type, "daily_next_step");
assert.strictEqual(unknownCoach.promptVersion, "coach-artifacts-v1");
assert.match(unknownCoach.artifacts[0].body, /unknown/);
assert.match(unknownCoach.artifacts[0].body, /交互状态/);
assert.ok(unknownCoach.artifacts[0].sources.some((source) => source.includes("角色视角：交互状态")));

const boundarySuggestions = boundaryTools.localGenerateBoundarySuggestions({
  profile: {
    id: "profile-impl",
    targetRole: "实施顾问",
    roleFamily: "implementation"
  },
  knowledgeBoundaries: [{ topic: "Redis" }],
  text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。"
});
assert.strictEqual(boundarySuggestions.provider, "local-fallback");
assert.strictEqual(boundarySuggestions.promptVersion, "coach-boundary-suggestions-v1");
assert.strictEqual(boundarySuggestions.schemaVersion, "coach-boundary-suggestion-list-v1");
assert.match(boundarySuggestions.inputSummaryHash, /^[a-f0-9]{16}$/);
assert.ok(boundarySuggestions.suggestions.some((item) => item.topic === "MQ"));
assert.ok(boundarySuggestions.suggestions.some((item) => item.topic === "稳定性"));
assert.ok(boundarySuggestions.suggestions.every((item) => item.topic !== "Redis"));
assert.match(boundarySuggestions.suggestions[0].gap, /故障场景/);
assert.strictEqual(typeof boundaryTools.generateBoundarySuggestionsWithAnthropic, "function");

console.log("node ai tools boundary tests passed");

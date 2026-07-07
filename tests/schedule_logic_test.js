const assert = require("assert");
const schedule = require("../data/schedule.json");
const {
  getPlanState,
  formatDuration,
  flattenBlocks,
  applyPlanDelays,
  mergeObjectState,
  mergeArrayState,
  viewAllowed,
  allowedNavItems
} = require("../assets/schedule.js");

function at(value) {
  return new Date(value);
}

function assertCurrent(dateTime, expectedId, message) {
  const state = getPlanState(schedule, at(dateTime));
  assert.strictEqual(state.status, "任务进行中", `${message}: status`);
  assert.ok(state.current, `${message}: should have current block`);
  assert.strictEqual(state.current.id, expectedId, message);
  return state;
}

assert.strictEqual(schedule.timezone, "Asia/Singapore");
assert.strictEqual(schedule.days.length, 14);
assert.ok(flattenBlocks(schedule).length > 0);

flattenBlocks(schedule)
  .filter((block) => block.category === "java")
  .forEach((block) => {
    const { day, startDateTime, endDateTime, ...taskOnly } = block;
    const serialized = JSON.stringify(taskOnly);
    assert.ok(
      !/python|pytest|uvicorn|FastAPI|\.py\b/i.test(serialized),
      `Java task must not contain Python-specific detail: ${block.id}`
    );
  });

assertCurrent(
  "2026-07-01T10:00:00+08:00",
  "2026-07-01-0930-project",
  "2026-07-01 10:00 should hit Day 1 morning project task"
);

assertCurrent(
  "2026-07-03T21:00:00+08:00",
  "2026-07-03-2030-resume",
  "2026-07-03 21:00 should hit that evening task"
);

const formalDeliveryState = assertCurrent(
  "2026-07-13T21:00:00+08:00",
  "2026-07-13-2030-interview",
  "2026-07-13 21:00 should hit formal delivery related task"
);
assert.match(formalDeliveryState.current.title, /正式投递/);

const lunchState = getPlanState(schedule, at("2026-07-01T12:30:00+08:00"));
assert.strictEqual(lunchState.status, "等待下一个任务");
assert.strictEqual(lunchState.current, null);
assert.ok(lunchState.next, "Non-task time should return next block");
assert.strictEqual(lunchState.next.id, "2026-07-01-1400-java");

const beforeState = getPlanState(schedule, at("2026-06-29T09:00:00+08:00"));
assert.strictEqual(beforeState.status, "计划尚未开始");
assert.strictEqual(beforeState.current, null);
assert.strictEqual(beforeState.next.id, "2026-07-01-0930-project");

const afterState = getPlanState(schedule, at("2026-07-15T09:00:00+08:00"));
assert.strictEqual(afterState.status, "计划已结束");
assert.strictEqual(afterState.current, null);
assert.strictEqual(afterState.next, null);

const delayedSchedule = applyPlanDelays(schedule, [
  {
    id: "delay-test",
    start: "2026-07-01T10:00:00+08:00",
    end: "2026-07-01T12:00:00+08:00",
    minutes: 120,
    reason: "突发事件"
  }
], {});
const delayedActiveBlock = flattenBlocks(delayedSchedule).find((block) => block.id === "2026-07-01-0930-project");
assert.ok(delayedActiveBlock, "Delayed schedule should keep active task id");
assert.strictEqual(delayedActiveBlock.start, "12:00");
assert.strictEqual(delayedActiveBlock.end, "14:00");
assert.strictEqual(delayedActiveBlock.delayMinutes, 150);
const delayedBlock = flattenBlocks(delayedSchedule).find((block) => block.id === "2026-07-01-1400-java");
assert.ok(delayedBlock, "Delayed schedule should keep original task id");
assert.strictEqual(delayedBlock.day.date, "2026-07-01");
assert.strictEqual(delayedBlock.start, "16:00");
assert.strictEqual(delayedBlock.end, "18:00");

assert.strictEqual(formatDuration(65 * 60 * 1000), "1小时 5分钟");

assert.deepStrictEqual(
  mergeObjectState({ "server-done": true, conflict: true }, { "local-done": true, conflict: false }),
  { "server-done": true, conflict: false, "local-done": true },
  "Local fallback progress should merge back without losing offline changes"
);

assert.deepStrictEqual(
  mergeArrayState(
    [{ id: "server-only", company: "A" }, { id: "same", status: "server" }],
    [{ id: "local-only", company: "B" }, { id: "same", status: "local" }]
  ),
  [
    { id: "server-only", company: "A" },
    { id: "same", status: "local" },
    { id: "local-only", company: "B" }
  ],
  "Local fallback records should merge by id and keep local edits for duplicate ids"
);

assert.strictEqual(
  viewAllowed({ authState: null }, "today"),
  true,
  "Local or Android fallback without auth user should keep primary navigation visible"
);
assert.strictEqual(
  allowedNavItems({ authState: null }).length,
  8,
  "Local or Android fallback without auth user should expose all navigation targets"
);
const guestApp = {
  authState: {
    user: {
      readOnly: true,
      permissions: ["module:today", "module:schedule"]
    }
  }
};
assert.strictEqual(viewAllowed(guestApp, "today"), true);
assert.strictEqual(viewAllowed(guestApp, "knowledge"), false);
assert.deepStrictEqual(
  allowedNavItems(guestApp).map((item) => item.id),
  ["today", "schedule"],
  "Authenticated guest navigation should still respect explicit permissions"
);

console.log("schedule logic tests passed");

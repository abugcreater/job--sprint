const assert = require("assert");
const schedule = require("../data/schedule.json");
const {
  getPlanState,
  formatDuration,
  flattenBlocks,
  applyPlanDelays,
  mergeObjectState,
  mergeArrayState,
  reactTodayPath,
  viewAllowed,
  allowedNavItems
} = require("../assets/schedule.js");

function at(value) {
  return new Date(value);
}

assert.strictEqual(schedule.timezone, "Asia/Shanghai");
assert.strictEqual(schedule.days.length, 0);
assert.deepStrictEqual(flattenBlocks(schedule), []);
assert.doesNotMatch(JSON.stringify(schedule), /高级 Java|Spring|G1\/ZGC|java/i);

const emptyState = getPlanState(schedule, at("2026-07-01T10:00:00+08:00"));
assert.strictEqual(emptyState.status, "等待导入画像");
assert.strictEqual(emptyState.current, null);
assert.strictEqual(emptyState.next, null);
assert.deepStrictEqual(emptyState.blocks, []);

assert.strictEqual(
  applyPlanDelays(schedule, [{ id: "delay-test", minutes: 120 }]),
  schedule,
  "Static fallback must not synthesize schedule data from delay records"
);

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
  6,
  "Local or Android fallback without auth user should expose all navigation targets"
);
const guestApp = {
  authState: {
    user: {
      readOnly: true,
      permissions: ["module:today", "module:learn"]
    }
  }
};
assert.strictEqual(viewAllowed(guestApp, "today"), true);
assert.strictEqual(viewAllowed(guestApp, "interview"), false);
assert.deepStrictEqual(
  allowedNavItems(guestApp).map((item) => item.id),
  ["today", "learn"],
  "Authenticated guest navigation should still respect explicit permissions"
);
assert.strictEqual(
  reactTodayPath({ pathname: "/schedule.html" }),
  "./react/index.html#/today",
  "Root static fallback should point to the colocated React build"
);
assert.strictEqual(
  reactTodayPath({ pathname: "/android_asset/web/schedule.html" }),
  "../react/index.html#/today",
  "Android web fallback should point to the sibling React asset directory"
);

console.log("schedule logic tests passed");

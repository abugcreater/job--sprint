const assert = require("assert");
const fs = require("fs");
const {
  NAV_META,
  CATEGORY_META,
  categoriesByGroup
} = require("../assets/schedule.js");

const html = fs.readFileSync("schedule.html", "utf8");

const navLabels = NAV_META.map((item) => item.label);
["今日", "日程", "面试", "知识库", "机会", "复盘", "维护", "设置"].forEach((label) => {
  assert.ok(navLabels.includes(label), `missing nav label: ${label}`);
});

const appNavMarkup = html.match(/id="appNav"[\s\S]*?<\/nav>/);
assert.ok(appNavMarkup, "main nav should exist");
["今日", "知识", "面试", "机会", "更多"].forEach((label) => {
  assert.ok(appNavMarkup[0].includes(label), `main nav missing grouped label: ${label}`);
});
["知识库", "复盘", "维护", "设置"].forEach((label) => {
  assert.ok(!appNavMarkup[0].includes(`>${label}<`), `main nav should not expose secondary label: ${label}`);
});
assert.match(html, /id="sectionNav"/);

const groupLabels = Array.from(new Set(NAV_META.map((item) => item.groupLabel)));
["今日", "知识", "面试", "机会", "更多"].forEach((label) => {
  assert.ok(groupLabels.includes(label), `missing nav group label: ${label}`);
});

const mainLabels = categoriesByGroup("primary")
  .filter(([, meta]) => meta.showInMainFilter)
  .map(([, meta]) => meta.label);

assert.ok(mainLabels.includes("项目"));
assert.ok(mainLabels.includes("供小慧"));
assert.ok(mainLabels.includes("RAG"));
assert.ok(mainLabels.includes("Java"));
assert.ok(mainLabels.includes("面试"));
assert.ok(mainLabels.includes("简历/机会"));
assert.ok(!mainLabels.includes("Android"));
assert.ok(!mainLabels.includes("部署"));
assert.ok(!mainLabels.includes("路径缺失"));
assert.strictEqual(mainLabels.filter((label) => label === "简历/机会").length, 1);

const engineeringLabels = categoriesByGroup("engineering").map(([, meta]) => meta.label);
assert.ok(engineeringLabels.includes("APK 打包"));
assert.ok(engineeringLabels.includes("云端发布"));
assert.ok(engineeringLabels.includes("路径问题"));

assert.strictEqual(CATEGORY_META.android.showInMainFilter, false);
assert.strictEqual(CATEGORY_META.deployment.showInMainFilter, false);
assert.strictEqual(CATEGORY_META["path-missing"].showInMainFilter, false);

console.log("ui category tests passed");

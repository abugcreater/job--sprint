const assert = require("assert");
const fs = require("fs");
const {
  NAV_META,
  CATEGORY_META
} = require("../assets/schedule.js");

const html = fs.readFileSync("schedule.html", "utf8");

const navLabels = NAV_META.map((item) => item.label);
["今日", "画像", "知识", "面试", "机会", "复盘"].forEach((label) => {
  assert.ok(navLabels.includes(label), `missing nav label: ${label}`);
});
["日程", "知识库", "维护", "设置"].forEach((label) => {
  assert.ok(!navLabels.includes(label), `legacy nav label should not remain: ${label}`);
});

assert.match(html, /React 今日页/);
assert.match(html, /\.\/react\/index\.html#\/today/);
assert.doesNotMatch(html, /id="appNav"/);
assert.doesNotMatch(html, /id="sectionNav"/);

function categoriesByGroup(group) {
  return Object.entries(CATEGORY_META).filter(([, meta]) => meta.group === group);
}

const mainLabels = categoriesByGroup("primary")
  .filter(([, meta]) => meta.showInMainFilter)
  .map(([, meta]) => meta.label);

assert.ok(mainLabels.includes("个人任务"));
assert.ok(mainLabels.includes("面试"));
assert.ok(mainLabels.includes("机会"));
assert.ok(mainLabels.includes("复盘"));
assert.ok(!mainLabels.includes("恢复"));
assert.strictEqual(mainLabels.filter((label) => label === "机会").length, 1);

const secondaryLabels = categoriesByGroup("secondary").map(([, meta]) => meta.label);
assert.ok(secondaryLabels.includes("恢复"));

assert.strictEqual(CATEGORY_META.rest.showInMainFilter, false);

console.log("ui category tests passed");

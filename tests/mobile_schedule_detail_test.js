const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("schedule.html", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const css = fs.readFileSync("assets/schedule.css", "utf8");

assert.match(html, /正在进入 Job Sprint/);
assert.match(html, /React 今日页/);
assert.match(html, /\.\/react\/index\.html#\/today/);
assert.doesNotMatch(html, /id="taskDetailSheet"/);
assert.doesNotMatch(html, /id="taskDetailSheetBody"/);
assert.doesNotMatch(html, /id="sheetBackdrop"/);

assert.match(js, /reactTodayPath/);
assert.match(js, /window\.location\.replace/);
assert.doesNotMatch(js, /function openTaskDetail/);
assert.doesNotMatch(js, /function renderTaskDetailSheet/);
assert.doesNotMatch(js, /openSheet\(app, els, "taskDetail"\)/);

assert.ok(css.length > 0);

console.log("mobile schedule detail tests passed");

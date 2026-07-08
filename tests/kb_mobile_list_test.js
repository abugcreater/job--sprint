const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("schedule.html", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const css = fs.readFileSync("assets/schedule.css", "utf8");
const kb = JSON.parse(fs.readFileSync("data/interview_kb.json", "utf8"));

assert.ok(Array.isArray(kb.entries));
assert.strictEqual(kb.entries.length, 0);
assert.match(kb.scope, /空知识库占位/);

assert.match(html, /正在进入 Job Sprint/);
assert.match(html, /React 今日页/);
assert.doesNotMatch(html, /id="kbSearchInput"/);
assert.doesNotMatch(html, /id="kbCategoryFilter"/);
assert.doesNotMatch(html, /id="kbDetailSheet"/);
assert.doesNotMatch(html, /id="kbGenerateForm"/);
assert.doesNotMatch(html, /id="generateKbBtn"/);

assert.match(js, /reactTodayPath/);
assert.doesNotMatch(js, /function renderKnowledgeBase/);
assert.doesNotMatch(js, /function generateKnowledgeEntries/);
assert.doesNotMatch(js, /function openKbDetail/);
assert.doesNotMatch(js, /function renderKbDetailSheet/);
assert.doesNotMatch(js, /data-kb-detail/);
assert.ok(!/class="kb-priority-answer"/.test(js), "knowledge cards must not render full answer blocks by default");
assert.ok(!/展开 3 分钟回答、边界和项目证据/.test(js), "knowledge cards must not default to expanded long details");
assert.ok(css.length > 0);

console.log("knowledge base mobile list tests passed");

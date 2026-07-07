const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("schedule.html", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const css = fs.readFileSync("assets/schedule.css", "utf8");
const kb = JSON.parse(fs.readFileSync("data/interview_kb.json", "utf8"));

assert.ok(Array.isArray(kb.entries));
assert.ok(kb.entries.length > 0);
assert.match(html, /id="kbSearchInput"/);
assert.match(html, /id="kbCategoryFilter"/);
assert.match(html, /id="kbCategoryChips"/);
assert.match(html, /id="kbFavoritesOnly"/);
assert.match(html, /id="kbMistakesOnly"/);
assert.match(html, /id="kbDetailSheet"/);
assert.match(html, /id="kbGenerateForm"/);
assert.match(html, /id="generateKbBtn"/);
assert.match(js, /function renderKnowledgeBase\(app, els\)/);
assert.match(js, /function generateKnowledgeEntries\(app, els\)/);
assert.match(js, /function openKbDetail\(app, els, entry\)/);
assert.match(js, /function renderKbDetailSheet\(app, els, entry\)/);
assert.match(js, /data-kb-detail/);
assert.match(js, /data-kb-practice/);
assert.match(js, /data-kb-favorite/);
assert.match(js, /没有匹配的知识库条目/);
assert.ok(!/class="kb-priority-answer"/.test(js), "knowledge cards must not render full answer blocks by default");
assert.ok(!/展开 3 分钟回答、边界和项目证据/.test(js), "knowledge cards must not default to expanded long details");
assert.match(css, /\.kb-summary/);
assert.match(css, /-webkit-line-clamp:\s*2/);
assert.match(css, /\.kb-detail-sheet/);
assert.match(css, /\.kb-detail-section/);
assert.match(css, /\.kb-toolbar[\s\S]*border/);
assert.match(css, /\.kb-generate-form[\s\S]*grid-template-columns/);

console.log("knowledge base mobile list tests passed");

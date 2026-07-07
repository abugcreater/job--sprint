const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("schedule.html", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const css = fs.readFileSync("assets/schedule.css", "utf8");

assert.match(html, /id="taskDetailSheet"/);
assert.match(html, /id="taskDetailSheetBody"/);
assert.match(html, /id="sheetBackdrop"/);
assert.match(js, /function openTaskDetail\(app, els, blockId, state, now\)/);
assert.match(js, /function renderTaskDetailSheet\(app, els, block\)/);
assert.match(js, /openSheet\(app, els, "taskDetail"\)/);
assert.ok(!/detailButton\.addEventListener\("click",[\s\S]{0,160}renderAll\(app, els\)/.test(js));
assert.match(css, /\.bottom-sheet/);
assert.match(css, /\.sheet-backdrop/);
assert.match(css, /\.right-column\s*\{\s*display:\s*none;/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /overscroll-behavior:\s*contain/);

[
  "描述",
  "必须产出",
  "必须会答",
  "Java 映射",
  "验收标准"
].forEach((label) => assert.ok(js.includes(label), `missing detail field: ${label}`));

console.log("mobile schedule detail tests passed");

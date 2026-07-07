#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const schedulePath = path.join(repoRoot, "data", "schedule.json");
const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectPathRefs() {
  const refs = [];
  for (const day of schedule.days || []) {
    for (const block of day.blocks || []) {
      for (const item of block.mustRead || block.sourceFiles || []) {
        if (!item || !item.absolutePath) continue;
        refs.push({
          day: day.date,
          blockId: block.id,
          title: block.title,
          label: item.label || item.relativePath || item.absolutePath,
          usage: item.usage || "",
          rootName: item.rootName || "",
          root: item.root || "",
          relativePath: item.relativePath || item.path || "",
          absolutePath: item.absolutePath,
          exists: fs.existsSync(item.absolutePath),
          status: fs.existsSync(item.absolutePath) ? "ok" : "missing"
        });
      }
    }
  }
  return refs;
}

function collectCommandRefs() {
  const commands = [];
  for (const day of schedule.days || []) {
    for (const block of day.blocks || []) {
      for (const item of block.commands || []) {
        if (!item || !item.workingDirectory) continue;
        commands.push({
          day: day.date,
          blockId: block.id,
          title: block.title,
          label: item.label || item.command,
          command: item.command,
          workingDirectory: item.workingDirectory,
          cwdExists: fs.existsSync(item.workingDirectory),
          copyCommand: item.copyCommand
        });
      }
    }
  }
  return commands;
}

function suggestReplacement(ref) {
  const roots = Object.values(schedule.roots || {}).filter(Boolean);
  const filename = path.basename(ref.absolutePath);
  if (!filename) return "";
  for (const root of roots) {
    const candidate = findFile(root, filename, 4);
    if (candidate) return candidate;
  }
  return "";
}

function findFile(root, filename, depth) {
  if (!root || depth < 0 || !fs.existsSync(root)) return "";
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return "";
  }
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isFile() && entry.name === filename) return fullPath;
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename, depth - 1);
      if (found) return found;
    }
  }
  return "";
}

const pathRefs = collectPathRefs();
const commandRefs = collectCommandRefs();
const uniqueRefs = uniqueBy(pathRefs, (item) => item.absolutePath);
const missing = uniqueRefs.filter((item) => !item.exists).map((item) => ({
  ...item,
  suggestedReplacement: suggestReplacement(item)
}));
const ok = uniqueRefs.filter((item) => item.exists);
const commandProblems = commandRefs.filter((item) => !item.cwdExists);
const passRate = uniqueRefs.length ? Math.round((ok.length / uniqueRefs.length) * 10000) / 100 : 100;

const report = {
  generatedAt: new Date().toISOString(),
  scheduleFile: schedulePath,
  totals: {
    uniquePaths: uniqueRefs.length,
    ok: ok.length,
    missing: missing.length,
    commands: commandRefs.length,
    commandProblems: commandProblems.length,
    passRate
  },
  okPaths: ok,
  missingPaths: missing,
  commandProblems
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(`路径校验：${ok.length}/${uniqueRefs.length} OK，通过率 ${passRate}%`);
  if (missing.length) {
    console.log("\n缺失路径：");
    missing.forEach((item) => {
      console.log(`- [${item.day}] ${item.label}: ${item.absolutePath}`);
      if (item.suggestedReplacement) {
        console.log(`  建议替代：${item.suggestedReplacement}`);
      }
    });
  }
  if (commandProblems.length) {
    console.log("\n命令工作目录异常：");
    commandProblems.forEach((item) => {
      console.log(`- [${item.day}] ${item.label}: ${item.workingDirectory}`);
    });
  }
}

if (missing.length || commandProblems.length) {
  process.exitCode = 1;
}

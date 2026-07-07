import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const projectRoot = resolve(appRoot, "../..");
const sourcePath = resolve(projectRoot, "data/schedule.json");
const targetPath = resolve(__dirname, "../src/data/scheduleCompact.json");

const schedule = JSON.parse(await readFile(sourcePath, "utf8"));
const compact = {
  timezone: schedule.timezone,
  startDate: schedule.startDate,
  endDate: schedule.endDate,
  version: `${schedule.version}+react-compact`,
  totalDays: schedule.days.length,
  days: schedule.days.map((day) => ({
    date: day.date,
    weekday: day.weekday,
    dayIndex: day.dayIndex,
    theme: day.theme,
    goal: day.goal,
    risk: day.risk,
    javaFocus: day.javaFocus,
    dailyDeliverables: day.dailyDeliverables ?? [],
    mustAnswer: day.mustAnswer ?? [],
    blocks: day.blocks.map((block) => ({
      id: block.id,
      start: block.start,
      end: block.end,
      endDate: block.endDate,
      category: block.category,
      title: block.title,
      description: block.description,
      deliverables: block.deliverables ?? [],
      interviewQuestions: block.interviewQuestions ?? [],
      javaMapping: block.javaMapping,
      acceptance: block.acceptance,
      risk: block.risk,
      sourceFiles: (block.sourceFiles ?? block.mustRead ?? []).slice(0, 3).map((source) => ({
        label: source.label
      }))
    }))
  }))
};

await writeFile(targetPath, `${JSON.stringify(compact, null, 2)}\n`, "utf8");
console.log(`Wrote ${targetPath}`);

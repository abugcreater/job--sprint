import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(appRoot, "../..");
const sourcePath = path.join(projectRoot, "data", "interview_context.json");
const targetPath = path.join(appRoot, "src", "data", "interviewQuestionsCompact.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function compactText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/\/Users\/|absolutePath|open\s+"|code\s+"|sed -n|private/i.test(text)) return "";
  return text;
}

function cleanList(value, limit = 8) {
  return (Array.isArray(value) ? value : [])
    .map(compactText)
    .filter(Boolean)
    .slice(0, limit);
}

function toCompactQuestion(question) {
  return {
    id: compactText(question.id),
    mode: compactText(question.mode),
    source: compactText(question.source),
    question: compactText(question.question),
    hint: compactText(question.hint),
    expectedKeywords: cleanList(question.expectedKeywords)
  };
}

const source = readJson(sourcePath);
const questionBank = (Array.isArray(source.questionBank) ? source.questionBank : [])
  .map(toCompactQuestion)
  .filter((question) => question.id && question.mode && question.question);

const compact = {
  version: "interview-questions-compact-v1",
  sourceVersion: source.version ?? "unknown",
  sourceUpdatedAt: source.updatedAt ?? "",
  privacy: "Only questionBank and safe rubric dimensions are bundled for the React app. Local paths, profile refs and JD source paths are excluded.",
  questionBank,
  scoringRubric: {
    dimensions: cleanList(source.scoringRubric?.dimensions, 8),
    scale: compactText(source.scoringRubric?.scale)
  }
};

const output = `${JSON.stringify(compact, null, 2)}\n`;
if (/\/Users\/|absolutePath|open\s+"|code\s+"|sed -n|private/i.test(output)) {
  throw new Error("Unsafe local path or private marker leaked into interviewQuestionsCompact.json");
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, output);
console.log(`Wrote ${path.relative(projectRoot, targetPath)} with ${questionBank.length} questions`);

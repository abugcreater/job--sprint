import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(appRoot, "../..");
const sourcePath = path.join(projectRoot, "data", "interview_kb.json");
const targetPath = path.join(appRoot, "src", "data", "learningKnowledgeCompact.json");

const preferredIds = [
  "kb-java-map-001",
  "kb-spring-db-cache-001",
  "kb-java-jvm-001",
  "kb-java-mq-001",
  "kb-stability-001",
  "kb-project-searchblackhole-001",
  "kb-evidence-001"
];

const learningKeywords = ["Java", "Spring", "JVM", "Redis", "MQ", "缓存", "事务", "稳定性", "证据", "搜索"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function compactText(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/\/Users\/|absolutePath|open\s+"|code\s+"|sed -n/i.test(text)) return "";
  return text;
}

function cleanList(value) {
  return (Array.isArray(value) ? value : [])
    .map(compactText)
    .filter(Boolean)
    .slice(0, 3);
}

function sourceLabels(entry) {
  const labels = (Array.isArray(entry.sourceRefs) ? entry.sourceRefs : [])
    .map((ref) => compactText(ref?.label))
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 4);
}

function scoreEntry(entry) {
  const text = [
    entry.category,
    entry.title,
    entry.publicSummary,
    entry.interviewQuestion,
    entry.javaMapping,
    entry.projectEvidence,
    sourceLabels(entry).join(" ")
  ].join(" ");

  let score = preferredIds.includes(entry.id) ? 100 : 0;
  for (const keyword of learningKeywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) score += 5;
  }
  return score;
}

function toCompactEntry(entry) {
  return {
    id: compactText(entry.id),
    category: compactText(entry.category),
    title: compactText(entry.title),
    publicSummary: compactText(entry.publicSummary),
    interviewQuestion: compactText(entry.interviewQuestion),
    javaMapping: compactText(entry.javaMapping),
    projectEvidence: compactText(entry.projectEvidence),
    safeWording: cleanList(entry.safeWording),
    sourceLabels: sourceLabels(entry)
  };
}

const source = readJson(sourcePath);
const entries = (Array.isArray(source.entries) ? source.entries : [])
  .map((entry) => ({ entry, score: scoreEntry(entry) }))
  .filter(({ entry, score }) => entry?.id && score > 0)
  .sort((a, b) => b.score - a.score || preferredIds.indexOf(a.entry.id) - preferredIds.indexOf(b.entry.id))
  .slice(0, 10)
  .map(({ entry }) => toCompactEntry(entry))
  .filter((entry) => entry.id && entry.title && entry.publicSummary);

const compact = {
  version: "learning-kb-compact-v1",
  sourceVersion: source.version ?? "unknown",
  sourceUpdatedAt: source.updatedAt ?? "",
  privacy: "Only sanitized learning fields are bundled for the React app. Local paths, commands and private source refs are excluded.",
  entries
};

const output = `${JSON.stringify(compact, null, 2)}\n`;
if (/\/Users\/|absolutePath|open\s+"|code\s+"|sed -n/i.test(output)) {
  throw new Error("Unsafe local path or command leaked into learningKnowledgeCompact.json");
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, output);
console.log(`Wrote ${path.relative(projectRoot, targetPath)} with ${entries.length} entries`);

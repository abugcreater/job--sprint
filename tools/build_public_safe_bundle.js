#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const outRoot = path.join(repoRoot, "dist", "public-safe");
const androidAssetRoot = path.join(repoRoot, "apps", "android", "app", "src", "main", "assets", "web");
const legacyDeployHostPattern = new RegExp(["app", "jobdailyschedule", "site"].join("\\."), "gi");
const legacyServerIpPattern = new RegExp(["118", "25", "151", "251"].join("\\."), "g");
const localUserRootPattern = /\/Users\/(?!Shared\b)[A-Za-z0-9._-]+/g;
const localUserPathPattern = /\/Users\/(?!Shared\b)[A-Za-z0-9._-]+\/[^\s"'，。；、)）\]}]*/g;
const privateNamePattern = new RegExp(["冯", "凯"].join(""), "g");
const sourceFiles = [
  "schedule.html",
  "login.html",
  "no-profile-fallback.html",
  "assets/schedule.css",
  "assets/schedule.js",
  "assets/auth.js",
  "assets/embedded-data.js",
  "assets/icon.svg",
  "assets/manifest.webmanifest",
  "sw.js",
  "data/schedule.json",
  "data/interview_kb.json",
  "data/interview_context.json",
  "tools/build_public_safe_bundle.js"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  const filePath = path.join(outRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyFile(relativePath) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(outRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function sourceHashes() {
  return Object.fromEntries(sourceFiles
    .slice()
    .sort()
    .map((relativePath) => [relativePath, fileSha256(path.join(repoRoot, relativePath))]));
}

function syncAndroidAssets() {
  if (!fs.existsSync(path.join(repoRoot, "apps", "android"))) {
    return;
  }
  fs.rmSync(androidAssetRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(androidAssetRoot), { recursive: true });
  fs.cpSync(outRoot, androidAssetRoot, { recursive: true });
  const androidScheduleHtml = path.join(androidAssetRoot, "schedule.html");
  if (fs.existsSync(androidScheduleHtml)) {
    fs.writeFileSync(
      androidScheduleHtml,
      fs.readFileSync(androidScheduleHtml, "utf8").replaceAll("./react/index.html#/today", "../react/index.html#/today")
    );
  }
}

function scrubText(value) {
  return String(value)
    .replace(legacyDeployHostPattern, "job-sprint.example.com")
    .replace(legacyServerIpPattern, "203.0.113.10")
    .replace(localUserPathPattern, "[本地路径已移除]")
    .replace(localUserRootPattern, "[本地路径已移除]")
    .replace(/tencentcloud|tecentcloud|qcloud|dnspod|腾讯云/gi, "[云部署资料已移除]")
    .replace(/同程旅行/g, "过往公司")
    .replace(/SearchFrontAPI|SearchCore|searchblackhole|searchpackage/gi, "搜索链路项目")
    .replace(privateNamePattern, "候选人")
    .replace(/fk_sha[_-]?\w*/gi, "[密钥引用已移除]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[token已移除]");
}

function scrubAny(value) {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubAny);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (["absolutePath", "root", "openCommand", "codeCommand", "viewCommand", "copyCommand", "workingDirectory", "cwd", "path"].includes(key)) {
        next[key] = "本地执行版可见";
      } else if (key === "sourceRefs") {
        next[key] = (Array.isArray(item) ? item : []).map((ref) => ({
          label: scrubText(ref.label || "来源已脱敏"),
          safeToShow: false
        }));
      } else {
        next[key] = scrubAny(item);
      }
    }
    return next;
  }
  return value;
}

function buildSafeSchedule() {
  const schedule = scrubAny(readJson("data/schedule.json"));
  schedule.version = `${schedule.version || "schedule"}-public-safe`;
  schedule.projectRoot = "public-safe";
  schedule.roots = {};
  schedule.publicSafe = true;
  schedule.pathAuditPolicy = "公网安全版不展示本机绝对路径；完整路径仅在本地执行版可见。";
  for (const day of schedule.days || []) {
    for (const block of day.blocks || []) {
      const mustRead = (block.mustRead || []).map((item) => ({
        label: scrubText(item.label || "学习材料"),
        usage: scrubText(item.usage || "学习提示"),
        rootName: "public-safe",
        root: "本地执行版可见",
        relativePath: "本地执行版可见",
        path: "本地执行版可见",
        absolutePath: "本地执行版可见",
        exists: null,
        status: "public-safe",
        openCommand: "本地执行版可见",
        codeCommand: "",
        viewCommand: ""
      }));
      block.mustRead = mustRead;
      block.sourceFiles = mustRead;
      block.cwd = "本地执行版可见";
      block.absolutePaths = ["本地执行版可见"];
      block.relativePaths = mustRead.map((item) => item.label);
      block.openCommands = [];
      block.pathStatus = "public-safe";
      block.fallback = "公网安全版隐藏本机路径；请在本地执行版查看一键打开命令。";
      block.commands = (block.commands || []).map((item) => ({
        label: scrubText(item.label || "运行命令"),
        command: scrubText(item.command || ""),
        workingDirectory: "本地执行版可见",
        cwd: "本地执行版可见",
        copyCommand: "本地执行版可见"
      }));
    }
  }
  return schedule;
}

function buildSafeKb() {
  const kb = scrubAny(readJson("data/interview_kb.json"));
  kb.version = `${kb.version || "interview-kb"}-public-safe`;
  kb.scope = "公网安全版：仅保留通用、脱敏、可公开的面试准备内容；不包含本地路径、公司原始资料、密钥或服务器信息。";
  return kb;
}

function buildSafeInterviewContext() {
  const context = scrubAny(readJson("data/interview_context.json"));
  context.version = `${context.version || "interview-context"}-public-safe`;
  if (context.profile) {
    context.profile.name = "候选人";
    context.profile.strengths = (context.profile.strengths || []).map(scrubText);
    context.profile.boundaries = (context.profile.boundaries || []).map(scrubText);
  }
  if (Array.isArray(context.jdSignals)) {
    context.jdSignals = context.jdSignals.map((signal) => ({
      ...signal,
      source: scrubText(signal.source || "公开岗位信号"),
      path: "公网安全版已移除",
      note: scrubText(signal.note || "")
    }));
  }
  return context;
}

fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

copyFile("schedule.html");
copyFile("login.html");
copyFile("no-profile-fallback.html");
copyFile("assets/schedule.css");
copyFile("assets/schedule.js");
copyFile("assets/auth.js");
copyFile("assets/embedded-data.js");
copyFile("assets/icon.svg");
copyFile("assets/manifest.webmanifest");
copyFile("sw.js");

const htmlPath = path.join(outRoot, "schedule.html");
fs.writeFileSync(
  htmlPath,
  fs.readFileSync(htmlPath, "utf8")
    .replace("local-execution：包含本地路径，仅本机或受保护访问使用", "public-safe：不包含本地路径和公司资料")
);

const safeSchedule = buildSafeSchedule();
const safeKb = buildSafeKb();
const safeInterviewContext = buildSafeInterviewContext();

writeJson("data/schedule.json", safeSchedule);
writeJson("data/interview_kb.json", safeKb);
writeJson("data/interview_context.json", safeInterviewContext);

fs.writeFileSync(
  path.join(outRoot, "assets", "embedded-data.js"),
  `window.__JOB_SPRINT_EMBEDDED_DATA__ = ${JSON.stringify({
    schedule: safeSchedule,
    interviewContext: safeInterviewContext,
    interviewKb: safeKb
  })};\n`
);
writeJson("build-manifest.json", {
  schemaVersion: 1,
  generatedBy: "tools/build_public_safe_bundle.js",
  sourceHashes: sourceHashes()
});
syncAndroidAssets();

console.log(`public-safe bundle generated: ${outRoot}`);
if (fs.existsSync(androidAssetRoot)) {
  console.log(`android fallback assets synced: ${androidAssetRoot}`);
}

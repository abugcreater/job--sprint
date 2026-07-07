#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const forbiddenPathSpecs = [
  { path: ".codex/agents", reason: "项目内不再维护 Codex 团队角色副本。" },
  { path: "docs/ai-team", reason: "Job Sprint 不再维护完整 AI 团队文档本体。" }
];

const forbiddenScriptNames = [
  "validate:ai-team",
  "validate:ai-team:global"
];

const activeEntryFiles = [
  "AGENTS.md",
  "docs/README.md",
  "docs/core/01-project-background.md",
  "docs/core/02-project-plan.md",
  "docs/core/03-technical-architecture.md",
  "docs/core/04-acceptance-and-risk.md"
];

const activeReferencePatterns = [
  { pattern: /docs\/ai-team\b/, reason: "当前入口不能把 docs/ai-team 当活跃事实源。" },
  { pattern: /\.codex\/agents\b/, reason: "当前入口不能要求维护项目级 agent 副本。" },
  { pattern: /tools\/ai_team_/, reason: "当前入口不能依赖项目级 AI team 脚本。" },
  { pattern: /tests\/ai_team_/, reason: "当前入口不能依赖项目级 AI team 测试。" },
  { pattern: /npm run ai-team:/, reason: "npm ai-team:* 只能是历史本地留痕，不能作为团队入口。" },
  { pattern: /npm run validate:ai-team/, reason: "validate:ai-team 已被 workspace-boundaries gate 替代。" }
];

function parseMode(argv) {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  if (modeArg) return modeArg.slice("--mode=".length);
  if (argv.includes("--audit")) return "audit";
  if (argv.includes("--enforce")) return "enforce";
  return "enforce";
}

function listMatchingFiles(root, dir, regexp) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter((name) => regexp.test(name))
    .map((name) => path.join(dir, name));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function lineFindings(root, file, patterns) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, "utf8");
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    patterns.forEach((rule) => {
      if (rule.pattern.test(line)) {
        findings.push({
          code: "active-entry-legacy-reference",
          severity: "error",
          file,
          line: index + 1,
          reason: rule.reason
        });
      }
    });
  });
  return findings;
}

function validateRepo(root = repoRoot, options = {}) {
  const mode = options.mode || "enforce";
  const findings = [];
  const warnings = [];

  const forbiddenPaths = [
    ...forbiddenPathSpecs,
    ...listMatchingFiles(root, "tools", /^ai_team_.*\.js$/).map((item) => ({
      path: item,
      reason: "项目级 AI team 脚本已由全局 Codex team 和 workspace-boundaries gate 替代。"
    })),
    ...listMatchingFiles(root, "tests", /^ai_team_.*_test\.js$/).map((item) => ({
      path: item,
      reason: "项目级 AI team 测试不再属于 Job Sprint 当前门禁。"
    }))
  ];

  forbiddenPaths.forEach((item) => {
    if (!fs.existsSync(path.join(root, item.path))) return;
    const finding = {
      code: "forbidden-local-ai-team-shadow",
      severity: mode === "audit" ? "warning" : "error",
      path: item.path,
      reason: item.reason
    };
    if (mode === "audit") warnings.push(finding);
    else findings.push(finding);
  });

  const packagePath = path.join(root, "package.json");
  if (fs.existsSync(packagePath)) {
    const scripts = readJson(packagePath).scripts || {};
    Object.keys(scripts).forEach((name) => {
      if (name.startsWith("ai-team:") || forbiddenScriptNames.includes(name)) {
        findings.push({
          code: "forbidden-ai-team-script",
          severity: "error",
          script: name,
          reason: "Job Sprint package scripts 不能再暴露项目级 AI team 入口。"
        });
      }
    });
  }

  activeEntryFiles.forEach((file) => {
    findings.push(...lineFindings(root, file, activeReferencePatterns));
  });

  const agentsPath = path.join(root, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    const agentsText = fs.readFileSync(agentsPath, "utf8");
    if (!agentsText.includes("~/.codex/skills/codex-ai-team/SKILL.md")) {
      warnings.push({
        code: "global-team-skill-reference-missing",
        severity: "warning",
        file: "AGENTS.md",
        reason: "项目规则应保留全局 codex-ai-team skill 的调用说明。"
      });
    }
    if (!/npm 脚本.*团队调度入口|npm.*不能.*团队入口|不得把 npm 脚本当作团队调度入口/.test(agentsText)) {
      warnings.push({
        code: "npm-team-entry-boundary-missing",
        severity: "warning",
        file: "AGENTS.md",
        reason: "项目规则应明确 npm 脚本不能冒充 Codex 多 agent 团队入口。"
      });
    }
  }

  return {
    ok: findings.length === 0,
    mode,
    findings,
    warnings
  };
}

function printReport(report) {
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  if (report.ok) {
    console.log(`工作树边界验证：${report.mode} 通过。`);
  } else {
    console.log(`工作树边界验证：${report.mode} 发现 ${report.findings.length} 个阻断问题。`);
    report.findings.forEach((finding) => {
      const location = finding.file ? `${finding.file}:${finding.line || 1}` : finding.path || finding.script;
      console.log(`- ${location} [${finding.code}] ${finding.reason}`);
    });
  }

  if (report.warnings.length) {
    console.log(`提示：${report.warnings.length} 条非阻断提示。`);
    report.warnings.forEach((warning) => {
      const location = warning.file ? `${warning.file}:${warning.line || 1}` : warning.path || warning.script;
      console.log(`- ${location} [${warning.code}] ${warning.reason}`);
    });
  }
}

if (require.main === module) {
  const mode = parseMode(process.argv.slice(2));
  if (!["audit", "enforce"].includes(mode)) {
    console.error("用法：node tools/validate_workspace_boundaries.js [--mode=audit|--mode=enforce]");
    process.exit(2);
  }
  const report = validateRepo(repoRoot, { mode });
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  validateRepo
};

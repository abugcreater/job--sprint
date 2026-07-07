#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateRepo } = require("../tools/validate_workspace_boundaries");

const repoRoot = path.resolve(__dirname, "..");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-boundaries-"));
  fs.mkdirSync(path.join(root, "docs/core"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/archive"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/plans"), { recursive: true });
  fs.mkdirSync(path.join(root, "tools"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), [
    "# Rules",
    "全局入口：~/.codex/skills/codex-ai-team/SKILL.md",
    "不得把 npm 脚本当作团队调度入口。"
  ].join("\n"));
  fs.writeFileSync(path.join(root, "docs/README.md"), "# Docs\n");
  ["01-project-background", "02-project-plan", "03-technical-architecture", "04-acceptance-and-risk"].forEach((name) => {
    fs.writeFileSync(path.join(root, "docs/core", `${name}.md`), `# ${name}\n`);
  });
  fs.writeFileSync(path.join(root, "docs/archive/index.md"), "历史 docs/ai-team 可在归档中说明。\n");
  fs.writeFileSync(path.join(root, "docs/plans/cleanup.md"), "历史 .codex/agents 可在计划中说明。\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      test: "node tests/workspace_boundaries_test.js",
      "validate:workspace-boundaries": "node tools/validate_workspace_boundaries.js"
    }
  }, null, 2));
  return root;
}

function testAuditModeAllowsExistingShadowAsWarning() {
  const root = makeFixture();
  fs.mkdirSync(path.join(root, ".codex/agents"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/ai-team"), { recursive: true });
  fs.writeFileSync(path.join(root, "tools/ai_team_quick.js"), "");
  fs.writeFileSync(path.join(root, "tests/ai_team_quick_test.js"), "");
  const report = validateRepo(root, { mode: "audit" });
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert(report.warnings.some((item) => item.code === "forbidden-local-ai-team-shadow"));
}

function testEnforceModeBlocksExistingShadow() {
  const root = makeFixture();
  fs.mkdirSync(path.join(root, "docs/ai-team"), { recursive: true });
  const report = validateRepo(root, { mode: "enforce" });
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.path === "docs/ai-team"));
}

function testActiveEntryReferencesFail() {
  const root = makeFixture();
  fs.appendFileSync(path.join(root, "docs/README.md"), "\n当前入口：docs/ai-team/\n");
  const report = validateRepo(root, { mode: "audit" });
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "active-entry-legacy-reference"));
}

function testForbiddenScriptsFail() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      "ai-team:record": "node tools/ai_team_quick.js",
      "validate:ai-team": "node tools/ai_team_validate.js"
    }
  }, null, 2));
  const report = validateRepo(root, { mode: "enforce" });
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.script === "ai-team:record"));
  assert(report.findings.some((item) => item.script === "validate:ai-team"));
}

function testCurrentRepoPassesEnforce() {
  const report = validateRepo(repoRoot, { mode: "enforce" });
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
}

testAuditModeAllowsExistingShadowAsWarning();
testEnforceModeBlocksExistingShadow();
testActiveEntryReferencesFail();
testForbiddenScriptsFail();
testCurrentRepoPassesEnforce();

console.log("工作树边界验证器测试：5 项通过。");

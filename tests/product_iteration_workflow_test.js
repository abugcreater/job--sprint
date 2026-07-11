#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateProductIterationWorkflow } = require("../tools/validate_product_iteration_workflow");

const repoRoot = path.resolve(__dirname, "..");

function writeFile(root, file, text) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function makeFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "product-iteration-"));
  writeFile(root, "package.json", JSON.stringify({
    scripts: {
      test: [
        "node --check tools/validate_product_iteration_workflow.js",
        "node tests/gitflow_policy_test.js",
        "node tests/product_iteration_workflow_test.js",
        "npm --prefix apps/react-web run typecheck",
        "npm --prefix apps/react-web test"
      ].join(" && "),
      "test:release": "npm test && npm run test:gitflow && npm run test:local-functional && npm run build:rust:linux && npm run build:server-delivery",
      "validate:product-iteration": "node tools/validate_product_iteration_workflow.js",
      "validate:gitflow": "node tools/validate_gitflow_policy.js",
      "test:gitflow": "node tests/gitflow_policy_test.js"
    }
  }, null, 2));
  writeFile(root, "docs/product/it-job-coach-v1/prd-options.md", [
    "版本 A：保守个人闭环版",
    "版本 B：泛 IT 多用户版",
    "版本 C：AI 原生教练版",
    "团队裁决"
  ].join("\n"));
  writeFile(root, "docs/product/it-job-coach-v1/prd-recommended.md", [
    "面向泛 IT 求职者",
    "北极星指标",
    "每周有效求职推进数",
    "AI 不能直接修改正式日程，只能生成草稿"
  ].join("\n"));
  writeFile(root, "docs/product/it-job-coach-v1/review-and-adjudication.md", [
    "采用 `prd-recommended.md` 作为主合同",
    "TEAM_ROOM_PARTIAL",
    "AI 输出必须先落入 artifact 草稿"
  ].join("\n"));
  writeFile(root, "docs/product/it-job-coach-v1/development-workflow.md", [
    "阶段 0：PRD 冻结",
    "团队分工规则",
    "防关闭智能体异常规则",
    "防 UI 功能不可用规则",
    "AI 教练功能规则"
  ].join("\n"));
  writeFile(root, "docs/product/product-ops/product-ledger.md", [
    "current_thread_quarantine=true",
    "不能标 `TEAM_ROOM_PASS`",
    "不替代真实 LLM 线上 evidence"
  ].join("\n"));
  writeFile(root, "docs/product/product-ops/known-issues.md", [
    "远端真实 LLM provider evidence 已通过",
    "Android 远端 HTTPS 真机 evidence 已通过",
    "当前线程 AI 团队处于 quarantine"
  ].join("\n"));
  writeFile(root, "docs/product/product-ops/doc-rules.md", [
    "current_thread_quarantine=true",
    "TEAM_ROOM_PARTIAL",
    "不能标 `TEAM_ROOM_PASS`"
  ].join("\n"));
  writeFile(root, "docs/product/product-ops/requirement-development-template.md", [
    "# 需求开发复用模板",
    "复制入口",
    "标准需求卡",
    "GitFlow",
    "工作分支",
    "数据隔离清单",
    "UI/UX 实现约束",
    "分层验收命令",
    "最终报告模板"
  ].join("\n"));
  writeFile(root, "docs/product/product-ops/gitflow-development-governance.md", [
    "# GitFlow 开发与版本治理规范",
    "main",
    "develop",
    "Conventional Commits",
    "release/vX.Y.Z",
    "hotfix/",
    "npm run validate:gitflow",
    "普通需求 PR 使用 squash merge"
  ].join("\n"));
  writeFile(root, "CONTRIBUTING.md", [
    "轻量 GitFlow",
    "main",
    "develop",
    "type(scope): description",
    "npm run validate:gitflow"
  ].join("\n"));
  writeFile(root, ".github/pull_request_template.md", [
    "需求/Issue",
    "目标分支",
    "GitFlow",
    "npm run scan:sensitive",
    "回滚方式"
  ].join("\n"));
  writeFile(root, ".github/workflows/gitflow-policy.yml", [
    "name: GitFlow Policy",
    "pull_request:",
    "validate_gitflow_policy.js",
    "GITFLOW_PR_TITLE",
    "gitflow_policy_test.js"
  ].join("\n"));
  writeFile(root, "docs/product/it-job-coach-v1/completion-audit.md", [
    "PASS_WITH_LIMITS",
    "当前团队工作是 `TEAM_ROOM_PARTIAL`",
    "远端真实 LLM provider evidence",
    "Android 远端 HTTPS evidence"
  ].join("\n"));
  writeFile(root, "docs/product/it-job-coach-v1/product-completeness-and-ai-expansion-2026-07-07.md", [
    "成功指标进入产品页",
    "本周有效推进",
    "采纳后完成",
    "面试复盘",
    "/api/coach/outcomes"
  ].join("\n"));
  writeFile(root, "docs/evidence/server-remote/coach-artifacts.json", JSON.stringify({
    status: "PASS",
    health: { apiConfigured: true },
    coach: {
      provider: "anthropic-compatible",
      jdInsights: { providerSemantic: true },
      roleQuestionBank: { providerSemantic: true }
    },
    feedback: { summary: { reviewedCount: 1 } }
  }, null, 2));

  Object.entries(overrides).forEach(([file, text]) => writeFile(root, file, text));
  return root;
}

function testFixturePassesWithRealProviderEvidence() {
  const report = validateProductIterationWorkflow(makeFixture());
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.warnings.length, 0);
}

function testFixtureWarnsWhenProviderIsFallbackOnly() {
  const report = validateProductIterationWorkflow(makeFixture({
    "docs/evidence/server-remote/coach-artifacts.json": JSON.stringify({
      status: "PASS",
      health: { apiConfigured: false },
      coach: {
        provider: "local-fallback",
        jdInsights: { summary: true, evidence: true, question: true },
        roleQuestionBank: { followUpLabel: true, roleSpecificQuestion: true }
      },
      feedback: { summary: { reviewedCount: 1 } }
    }, null, 2)
  }));
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.status, "PASS_WITH_LIMITS");
  assert(report.warnings.some((item) => item.id === "remote_provider_not_configured"));
}

function testMissingPrdVersionFails() {
  const report = validateProductIterationWorkflow(makeFixture({
    "docs/product/it-job-coach-v1/prd-options.md": "版本 A：保守个人闭环版\n团队裁决"
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.id === "prd_options_multiple_versions"));
}

function testMissingReactGateInNpmTestFails() {
  const report = validateProductIterationWorkflow(makeFixture({
    "package.json": JSON.stringify({
      scripts: {
        test: "node tests/product_iteration_workflow_test.js",
        "test:release": "npm test && npm run test:gitflow && npm run test:local-functional && npm run build:rust:linux && npm run build:server-delivery",
        "validate:product-iteration": "node tools/validate_product_iteration_workflow.js"
      }
    }, null, 2)
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.script === "test" && item.missing.includes("npm --prefix apps/react-web test")));
}

function testMissingRequirementDevelopmentTemplateFails() {
  const report = validateProductIterationWorkflow(makeFixture({
    "docs/product/product-ops/requirement-development-template.md": "缺少可复用需求开发模板"
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.id === "requirement_development_template_reusable"));
}

function testMissingGitflowGovernanceFails() {
  const report = validateProductIterationWorkflow(makeFixture({
    "docs/product/product-ops/gitflow-development-governance.md": "缺少 GitFlow 权威规范"
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.id === "gitflow_development_governance"));
}

function testMissingGitflowScriptFails() {
  const root = makeFixture();
  const packageFile = path.join(root, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  delete packageJson.scripts["validate:gitflow"];
  fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2));
  const report = validateProductIterationWorkflow(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.script === "validate:gitflow"));
}

function testRemoteCoachEvidenceMustIncludeRoleQuestionBank() {
  const report = validateProductIterationWorkflow(makeFixture({
    "docs/evidence/server-remote/coach-artifacts.json": JSON.stringify({
      status: "PASS",
      coach: {
        jdInsights: { summary: true, evidence: true, question: true },
        roleQuestionBank: { followUpLabel: true, roleSpecificQuestion: false }
      },
      feedback: { summary: { reviewedCount: 1 } }
    }, null, 2)
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.issues && item.issues.includes("role_question_bank_not_proven")));
}

function testMissingRemoteCoachEvidenceWarnsOnly() {
  const root = makeFixture();
  fs.rmSync(path.join(root, "docs/evidence"), { recursive: true, force: true });
  const report = validateProductIterationWorkflow(root);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.status, "PASS_WITH_LIMITS");
  assert(report.warnings.some((item) => item.id === "remote_coach_artifacts" && item.code === "evidence_missing"));
}

function testCurrentRepoPassesProductIterationGate() {
  const report = validateProductIterationWorkflow(repoRoot);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
}

testFixturePassesWithRealProviderEvidence();
testFixtureWarnsWhenProviderIsFallbackOnly();
testMissingPrdVersionFails();
testMissingReactGateInNpmTestFails();
testMissingRequirementDevelopmentTemplateFails();
testMissingGitflowGovernanceFails();
testMissingGitflowScriptFails();
testRemoteCoachEvidenceMustIncludeRoleQuestionBank();
testMissingRemoteCoachEvidenceWarnsOnly();
testCurrentRepoPassesProductIterationGate();

console.log("产品迭代工作流门禁测试：10 项通过。");

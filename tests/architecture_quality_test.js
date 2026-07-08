#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateArchitectureQuality, lineCount } = require("../tools/validate_architecture_quality");
const { architectureQualityCheck } = require("../tools/delivery_readiness_architecture");

const repoRoot = path.resolve(__dirname, "..");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-quality-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "mirror"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/main.js"), "one\n");
  fs.writeFileSync(path.join(root, "mirror/main.js"), "one\n");
  return root;
}

function fixturePolicy(overrides = {}) {
  return {
    requiredFiles: [],
    sameHashGroups: [],
    fileLineBudgets: [],
    patternLineBudgets: [],
    ...overrides
  };
}

function testLineCountMatchesTrailingNewlineFiles() {
  assert.strictEqual(lineCount("one\n"), 1);
  assert.strictEqual(lineCount("one\ntwo"), 2);
}

function testLineBudgetFailure() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "src/main.js"), "one\ntwo\nthree\n");
  const report = validateArchitectureQuality(root, fixturePolicy({
    fileLineBudgets: [
      { file: "src/main.js", maxLines: 2, reason: "fixture budget" }
    ]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "line_budget_exceeded" && item.file === "src/main.js"));
}

function testSameHashFailure() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "mirror/main.js"), "different\n");
  const report = validateArchitectureQuality(root, fixturePolicy({
    sameHashGroups: [
      { id: "fixture_copy", files: ["src/main.js", "mirror/main.js"] }
    ]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "same_hash_group_mismatch"));
}

function testRequiredFileFailure() {
  const root = makeFixture();
  const report = validateArchitectureQuality(root, fixturePolicy({
    requiredFiles: ["src/missing.js"]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "required_architecture_module_missing"));
}

function testRustModuleSemanticBoundaryFailure() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "src/lib.rs"), "mod app_bootstrap;\n");
  const report = validateArchitectureQuality(root, fixturePolicy({
    semanticBoundaryRules: [
      {
        id: "fixture_rust_modules",
        type: "rust_modules",
        file: "src/lib.rs",
        requiredModules: ["app_bootstrap", "runtime_store"],
        reason: "fixture semantic boundary"
      }
    ]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => (
    item.code === "semantic_boundary_rust_module_missing"
    && item.missing.includes("runtime_store")
  )));
}

function testNodeRequireSemanticBoundaryFailure() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "src/main.js"), [
    "const http = require(\"http\");",
    "const fs = require(\"fs\");"
  ].join("\n"));
  const report = validateArchitectureQuality(root, fixturePolicy({
    semanticBoundaryRules: [
      {
        id: "fixture_node_requires",
        type: "node_requires",
        file: "src/main.js",
        allowedRequires: ["http"],
        requiredRequires: ["http"],
        reason: "fixture semantic boundary"
      }
    ]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => (
    item.code === "semantic_boundary_node_require_unexpected"
    && item.unexpected.includes("fs")
  )));
}

function testJavaNewClassSemanticBoundaryFailure() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "src/MainActivity.java"), [
    "class MainActivity {",
    "  void onCreate() {",
    "    new AndroidAppStartupController();",
    "    new AndroidSpeechBridge();",
    "  }",
    "}"
  ].join("\n"));
  const report = validateArchitectureQuality(root, fixturePolicy({
    semanticBoundaryRules: [
      {
        id: "fixture_java_new_classes",
        type: "java_new_classes",
        file: "src/MainActivity.java",
        allowedNewClasses: ["AndroidAppStartupController"],
        requiredNewClasses: ["AndroidAppStartupController"],
        reason: "fixture semantic boundary"
      }
    ]
  }));
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => (
    item.code === "semantic_boundary_java_new_class_unexpected"
    && item.unexpected.includes("AndroidSpeechBridge")
  )));
}

function testCurrentRepoPassesArchitectureGate() {
  const report = validateArchitectureQuality(repoRoot);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert(report.metrics.sourceFileCount > 50);
  assert(report.metrics.semanticBoundaryRuleCount >= 3);
  assert(fs.readFileSync(path.join(repoRoot, "assets/schedule.js"), "utf8").includes("reactTodayPath"));
  assert(!report.metrics.largestFiles.some((item) => item.file === "assets/schedule.js"));
}

function testReadinessArchitectureWrapperFailsOnMissingModules() {
  const root = makeFixture();
  const check = architectureQualityCheck(root);
  assert.strictEqual(check.status, "FAIL");
  assert.strictEqual(check.reason, "architecture_quality_findings_present");
}

function testReadinessArchitectureWrapperPassesCurrentRepo() {
  const check = architectureQualityCheck(repoRoot);
  assert.strictEqual(check.status, "PASS", JSON.stringify(check, null, 2));
  assert(check.sourceFileCount > 50);
  assert(check.requiredFileCount >= 50);
  assert(check.semanticBoundaryRuleCount >= 3);
}

testLineCountMatchesTrailingNewlineFiles();
testLineBudgetFailure();
testSameHashFailure();
testRequiredFileFailure();
testRustModuleSemanticBoundaryFailure();
testNodeRequireSemanticBoundaryFailure();
testJavaNewClassSemanticBoundaryFailure();
testCurrentRepoPassesArchitectureGate();
testReadinessArchitectureWrapperFailsOnMissingModules();
testReadinessArchitectureWrapperPassesCurrentRepo();

console.log("架构质量门禁测试：10 项通过。");

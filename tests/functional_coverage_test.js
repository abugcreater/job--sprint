#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateFunctionalCoverage, valueAt } = require("../tools/validate_functional_coverage");

const repoRoot = path.resolve(__dirname, "..");

function writeFile(root, file, text) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "functional-coverage-"));
  writeFile(root, "package.json", JSON.stringify({
    private: true,
    scripts: {
      "test:functional": "node tests/react_functional_persistence_test.js",
      "test:rust:functional": "node tests/rust_sqlite_ui_persistence_test.js",
      "test:android:functional": "node tests/android_webview_functional_persistence_test.js",
      "test:android:remote:functional": "node tools/run_android_remote_functional_evidence.js --remote",
      "test:local-functional": "npm run test:functional && npm run test:rust:functional",
      "test:release": "npm test && npm run test:local-functional"
    }
  }, null, 2));
  writeFile(root, "tests/react_functional_persistence_test.js", [
    "今日 AI 教练 延期原因 准备工作台 生成 AI 建议 userProfiles aiArtifacts 知识边界 面试训练 机会工作台 今日复盘 账号与数据",
    "导入个人数据备份 browser restart should preserve expected localStorage bytes and hashes",
    "mobile viewport should read the injected desktop storage without mutation waitForServerRuntimeText",
    "react-functional-persistence-report.json"
  ].join("\n"));
  writeFile(root, "tests/android_webview_functional_persistence_test.js", [
    "Android 延期原因 准备工作台 生成 AI 建议 profileCount aiArtifactCount 知识边界 面试训练 机会工作台 今日复盘 账号与数据 导入个人数据备份",
    "AUTH_EVIDENCE sessionStates am\", \"force-stop\"",
    "Android app restart should preserve expected localStorage bytes and hashes",
    "android-webview-functional-persistence-report.json"
  ].join("\n"));
  writeFile(root, "tests/rust_sqlite_ui_persistence_test.js", [
    "JOB_SPRINT_RUNTIME_DB_PATH runtimeStorage === \"sqlite\" 延期原因 准备工作台 生成 AI 建议 userProfiles aiArtifacts 面试训练 机会工作台 今日复盘 账号与数据",
    "导入个人数据备份 sqliteSnapshot runtime_items progress reviews applications interview_mistakes",
    "rust-sqlite-ui-persistence-report.json"
  ].join("\n"));
  writeFile(root, "docs/evidence/android-functional/android-webview-functional-persistence-report.json", JSON.stringify({
    status: "PASS",
    mode: "local",
    authEvidence: {
      mode: "local",
      sessionStates: [{ skipped: "local_webview" }]
    },
    flowSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1,
          evidenceTypes: ["delivery_record", "learning_note", "oral_score", "review"],
        delayReasons: ["Android 延期原因"],
        profileCount: 1,
        boundaryCount: 2,
        scheduleEventCount: 2,
        aiArtifactCount: 3
      },
      learningMarkedCount: 1,
      interviewWeakCount: 1
    },
    restartSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1,
        profileCount: 1,
        boundaryCount: 2,
        scheduleEventCount: 2,
        aiArtifactCount: 3
      }
    }
  }, null, 2));
  writeFile(root, "docs/evidence/rust-functional/rust-sqlite-ui-persistence-report.json", JSON.stringify({
    status: "PASS",
    dbPathWasTemporary: true,
    runtimeItemKeys: ["applications", "interview_mistakes", "progress", "reviews"],
    delayCount: 2,
    reviewCount: 2,
    applicationCount: 1,
    interviewMistakeCount: 1,
    profileCount: 1,
    boundaryCount: 2,
    scheduleEventCount: 2,
    aiArtifactCount: 3
  }, null, 2));
  return root;
}

function testValueAtReadsNestedKeys() {
  assert.strictEqual(valueAt({ a: { b: 1 } }, "a.b"), 1);
  assert.strictEqual(valueAt({ a: {} }, "a.b"), undefined);
}

function testFixturePasses() {
  const report = validateFunctionalCoverage(makeFixture());
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
}

function testMissingAndroidRestartCoverageFails() {
  const root = makeFixture();
  const file = path.join(root, "tests/android_webview_functional_persistence_test.js");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("am\", \"force-stop\"", ""));
  const report = validateFunctionalCoverage(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "coverage_tokens_missing" && item.target === "android_webview_functional_flow"));
}

function testInvalidEvidenceFails() {
  const root = makeFixture();
  writeFile(root, "docs/evidence/rust-functional/rust-sqlite-ui-persistence-report.json", JSON.stringify({
    status: "PASS",
    dbPathWasTemporary: true,
    runtimeItemKeys: ["progress"],
    delayCount: 0,
    reviewCount: 0,
    applicationCount: 0,
    interviewMistakeCount: 0
  }, null, 2));
  const report = validateFunctionalCoverage(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => item.code === "functional_evidence_array_values_missing"));
  assert(report.findings.some((item) => item.code === "functional_evidence_min_value_not_met"));
}

function testMissingAndroidAuthEvidenceFails() {
  const root = makeFixture();
  writeFile(root, "docs/evidence/android-functional/android-webview-functional-persistence-report.json", JSON.stringify({
    status: "PASS",
    mode: "local",
    flowSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1,
        evidenceTypes: ["delivery_record", "learning_note", "oral_score", "review"],
        delayReasons: ["Android 延期原因"],
        profileCount: 1,
        boundaryCount: 2,
        scheduleEventCount: 2,
        aiArtifactCount: 3
      },
      learningMarkedCount: 1,
      interviewWeakCount: 1
    },
    restartSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1,
        profileCount: 1,
        boundaryCount: 2,
        scheduleEventCount: 2,
        aiArtifactCount: 3
      }
    }
  }, null, 2));
  const report = validateFunctionalCoverage(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((item) => (
    item.code === "functional_evidence_required_value_mismatch"
    && item.key === "authEvidence.mode"
  )));
  assert(report.findings.some((item) => (
    item.code === "functional_evidence_min_value_not_met"
    && item.key === "authEvidence.sessionStates.length"
  )));
}

function testMissingOptionalEvidenceWarnsOnly() {
  const root = makeFixture();
  fs.rmSync(path.join(root, "docs/evidence"), { recursive: true, force: true });
  const report = validateFunctionalCoverage(root);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  const missingEvidence = report.findings.filter((item) => item.code === "functional_evidence_report_missing");
  assert.strictEqual(missingEvidence.length, 2);
  assert(missingEvidence.every((item) => item.severity === "warning"));
}

function testCurrentRepoPasses() {
  const report = validateFunctionalCoverage(repoRoot);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.metrics.coverageTargetCount, 4);
  assert.strictEqual(report.metrics.evidenceReportCount, 2);
}

testValueAtReadsNestedKeys();
testFixturePasses();
testMissingAndroidRestartCoverageFails();
testInvalidEvidenceFails();
testMissingAndroidAuthEvidenceFails();
testMissingOptionalEvidenceWarnsOnly();
testCurrentRepoPasses();

console.log("功能覆盖门禁测试：7 项通过。");

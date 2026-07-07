#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateFeatureParity, valueAt } = require("../tools/validate_feature_parity");

const repoRoot = path.resolve(__dirname, "..");

function writeFile(root, file, text) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "feature-parity-"));
  writeFile(root, "package.json", JSON.stringify({
    scripts: {
      "test:functional": "node tests/react_functional_persistence_test.js",
      "test:android:functional": "node tests/android_webview_functional_persistence_test.js",
      "test:android:remote:functional": "node tests/android_webview_functional_persistence_test.js --remote"
    }
  }, null, 2));
  writeFile(root, "tests/react_functional_persistence_test.js", [
    "用户名 密码 进入工作台 今日 AI 教练 delivery_record learning_note",
    "延期原因 delayRecords 知识边界 learningKnowledgeMarks 面试训练 interviewWeakQuestions",
    "AI 教练设置 生成 AI 草稿 userProfiles knowledgeBoundaries coachScheduleEvents aiArtifacts",
    "机会验证 applications 复盘归因 review 更多入口 导出 JSON 导入 React 状态 JSON",
    "browser restart should preserve expected localStorage bytes and hashes"
  ].join("\n"));
  writeFile(root, "tests/android_webview_functional_persistence_test.js", [
    "AUTH_EVIDENCE loginPageSeen loginAttempted sessionStates readSessionState",
    "assertExpectedStorage Android 延期原因 delayRecords",
    "AI 教练设置 生成 AI 草稿 profileCount aiArtifactCount",
    "知识边界 learningMarkedCount 面试训练 interviewWeakCount 机会验证 applications 复盘归因 review",
    "更多入口 导入 React 状态 JSON android-webview-functional-persistence-report.json",
    "am\", \"force-stop\" Android app restart should preserve expected localStorage bytes and hashes"
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
        aiArtifactCount: 3
      }
    }
  }, null, 2));
  return root;
}

function testValueAtReadsNestedKeys() {
  assert.strictEqual(valueAt({ a: { b: 1 } }, "a.b"), 1);
  assert.strictEqual(valueAt({ a: {} }, "a.b"), undefined);
}

function testFixturePasses() {
  const report = validateFeatureParity(makeFixture());
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.metrics.featureCount, 10);
  assert.strictEqual(report.metrics.passCount, 10);
}

function testMissingAndroidDelayFails() {
  const root = makeFixture();
  const file = path.join(root, "tests/android_webview_functional_persistence_test.js");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Android 延期原因", ""));
  const report = validateFeatureParity(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((finding) => (
    finding.code === "feature_parity_tokens_missing"
    && finding.feature === "delay_records"
    && finding.side === "android"
  )));
}

function testInvalidAndroidEvidenceFails() {
  const root = makeFixture();
  writeFile(root, "docs/evidence/android-functional/android-webview-functional-persistence-report.json", JSON.stringify({
    status: "PASS",
    mode: "local",
    flowSnapshot: {
      react: {
        evidenceCount: 1,
        delayCount: 0,
        evidenceTypes: []
      },
      learningMarkedCount: 0,
      interviewWeakCount: 0
    },
    restartSnapshot: {
      react: {
        evidenceCount: 0,
        delayCount: 0
      }
    }
  }, null, 2));
  const report = validateFeatureParity(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((finding) => finding.code === "feature_parity_evidence_min_not_met"));
  assert(report.findings.some((finding) => finding.code === "feature_parity_evidence_types_missing"));
}

function testMissingLoginSessionEvidenceFails() {
  const root = makeFixture();
  writeFile(root, "docs/evidence/android-functional/android-webview-functional-persistence-report.json", JSON.stringify({
    status: "PASS",
    mode: "local",
    flowSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1,
        evidenceTypes: ["delivery_record", "learning_note", "oral_score", "review"]
      },
      learningMarkedCount: 1,
      interviewWeakCount: 1
    },
    restartSnapshot: {
      react: {
        evidenceCount: 5,
        delayCount: 1
      }
    }
  }, null, 2));
  const report = validateFeatureParity(root);
  assert.strictEqual(report.ok, false);
  assert(report.findings.some((finding) => (
    finding.code === "feature_parity_evidence_required_value_mismatch"
    && finding.feature === "login_and_session"
    && finding.key === "authEvidence.mode"
  )));
  assert(report.findings.some((finding) => (
    finding.code === "feature_parity_evidence_min_not_met"
    && finding.feature === "login_and_session"
    && finding.key === "authEvidence.sessionStates.length"
  )));
}

function testCurrentRepoPasses() {
  const report = validateFeatureParity(repoRoot);
  assert.strictEqual(report.ok, true, JSON.stringify(report, null, 2));
  assert.strictEqual(report.metrics.featureCount, 10);
  assert.strictEqual(report.metrics.passCount, 10);
}

testValueAtReadsNestedKeys();
testFixturePasses();
testMissingAndroidDelayFails();
testInvalidAndroidEvidenceFails();
testMissingLoginSessionEvidenceFails();
testCurrentRepoPasses();

console.log("功能对齐门禁测试：6 项通过。");

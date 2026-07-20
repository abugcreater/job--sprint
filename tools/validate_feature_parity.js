#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);

const featureMatrix = [
  {
    id: "login_and_session",
    web: ["用户名", "密码", "进入工作台"],
    android: ["AUTH_EVIDENCE", "loginPageSeen", "loginAttempted", "sessionStates", "readSessionState"],
    requiredEvidence: [
      ["authEvidence.mode", "local"]
    ],
    min: [["authEvidence.sessionStates.length", 1]],
    capabilityOnly: true
  },
  {
    id: "today_completion_and_evidence",
    web: ["今日 AI 教练", "delivery_record", "learning_note"],
    android: ["assertExpectedStorage"],
    evidenceTypes: ["delivery_record", "learning_note"]
  },
  {
    id: "delay_records",
    web: ["延期原因", "delayRecords"],
    android: ["Android 延期原因", "delayRecords"],
    min: [["flowSnapshot.react.delayCount", 1], ["restartSnapshot.react.delayCount", 1]]
  },
  {
    id: "learning_workspace",
    web: ["知识边界", "learningKnowledgeMarks"],
    android: ["知识边界", "learningMarkedCount"],
    min: [["flowSnapshot.learningMarkedCount", 1]]
  },
  {
    id: "coach_personalization",
    web: ["准备工作台", "生成 AI 建议", "userProfiles", "knowledgeBoundaries", "coachScheduleEvents", "aiArtifacts"],
    android: ["准备工作台", "生成 AI 建议", "profileCount", "aiArtifactCount"],
    min: [
      ["flowSnapshot.react.profileCount", 1],
      ["flowSnapshot.react.boundaryCount", 2],
      ["flowSnapshot.react.scheduleEventCount", 2],
      ["flowSnapshot.react.aiArtifactCount", 3],
      ["restartSnapshot.react.profileCount", 1],
      ["restartSnapshot.react.aiArtifactCount", 3]
    ]
  },
  {
    id: "interview_training",
    web: ["面试训练", "interviewWeakQuestions"],
    android: ["面试训练", "interviewWeakCount"],
    min: [["flowSnapshot.interviewWeakCount", 1]],
    evidenceTypes: ["oral_score"]
  },
  {
    id: "application_tracking",
    web: ["机会工作台", "applications"],
    android: ["机会工作台", "applications"],
    evidenceTypes: ["delivery_record"]
  },
  {
    id: "daily_review",
    web: ["今日复盘", "review"],
    android: ["今日复盘", "review"],
    evidenceTypes: ["review"]
  },
  {
    id: "more_import_export",
    web: ["账号与数据", "导出 JSON", "导入个人数据备份"],
    android: ["账号与数据", "导入个人数据备份", "android-webview-functional-persistence-report.json"]
  },
  {
    id: "restart_persistence",
    web: ["browser restart should preserve expected localStorage bytes and hashes"],
    android: ["am\", \"force-stop\"", "Android app restart should preserve expected localStorage bytes and hashes"],
    min: [["restartSnapshot.react.evidenceCount", 5]]
  }
];

const requiredScripts = {
  "test:functional": "node tests/react_functional_persistence_test.js",
  "test:android:functional": "node tests/android_webview_functional_persistence_test.js",
  "test:android:remote:functional": "node tools/run_android_remote_functional_evidence.js --remote"
};

function readText(root, file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(root, file) {
  return JSON.parse(readText(root, file));
}

function valueAt(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => (
    current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
  ), object);
}

function packageScriptFindings(root) {
  const findings = [];
  const packageJson = readJson(root, "package.json");
  const scripts = packageJson.scripts || {};
  for (const [name, expected] of Object.entries(requiredScripts)) {
    if (scripts[name] !== expected) {
      findings.push({
        code: "feature_parity_script_mismatch",
        severity: "error",
        script: name,
        expected,
        actual: scripts[name] || null
      });
    }
  }
  return findings;
}

function textFindingsForFeature(feature, side, text) {
  const tokens = feature[side] || [];
  const missing = tokens.filter((token) => !text.includes(token));
  return missing.length
    ? [{
        code: "feature_parity_tokens_missing",
        severity: "error",
        feature: feature.id,
        side,
        missing
      }]
    : [];
}

function evidenceFindingsForFeature(feature, report) {
  const findings = [];
  for (const [key, expected] of feature.requiredEvidence || []) {
    const actual = valueAt(report, key);
    if (actual !== expected) {
      findings.push({
        code: "feature_parity_evidence_required_value_mismatch",
        severity: "error",
        feature: feature.id,
        key,
        expected,
        actual
      });
    }
  }

  for (const [key, min] of feature.min || []) {
    const actual = valueAt(report, key);
    if (typeof actual !== "number" || actual < min) {
      findings.push({
        code: "feature_parity_evidence_min_not_met",
        severity: "error",
        feature: feature.id,
        key,
        min,
        actual
      });
    }
  }

  const flowEvidenceTypes = valueAt(report, "flowSnapshot.react.evidenceTypes") || [];
  const missingTypes = (feature.evidenceTypes || []).filter((type) => !Array.isArray(flowEvidenceTypes) || !flowEvidenceTypes.includes(type));
  if (missingTypes.length) {
    findings.push({
      code: "feature_parity_evidence_types_missing",
      severity: "error",
      feature: feature.id,
      missing: missingTypes
    });
  }
  return findings;
}

function androidEvidenceFindings(root) {
  const file = path.join(root, "docs/evidence/android-functional/android-webview-functional-persistence-report.json");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {
      report: null,
      findings: [{
        code: "feature_parity_android_evidence_missing",
        severity: "warning",
        file: "docs/evidence/android-functional/android-webview-functional-persistence-report.json"
      }]
    };
  }
  try {
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    const findings = [];
    if (report.status !== "PASS") {
      findings.push({
        code: "feature_parity_android_evidence_status_not_pass",
        severity: "error",
        actual: report.status
      });
    }
    if (report.mode !== "local") {
      findings.push({
        code: "feature_parity_android_evidence_mode_not_local",
        severity: "error",
        actual: report.mode
      });
    }
    return { report, findings };
  } catch (error) {
    return {
      report: null,
      findings: [{
        code: "feature_parity_android_evidence_invalid_json",
        severity: "error",
        error: error.message
      }]
    };
  }
}

function validateFeatureParity(root = repoRoot) {
  const findings = [...packageScriptFindings(root)];
  const webText = readText(root, "tests/react_functional_persistence_test.js");
  const androidText = readText(root, "tests/android_webview_functional_persistence_test.js");
  const androidEvidence = androidEvidenceFindings(root);
  findings.push(...androidEvidence.findings);

  const features = featureMatrix.map((feature) => {
    const featureFindings = [
      ...textFindingsForFeature(feature, "web", webText),
      ...textFindingsForFeature(feature, "android", androidText),
      ...(androidEvidence.report ? evidenceFindingsForFeature(feature, androidEvidence.report) : [])
    ];
    findings.push(...featureFindings);
    return {
      id: feature.id,
      status: featureFindings.length ? "FAIL" : "PASS",
      capabilityOnly: Boolean(feature.capabilityOnly)
    };
  });

  return {
    ok: findings.every((finding) => finding.severity !== "error"),
    findings,
    features,
    metrics: {
      featureCount: featureMatrix.length,
      passCount: features.filter((feature) => feature.status === "PASS").length,
      capabilityOnlyCount: features.filter((feature) => feature.capabilityOnly).length
    }
  };
}

function printReport(report) {
  if (argSet.has("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (report.ok) {
    console.log(`功能对齐门禁通过：${report.metrics.passCount}/${report.metrics.featureCount} 个功能对齐。`);
    const warnings = report.findings.filter((finding) => finding.severity === "warning");
    warnings.forEach((finding) => {
      const target = finding.feature || finding.file || finding.script || "(repo)";
      console.log(`- ${target} [${finding.code}] warning`);
    });
    return;
  }
  console.log(`功能对齐门禁失败：发现 ${report.findings.length} 个阻断问题。`);
  for (const finding of report.findings) {
    const target = finding.feature || finding.file || finding.script || "(repo)";
    console.log(`- ${target} [${finding.code}]`);
  }
}

if (require.main === module) {
  const report = validateFeatureParity(repoRoot);
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  validateFeatureParity,
  valueAt
};

#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const requiredPackageScripts = {
  "test:functional": "node tests/react_functional_persistence_test.js",
  "test:rust:functional": "node tests/rust_sqlite_ui_persistence_test.js",
  "test:android:functional": "node tests/android_webview_functional_persistence_test.js",
  "test:android:remote:functional": "node tests/android_webview_functional_persistence_test.js --remote",
  "test:local-functional": "npm run test:functional && npm run test:rust:functional"
};

const coverageTargets = [
  {
    id: "web_functional_flow",
    file: "tests/react_functional_persistence_test.js",
    requiredText: [
      "今日 AI 教练",
      "延期原因",
      "AI 教练设置",
      "生成 AI 草稿",
      "userProfiles",
      "aiArtifacts",
      "知识边界",
      "面试训练",
      "机会验证",
      "复盘归因",
      "更多入口",
      "导入 React 状态 JSON",
      "browser restart should preserve expected localStorage bytes and hashes",
      "mobile viewport should read the injected desktop storage without mutation",
      "waitForServerRuntimeText",
      "react-functional-persistence-report.json"
    ]
  },
  {
    id: "android_webview_functional_flow",
    file: "tests/android_webview_functional_persistence_test.js",
    requiredText: [
      "Android 延期原因",
      "AI 教练设置",
      "生成 AI 草稿",
      "profileCount",
      "aiArtifactCount",
      "知识边界",
      "面试训练",
      "机会验证",
      "复盘归因",
      "更多入口",
      "导入 React 状态 JSON",
      "AUTH_EVIDENCE",
      "sessionStates",
      "am\", \"force-stop\"",
      "Android app restart should preserve expected localStorage bytes and hashes",
      "android-webview-functional-persistence-report.json"
    ]
  },
  {
    id: "rust_sqlite_ui_persistence_flow",
    file: "tests/rust_sqlite_ui_persistence_test.js",
    requiredText: [
      "JOB_SPRINT_RUNTIME_DB_PATH",
      "runtimeStorage === \"sqlite\"",
      "延期原因",
      "AI 教练设置",
      "生成 AI 草稿",
      "userProfiles",
      "aiArtifacts",
      "面试训练",
      "机会验证",
      "复盘归因",
      "更多入口",
      "导入 React 状态 JSON",
      "sqliteSnapshot",
      "runtime_items",
      "progress",
      "reviews",
      "applications",
      "interview_mistakes",
      "rust-sqlite-ui-persistence-report.json"
    ]
  },
  {
    id: "delivery_release_gate_wires_functional_tests",
    file: "package.json",
    requiredText: [
      "\"test:functional\"",
      "\"test:rust:functional\"",
      "\"test:android:functional\"",
      "\"test:android:remote:functional\"",
      "\"test:local-functional\"",
      "npm run test:local-functional"
    ]
  }
];

const evidenceReports = [
  {
    id: "android_local_functional_evidence",
    file: "docs/evidence/android-functional/android-webview-functional-persistence-report.json",
    required: [
      ["status", "PASS"],
      ["mode", "local"],
      ["authEvidence.mode", "local"]
    ],
    min: [
      ["authEvidence.sessionStates.length", 1],
      ["flowSnapshot.react.evidenceCount", 5],
      ["restartSnapshot.react.evidenceCount", 5],
      ["flowSnapshot.react.delayCount", 1],
      ["restartSnapshot.react.delayCount", 1],
      ["flowSnapshot.react.profileCount", 1],
      ["restartSnapshot.react.profileCount", 1],
      ["flowSnapshot.react.boundaryCount", 2],
      ["restartSnapshot.react.boundaryCount", 2],
      ["flowSnapshot.react.scheduleEventCount", 2],
      ["restartSnapshot.react.scheduleEventCount", 2],
      ["flowSnapshot.react.aiArtifactCount", 3],
      ["restartSnapshot.react.aiArtifactCount", 3],
      ["flowSnapshot.learningMarkedCount", 1],
      ["flowSnapshot.interviewWeakCount", 1]
    ],
    requiredText: [
      "Android 延期原因",
      "delivery_record",
      "learning_note",
      "oral_score",
      "review"
    ]
  },
  {
    id: "rust_sqlite_functional_evidence",
    file: "docs/evidence/rust-functional/rust-sqlite-ui-persistence-report.json",
    required: [
      ["status", "PASS"],
      ["dbPathWasTemporary", true]
    ],
    min: [
      ["delayCount", 2],
      ["reviewCount", 2],
      ["applicationCount", 1],
      ["interviewMistakeCount", 1],
      ["profileCount", 1],
      ["boundaryCount", 2],
      ["scheduleEventCount", 2],
      ["aiArtifactCount", 3]
    ],
    requiredArrayValues: [
      ["runtimeItemKeys", ["applications", "interview_mistakes", "progress", "reviews"]]
    ]
  }
];

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
  for (const [name, expected] of Object.entries(requiredPackageScripts)) {
    if (scripts[name] !== expected) {
      findings.push({
        code: "functional_script_mismatch",
        severity: "error",
        script: name,
        expected,
        actual: scripts[name] || null
      });
    }
  }
  return findings;
}

function textCoverageFindings(root) {
  const findings = [];
  for (const target of coverageTargets) {
    const file = path.join(root, target.file);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      findings.push({
        code: "coverage_file_missing",
        severity: "error",
        target: target.id,
        file: target.file
      });
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    const missing = target.requiredText.filter((item) => !text.includes(item));
    if (missing.length) {
      findings.push({
        code: "coverage_tokens_missing",
        severity: "error",
        target: target.id,
        file: target.file,
        missing
      });
    }
  }
  return findings;
}

function evidenceFindings(root) {
  const findings = [];
  for (const reportSpec of evidenceReports) {
    const file = path.join(root, reportSpec.file);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      findings.push({
        code: "functional_evidence_report_missing",
        severity: "error",
        report: reportSpec.id,
        file: reportSpec.file
      });
      continue;
    }

    let report;
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
      report = JSON.parse(text);
    } catch (error) {
      findings.push({
        code: "functional_evidence_report_invalid_json",
        severity: "error",
        report: reportSpec.id,
        file: reportSpec.file,
        error: error.message
      });
      continue;
    }

    for (const [key, expected] of reportSpec.required || []) {
      const actual = valueAt(report, key);
      if (actual !== expected) {
        findings.push({
          code: "functional_evidence_required_value_mismatch",
          severity: "error",
          report: reportSpec.id,
          file: reportSpec.file,
          key,
          expected,
          actual
        });
      }
    }

    for (const [key, min] of reportSpec.min || []) {
      const actual = valueAt(report, key);
      if (typeof actual !== "number" || actual < min) {
        findings.push({
          code: "functional_evidence_min_value_not_met",
          severity: "error",
          report: reportSpec.id,
          file: reportSpec.file,
          key,
          min,
          actual
        });
      }
    }

    for (const token of reportSpec.requiredText || []) {
      if (!text.includes(token)) {
        findings.push({
          code: "functional_evidence_text_missing",
          severity: "error",
          report: reportSpec.id,
          file: reportSpec.file,
          token
        });
      }
    }

    for (const [key, expectedValues] of reportSpec.requiredArrayValues || []) {
      const actual = valueAt(report, key);
      const missing = expectedValues.filter((item) => !Array.isArray(actual) || !actual.includes(item));
      if (missing.length) {
        findings.push({
          code: "functional_evidence_array_values_missing",
          severity: "error",
          report: reportSpec.id,
          file: reportSpec.file,
          key,
          missing
        });
      }
    }
  }
  return findings;
}

function validateFunctionalCoverage(root = repoRoot) {
  const findings = [
    ...packageScriptFindings(root),
    ...textCoverageFindings(root),
    ...evidenceFindings(root)
  ];
  return {
    ok: findings.length === 0,
    findings,
    metrics: {
      coverageTargetCount: coverageTargets.length,
      evidenceReportCount: evidenceReports.length,
      requiredPackageScriptCount: Object.keys(requiredPackageScripts).length
    }
  };
}

function printReport(report) {
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (report.ok) {
    console.log(`功能覆盖门禁通过：${report.metrics.coverageTargetCount} 个覆盖目标，${report.metrics.evidenceReportCount} 份证据报告。`);
  } else {
    console.log(`功能覆盖门禁失败：发现 ${report.findings.length} 个阻断问题。`);
    report.findings.forEach((finding) => {
      const location = finding.file || finding.script || finding.report || finding.target || "(repo)";
      console.log(`- ${location} [${finding.code}]`);
    });
  }
}

if (require.main === module) {
  const report = validateFunctionalCoverage(repoRoot);
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  validateFunctionalCoverage,
  valueAt
};

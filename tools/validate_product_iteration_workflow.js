#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const docChecks = [
  {
    id: "prd_options_multiple_versions",
    file: "docs/product/it-job-coach-v1/prd-options.md",
    tokens: ["版本 A：保守个人闭环版", "版本 B：泛 IT 多用户版", "版本 C：AI 原生教练版", "团队裁决"]
  },
  {
    id: "recommended_prd_contract",
    file: "docs/product/it-job-coach-v1/prd-recommended.md",
    tokens: ["面向泛 IT 求职者", "北极星指标", "每周有效求职推进数", "AI 不能直接修改正式日程，只能生成草稿"]
  },
  {
    id: "team_review_adjudication",
    file: "docs/product/it-job-coach-v1/review-and-adjudication.md",
    tokens: ["采用 `prd-recommended.md` 作为主合同", "TEAM_ROOM_PARTIAL", "AI 输出必须先落入 artifact 草稿"]
  },
  {
    id: "development_workflow_reusable",
    file: "docs/product/it-job-coach-v1/development-workflow.md",
    tokens: ["阶段 0：PRD 冻结", "团队分工规则", "防关闭智能体异常规则", "防 UI 功能不可用规则", "AI 教练功能规则"]
  },
  {
    id: "product_ledger_limits",
    file: "docs/product/product-ops/product-ledger.md",
    tokens: ["current_thread_quarantine=true", "不能标 `TEAM_ROOM_PASS`", "不替代真实 LLM 线上 evidence"]
  },
  {
    id: "known_issues_external_limits",
    file: "docs/product/product-ops/known-issues.md",
    tokens: ["远端真实 LLM provider evidence 已通过", "Android 远端 HTTPS 真机 evidence 缺失", "当前线程 AI 团队处于 quarantine"]
  },
  {
    id: "doc_rules_no_false_team_pass",
    file: "docs/product/product-ops/doc-rules.md",
    tokens: ["current_thread_quarantine=true", "TEAM_ROOM_PARTIAL", "不能标 `TEAM_ROOM_PASS`"]
  },
  {
    id: "requirement_development_template_reusable",
    file: "docs/product/product-ops/requirement-development-template.md",
    tokens: ["# 需求开发复用模板", "复制入口", "标准需求卡", "数据隔离清单", "UI/UX 实现约束", "分层验收命令", "最终报告模板"]
  },
  {
    id: "completion_audit_scope",
    file: "docs/product/it-job-coach-v1/completion-audit.md",
    tokens: ["PASS_WITH_LIMITS", "当前团队工作是 `TEAM_ROOM_PARTIAL`", "远端真实 LLM provider evidence", "Android 远端 HTTPS evidence"]
  },
  {
    id: "product_success_metrics_visible",
    file: "docs/product/it-job-coach-v1/product-completeness-and-ai-expansion-2026-07-07.md",
    tokens: ["成功指标进入产品页", "本周有效推进", "采纳后完成", "面试复盘", "/api/coach/outcomes"]
  }
];

function readText(root, file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(root, file) {
  return JSON.parse(readText(root, file));
}

function fileExists(root, file) {
  const target = path.join(root, file);
  return fs.existsSync(target) && fs.statSync(target).isFile();
}

function relPath(root, file) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);
  return relative.startsWith("..") ? absolute : relative;
}

function addMissingTokens(root, findings, check) {
  if (!fileExists(root, check.file)) {
    findings.push({
      id: check.id,
      code: "required_product_doc_missing",
      file: check.file,
      missing: [`file:${check.file}`]
    });
    return;
  }
  const text = readText(root, check.file);
  const missing = check.tokens.filter((token) => !text.includes(token));
  if (missing.length) {
    findings.push({
      id: check.id,
      code: "required_product_doc_token_missing",
      file: check.file,
      missing
    });
  }
}

function scriptValue(root, name) {
  try {
    const scripts = readJson(root, "package.json").scripts || {};
    return scripts[name] ? String(scripts[name]) : "";
  } catch {
    return "";
  }
}

function requireScriptContains(root, findings, scriptName, tokens) {
  const script = scriptValue(root, scriptName);
  if (!script) {
    findings.push({
      id: `script_${scriptName}`,
      code: "required_package_script_missing",
      script: scriptName,
      missing: [`script:${scriptName}`]
    });
    return;
  }
  const missing = tokens.filter((token) => !script.includes(token));
  if (missing.length) {
    findings.push({
      id: `script_${scriptName}`,
      code: "required_package_script_token_missing",
      script: scriptName,
      missing
    });
  }
}

function parseEvidence(root, file) {
  if (!fileExists(root, file)) {
    return {
      ok: false,
      reason: "evidence_missing",
      evidence: relPath(root, file)
    };
  }
  try {
    return {
      ok: true,
      evidence: relPath(root, file),
      report: readJson(root, file)
    };
  } catch (error) {
    return {
      ok: false,
      reason: "evidence_invalid_json",
      evidence: relPath(root, file),
      error: error.message
    };
  }
}

function validateCoachEvidence(root, findings, warnings) {
  const evidence = parseEvidence(root, "docs/evidence/server-remote/coach-artifacts.json");
  if (!evidence.ok) {
    const target = evidence.reason === "evidence_missing" ? warnings : findings;
    target.push({
      id: "remote_coach_artifacts",
      code: evidence.reason,
      evidence: evidence.evidence,
      error: evidence.error,
      reason: evidence.reason === "evidence_missing"
        ? "远端 coach artifact evidence 不进入开源源码包；发布交付阶段需要重新生成。"
        : undefined
    });
    return;
  }
  const report = evidence.report;
  const issues = [];
  if (report.status !== "PASS") issues.push("status_not_pass");
  if (!report.coach || !report.coach.jdInsights || !Object.values(report.coach.jdInsights).every(Boolean)) {
    issues.push("jd_insights_not_proven");
  }
  if (!report.coach || !report.coach.roleQuestionBank || !Object.values(report.coach.roleQuestionBank).every(Boolean)) {
    issues.push("role_question_bank_not_proven");
  }
  if (!report.feedback || !report.feedback.summary || Number(report.feedback.summary.reviewedCount || 0) < 1) {
    issues.push("feedback_summary_not_proven");
  }
  if (issues.length) {
    findings.push({
      id: "remote_coach_artifacts",
      code: "remote_coach_evidence_invalid",
      evidence: evidence.evidence,
      issues
    });
  }
  if (report.health && report.health.apiConfigured === false) {
    warnings.push({
      id: "remote_provider_not_configured",
      code: "known_delivery_limit",
      evidence: evidence.evidence,
      reason: "远端真实 LLM provider 未配置，当前 evidence 只能证明 local-fallback 和合同路径。"
    });
  }
}

function validateProductIterationWorkflow(root = repoRoot) {
  const findings = [];
  const warnings = [];

  docChecks.forEach((check) => addMissingTokens(root, findings, check));
  requireScriptContains(root, findings, "test", [
    "npm --prefix apps/react-web run typecheck",
    "npm --prefix apps/react-web test",
    "node tests/product_iteration_workflow_test.js"
  ]);
  requireScriptContains(root, findings, "test:release", [
    "npm test",
    "npm run test:local-functional",
    "npm run build:rust:linux",
    "npm run build:server-delivery"
  ]);
  requireScriptContains(root, findings, "validate:product-iteration", [
    "node tools/validate_product_iteration_workflow.js"
  ]);
  requireScriptContains(root, findings, "diagnose:coach-runtime", [
    "node tools/diagnose_coach_artifacts_runtime.js"
  ]);
  requireScriptContains(root, findings, "test:coach-runtime-diagnostic", [
    "node tests/coach_artifacts_runtime_diagnostic_test.js"
  ]);
  validateCoachEvidence(root, findings, warnings);

  return {
    ok: findings.length === 0,
    status: findings.length ? "FAIL" : warnings.length ? "PASS_WITH_LIMITS" : "PASS",
    findings,
    warnings,
    metrics: {
      checkedDocs: docChecks.length,
      warningCount: warnings.length
    }
  };
}

function printReport(report) {
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (report.ok) {
    console.log(`产品迭代工作流门禁通过：${report.status}，检查 ${report.metrics.checkedDocs} 份产品文档。`);
  } else {
    console.log(`产品迭代工作流门禁失败：${report.findings.length} 个阻断问题。`);
    report.findings.forEach((finding) => {
      const location = finding.file || finding.evidence || finding.script || finding.id;
      const missing = finding.missing ? ` missing=${finding.missing.join(",")}` : "";
      const issues = finding.issues ? ` issues=${finding.issues.join(",")}` : "";
      console.log(`- ${location} [${finding.code}]${missing}${issues}`);
    });
  }
  if (report.warnings.length) {
    console.log(`限制提示：${report.warnings.length} 条。`);
    report.warnings.forEach((warning) => {
      console.log(`- ${warning.evidence || warning.id} [${warning.code}] ${warning.reason}`);
    });
  }
}

if (require.main === module) {
  const report = validateProductIterationWorkflow(repoRoot);
  printReport(report);
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  validateProductIterationWorkflow
};

const path = require("path");
const { validateFunctionalCoverage } = require("./validate_functional_coverage");

const repoRoot = path.resolve(__dirname, "..");

function functionalCoverageCheck(root = repoRoot) {
  let report;
  try {
    report = validateFunctionalCoverage(root);
  } catch (error) {
    return {
      id: "functional_coverage",
      status: "FAIL",
      reason: "functional_coverage_gate_failed",
      error: error.message
    };
  }

  if (!report.ok) {
    return {
      id: "functional_coverage",
      status: "FAIL",
      reason: "functional_coverage_findings_present",
      findings: Array.isArray(report.findings) ? report.findings.slice(0, 20) : []
    };
  }

  return {
    id: "functional_coverage",
    status: "PASS",
    coverageTargetCount: report.metrics && report.metrics.coverageTargetCount,
    evidenceReportCount: report.metrics && report.metrics.evidenceReportCount,
    requiredPackageScriptCount: report.metrics && report.metrics.requiredPackageScriptCount
  };
}

module.exports = {
  functionalCoverageCheck
};

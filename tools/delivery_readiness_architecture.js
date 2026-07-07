const path = require("path");
const { validateArchitectureQuality } = require("./validate_architecture_quality");

const repoRoot = path.resolve(__dirname, "..");

function architectureQualityCheck(root = repoRoot) {
  let report;
  try {
    report = validateArchitectureQuality(root);
  } catch (error) {
    return {
      id: "architecture_quality",
      status: "FAIL",
      reason: "architecture_quality_gate_failed",
      error: error.message
    };
  }

  if (!report.ok) {
    return {
      id: "architecture_quality",
      status: "FAIL",
      reason: "architecture_quality_findings_present",
      findings: Array.isArray(report.findings) ? report.findings.slice(0, 20) : []
    };
  }

  return {
    id: "architecture_quality",
    status: "PASS",
    sourceFileCount: report.metrics && report.metrics.sourceFileCount,
    requiredFileCount: report.metrics && report.metrics.requiredFileCount,
    semanticBoundaryRuleCount: report.metrics && report.metrics.semanticBoundaryRuleCount,
    largestFiles: report.metrics && report.metrics.largestFiles
      ? report.metrics.largestFiles.slice(0, 8)
      : []
  };
}

module.exports = {
  architectureQualityCheck
};

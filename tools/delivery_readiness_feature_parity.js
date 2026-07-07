const path = require("path");
const { validateFeatureParity } = require("./validate_feature_parity");

const repoRoot = path.resolve(__dirname, "..");

function featureParityCheck(root = repoRoot) {
  let report;
  try {
    report = validateFeatureParity(root);
  } catch (error) {
    return {
      id: "feature_parity",
      status: "FAIL",
      reason: "feature_parity_gate_failed",
      error: error.message
    };
  }

  if (!report.ok) {
    return {
      id: "feature_parity",
      status: "FAIL",
      reason: "feature_parity_findings_present",
      findings: Array.isArray(report.findings) ? report.findings.slice(0, 20) : []
    };
  }

  return {
    id: "feature_parity",
    status: "PASS",
    featureCount: report.metrics && report.metrics.featureCount,
    passCount: report.metrics && report.metrics.passCount,
    capabilityOnlyCount: report.metrics && report.metrics.capabilityOnlyCount
  };
}

module.exports = {
  featureParityCheck
};

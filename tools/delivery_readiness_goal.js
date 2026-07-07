const path = require("path");
const { validateGoalAcceptance } = require("./validate_goal_acceptance");

const repoRoot = path.resolve(__dirname, "..");

function goalAcceptanceCheck(root = repoRoot, env = process.env) {
  let report;
  try {
    report = validateGoalAcceptance(root, { env });
  } catch (error) {
    return {
      id: "goal_acceptance",
      status: "FAIL",
      reason: "goal_acceptance_gate_failed",
      error: error.message
    };
  }

  if (report.status === "FAIL") {
    return {
      id: "goal_acceptance",
      status: "FAIL",
      reason: "goal_acceptance_findings_present",
      goalCount: report.metrics.goalCount,
      failingGoals: report.goals.filter((goal) => goal.status === "FAIL").map((goal) => goal.id)
    };
  }

  if (report.status === "USER_ACTION_REQUIRED") {
    return {
      id: "goal_acceptance",
      status: "USER_ACTION_REQUIRED",
      reason: "goal_acceptance_requires_external_evidence",
      goalCount: report.metrics.goalCount,
      passCount: report.metrics.passCount,
      nextActions: report.nextActions
    };
  }

  if (report.status === "PASS_WITH_LIMITS" || report.status === "PARTIAL") {
    return {
      id: "goal_acceptance",
      status: "PASS_WITH_LIMITS",
      reason: "goal_acceptance_has_limits",
      goalCount: report.metrics.goalCount,
      passCount: report.metrics.passCount,
      limitedGoals: report.goals.filter((goal) => goal.status !== "PASS").map((goal) => goal.id)
    };
  }

  return {
    id: "goal_acceptance",
    status: "PASS",
    goalCount: report.metrics.goalCount,
    passCount: report.metrics.passCount
  };
}

module.exports = {
  goalAcceptanceCheck
};

#!/usr/bin/env node
const { spawnSync } = require("child_process");

const WORK_BRANCH_TYPES = new Set(["feature", "fix", "refactor", "docs", "chore", "test", "spike"]);
const PROTECTED_BRANCHES = new Set(["main", "develop"]);
const COMMIT_TYPES = "feat|fix|docs|refactor|test|chore|build|ci|perf|revert";
const COMMIT_MESSAGE_PATTERN = new RegExp(`^(${COMMIT_TYPES})(\\([a-z0-9][a-z0-9._-]*\\))?!?: \\S.{2,}$`);

function stripAutomationPrefix(branch) {
  return String(branch || "").trim().replace(/^codex\//, "");
}

function branchCategory(branch) {
  const normalized = stripAutomationPrefix(branch);
  if (PROTECTED_BRANCHES.has(normalized)) return "protected";
  if (/^release\/v\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(normalized)) return "release";
  if (/^hotfix\/(?:[A-Z]+-\d+|v\d+\.\d+\.\d+)-[a-z0-9][a-z0-9._-]*$/.test(normalized)) return "hotfix";
  const match = normalized.match(/^([a-z]+)\/([A-Za-z0-9][A-Za-z0-9._-]{2,})$/);
  return match && WORK_BRANCH_TYPES.has(match[1]) ? match[1] : "invalid";
}

function validateBranchName(branch) {
  const category = branchCategory(branch);
  return {
    ok: category !== "invalid",
    branch: String(branch || "").trim(),
    normalized: stripAutomationPrefix(branch),
    category,
    expectedBase: expectedBaseForBranch(branch)
  };
}

function expectedBaseForBranch(branch) {
  const category = branchCategory(branch);
  if (category === "release" || category === "hotfix") return "main";
  if (WORK_BRANCH_TYPES.has(category)) return "develop";
  return null;
}

function validateCommitMessage(message) {
  const normalized = String(message || "").trim().split(/\r?\n/, 1)[0];
  return {
    ok: COMMIT_MESSAGE_PATTERN.test(normalized),
    message: normalized
  };
}

function validateGitflowPolicy(options = {}) {
  const phase = String(options.phase || "work").trim();
  const branch = String(options.branch || "").trim();
  const base = String(options.base || "").trim();
  const clean = options.clean !== false;
  const branchResult = validateBranchName(branch);
  const findings = [];

  if (!branchResult.ok) {
    findings.push({
      code: "invalid_branch_name",
      branch,
      message: "分支必须使用 feature/fix/refactor/docs/chore/test/spike/release/hotfix 前缀，可选 codex/ 命名空间。"
    });
  }

  if (["work", "commit", "pr"].includes(phase) && branchResult.category === "protected") {
    findings.push({
      code: "protected_branch_direct_work",
      branch,
      message: "main 和 develop 只接受 PR，不允许直接开发或提交需求代码。"
    });
  }

  if (phase === "start" && branchResult.normalized !== "develop") {
    findings.push({
      code: "requirement_must_start_from_develop",
      branch,
      message: "普通需求启动前必须回到最新 develop，再创建独立工作分支。"
    });
  }

  if (["commit", "pr"].includes(phase)) {
    const commitResult = validateCommitMessage(options.message);
    if (!commitResult.ok) {
      findings.push({
        code: "invalid_commit_message",
        message: commitResult.message,
        expected: "type(scope): concise description"
      });
    }
  }

  if (phase === "pr") {
    const expectedBase = expectedBaseForBranch(branch);
    if (expectedBase && base !== expectedBase) {
      findings.push({
        code: "pull_request_base_mismatch",
        branch,
        base,
        expectedBase
      });
    }
  }

  if (["start", "pr", "release"].includes(phase) && !clean) {
    findings.push({
      code: "worktree_not_clean",
      message: `${phase} 阶段要求工作树干净。`
    });
  }

  if (phase === "release" && !["release", "hotfix"].includes(branchResult.category)) {
    findings.push({
      code: "invalid_release_branch",
      branch,
      message: "发布阶段只允许 release/* 或 hotfix/* 分支。"
    });
  }

  return {
    ok: findings.length === 0,
    status: findings.length ? "FAIL" : "PASS",
    phase,
    branch,
    base: base || null,
    category: branchResult.category,
    expectedBase: expectedBaseForBranch(branch),
    clean,
    findings
  };
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : String(args[index + 1] || "");
}

function gitOutput(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? String(result.stdout || "").trim() : "";
}

function runCli(args = process.argv.slice(2)) {
  const phase = argValue(args, "--phase") || "work";
  const branch = argValue(args, "--branch") || process.env.GITHUB_HEAD_REF || gitOutput(["branch", "--show-current"]);
  const base = argValue(args, "--base") || process.env.GITHUB_BASE_REF || "";
  const message = argValue(args, "--message") || process.env.GITFLOW_PR_TITLE || "";
  const clean = gitOutput(["status", "--porcelain"]) === "";
  const report = validateGitflowPolicy({ phase, branch, base, message, clean });

  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.ok) {
    console.log(`GitFlow 门禁通过：${report.phase} · ${report.branch}${report.base ? ` -> ${report.base}` : ""}`);
  } else {
    console.log(`GitFlow 门禁失败：${report.findings.length} 个问题。`);
    report.findings.forEach((finding) => {
      console.log(`- [${finding.code}] ${finding.message || `${finding.branch || ""} -> ${finding.base || ""}`}`);
    });
  }

  if (!report.ok) process.exitCode = 1;
  return report;
}

if (require.main === module) {
  runCli();
}

module.exports = {
  branchCategory,
  expectedBaseForBranch,
  runCli,
  validateBranchName,
  validateCommitMessage,
  validateGitflowPolicy
};

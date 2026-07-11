#!/usr/bin/env node
const assert = require("assert");
const {
  expectedBaseForBranch,
  validateBranchName,
  validateCommitMessage,
  validateGitflowPolicy
} = require("../tools/validate_gitflow_policy");

function testValidWorkBranches() {
  const branches = [
    "feature/REQ-102-profile-import",
    "fix/ISSUE-88-runtime-isolation",
    "refactor/coach-store-boundary",
    "docs/gitflow-governance",
    "chore/dependency-audit",
    "test/invitation-permissions",
    "spike/android-session",
    "codex/chore/gitflow-governance"
  ];
  branches.forEach((branch) => {
    const result = validateBranchName(branch);
    assert.strictEqual(result.ok, true, `${branch}: ${JSON.stringify(result)}`);
    assert.strictEqual(expectedBaseForBranch(branch), "develop");
  });
}

function testReleaseAndHotfixBranchesTargetMain() {
  assert.strictEqual(validateBranchName("release/v1.4.0").ok, true);
  assert.strictEqual(validateBranchName("hotfix/ISSUE-99-login-bypass").ok, true);
  assert.strictEqual(expectedBaseForBranch("release/v1.4.0"), "main");
  assert.strictEqual(expectedBaseForBranch("hotfix/ISSUE-99-login-bypass"), "main");
}

function testInvalidBranchesAreRejected() {
  ["tmp/work", "feature", "feature/Profile Import", "release/1.4", "codex/random/work"].forEach((branch) => {
    assert.strictEqual(validateBranchName(branch).ok, false, branch);
  });
}

function testConventionalCommitMessages() {
  [
    "feat(coach): add profile import feedback",
    "fix(auth): isolate invited user data",
    "docs(gitflow): define release workflow",
    "chore(deps): remove unused sqlx drivers"
  ].forEach((message) => assert.strictEqual(validateCommitMessage(message).ok, true, message));

  [
    "WIP",
    "update files",
    "fix bug",
    "Feat(coach): wrong case",
    "feat: x"
  ].forEach((message) => assert.strictEqual(validateCommitMessage(message).ok, false, message));
}

function testProtectedBranchesCannotBeWorkBranches() {
  ["main", "develop"].forEach((branch) => {
    const report = validateGitflowPolicy({ phase: "work", branch, clean: true });
    assert.strictEqual(report.ok, false, branch);
    assert(report.findings.some((finding) => finding.code === "protected_branch_direct_work"));
  });
}

function testPullRequestBaseMapping() {
  const featureReport = validateGitflowPolicy({
    phase: "pr",
    branch: "feature/REQ-102-profile-import",
    base: "develop",
    message: "feat(coach): add profile import feedback",
    clean: true
  });
  assert.strictEqual(featureReport.ok, true, JSON.stringify(featureReport, null, 2));

  const wrongBase = validateGitflowPolicy({
    phase: "pr",
    branch: "fix/ISSUE-88-runtime-isolation",
    base: "main",
    message: "fix(runtime): isolate invited user data",
    clean: true
  });
  assert.strictEqual(wrongBase.ok, false);
  assert(wrongBase.findings.some((finding) => finding.code === "pull_request_base_mismatch"));

  const releaseReport = validateGitflowPolicy({
    phase: "pr",
    branch: "release/v1.4.0",
    base: "main",
    message: "chore(release): prepare v1.4.0",
    clean: true
  });
  assert.strictEqual(releaseReport.ok, true, JSON.stringify(releaseReport, null, 2));
}

function testCommitAndPullRequestRequirements() {
  const invalidCommit = validateGitflowPolicy({
    phase: "commit",
    branch: "codex/chore/gitflow-governance",
    message: "update git files",
    clean: false
  });
  assert.strictEqual(invalidCommit.ok, false);
  assert(invalidCommit.findings.some((finding) => finding.code === "invalid_commit_message"));

  const dirtyPullRequest = validateGitflowPolicy({
    phase: "pr",
    branch: "docs/gitflow-governance",
    base: "develop",
    message: "docs(gitflow): define governance",
    clean: false
  });
  assert.strictEqual(dirtyPullRequest.ok, false);
  assert(dirtyPullRequest.findings.some((finding) => finding.code === "worktree_not_clean"));
}

testValidWorkBranches();
testReleaseAndHotfixBranchesTargetMain();
testInvalidBranchesAreRejected();
testConventionalCommitMessages();
testProtectedBranchesCannotBeWorkBranches();
testPullRequestBaseMapping();
testCommitAndPullRequestRequirements();

console.log("GitFlow 策略测试：7 组通过。");

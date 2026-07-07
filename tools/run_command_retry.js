function runCommandWithRetries(runCommand, id, command, commandArgs, env, options = {}) {
  const failedAttempts = [];
  for (let attempt = 1; attempt <= (options.maxAttempts || 1); attempt += 1) {
    const step = runCommand(id, command, commandArgs, env);
    if (step.status !== "FAIL" || attempt === (options.maxAttempts || 1)) return failedAttempts.length ? { ...step, failedAttempts } : step;
    failedAttempts.push({ attempt, status: step.status, exitCode: step.exitCode, outputTail: step.outputTail });
  }
  return runCommand(id, command, commandArgs, env);
}

module.exports = { runCommandWithRetries };

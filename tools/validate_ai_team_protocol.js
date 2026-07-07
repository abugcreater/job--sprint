#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || "/path/to/local-user", ".codex");
const skillRoot = path.join(codexHome, "skills", "codex-ai-team");

const files = [
  {
    label: "global codex-ai-team skill",
    file: path.join(skillRoot, "SKILL.md"),
    required: [
      "Stall preflight hard rule",
      "current_thread_quarantine=true",
      "set `max_agents=0`",
      "do not discover or call `multi_agent_v1.spawn_agent`",
      "do not call any close/shutdown/wait lifecycle operation",
      "Agent lifecycle cleanup is platform housekeeping, not user work",
    ],
  },
  {
    label: "global team-room protocol",
    file: path.join(skillRoot, "references", "team-room.md"),
    required: [
      "启动前熔断检查",
      "current_thread_quarantine=true",
      "stall_recovery_reason",
      "生命周期清理不属于交付物",
      "do not perform agent tool discovery",
    ],
  },
  {
    label: "global output contract",
    file: path.join(skillRoot, "references", "output-contract.md"),
    required: [
      "current_thread_quarantine=true",
      "max_agents=0",
      "stall_recovery_reason",
      "Do not list cleanup as a remaining action",
    ],
  },
  {
    label: "Job Sprint AGENTS adapter",
    file: path.join(repoRoot, "AGENTS.md"),
    required: [
      "每次进入 AI 团队/Team Room/Manager Dispatch 前，必须先做熔断检查",
      "禁止调用 `close_agent`",
      "不发现、不派发、不关闭、不等待任何 agent",
      "current_thread_quarantine=true",
      "stall_recovery_reason",
      "不得把关闭/停止/等待 agent 写成待办或继续执行步骤",
    ],
  },
];

const forbiddenPatterns = [
  {
    pattern: /释放上一轮残留的?\s*agent/,
    reason: "Old flow tries to release stale agent handles before doing user work.",
  },
  {
    pattern: /关闭动作只影响代理会话/,
    reason: "Old flow normalizes agent close operations as harmless cleanup.",
  },
  {
    pattern: /先.*释放.*agent.*句柄/s,
    reason: "Old flow makes agent handle release a prerequisite for continuing.",
  },
];

function readRequiredFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required protocol file: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function assertIncludes({ label, file, content, needle }) {
  if (!content.includes(needle)) {
    throw new Error(`${label} is missing required protocol text "${needle}" in ${file}`);
  }
}

for (const entry of files) {
  const content = readRequiredFile(entry.file);
  for (const needle of entry.required) {
    assertIncludes({ ...entry, content, needle });
  }
  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`${entry.label} contains a forbidden stale-agent pattern in ${entry.file}: ${reason}`);
    }
  }
}

console.log("AI team protocol guard passed.");

import type { LlmRun, LlmRunStatus } from "../types/sprint";

export function createLlmRun({
  profileId,
  provider,
  model,
  promptVersion = "coach-artifacts-v1",
  schemaVersion = "coach-artifact-list-v1",
  inputSummaryHash,
  status,
  artifactCount,
  warning,
  error
}: {
  profileId?: string;
  provider: string;
  model?: string;
  promptVersion?: string;
  schemaVersion?: string;
  inputSummaryHash?: string;
  status: LlmRunStatus;
  artifactCount: number;
  warning?: string;
  error?: string;
}): LlmRun {
  const createdAt = new Date().toISOString();
  return {
    id: `llm-run-${Date.now()}`,
    profileId,
    provider,
    model,
    promptVersion,
    schemaVersion,
    inputSummaryHash: inputSummaryHash ?? simpleHash(`${profileId ?? "unknown"}|${provider}|${artifactCount}|${createdAt}`),
    artifactCount,
    schemaStatus: artifactCount > 0 ? "pass" : "failed",
    status,
    warning,
    error,
    createdAt
  };
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

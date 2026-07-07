import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DelayRecord, KnowledgeBoundary, LlmRun, ReviewEvidence, UserProfile } from "../types/sprint";

export function isDelayRecord(value: unknown): value is DelayRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DelayRecord>;
  return typeof record.id === "string"
    && typeof record.date === "string"
    && typeof record.reason === "string"
    && typeof record.recoveryAction === "string"
    && typeof record.createdAt === "string"
    && typeof record.minutes === "number";
}

export function sanitizeCompleted(completed: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(Object.entries(completed).filter(([key, done]) => typeof key === "string" && typeof done === "boolean"));
}

export function sanitizeEvidenceByTaskId(evidenceByTaskId: Record<string, ReviewEvidence[]>): Record<string, ReviewEvidence[]> {
  return Object.fromEntries(
    Object.entries(evidenceByTaskId)
      .map(([taskId, records]) => [
        taskId,
        Array.isArray(records) ? records.filter(isReviewEvidence) : []
      ] as const)
      .filter(([, records]) => records.length > 0)
  );
}

export function parseUserProfiles(value: unknown): UserProfile[] {
  return Array.isArray(value) ? value.filter(isUserProfile).slice(0, 20) : [];
}

export function parseKnowledgeBoundaries(value: unknown): KnowledgeBoundary[] {
  return Array.isArray(value) ? value.filter(isKnowledgeBoundary).slice(0, 200) : [];
}

export function parseBoundarySuggestionFeedback(value: unknown): BoundarySuggestionFeedback[] {
  return Array.isArray(value) ? value.filter(isBoundarySuggestionFeedback).slice(0, 200) : [];
}

export function parseCoachScheduleEvents(value: unknown): CoachScheduleEvent[] {
  return Array.isArray(value) ? value.filter(isCoachScheduleEvent).slice(0, 200) : [];
}

export function parseAiArtifacts(value: unknown): AiArtifact[] {
  return Array.isArray(value) ? value.filter(isAiArtifact).slice(0, 200) : [];
}

export function parseLlmRuns(value: unknown): LlmRun[] {
  return Array.isArray(value) ? value.filter(isLlmRun).slice(0, 100) : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isReviewEvidence(value: unknown): value is ReviewEvidence {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Partial<ReviewEvidence>;
  return typeof evidence.id === "string"
    && typeof evidence.taskId === "string"
    && typeof evidence.type === "string"
    && typeof evidence.title === "string"
    && typeof evidence.content === "string"
    && typeof evidence.createdAt === "string"
    && typeof evidence.verified === "boolean";
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.roleFamily === "string"
    && typeof value.targetRole === "string"
    && typeof value.dailyMinutes === "number"
    && typeof value.active === "boolean";
}

function isKnowledgeBoundary(value: unknown): value is KnowledgeBoundary {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.profileId === "string"
    && typeof value.topic === "string"
    && typeof value.level === "string"
    && typeof value.gap === "string";
}

function isBoundarySuggestionFeedback(value: unknown): value is BoundarySuggestionFeedback {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.suggestionId === "string"
    && typeof value.topic === "string"
    && typeof value.decision === "string"
    && typeof value.reason === "string"
    && typeof value.createdAt === "string";
}

function isCoachScheduleEvent(value: unknown): value is CoachScheduleEvent {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.profileId === "string"
    && typeof value.date === "string"
    && typeof value.start === "string"
    && typeof value.end === "string"
    && typeof value.kind === "string"
    && typeof value.title === "string"
    && typeof value.evidenceRequired === "boolean";
}

function isAiArtifact(value: unknown): value is AiArtifact {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.profileId === "string"
    && typeof value.type === "string"
    && typeof value.title === "string"
    && typeof value.body === "string"
    && typeof value.reason === "string"
    && Array.isArray(value.sources)
    && typeof value.status === "string";
}

function isLlmRun(value: unknown): value is LlmRun {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.provider === "string"
    && typeof value.promptVersion === "string"
    && typeof value.schemaVersion === "string"
    && typeof value.inputSummaryHash === "string"
    && typeof value.artifactCount === "number"
    && typeof value.schemaStatus === "string"
    && typeof value.status === "string"
    && typeof value.createdAt === "string";
}

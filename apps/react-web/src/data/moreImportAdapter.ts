import type {
  AiArtifact,
  BoundarySuggestionFeedback,
  CoachScheduleEvent,
  DelayRecord,
  EvidenceType,
  KnowledgeBoundary,
  LlmRun,
  ReviewEvidence,
  SprintRestoreSnapshot,
  UserProfile
} from "../types/sprint";

export type ReactStateImportResult =
  | {
      ok: true;
      snapshot: SprintRestoreSnapshot;
      summary: {
        completedCount: number;
        evidenceCount: number;
        delayCount: number;
        profileCount: number;
        boundaryCount: number;
        boundaryFeedbackCount: number;
        scheduleEventCount: number;
        aiArtifactCount: number;
        llmRunCount: number;
      };
    }
  | {
      ok: false;
      error: string;
    };

const reactStorageKey = "jobSprint.react.v1";
const evidenceTypes: EvidenceType[] = ["review", "oral_score", "interview_answer", "delivery_record", "learning_note"];

export function parseReactStateImportPayload(payload: unknown): ReactStateImportResult {
  if (!isRecord(payload)) {
    return { ok: false, error: "JSON 顶层必须是对象" };
  }
  if (payload.source !== reactStorageKey) {
    return { ok: false, error: "只支持 jobSprint.react.v1 导出文件" };
  }

  const completed = parseCompleted(payload.completed);
  const evidenceByTaskId = parseEvidenceByTaskId(payload.evidenceByTaskId);
  const delayRecords = parseDelayRecords(payload.delayRecords);
  const userProfiles = parseUserProfiles(payload.userProfiles);
  const knowledgeBoundaries = parseKnowledgeBoundaries(payload.knowledgeBoundaries);
  const boundarySuggestionFeedback = parseBoundarySuggestionFeedback(payload.boundarySuggestionFeedback);
  const coachScheduleEvents = parseCoachScheduleEvents(payload.coachScheduleEvents);
  const aiArtifacts = parseAiArtifacts(payload.aiArtifacts);
  const llmRuns = parseLlmRuns(payload.llmRuns);
  const evidenceCount = Object.values(evidenceByTaskId).reduce((count, records) => count + records.length, 0);

  if (!Object.keys(completed).length && !evidenceCount && !delayRecords.length && !userProfiles.length && !knowledgeBoundaries.length && !boundarySuggestionFeedback.length && !coachScheduleEvents.length && !aiArtifacts.length && !llmRuns.length) {
    return { ok: false, error: "导入文件没有可恢复的完成、证据、延期或教练状态" };
  }

  return {
    ok: true,
    snapshot: {
      completed,
      evidenceByTaskId,
      delayRecords,
      userProfiles,
      knowledgeBoundaries,
      boundarySuggestionFeedback,
      coachScheduleEvents,
      aiArtifacts,
      llmRuns
    },
    summary: {
      completedCount: Object.values(completed).filter(Boolean).length,
      evidenceCount,
      delayCount: delayRecords.length,
      profileCount: userProfiles.length,
      boundaryCount: knowledgeBoundaries.length,
      boundaryFeedbackCount: boundarySuggestionFeedback.length,
      scheduleEventCount: coachScheduleEvents.length,
      aiArtifactCount: aiArtifacts.length,
      llmRunCount: llmRuns.length
    }
  };
}

function parseCompleted(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const completed: Record<string, boolean> = {};
  for (const [key, done] of Object.entries(value)) {
    if (typeof key === "string" && typeof done === "boolean") {
      completed[key] = done;
    }
  }
  return completed;
}

function parseEvidenceByTaskId(value: unknown): Record<string, ReviewEvidence[]> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value)
    .map(([taskId, records]) => [
      taskId,
      Array.isArray(records) ? records.filter(isReviewEvidence) : []
    ] as const)
    .filter(([, records]) => records.length > 0);
  return Object.fromEntries(entries);
}

function parseDelayRecords(value: unknown): DelayRecord[] {
  return Array.isArray(value) ? value.filter(isDelayRecord).slice(0, 30) : [];
}

function parseUserProfiles(value: unknown): UserProfile[] {
  return Array.isArray(value) ? value.filter(isUserProfile).slice(0, 20) : [];
}

function parseKnowledgeBoundaries(value: unknown): KnowledgeBoundary[] {
  return Array.isArray(value) ? value.filter(isKnowledgeBoundary).slice(0, 200) : [];
}

function parseBoundarySuggestionFeedback(value: unknown): BoundarySuggestionFeedback[] {
  return Array.isArray(value) ? value.filter(isBoundarySuggestionFeedback).slice(0, 200) : [];
}

function parseCoachScheduleEvents(value: unknown): CoachScheduleEvent[] {
  return Array.isArray(value) ? value.filter(isCoachScheduleEvent).slice(0, 200) : [];
}

function parseAiArtifacts(value: unknown): AiArtifact[] {
  return Array.isArray(value) ? value.filter(isAiArtifact).slice(0, 200) : [];
}

function parseLlmRuns(value: unknown): LlmRun[] {
  return Array.isArray(value) ? value.filter(isLlmRun).slice(0, 100) : [];
}

function isReviewEvidence(value: unknown): value is ReviewEvidence {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.taskId === "string"
    && evidenceTypes.includes(value.type as EvidenceType)
    && typeof value.title === "string"
    && typeof value.content === "string"
    && typeof value.createdAt === "string"
    && typeof value.verified === "boolean";
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

function isDelayRecord(value: unknown): value is DelayRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && (typeof value.taskId === "string" || typeof value.taskId === "undefined")
    && typeof value.date === "string"
    && typeof value.minutes === "number"
    && typeof value.reason === "string"
    && typeof value.recoveryAction === "string"
    && typeof value.createdAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

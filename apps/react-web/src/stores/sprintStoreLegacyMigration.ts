import { createSprint } from "./sprintStateFactory";
import {
  isDelayRecord,
  isRecord,
  parseAiArtifacts,
  parseBoundarySuggestionFeedback,
  parseCoachScheduleEvents,
  parseKnowledgeBoundaries,
  parseLlmRuns,
  parseUserProfiles,
  sanitizeCompleted,
  sanitizeEvidenceByTaskId
} from "./sprintStoreParsers";
import type {
  AiArtifact,
  BoundarySuggestionFeedback,
  CoachScheduleEvent,
  DailySprint,
  DelayRecord,
  KnowledgeBoundary,
  LlmRun,
  ReviewEvidence,
  SyncState,
  UserProfile
} from "../types/sprint";

export interface SanitizedPersistedSprintState {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles: UserProfile[];
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
  syncState: SyncState;
  storageOwner?: {
    username?: string;
    dataScope?: string;
  };
  hasHydrated: true;
  lastSavedAt?: string;
  sprint: DailySprint;
}

const legacyDemoIdPrefixes = [
  ["react", "-step-1"],
  ["resume", "-java-001"],
  ["llm", "-basic-001"],
  ["kb-", "java", "-"],
  ["kb-", "spring", "-"],
  ["kb-", "project", "-"],
  ["kb-", "profile", "-"]
];
const legacyDemoDatedIdPattern = /^2026-07-(0[1-9]|1[0-4])-[a-z0-9-]+/i;
const legacyDemoTextFragments = [
  ["Spring ", "事务、", "MySQL、", "Redis"],
  ["G1", "/", "ZGC"],
  ["真实项目", "知识图谱"],
  ["SOF", "/", "Dubbo"],
  ["搜索服务入口", "与 SOF"],
  ["高级 ", "Java ", "后端能力地图"],
  ["高级 ", "Java ", "后端主身份"],
  ["泛 IT AI ", "求职教练样例"],
  ["React ", "前端骨架"]
];

export function sanitizePersistedSprintState(value: unknown, now: Date = new Date()): SanitizedPersistedSprintState {
  const state = isRecord(value) ? value : {};
  const completed = sanitizeCompletedRecord(state.completed);
  const evidenceByTaskId = sanitizeEvidenceRecord(state.evidenceByTaskId);
  const delayRecords = parseDelayRecords(state.delayRecords).filter((record) => !record.taskId || !isLegacyDemoTaskId(record.taskId));
  const userProfiles = parseUserProfiles(state.userProfiles).filter((profile) => !isLegacyDemoEntity(profile));
  const knowledgeBoundaries = parseKnowledgeBoundaries(state.knowledgeBoundaries).filter((boundary) => !isLegacyDemoEntity(boundary));
  const boundarySuggestionFeedback = parseBoundarySuggestionFeedback(state.boundarySuggestionFeedback).filter((feedback) => !isLegacyDemoEntity(feedback));
  const coachScheduleEvents = parseCoachScheduleEvents(state.coachScheduleEvents)
    .filter((event) => !isLegacyDemoEntity(event))
    .filter((event) => userProfiles.some((profile) => profile.id === event.profileId));
  const aiArtifacts = parseAiArtifacts(state.aiArtifacts)
    .filter((artifact) => !isLegacyDemoEntity(artifact))
    .filter((artifact) => userProfiles.some((profile) => profile.id === artifact.profileId));
  const llmRuns = parseLlmRuns(state.llmRuns).filter((run) => !isLegacyDemoEntity(run));
  const syncState = parseSyncState(state.syncState);
  const storageOwner = parseStorageOwner(state.storageOwner);
  const lastSavedAt = typeof state.lastSavedAt === "string" ? state.lastSavedAt : undefined;

  return {
    completed,
    evidenceByTaskId,
    delayRecords,
    userProfiles,
    knowledgeBoundaries,
    boundarySuggestionFeedback,
    coachScheduleEvents,
    aiArtifacts,
    llmRuns,
    syncState,
    storageOwner,
    hasHydrated: true,
    lastSavedAt,
    sprint: createSprint(completed, evidenceByTaskId, syncState, coachScheduleEvents, now, userProfiles)
  };
}

export function parseStorageOwner(value: unknown): SanitizedPersistedSprintState["storageOwner"] {
  if (!isRecord(value)) return undefined;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const dataScope = typeof value.dataScope === "string" ? value.dataScope.trim() : "";
  if (!username && !dataScope) return undefined;
  return {
    ...(username ? { username } : {}),
    ...(dataScope ? { dataScope } : {})
  };
}

function sanitizeCompletedRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(sanitizeCompleted(value as Record<string, boolean>))
      .filter(([taskId]) => !isLegacyDemoTaskId(taskId))
  );
}

function sanitizeEvidenceRecord(value: unknown): Record<string, ReviewEvidence[]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(sanitizeEvidenceByTaskId(value as Record<string, ReviewEvidence[]>))
      .filter(([taskId]) => !isLegacyDemoTaskId(taskId))
      .map(([taskId, records]) => [
        taskId,
        records.filter((record) => !isLegacyDemoTaskId(record.taskId) && !isLegacyDemoId(record.id))
      ] as const)
      .filter(([, records]) => records.length > 0)
  );
}

function parseDelayRecords(value: unknown): DelayRecord[] {
  return Array.isArray(value) ? value.filter(isDelayRecord).slice(0, 30) : [];
}

function parseSyncState(value: unknown): SyncState {
  return value === "online" || value === "syncing" || value === "failed" || value === "local_fallback"
    ? value
    : "local_fallback";
}

function isLegacyDemoEntity(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const id = typeof value.id === "string" ? value.id : "";
  const taskId = typeof value.taskId === "string" ? value.taskId : "";
  if (isLegacyDemoId(id) || isLegacyDemoTaskId(taskId)) return true;

  const seededText = [
    value.title,
    value.name,
    value.description,
    value.category,
    value.javaMapping,
    value.publicSummary,
    value.interviewQuestion,
    value.targetRole
  ]
    .filter((item): item is string => typeof item === "string")
    .join("\n");

  return hasLegacyDemoText(seededText);
}

function isLegacyDemoTaskId(value: string): boolean {
  return hasLegacyDemoId(value);
}

function isLegacyDemoId(value: string): boolean {
  return hasLegacyDemoId(value);
}

function hasLegacyDemoId(value: string): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return legacyDemoDatedIdPattern.test(value)
    || legacyDemoIdPrefixes.some((parts) => normalized.startsWith(parts.join("").toLowerCase()));
}

function hasLegacyDemoText(value: string): boolean {
  return legacyDemoTextFragments.some((parts) => value.includes(parts.join("")));
}

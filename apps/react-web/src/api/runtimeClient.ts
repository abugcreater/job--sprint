import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DailySprint, DelayRecord, KnowledgeBoundary, LlmRun, ReviewEvidence, SyncState, UserProfile } from "../types/sprint";
import type { OpportunitySignal } from "../data/opportunitySignalsAdapter";
import type { BoundarySuggestionResponse, CoachArtifactResponse, CoachFeedbackPayload, CoachFeedbackRecord, CoachFeedbackResponse, CoachOnboardingEventPayload, CoachOnboardingEventRecord, CoachOnboardingEventResponse, RuntimeData, RuntimeResponse } from "./runtimeClientTypes";

export type { BoundarySuggestionResponse, CoachArtifactResponse, CoachFeedbackPayload, CoachFeedbackRecord, CoachFeedbackResponse, CoachOnboardingEventPayload, CoachOnboardingEventRecord, CoachOnboardingEventResponse, RuntimeData, RuntimeResponse } from "./runtimeClientTypes";

export const RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES = 60000;

export function canUseServerRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const env = runtimeImportEnv();
  return shouldUseServerRuntimeForEnv({
    protocol: window.location.protocol,
    mode: env.MODE,
    dev: env.DEV,
    serverRuntime: env.VITE_JOB_SPRINT_SERVER_RUNTIME
  });
}

export function shouldUseServerRuntimeForEnv({
  protocol,
  mode,
  dev,
  serverRuntime
}: {
  protocol?: string;
  mode?: string;
  dev?: boolean | string;
  serverRuntime?: string;
}): boolean {
  if (!protocol || !["http:", "https:"].includes(protocol)) return false;
  if (mode === "test") return false;
  if (isDevMode(mode, dev) && serverRuntime !== "true") return false;
  return true;
}

export async function fetchRuntimeState(): Promise<RuntimeResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/runtime"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`runtime_load_failed:${response.status}`);
  return response.json();
}

export async function saveRuntimeState(data: RuntimeData): Promise<RuntimeResponse | null> {
  if (!canUseServerRuntime()) return null;
  const body = JSON.stringify({ data });
  const response = await fetch(appPath("/api/runtime"), {
    method: "POST",
    credentials: "include",
    keepalive: shouldUseRuntimeKeepalive(body),
    headers: { "content-type": "application/json" },
    body
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`runtime_save_failed:${response.status}`);
  return response.json();
}

export function shouldUseRuntimeKeepalive(body: string): boolean {
  return new TextEncoder().encode(body).length <= RUNTIME_KEEPALIVE_BODY_LIMIT_BYTES;
}

export async function generateCoachArtifactsOnServer({
  profile,
  knowledgeBoundaries,
  scheduleEvents,
  opportunitySignals = [],
  sprint
}: {
  profile?: UserProfile;
  knowledgeBoundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  opportunitySignals?: OpportunitySignal[];
  sprint: DailySprint;
}): Promise<CoachArtifactResponse | null> {
  if (!canUseServerRuntime() || !profile) return null;
  const currentTask = sprint.tasks.find((task) => task.id === sprint.currentTaskId) ?? sprint.tasks[0];
  const response = await fetch(appPath("/api/coach/artifacts"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile,
      knowledgeBoundaries,
      scheduleEvents,
      opportunitySignals: opportunitySignals.slice(0, 5),
      sprint: {
        date: sprint.date,
        currentTask,
        tasks: sprint.tasks.slice(0, 8).map((task) => ({
          id: task.id,
          title: task.title,
          type: task.type,
          status: task.status,
          tags: task.tags
        }))
      }
    })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_artifact_generation_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data.artifacts) ? data as CoachArtifactResponse : null;
}

export async function generateBoundarySuggestionsOnServer({
  profile,
  knowledgeBoundaries,
  text
}: {
  profile?: UserProfile;
  knowledgeBoundaries: KnowledgeBoundary[];
  text: string;
}): Promise<BoundarySuggestionResponse | null> {
  if (!canUseServerRuntime() || !profile) return null;
  const response = await fetch(appPath("/api/coach/boundary-suggestions"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile,
      knowledgeBoundaries,
      text
    })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`boundary_suggestion_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data.suggestions) ? data as BoundarySuggestionResponse : null;
}

export async function submitCoachFeedback(payload: CoachFeedbackPayload): Promise<CoachFeedbackRecord | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/feedback"), {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_feedback_failed:${response.status}`);
  const data = await response.json();
  return data?.feedback ?? null;
}

export async function fetchCoachFeedback(): Promise<CoachFeedbackResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/feedback"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_feedback_load_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.feedback) ? data as CoachFeedbackResponse : null;
}

export async function submitCoachOnboardingEvent(payload: CoachOnboardingEventPayload): Promise<CoachOnboardingEventRecord | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/onboarding-events"), {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_onboarding_event_failed:${response.status}`);
  const data = await response.json();
  return data?.event ?? null;
}

export async function fetchCoachOnboardingEvents(): Promise<CoachOnboardingEventResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/onboarding-events"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_onboarding_events_load_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.events) ? data as CoachOnboardingEventResponse : null;
}

export function buildRuntimeData({
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
  lastSavedAt
}: {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords?: DelayRecord[];
  userProfiles?: UserProfile[];
  knowledgeBoundaries?: KnowledgeBoundary[];
  boundarySuggestionFeedback?: BoundarySuggestionFeedback[];
  coachScheduleEvents?: CoachScheduleEvent[];
  aiArtifacts?: AiArtifact[];
  llmRuns?: LlmRun[];
  syncState: SyncState;
  lastSavedAt?: string;
}): RuntimeData {
  const evidenceRecords = Object.values(evidenceByTaskId).flat();
  return {
    progress: {
      completed,
      evidenceByTaskId,
      delayRecords: delayRecords ?? [],
      coach: {
        userProfiles: userProfiles ?? [],
        knowledgeBoundaries: knowledgeBoundaries ?? [],
        boundarySuggestionFeedback: boundarySuggestionFeedback ?? [],
        coachScheduleEvents: coachScheduleEvents ?? [],
        aiArtifacts: aiArtifacts ?? [],
        llmRuns: llmRuns ?? []
      },
      syncState,
      lastSavedAt
    },
    reviews: Object.fromEntries(evidenceRecords.filter((item) => item.type === "review").map((item) => [item.id, item])),
    applications: evidenceRecords.filter((item) => item.type === "delivery_record"),
    interviewMistakes: evidenceRecords.filter((item) => item.type === "oral_score" || item.type === "interview_answer")
  };
}

export function appPath(pathname: string): string {
  const prefix = window.location.pathname.startsWith("/job-sprint/") ? "/job-sprint" : "";
  return `${prefix}${pathname}`;
}

function runtimeImportEnv(): { MODE?: string; DEV?: boolean | string; VITE_JOB_SPRINT_SERVER_RUNTIME?: string } {
  return ((import.meta as ImportMeta & { env?: { MODE?: string; DEV?: boolean | string; VITE_JOB_SPRINT_SERVER_RUNTIME?: string } }).env) ?? {};
}

function isDevMode(mode?: string, dev?: boolean | string): boolean {
  return mode === "development" || dev === true || dev === "true";
}

import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DailySprint, DelayRecord, KnowledgeBoundary, LlmRun, ReviewEvidence, SyncState, UserProfile } from "../types/sprint";
import type { AiFeedbackSummary } from "../data/aiFeedbackAdapter";
import type { BoundarySuggestionDraft } from "../data/boundarySuggestionAdapter";

export interface RuntimeData {
  progress: {
    completed?: Record<string, boolean>;
    evidenceByTaskId?: Record<string, ReviewEvidence[]>;
    delayRecords?: DelayRecord[];
    coachFeedback?: CoachFeedbackRecord[];
    coach?: {
      userProfiles?: UserProfile[];
      knowledgeBoundaries?: KnowledgeBoundary[];
      boundarySuggestionFeedback?: BoundarySuggestionFeedback[];
      coachScheduleEvents?: CoachScheduleEvent[];
      aiArtifacts?: AiArtifact[];
      llmRuns?: LlmRun[];
    };
    syncState?: SyncState;
    lastSavedAt?: string;
    [key: string]: unknown;
  };
  reviews: Record<string, unknown>;
  applications: unknown[];
  interviewMistakes: unknown[];
}

export interface RuntimeResponse {
  ok: boolean;
  storage: string;
  readOnly: boolean;
  data: RuntimeData;
}

export interface CoachArtifactResponse {
  provider: "anthropic-compatible" | "local-fallback" | string;
  model?: string;
  promptVersion?: string;
  schemaVersion?: string;
  inputSummaryHash?: string;
  artifacts: AiArtifact[];
  llmRun?: LlmRun;
  warning?: string;
}

export interface BoundarySuggestionResponse {
  provider: "local-fallback" | string;
  promptVersion?: string;
  schemaVersion?: string;
  inputSummaryHash?: string;
  suggestions: BoundarySuggestionDraft[];
  warning?: string;
}

export interface CoachFeedbackPayload {
  profileId?: string;
  artifactId: string;
  llmRunId?: string;
  artifactType: AiArtifact["type"];
  decision: "accepted" | "rejected";
  reason?: string;
  title?: string;
}

export interface CoachFeedbackRecord extends CoachFeedbackPayload {
  id: string;
  createdAt: string;
}

export interface CoachFeedbackResponse {
  ok: boolean;
  storage?: string;
  readOnly?: boolean;
  feedback: CoachFeedbackRecord[];
  summary?: AiFeedbackSummary;
}

export interface CoachOnboardingEventPayload {
  profileId?: string;
  stepId: "account_scope" | "profile_template" | "material_boundary" | "first_schedule" | "ai_review" | "complete";
  stepLabel?: string;
  progressLabel: string;
  completionRate: number;
  completionRateLabel: string;
  dropOffLabel: string;
  riskLabel: string;
  nextActionLabel: string;
  source?: string;
}

export interface CoachOnboardingEventRecord extends CoachOnboardingEventPayload {
  id: string;
  createdAt: string;
}

export interface CoachOnboardingEventResponse {
  ok: boolean;
  storage?: string;
  readOnly?: boolean;
  events: CoachOnboardingEventRecord[];
  summary?: {
    eventCount: number;
    latestCompletionRate: number;
    latestCompletionRateLabel: string;
    latestDropOffLabel: string;
    latestRiskLabel: string;
    highestRiskLabel: string;
    nextActionLabel: string;
    firstLoginStatus: string;
  };
}

export type CoachArtifactRequest = {
  profile?: UserProfile;
  knowledgeBoundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  opportunitySignals?: unknown[];
  sprint: DailySprint;
};

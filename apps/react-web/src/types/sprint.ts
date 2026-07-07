export type TaskStatus = "pending" | "active" | "done" | "blocked" | "deferred";

export type TaskType =
  | "project"
  | "java"
  | "agent"
  | "rag"
  | "interview"
  | "resume"
  | "delivery"
  | "review"
  | "deployment"
  | "android"
  | "rest"
  | "path-audit"
  | "path-missing"
  | "public-safe"
  | "health-check";

export type EvidenceType =
  | "review"
  | "oral_score"
  | "interview_answer"
  | "delivery_record"
  | "learning_note";

export type RiskLevel = "none" | "low" | "medium" | "high" | "resolved";

export type SyncState = "online" | "local_fallback" | "syncing" | "failed" | "conflict";

export interface Task {
  id: string;
  day: number;
  date: string;
  weekday: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  startAt: string;
  endAt: string;
  durationLabel: string;
  deliverables: string[];
  interviewQuestions: string[];
  acceptanceCriteria: string;
  javaMapping?: string;
  tags: string[];
  riskIds: string[];
  evidenceRequired: EvidenceType[];
  sourceLabels: string[];
}

export interface ReviewEvidence {
  id: string;
  taskId: string;
  type: EvidenceType;
  title: string;
  content: string;
  createdAt: string;
  verified: boolean;
}

export interface DelayRecord {
  id: string;
  taskId?: string;
  date: string;
  minutes: number;
  reason: string;
  recoveryAction: string;
  createdAt: string;
}

export type ProfileRoleFamily =
  | "backend"
  | "frontend"
  | "qa"
  | "ops"
  | "data"
  | "mobile"
  | "product"
  | "project"
  | "implementation"
  | "support"
  | "other";

export interface UserProfile {
  id: string;
  name: string;
  roleFamily: ProfileRoleFamily;
  targetRole: string;
  targetLevel: string;
  cities: string;
  salaryTarget: string;
  companyTypes: string;
  experienceSummary: string;
  projectEvidence: string;
  nonClaims: string;
  dailyMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeBoundaryLevel = "陌生" | "了解" | "可讲" | "可实战" | "可面试追问";
export type CoachConfidence = "low" | "medium" | "high";
export type BoundarySuggestionFeedbackDecision = "accepted" | "rejected" | "needs_revision";

export interface KnowledgeBoundary {
  id: string;
  profileId: string;
  topic: string;
  level: KnowledgeBoundaryLevel;
  gap: string;
  evidence: string;
  targetUse: string;
  sourceSummary?: string;
  sourceConfidence?: CoachConfidence;
  sourceProvider?: string;
  sourcePromptVersion?: string;
  sourceInputHash?: string;
  lastValidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoundarySuggestionFeedback {
  id: string;
  profileId?: string;
  suggestionId: string;
  topic: string;
  decision: BoundarySuggestionFeedbackDecision;
  reason: string;
  sourceSummary?: string;
  sourceConfidence?: CoachConfidence;
  sourceProvider?: string;
  sourcePromptVersion?: string;
  sourceInputHash?: string;
  createdAt: string;
}

export type CoachScheduleEventKind = "learning" | "interview" | "opportunity" | "review" | "recovery";

export interface CoachScheduleEvent {
  id: string;
  profileId: string;
  date: string;
  start: string;
  end: string;
  kind: CoachScheduleEventKind;
  title: string;
  reason: string;
  evidenceRequired: boolean;
  acceptedFromArtifactId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AiArtifactType = "knowledge_card" | "schedule_suggestion" | "interview_question" | "daily_next_step";
export type AiArtifactStatus = "draft" | "accepted" | "rejected" | "edited";
export type AiArtifactConfidence = CoachConfidence;

export interface AiArtifact {
  id: string;
  profileId: string;
  type: AiArtifactType;
  title: string;
  body: string;
  reason: string;
  sources: string[];
  confidence: AiArtifactConfidence;
  status: AiArtifactStatus;
  targetDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type LlmRunStatus = "success" | "fallback" | "failed";
export type LlmRunSchemaStatus = "pass" | "failed" | "not_checked";

export interface LlmRun {
  id: string;
  profileId?: string;
  provider: string;
  model?: string;
  promptVersion: string;
  schemaVersion: string;
  inputSummaryHash: string;
  artifactCount: number;
  schemaStatus: LlmRunSchemaStatus;
  status: LlmRunStatus;
  warning?: string;
  error?: string;
  createdAt: string;
}

export interface SprintRestoreSnapshot {
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles?: UserProfile[];
  knowledgeBoundaries?: KnowledgeBoundary[];
  boundarySuggestionFeedback?: BoundarySuggestionFeedback[];
  coachScheduleEvents?: CoachScheduleEvent[];
  aiArtifacts?: AiArtifact[];
  llmRuns?: LlmRun[];
}

export interface RiskItem {
  id: string;
  level: RiskLevel;
  title: string;
  reason: string;
  mitigation: string;
  resolvedAt?: string;
}

export interface InterviewQuestion {
  id: string;
  taskId?: string;
  category: TaskType;
  question: string;
  hint?: string;
  score?: number;
  weaknessTags: string[];
  lastPracticedAt?: string;
}

export interface DailySprint {
  date: string;
  weekday: string;
  day: number;
  totalDays: number;
  theme: string;
  goal: string;
  tasks: Task[];
  currentTaskId?: string;
  nextTaskId?: string;
  progress: {
    total: number;
    done: number;
    pending: number;
    overdue: number;
    evidenceMissing: number;
  };
  risks: RiskItem[];
  dailyDeliverables: string[];
  mustAnswer: string[];
  nextMilestone: string;
  syncState: SyncState;
  generatedAt: string;
}

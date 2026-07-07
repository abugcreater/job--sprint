import { appPath, canUseServerRuntime } from "./runtimeClient";

export interface CoachOutcomeReport {
  schemaVersion: "coach-outcome-report-v1";
  attributionLevel: "server-weekly-runtime";
  generatedAt: string;
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  score: number;
  scoreLabel: string;
  summary: string;
  metrics: {
    evidenceCount: number;
    verifiedEvidenceCount: number;
    completedTaskCount: number;
    effectiveActionCount: number;
    delayCount: number;
    feedbackReviewedCount: number;
    acceptedScheduleCount: number;
    acceptedScheduleCompletedCount: number;
    acceptedScheduleCompletionRate: number;
    acceptedScheduleCompletionRateLabel: string;
    interviewReviewTotalCount: number;
    interviewReviewCompletedCount: number;
    interviewReviewRate: number;
    interviewReviewRateLabel: string;
    evidenceTypeCounts: Record<string, number>;
  };
  signals: string[];
  risks: string[];
  nextWeekFocus: string[];
  id?: string;
  createdAt?: string;
}

export interface CoachOutcomeResponse {
  ok: boolean;
  storage?: string;
  readOnly?: boolean;
  outcome?: CoachOutcomeReport;
  snapshots?: CoachOutcomeReport[];
}

export async function fetchCoachOutcomes(date: string): Promise<CoachOutcomeResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath(`/api/coach/outcomes?date=${encodeURIComponent(date)}`), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_outcomes_load_failed:${response.status}`);
  const data = await response.json();
  return data?.outcome?.schemaVersion === "coach-outcome-report-v1" ? data as CoachOutcomeResponse : null;
}

export async function saveCoachOutcomeSnapshot(date: string): Promise<CoachOutcomeResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/outcomes"), {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date })
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_outcome_snapshot_failed:${response.status}`);
  const data = await response.json();
  return data?.outcome?.schemaVersion === "coach-outcome-report-v1" ? data as CoachOutcomeResponse : null;
}

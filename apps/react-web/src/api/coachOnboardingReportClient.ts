import {
  appPath,
  canUseServerRuntime,
  type CoachOnboardingEventRecord,
  type CoachOnboardingEventResponse
} from "./runtimeClient";

export interface CoachOnboardingReportUser {
  username: string;
  displayName: string;
  dataScope: string;
  inviteBatch: string;
  latestEvent: CoachOnboardingEventRecord | null;
  summary: NonNullable<CoachOnboardingEventResponse["summary"]>;
}

export interface CoachOnboardingReportSummary {
  totalUsers: number;
  startedCount: number;
  completedCount: number;
  completionRate: number;
  completionRateLabel: string;
  topDropOffs: Array<{ label: string; count: number }>;
  highestRiskLabel: string;
}

export interface CoachOnboardingReportResponse {
  ok: boolean;
  storage?: string;
  readOnly?: boolean;
  summary: CoachOnboardingReportSummary;
  batches: Array<CoachOnboardingReportSummary & { inviteBatch: string; topDropOffLabel: string }>;
  users: CoachOnboardingReportUser[];
}

export async function fetchCoachOnboardingReport(): Promise<CoachOnboardingReportResponse | null> {
  if (!canUseServerRuntime()) return null;
  const response = await fetch(appPath("/api/coach/onboarding-report"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });
  if ([401, 403, 503].includes(response.status)) return null;
  if (!response.ok) throw new Error(`coach_onboarding_report_load_failed:${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.users) && data?.summary ? data as CoachOnboardingReportResponse : null;
}

import type {
  CoachOnboardingReportResponse,
  CoachOnboardingReportUser
} from "../../../api/coachOnboardingReportClient";
import type { InviteManagementDetail } from "./InviteManagementDetailPanel";

export function findInviteManagementOnboardingUser(
  report: CoachOnboardingReportResponse | null | undefined,
  detail: InviteManagementDetail | null
): CoachOnboardingReportUser | null {
  if (!report || !detail) return null;
  const username = detail.kind === "user" ? detail.user.username : detail.invitation.username;
  const dataScope = detail.kind === "user" ? detail.user.dataScope : detail.invitation.dataScope;
  return report.users.find((user) => user.username === username || user.dataScope === dataScope) ?? null;
}

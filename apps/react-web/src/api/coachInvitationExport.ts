import type { CoachInvitationResponse } from "./coachInvitationClient";

export function buildCoachInvitationExport(response: CoachInvitationResponse, inviteBatch = "all") {
  const invitations = inviteBatch === "all"
    ? response.invitations
    : response.invitations.filter((invitation) => invitation.inviteBatch === inviteBatch);
  const configuredUsers = inviteBatch === "all"
    ? response.configuredUsers
    : response.configuredUsers.filter((user) => user.inviteBatch === inviteBatch);
  const names = new Set([
    ...invitations.map((invitation) => invitation.username),
    ...configuredUsers.map((user) => user.username)
  ]);
  return JSON.stringify({
    schemaVersion: "coach-invitations-export-v1",
    generatedAt: new Date().toISOString(),
    inviteBatch,
    summary: response.summary,
    invitationCount: invitations.length,
    configuredUserCount: configuredUsers.length,
    invitations,
    configuredUsers,
    accountAuditEvents: (response.accountAuditEvents || []).filter((event) => {
      if (inviteBatch === "all" || event.inviteBatch === inviteBatch) return true;
      return Boolean(event.username && names.has(event.username)) || Boolean(event.affectedUsernames?.some((username) => names.has(username)));
    })
  }, null, 2);
}

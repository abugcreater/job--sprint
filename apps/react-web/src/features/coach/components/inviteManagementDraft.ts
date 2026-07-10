import type {
  CoachConfiguredUser,
  CoachInvitationDraft,
  CoachInvitationRecord
} from "../../../api/coachInvitationClient";

export function draftFromConfiguredUser(
  current: CoachInvitationDraft,
  user: CoachConfiguredUser,
  options: { provisionAccount?: boolean } = {}
): CoachInvitationDraft {
  return {
    ...current,
    username: user.username,
    displayName: user.displayName,
    dataScope: user.dataScope,
    inviteBatch: user.inviteBatch,
    accountRole: user.role === "viewer" ? "viewer" : "coach",
    password: "",
    provisionAccount: Boolean(options.provisionAccount),
    status: options.provisionAccount ? "active" : current.status
  };
}

export function draftFromInvitation(invitation: CoachInvitationRecord): CoachInvitationDraft {
  return {
    username: invitation.username,
    displayName: invitation.displayName,
    dataScope: invitation.dataScope,
    inviteBatch: invitation.inviteBatch,
    templateVersion: invitation.templateVersion || "role-family-v1",
    roleFamily: invitation.roleFamily,
    targetRole: invitation.targetRole,
    status: invitation.status,
    note: invitation.note,
    accountRole: "coach",
    password: "",
    provisionAccount: false
  };
}

export function accountProvisioningReadyMessage(user: CoachConfiguredUser) {
  return `已将「${user.displayName}」切到开通/重置模式；请在左侧输入新密码后保存，系统不会显示旧密码。`;
}

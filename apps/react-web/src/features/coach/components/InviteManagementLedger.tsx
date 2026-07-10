import { Copy, KeyRound, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import type {
  AccountProvisioningState,
  CoachAccountAction,
  CoachConfiguredUser,
  CoachInvitationRecord,
  CoachInvitationSummary
} from "../../../api/coachInvitationClient";
import { statusLabel } from "./inviteManagementConfig";

const USER_PREVIEW_LIMIT = 6;
const INVITATION_PREVIEW_LIMIT = 8;

interface ConfirmingAccountAction {
  action: CoachAccountAction;
  username: string;
}

interface InviteManagementLedgerProps {
  accountProvisioning?: AccountProvisioningState;
  invitations: CoachInvitationRecord[];
  saving: boolean;
  summary?: CoachInvitationSummary;
  users: CoachConfiguredUser[];
  onGenerateLoginEntry: (user: CoachConfiguredUser) => void;
  onPickInvitation: (invitation: CoachInvitationRecord, trigger?: HTMLElement) => void;
  onPickUser: (user: CoachConfiguredUser, trigger?: HTMLElement) => void;
  onRemoveInvitation: (username: string, displayName: string) => void;
  onRunAccountAction: (username: string, action: CoachAccountAction) => void;
  selectedInvitationId?: string;
  selectedUsername?: string;
}

function accountActionCopy(user: CoachConfiguredUser, action: CoachAccountAction) {
  if (action === "delete") {
    return {
      label: "确认删除",
      message: `确认删除「${user.displayName}」登录账号？删除后该用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。`,
      title: `确认删除登录账号 ${user.displayName}`
    };
  }
  if (action === "disable") {
    return {
      label: "确认禁用",
      message: `确认禁用「${user.displayName}」登录账号？禁用后该用户无法登录；数据域和历史数据会保留，owner 可稍后恢复。`,
      title: `确认禁用账号 ${user.displayName}`
    };
  }
  return {
    label: "确认恢复",
    message: `确认恢复「${user.displayName}」登录账号？恢复后该用户可以再次登录，并继续使用自己的数据域。`,
    title: `确认恢复账号 ${user.displayName}`
  };
}

export function InviteManagementLedger({
  accountProvisioning,
  invitations,
  saving,
  summary,
  users,
  onGenerateLoginEntry,
  onPickInvitation,
  onPickUser,
  onRemoveInvitation,
  onRunAccountAction,
  selectedInvitationId = "",
  selectedUsername = ""
}: InviteManagementLedgerProps) {
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllInvitations, setShowAllInvitations] = useState(false);
  const [confirmingAccountAction, setConfirmingAccountAction] = useState<ConfirmingAccountAction | null>(null);
  const [confirmingInvitationId, setConfirmingInvitationId] = useState<string | null>(null);
  const visibleUsers = showAllUsers ? users : users.slice(0, USER_PREVIEW_LIMIT);
  const visibleInvitations = showAllInvitations ? invitations : invitations.slice(0, INVITATION_PREVIEW_LIMIT);
  const hiddenUsers = Math.max(users.length - USER_PREVIEW_LIMIT, 0);
  const hiddenInvitations = Math.max(invitations.length - INVITATION_PREVIEW_LIMIT, 0);

  return (
    <div className="rounded-card border border-line bg-surface-0 p-4">
      <p className="text-sm font-black text-ink-900">服务端账号与邀请台账</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
        {summary?.nextActionLabel ?? "连接服务端后可查看已配置账号和邀请记录。"}
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-ink-500">
        点选账号或邀请记录会从右侧打开详情抽屉；当前筛选、搜索和批量动作状态会保留。
      </p>
      {accountProvisioning?.status === "PASS" ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-control bg-success-100 px-3 py-2 text-xs font-black text-success-600" role="status">
          <KeyRound size={14} aria-hidden="true" />
          {accountProvisioning.message}
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {visibleUsers.map((user) => {
          const nextStatusAction: CoachAccountAction = user.disabled ? "enable" : "disable";
          const pendingAction = confirmingAccountAction?.username === user.username ? confirmingAccountAction.action : null;
          const pendingActionCopy = pendingAction ? accountActionCopy(user, pendingAction) : null;
          const selected = selectedUsername === user.username;
          return (
            <div key={`${user.dataScope}-${user.username}`} className={`w-full rounded-card border p-3 text-left transition ${selected ? "border-brand-600 bg-brand-100 ring-2 ring-brand-100" : "border-line bg-surface-100"}`}>
              <button
                type="button"
                className="w-full text-left"
                aria-current={selected ? "true" : undefined}
                onClick={(event) => {
                  setConfirmingAccountAction(null);
                  setConfirmingInvitationId(null);
                  onPickUser(user, event.currentTarget);
                }}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-ink-900">{user.displayName}</span>
                  <span className={`status-chip border border-line bg-white ${user.disabled ? "text-risk-600" : "text-success-600"}`}>
                    {user.disabled ? "已禁用" : "可登录"}
                  </span>
                  {selected ? <span className="status-chip bg-brand-700 text-white">详情已打开</span> : null}
                </span>
                <span className="mt-1 block text-xs font-bold text-ink-500">{user.role} · {user.inviteBatch} · {user.dataScope}</span>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => onGenerateLoginEntry(user)}>
                  <Copy size={14} aria-hidden="true" />
                  登录入口
                </button>
                <button
                  type="button"
                  className="secondary-button min-h-9 px-3 text-xs"
                  onClick={() => setConfirmingAccountAction({ username: user.username, action: nextStatusAction })}
                  aria-controls={`account-action-confirm-${user.username}-${nextStatusAction}`}
                  aria-expanded={pendingAction === nextStatusAction}
                  disabled={user.role === "owner" || saving}
                >
                  {user.disabled ? <UserCheck size={14} aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
                  {user.disabled ? "恢复账号" : "禁用账号"}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center gap-2 rounded-control border border-risk-200 px-3 text-xs font-black text-risk-600 hover:bg-risk-100"
                  onClick={() => setConfirmingAccountAction({ username: user.username, action: "delete" })}
                  aria-controls={`account-action-confirm-${user.username}-delete`}
                  aria-expanded={pendingAction === "delete"}
                  disabled={user.role === "owner" || saving}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  删除登录账号
                </button>
              </div>
              {pendingAction && pendingActionCopy ? (
                <div
                  id={`account-action-confirm-${user.username}-${pendingAction}`}
                  className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3"
                  role="group"
                  aria-label={`登录账号动作确认 ${user.displayName}`}
                >
                  <p className="text-sm font-black leading-6 text-risk-600">{pendingActionCopy.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                      onClick={() => {
                        setConfirmingAccountAction(null);
                        onRunAccountAction(user.username, pendingAction);
                      }}
                      aria-label={pendingActionCopy.title}
                      disabled={saving}
                    >
                      {pendingAction === "enable" ? <UserCheck size={15} aria-hidden="true" /> : pendingAction === "disable" ? <UserX size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
                      {pendingActionCopy.label}
                    </button>
                    <button
                      type="button"
                      className="secondary-button min-h-11 px-3"
                      onClick={() => setConfirmingAccountAction(null)}
                      aria-label={`取消账号动作 ${user.displayName}`}
                      disabled={saving}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {users.length > USER_PREVIEW_LIMIT ? (
          <div className="rounded-card border border-line bg-white p-3 text-sm font-bold text-ink-500">
            <p>{showAllUsers ? `已显示全部 ${users.length} 个登录账号。` : `还有 ${hiddenUsers} 个登录账号未显示。`}</p>
            <button
              type="button"
              className="secondary-button mt-3 min-h-9 px-3 text-xs"
              onClick={() => {
                setConfirmingAccountAction(null);
                setShowAllUsers((current) => !current);
              }}
              aria-expanded={showAllUsers}
            >
              {showAllUsers ? "收起登录账号" : "查看全部登录账号"}
            </button>
          </div>
        ) : null}
        {visibleInvitations.map((invitation) => {
          const selected = selectedInvitationId === invitation.id;
          return (
          <div key={invitation.id} className={`rounded-card border p-3 transition ${selected ? "border-brand-600 bg-brand-100 ring-2 ring-brand-100" : "border-line bg-white"}`}>
            <button
              type="button"
              className="w-full text-left"
              aria-current={selected ? "true" : undefined}
              onClick={(event) => {
                setConfirmingAccountAction(null);
                setConfirmingInvitationId(null);
                onPickInvitation(invitation, event.currentTarget);
              }}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-ink-900">{invitation.displayName}</span>
                <span className="status-chip border border-line bg-white text-ink-700">{statusLabel(invitation.status)}</span>
                {selected ? <span className="status-chip bg-brand-700 text-white">详情已打开</span> : null}
              </span>
              <span className="mt-1 block text-xs font-bold text-ink-500">
                {invitation.inviteBatch} · {invitation.templateVersion || "role-family-v1"} · {invitation.targetRole || "未填岗位"}
              </span>
            </button>
            <button
              type="button"
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-control border border-risk-200 px-3 text-xs font-black text-risk-600 hover:bg-risk-100"
              onClick={() => setConfirmingInvitationId(invitation.id)}
              aria-controls={`delete-invitation-confirm-${invitation.id}`}
              aria-expanded={confirmingInvitationId === invitation.id}
              disabled={saving}
            >
              <Trash2 size={14} aria-hidden="true" />
              删除邀请记录：{invitation.displayName}
            </button>
            {confirmingInvitationId === invitation.id ? (
              <div
                id={`delete-invitation-confirm-${invitation.id}`}
                className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3"
                role="group"
                aria-label={`删除邀请记录确认 ${invitation.displayName}`}
              >
                <p className="text-sm font-black leading-6 text-risk-600">
                  确认删除「{invitation.displayName}」邀请记录？删除后管理员看板不再展示这条试用用户登记；已开通的登录账号不会自动删除。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                    onClick={() => {
                      setConfirmingInvitationId(null);
                      onRemoveInvitation(invitation.username, invitation.displayName);
                    }}
                    aria-label={`确认删除邀请记录 ${invitation.displayName}`}
                    disabled={saving}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="secondary-button min-h-11 px-3"
                    onClick={() => setConfirmingInvitationId(null)}
                    aria-label={`取消删除邀请记录 ${invitation.displayName}`}
                    disabled={saving}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          );
        })}
        {invitations.length > INVITATION_PREVIEW_LIMIT ? (
          <div className="rounded-card border border-line bg-white p-3 text-sm font-bold text-ink-500">
            <p>{showAllInvitations ? `已显示全部 ${invitations.length} 条邀请记录。` : `还有 ${hiddenInvitations} 条邀请记录未显示。`}</p>
            <button
              type="button"
              className="secondary-button mt-3 min-h-9 px-3 text-xs"
              onClick={() => {
                setConfirmingInvitationId(null);
                setShowAllInvitations((current) => !current);
              }}
              aria-expanded={showAllInvitations}
            >
              {showAllInvitations ? "收起邀请记录" : "查看全部邀请记录"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

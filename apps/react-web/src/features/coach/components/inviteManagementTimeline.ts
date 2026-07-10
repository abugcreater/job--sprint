import type {
  CoachAccountAuditEvent,
  CoachConfiguredUser,
  CoachInvitationRecord
} from "../../../api/coachInvitationClient";
import type { CoachOnboardingReportUser } from "../../../api/coachOnboardingReportClient";
import type { InviteManagementDetail } from "./InviteManagementDetailPanel";
import { statusLabel } from "./inviteManagementConfig";

export interface InviteManagementTimelineItem {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
}

export type AccountAuditFilter = "all" | "provisioning" | "access" | "deletion" | "batch";

export const accountAuditFilterOptions: Array<{ value: AccountAuditFilter; label: string }> = [
  { value: "all", label: "全部审计" },
  { value: "provisioning", label: "开通/重置" },
  { value: "access", label: "禁用/恢复" },
  { value: "deletion", label: "删除/清理" },
  { value: "batch", label: "批量动作" }
];

function formatTime(value?: string | null) {
  if (!value) return "时间未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function userLoginTitle(user: CoachConfiguredUser) {
  if (user.disabled) return "登录账号已禁用";
  if (user.canLogin === false) return "登录账号暂不可用";
  return "登录账号当前可用";
}

function userLoginDescription(user: CoachConfiguredUser) {
  if (user.disabled) return "用户不能登录；数据域和历史求职数据仍保留。";
  if (user.canLogin === false) return "服务端 users file 暂未确认该账号可登录。";
  return `角色：${user.role}；数据域：${user.dataScope || "未填写"}。`;
}

function latestOnboardingItem(user?: CoachOnboardingReportUser | null): InviteManagementTimelineItem | null {
  const latestEvent = user?.latestEvent;
  if (!latestEvent) return null;
  return {
    id: "latest-onboarding-event",
    title: "最近首登观察",
    description: `${latestEvent.stepLabel || latestEvent.dropOffLabel} · ${latestEvent.progressLabel} · ${latestEvent.riskLabel}`,
    timeLabel: formatTime(latestEvent.createdAt)
  };
}

function auditActionTitle(action: string) {
  const labels: Record<string, string> = {
    created: "登录账号已开通",
    password_reset: "登录密码已重置",
    disable: "登录账号已禁用",
    enable: "登录账号已恢复",
    delete: "登录账号已删除",
    batch_disable: "批量禁用账号",
    batch_enable: "批量恢复账号",
    batch_delete: "批量删除账号"
  };
  return labels[action] || "账号审计事件";
}

function auditDescription(event: CoachAccountAuditEvent) {
  const count = event.affectedCount ?? event.affectedUsernames?.length ?? 1;
  const skipped = event.skippedCount ? `；跳过 ${event.skippedCount} 个` : "";
  const actor = event.actorUsername ? `；操作人：${event.actorUsername}` : "";
  return event.message ? `${event.message}${actor}` : `影响 ${count} 个账号${skipped}${actor}`;
}

function auditFilterMatches(action: string, filter: AccountAuditFilter) {
  if (filter === "all") return true;
  if (filter === "provisioning") return action === "created" || action === "password_reset";
  if (filter === "access") return action === "disable" || action === "enable";
  if (filter === "deletion") return action === "delete" || action === "batch_delete";
  return action.startsWith("batch_");
}

function auditSearchMatches(event: CoachAccountAuditEvent, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const haystack = [
    auditActionTitle(event.action),
    event.action,
    event.message,
    event.actorUsername,
    event.username,
    event.role,
    event.dataScope,
    event.inviteBatch,
    ...(event.affectedUsernames ?? []),
    ...(event.skippedUsers?.map((user) => `${user.username} ${user.reason}`) ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

function detailUsername(detail: InviteManagementDetail) {
  return detail.kind === "invitation" ? detail.invitation.username : detail.user.username;
}

export function filterAccountAuditEventsForDetail(
  detail: InviteManagementDetail,
  events: CoachAccountAuditEvent[] = [],
  filter: AccountAuditFilter = "all",
  query = ""
): CoachAccountAuditEvent[] {
  const username = detailUsername(detail);
  if (!username) return [];
  return events
    .filter((event) => event.username === username || event.affectedUsernames?.includes(username))
    .filter((event) => auditFilterMatches(event.action, filter))
    .filter((event) => auditSearchMatches(event, query))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

function auditItems(
  detail: InviteManagementDetail,
  events: CoachAccountAuditEvent[] = [],
  filter: AccountAuditFilter = "all",
  query = "",
  limit = 5
): InviteManagementTimelineItem[] {
  return filterAccountAuditEventsForDetail(detail, events, filter, query)
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      title: auditActionTitle(event.action),
      description: auditDescription(event),
      timeLabel: formatTime(event.createdAt)
    }));
}

function invitationItems(invitation: CoachInvitationRecord): InviteManagementTimelineItem[] {
  const items: InviteManagementTimelineItem[] = [
    {
      id: "invitation-created",
      title: "邀请记录已登记",
      description: `状态：${statusLabel(invitation.status)}；批次：${invitation.inviteBatch || "未填写"}。`,
      timeLabel: formatTime(invitation.createdAt)
    }
  ];
  if (invitation.updatedAt && invitation.updatedAt !== invitation.createdAt) {
    items.unshift({
      id: "invitation-updated",
      title: "邀请记录最近更新",
      description: `当前状态：${statusLabel(invitation.status)}；目标岗位：${invitation.targetRole || "未填写"}。`,
      timeLabel: formatTime(invitation.updatedAt)
    });
  }
  if (invitation.note) {
    items.push({
      id: "invitation-note",
      title: "运营备注已补充",
      description: invitation.note,
      timeLabel: formatTime(invitation.updatedAt || invitation.createdAt)
    });
  }
  return items;
}

export function buildInviteManagementTimeline(
  detail: InviteManagementDetail,
  onboardingUser?: CoachOnboardingReportUser | null,
  accountAuditEvents: CoachAccountAuditEvent[] = [],
  auditFilter: AccountAuditFilter = "all",
  auditSearch = "",
  auditLimit = 5
): InviteManagementTimelineItem[] {
  const onboardingItem = latestOnboardingItem(onboardingUser);
  const audit = auditItems(detail, accountAuditEvents, auditFilter, auditSearch, auditLimit);
  if (detail.kind === "invitation") {
    return [
      ...(onboardingItem ? [onboardingItem] : []),
      ...audit,
      ...invitationItems(detail.invitation)
    ];
  }
  return [
    ...(onboardingItem ? [onboardingItem] : []),
    ...audit,
    {
      id: "account-current-login",
      title: userLoginTitle(detail.user),
      description: userLoginDescription(detail.user),
      timeLabel: "当前状态"
    },
    {
      id: "account-batch",
      title: "归属邀请批次",
      description: `批次：${detail.user.inviteBatch || "未填写"}；登录名：${detail.user.username}。`,
      timeLabel: "当前台账"
    }
  ];
}

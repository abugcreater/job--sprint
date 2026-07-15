import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock3, FileText, KeyRound, ListFilter, Trash2, UserCheck, UserRound, UserX, X } from "lucide-react";
import type {
  CoachAccountAction,
  CoachAccountAuditEvent,
  CoachConfiguredUser,
  CoachInvitationRecord
} from "../../../api/coachInvitationClient";
import type { CoachOnboardingReportUser } from "../../../api/coachOnboardingReportClient";
import { statusLabel } from "./inviteManagementConfig";
import {
  accountAuditFilterOptions,
  buildInviteManagementTimeline,
  filterAccountAuditEventsForDetail,
  type AccountAuditFilter
} from "./inviteManagementTimeline";

export type InviteManagementDetail =
  | { kind: "user"; user: CoachConfiguredUser }
  | { kind: "invitation"; invitation: CoachInvitationRecord };

interface InviteManagementDetailPanelProps {
  detail: InviteManagementDetail | null;
  accountAuditEvents?: CoachAccountAuditEvent[];
  onboardingUser?: CoachOnboardingReportUser | null;
  saving?: boolean;
  accountProvisioningEnabled?: boolean;
  onClose: () => void;
  onPrepareAccountProvisioning?: (user: CoachConfiguredUser) => void;
  onRunAccountAction?: (username: string, action: CoachAccountAction) => void;
}

const AUDIT_PREVIEW_LIMIT = 5;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <p className="text-xs font-black text-ink-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-ink-900">{value || "未填写"}</p>
    </div>
  );
}

function userLoginLabel(user: CoachConfiguredUser) {
  if (user.disabled) return "已禁用";
  if (user.canLogin === false) return "不可登录";
  return "可登录";
}

function userGuidance(user: CoachConfiguredUser) {
  if (user.role === "owner") return "Owner 账号受保护，不能在这里禁用或删除。";
  if (user.disabled) return "用户当前不能登录；数据域和历史求职数据仍会保留。";
  if (user.canLogin === false) return "账号配置暂不可登录，建议检查服务端 users file。";
  return "点击台账已同步编辑表单，可直接调整批次、岗位或备注后保存。";
}

function riskTone(label: string) {
  if (label.includes("高")) return "border-line bg-risk-100 text-risk-600";
  if (label.includes("中")) return "border-line bg-warn-100 text-warn-600";
  if (label.includes("无")) return "border-line bg-success-100 text-success-600";
  return "border-line bg-white text-ink-700";
}

function OnboardingSummary({ user }: { user?: CoachOnboardingReportUser | null }) {
  const summary = user?.summary;
  if (!summary) {
    return (
      <div className="rounded-card border border-dashed border-line bg-white p-3">
        <p className="text-xs font-black text-ink-500">首登状态</p>
        <p className="mt-1 text-sm font-bold leading-6 text-ink-600">暂无服务端首登观察；可在建档看板刷新，或等用户完成首登步骤后再查看。</p>
      </div>
    );
  }
  return (
    <div className="rounded-card border border-line bg-surface-100 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-chip border border-line bg-white text-ink-700">
          <Activity size={14} aria-hidden="true" />
          {summary.firstLoginStatus}
        </span>
        <span className="status-chip border border-line bg-white text-brand-700">{summary.latestCompletionRateLabel}</span>
        <span className={`status-chip border ${riskTone(summary.highestRiskLabel || summary.latestRiskLabel)}`}>
          {summary.highestRiskLabel || summary.latestRiskLabel}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailRow label="当前放弃点" value={summary.latestDropOffLabel} />
        <DetailRow label="下一步" value={summary.nextActionLabel} />
      </div>
    </div>
  );
}

function auditRecoveryGuidance(events: CoachAccountAuditEvent[]) {
  const actions = new Set(events.map((event) => event.action));
  if (actions.has("delete") || actions.has("batch_delete")) {
    return "删除类审计只能证明账号曾被移除；恢复需要重新开通或重置密码，历史数据域不会自动删除。";
  }
  if (actions.has("disable") || actions.has("batch_disable") || actions.has("enable") || actions.has("batch_enable")) {
    return "禁用后可通过恢复账号重新允许登录；恢复不会改动画像、机会、知识或复盘数据。";
  }
  if (actions.has("created") || actions.has("password_reset")) {
    return "开通和重置只记录操作发生；为了安全，审计不会展示或恢复旧密码。";
  }
  return "审计用于证明账号动作，最终登录权限仍以服务端 users file 当前状态为准。";
}

function AuditRecoveryRules({ events }: { events: CoachAccountAuditEvent[] }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-xs font-black text-ink-500">恢复规则</p>
      <p className="mt-1 text-sm font-bold leading-6 text-ink-600">{auditRecoveryGuidance(events)}</p>
    </div>
  );
}

function accountActionCopy(user: CoachConfiguredUser, action: CoachAccountAction) {
  if (action === "delete") {
    return {
      confirmLabel: "确认删除",
      message: `确认删除「${user.displayName}」登录账号？删除后该用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。`,
      title: `确认删除登录账号 ${user.displayName}`
    };
  }
  if (action === "enable") {
    return {
      confirmLabel: "确认恢复",
      message: `确认恢复「${user.displayName}」登录账号？恢复后该用户可以再次登录，并继续使用自己的数据域。`,
      title: `确认恢复账号 ${user.displayName}`
    };
  }
  return {
    confirmLabel: "确认禁用",
    message: `确认禁用「${user.displayName}」登录账号？禁用后该用户无法登录；数据域和历史数据会保留，owner 可稍后恢复。`,
    title: `确认禁用账号 ${user.displayName}`
  };
}

function AccountNextActions({
  accountProvisioningEnabled = true,
  onPrepareAccountProvisioning,
  onRunAccountAction,
  saving = false,
  user
}: {
  accountProvisioningEnabled?: boolean;
  onPrepareAccountProvisioning?: (user: CoachConfiguredUser) => void;
  onRunAccountAction?: (username: string, action: CoachAccountAction) => void;
  saving?: boolean;
  user: CoachConfiguredUser;
}) {
  const [pendingAction, setPendingAction] = useState<CoachAccountAction | null>(null);
  if ((!onRunAccountAction && !onPrepareAccountProvisioning) || user.role === "owner") return null;
  const statusAction: CoachAccountAction = user.disabled ? "enable" : "disable";
  const pendingCopy = pendingAction ? accountActionCopy(user, pendingAction) : null;
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <p className="text-sm font-black text-ink-900">账号下一步</p>
      <p className="mt-1 text-xs font-bold leading-5 text-ink-500">这些动作会更新服务端 users file；重置密码需要 owner 输入新密码，系统不会显示旧密码。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onPrepareAccountProvisioning ? (
          <button
            type="button"
            className="secondary-button min-h-9 px-3 text-xs"
            onClick={() => onPrepareAccountProvisioning(user)}
            disabled={saving || !accountProvisioningEnabled}
          >
            <KeyRound size={14} aria-hidden="true" />
            开通/重置密码
          </button>
        ) : null}
        {onRunAccountAction ? (
          <>
            <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => setPendingAction(statusAction)} disabled={saving}>
              {statusAction === "enable" ? <UserCheck size={14} aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
              {statusAction === "enable" ? "恢复账号" : "禁用账号"}
            </button>
            <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-control border border-risk-200 px-3 text-xs font-black text-risk-600 hover:bg-risk-100" onClick={() => setPendingAction("delete")} disabled={saving}>
              <Trash2 size={14} aria-hidden="true" />
              删除登录账号
            </button>
          </>
        ) : null}
      </div>
      {pendingAction && pendingCopy ? (
        <div className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3" role="group" aria-label={`账号详情动作确认 ${user.displayName}`}>
          <p className="text-sm font-black leading-6 text-risk-600">{pendingCopy.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
              onClick={() => {
                if (!onRunAccountAction) return;
                setPendingAction(null);
                onRunAccountAction(user.username, pendingAction);
              }}
              aria-label={pendingCopy.title}
              disabled={saving}
            >
              {pendingAction === "enable" ? <UserCheck size={15} aria-hidden="true" /> : pendingAction === "disable" ? <UserX size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
              {pendingCopy.confirmLabel}
            </button>
            <button type="button" className="secondary-button min-h-11 px-3" onClick={() => setPendingAction(null)} aria-label={`取消账号详情动作 ${user.displayName}`} disabled={saving}>
              取消
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecentTimeline({ accountAuditEvents = [], detail, user }: { accountAuditEvents?: CoachAccountAuditEvent[]; detail: InviteManagementDetail; user?: CoachOnboardingReportUser | null }) {
  const [auditFilter, setAuditFilter] = useState<AccountAuditFilter>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [showAllAudit, setShowAllAudit] = useState(false);
  const detailKey = detail.kind === "user" ? `user:${detail.user.username}` : `invitation:${detail.invitation.id}`;
  useEffect(() => {
    setAuditFilter("all");
    setAuditSearch("");
    setShowAllAudit(false);
  }, [detailKey]);
  const matchedAuditEvents = useMemo(() => filterAccountAuditEventsForDetail(detail, accountAuditEvents), [accountAuditEvents, detail]);
  const filteredAuditEvents = useMemo(
    () => filterAccountAuditEventsForDetail(detail, accountAuditEvents, auditFilter, auditSearch),
    [accountAuditEvents, auditFilter, auditSearch, detail]
  );
  const auditLimit = showAllAudit ? Math.max(filteredAuditEvents.length, AUDIT_PREVIEW_LIMIT) : AUDIT_PREVIEW_LIMIT;
  const items = buildInviteManagementTimeline(detail, user, accountAuditEvents, auditFilter, auditSearch, auditLimit);
  const hasAudit = matchedAuditEvents.length > 0;
  const guidanceEvents = filteredAuditEvents.length ? filteredAuditEvents : matchedAuditEvents;
  const hasHiddenAudit = filteredAuditEvents.length > AUDIT_PREVIEW_LIMIT;
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <div className="flex items-start gap-2">
        <Clock3 size={16} className="mt-0.5 text-brand-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-black text-ink-900">最近动态</p>
          <p className="mt-1 text-xs font-bold leading-5 text-ink-500">
            {hasAudit ? "优先展示服务端账号审计、再补充首登和台账状态。" : "仅展示当前台账和首登报表可证明的记录，不等于完整审计日志。"}
          </p>
        </div>
      </div>
      {hasAudit ? (
        <div className="mt-3 grid gap-3 rounded-card border border-line bg-surface-100 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-xs font-black text-ink-500">
              <ListFilter size={14} aria-hidden="true" />
              审计筛选
            </span>
            <select
              className="field-control mt-2"
              value={auditFilter}
              onChange={(event) => {
                setAuditFilter(event.target.value as AccountAuditFilter);
                setShowAllAudit(false);
              }}
              aria-label="账号审计类型筛选"
            >
              {accountAuditFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="text-xs font-black text-ink-500">搜索审计</span>
            <input
              className="field-control mt-2"
              value={auditSearch}
              onChange={(event) => {
                setAuditSearch(event.target.value);
                setShowAllAudit(false);
              }}
              aria-label="账号审计搜索"
              placeholder="动作、操作人、消息或用户名"
            />
          </label>
          <p className="text-sm font-black text-ink-700">
            {filteredAuditEvents.length}/{matchedAuditEvents.length} 条匹配
          </p>
        </div>
      ) : null}
      {hasAudit && filteredAuditEvents.length === 0 ? (
        <p className="mt-3 rounded-card border border-dashed border-line bg-white p-3 text-sm font-bold text-ink-500">当前筛选没有匹配的账号审计事件；下方只保留首登和台账状态。</p>
      ) : null}
      <ol className="mt-3 space-y-2" aria-label="账号最近动态">
        {items.map((item) => (
          <li key={item.id} className="rounded-card border border-line bg-surface-100 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm font-black text-ink-900">{item.title}</p>
              <time className="text-xs font-black text-ink-500">{item.timeLabel}</time>
            </div>
            <p className="mt-1 text-sm font-bold leading-6 text-ink-600">{item.description}</p>
          </li>
        ))}
      </ol>
      {hasAudit && hasHiddenAudit ? (
        <button type="button" className="secondary-button mt-3 min-h-9 px-3 text-xs" onClick={() => setShowAllAudit((current) => !current)} aria-expanded={showAllAudit}>
          {showAllAudit ? "收起审计记录" : `查看全部审计（${filteredAuditEvents.length}）`}
        </button>
      ) : null}
      {hasAudit ? <AuditRecoveryRules events={guidanceEvents} /> : null}
    </div>
  );
}

export function InviteManagementDetailPanel({
  accountAuditEvents = [],
  accountProvisioningEnabled = true,
  detail,
  onboardingUser,
  onClose,
  onPrepareAccountProvisioning,
  onRunAccountAction,
  saving = false
}: InviteManagementDetailPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!detail) return;
    closeButtonRef.current?.focus();
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink-900/40 p-0 backdrop-blur-[1px] sm:items-stretch sm:p-4" role="presentation">
      <section
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-card border border-line bg-surface-0 shadow-soft sm:h-full sm:max-h-none sm:max-w-2xl sm:rounded-card"
        role="dialog"
        aria-modal="true"
        aria-label="账号详情抽屉"
      >
        <div className="flex justify-center bg-white pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-line bg-white p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-ink-500">当前选择</p>
            <h3 className="mt-1 text-base font-black text-ink-900">
              {detail.kind === "user" ? detail.user.displayName : detail.invitation.displayName}
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-ink-500">关闭后会回到当前筛选和台账位置。</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="secondary-button min-h-11 px-3"
            onClick={onClose}
            aria-label="关闭账号详情抽屉"
          >
            <X size={16} aria-hidden="true" />
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
          {detail.kind === "user" ? (
            <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`status-chip border border-line bg-white ${detail.user.disabled || detail.user.canLogin === false ? "text-risk-600" : "text-success-600"}`}>
              <KeyRound size={14} aria-hidden="true" />
              {userLoginLabel(detail.user)}
            </span>
            <span className="status-chip border border-line bg-white text-ink-700">
              <UserRound size={14} aria-hidden="true" />
              {detail.user.role}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="登录名" value={detail.user.username} />
            <DetailRow label="数据域" value={detail.user.dataScope} />
            <DetailRow label="邀请批次" value={detail.user.inviteBatch} />
            <DetailRow label="登录能力" value={userLoginLabel(detail.user)} />
          </div>
          <OnboardingSummary user={onboardingUser} />
          <RecentTimeline accountAuditEvents={accountAuditEvents} detail={detail} user={onboardingUser} />
          <AccountNextActions
            accountProvisioningEnabled={accountProvisioningEnabled}
            onPrepareAccountProvisioning={onPrepareAccountProvisioning}
            onRunAccountAction={onRunAccountAction}
            saving={saving}
            user={detail.user}
          />
          <p className="rounded-card border border-line bg-surface-100 p-3 text-sm font-bold leading-6 text-ink-600">
            {userGuidance(detail.user)}
          </p>
            </div>
          ) : (
            <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-chip border border-line bg-white text-ink-700">
              <FileText size={14} aria-hidden="true" />
              邀请记录
            </span>
            <span className="status-chip border border-line bg-white text-brand-700">
              {statusLabel(detail.invitation.status)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="登录名" value={detail.invitation.username} />
            <DetailRow label="数据域" value={detail.invitation.dataScope} />
            <DetailRow label="邀请批次" value={detail.invitation.inviteBatch} />
            <DetailRow label="目标岗位" value={detail.invitation.targetRole} />
            <DetailRow label="角色族" value={detail.invitation.roleFamily} />
            <DetailRow label="模板版本" value={detail.invitation.templateVersion || "role-family-v1"} />
          </div>
          <div className="rounded-card border border-line bg-surface-100 p-3">
            <p className="text-xs font-black text-ink-500">运营备注</p>
            <p className="mt-1 text-sm font-bold leading-6 text-ink-700">{detail.invitation.note || "未填写备注。"}</p>
          </div>
          <OnboardingSummary user={onboardingUser} />
          <RecentTimeline accountAuditEvents={accountAuditEvents} detail={detail} user={onboardingUser} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

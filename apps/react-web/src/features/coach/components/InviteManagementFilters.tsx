import type {
  CoachAccountAction,
  CoachConfiguredUser,
  CoachInvitationNotificationChannel,
  CoachInvitationRecord,
  CoachInvitationResponse,
  CoachInvitationStatus
} from "../../../api/coachInvitationClient";
import { statusLabel, statusOptions } from "./inviteManagementConfig";

interface InviteManagementFiltersProps {
  batchAccountAction: CoachAccountAction;
  batchOptions: string[];
  batchStatus: CoachInvitationStatus;
  filteredInvitationCount: number;
  filteredUserCount: number;
  ledgerSearch: string;
  notificationChannel: CoachInvitationNotificationChannel;
  selectedBatch: string;
  onBatchAccountActionChange: (action: CoachAccountAction) => void;
  onBatchStatusChange: (status: CoachInvitationStatus) => void;
  onClearLedgerSearch: () => void;
  onLedgerSearchChange: (value: string) => void;
  onNotificationChannelChange: (channel: CoachInvitationNotificationChannel) => void;
  onSelectedBatchChange: (batch: string) => void;
}

export function filterInviteManagementRecords(
  response: CoachInvitationResponse | null,
  selectedBatch: string,
  ledgerSearch: string
): {
  filteredInvitations: CoachInvitationRecord[];
  filteredUsers: CoachConfiguredUser[];
  normalizedLedgerSearch: string;
} {
  const normalizedLedgerSearch = ledgerSearch.trim().toLowerCase();
  const matchesLedgerSearch = (values: Array<string | undefined>) => {
    if (!normalizedLedgerSearch) return true;
    return values.some((value) => value?.toLowerCase().includes(normalizedLedgerSearch));
  };
  const filteredInvitations = response?.invitations.filter((invitation) => {
    const inSelectedBatch = selectedBatch === "all" || invitation.inviteBatch === selectedBatch;
    return inSelectedBatch && matchesLedgerSearch([
      invitation.username,
      invitation.displayName,
      invitation.dataScope,
      invitation.inviteBatch,
      invitation.templateVersion,
      invitation.roleFamily,
      invitation.targetRole,
      statusLabel(invitation.status),
      invitation.note
    ]);
  }) ?? [];
  const filteredUsers = response?.configuredUsers.filter((user) => {
    const inSelectedBatch = selectedBatch === "all" || user.inviteBatch === selectedBatch;
    return inSelectedBatch && matchesLedgerSearch([
      user.username,
      user.displayName,
      user.dataScope,
      user.inviteBatch,
      user.role,
      user.disabled ? "已禁用 disabled" : "可登录 active"
    ]);
  }) ?? [];
  return { filteredInvitations, filteredUsers, normalizedLedgerSearch };
}

export function InviteManagementFilters({
  batchAccountAction,
  batchOptions,
  batchStatus,
  filteredInvitationCount,
  filteredUserCount,
  ledgerSearch,
  notificationChannel,
  selectedBatch,
  onBatchAccountActionChange,
  onBatchStatusChange,
  onClearLedgerSearch,
  onLedgerSearchChange,
  onNotificationChannelChange,
  onSelectedBatchChange
}: InviteManagementFiltersProps) {
  const hasSearch = ledgerSearch.trim().length > 0;
  return (
    <div className="grid w-full min-w-0 gap-3 md:grid-cols-3">
      <label className="block">
        <span className="text-sm font-black text-ink-700">批次筛选</span>
        <select className="field-control mt-2" value={selectedBatch} onChange={(event) => onSelectedBatchChange(event.target.value)} aria-label="批次筛选">
          <option value="all">全部批次</option>
          {batchOptions.map((batch) => (
            <option key={batch} value={batch}>{batch}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-black text-ink-700">批量状态</span>
        <select className="field-control mt-2" value={batchStatus} onChange={(event) => onBatchStatusChange(event.target.value as CoachInvitationStatus)} aria-label="批量状态">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-black text-ink-700">批量账号动作</span>
        <select className="field-control mt-2" value={batchAccountAction} onChange={(event) => onBatchAccountActionChange(event.target.value as CoachAccountAction)} aria-label="批量账号动作">
          <option value="disable">禁用账号</option>
          <option value="enable">恢复账号</option>
          <option value="delete">删除账号</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-black text-ink-700">邀请通知渠道</span>
        <select className="field-control mt-2" value={notificationChannel} onChange={(event) => onNotificationChannelChange(event.target.value as CoachInvitationNotificationChannel)} aria-label="邀请通知渠道">
          <option value="im">IM 文案</option>
          <option value="email">邮件文案</option>
          <option value="manual">手动发送文案</option>
        </select>
      </label>
      <div className="block md:col-span-2">
        <label className="text-sm font-black text-ink-700" htmlFor="invite-ledger-search">账号搜索</label>
        <input
          id="invite-ledger-search"
          className="field-control mt-2"
          value={ledgerSearch}
          onChange={(event) => onLedgerSearchChange(event.target.value)}
          placeholder="搜索登录名、显示名、数据域、岗位或备注"
          aria-describedby="invite-ledger-search-hint"
        />
        <p id="invite-ledger-search-hint" className="mt-2 text-xs font-bold leading-5 text-ink-500">
          搜索会同时过滤邀请记录、登录账号、批量账号动作和通知生成范围。
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface-100 p-3">
        <p className="text-xs font-black text-ink-500">当前筛选</p>
        <p className="mt-1 text-sm font-black text-ink-900">{filteredInvitationCount} 条邀请 · {filteredUserCount} 个账号</p>
        {hasSearch ? (
          <button type="button" className="secondary-button mt-3 min-h-9 px-3 text-xs" onClick={onClearLedgerSearch}>
            清空搜索
          </button>
        ) : null}
      </div>
    </div>
  );
}

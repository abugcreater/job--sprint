import { Download, Layers, Mail, RefreshCcw, Save, Trash2, Upload, UserCheck, UserPlus, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildCoachLoginEntry,
  buildCoachInvitationExport,
  createCoachInvitationDraft,
  deleteCoachInvitation,
  fetchCoachInvitations,
  generateCoachInvitationNotifications,
  saveCoachInvitation,
  updateCoachInvitationBatchAccountStatus,
  updateCoachInvitationAccountStatus,
  updateCoachInvitationBatchStatus,
  type CoachConfiguredUser,
  type CoachAccountAction,
  type CoachInvitationDraft,
  type CoachInvitationRecord,
  type CoachInvitationNotificationChannel,
  type CoachInvitationResponse,
  type CoachInvitationStatus
} from "../../../api/coachInvitationClient";
import type { CoachOnboardingReportResponse } from "../../../api/coachOnboardingReportClient";
import {
  importCoachInvitations,
  parseCoachInvitationImport
} from "../../../api/coachInvitationImportClient";
import { InviteManagementDetailPanel, type InviteManagementDetail } from "./InviteManagementDetailPanel";
import { InviteManagementFilters, filterInviteManagementRecords } from "./InviteManagementFilters";
import { InviteManagementLedger } from "./InviteManagementLedger";
import { Field, MetricTile, PanelTitle, Textarea } from "./CoachPrimitives";
import { buildBatchAccountActionConfirmation, buildBatchActionHint } from "./inviteManagementBatchActions";
import { accountProvisioningText, roleFamilyOptions, statusLabel, statusOptions, templateVersionOptions } from "./inviteManagementConfig";
import { accountProvisioningReadyMessage, draftFromConfiguredUser, draftFromInvitation } from "./inviteManagementDraft";
import { findInviteManagementOnboardingUser } from "./inviteManagementOnboarding";

export function InviteManagementPanel({ onboardingReport = null }: { onboardingReport?: CoachOnboardingReportResponse | null }) {
  const [draft, setDraft] = useState<CoachInvitationDraft>(() => createCoachInvitationDraft());
  const [response, setResponse] = useState<CoachInvitationResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "local" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [batchStatus, setBatchStatus] = useState<CoachInvitationStatus>("invited");
  const [batchAccountAction, setBatchAccountAction] = useState<CoachAccountAction>("disable");
  const [notificationChannel, setNotificationChannel] = useState<CoachInvitationNotificationChannel>("im");
  const [exportPreview, setExportPreview] = useState("");
  const [importText, setImportText] = useState("");
  const [confirmingBatchAccountAction, setConfirmingBatchAccountAction] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<InviteManagementDetail | null>(null);
  const detailReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setStatus("loading");
    try {
      const result = await fetchCoachInvitations();
      setResponse(result);
      setStatus(result ? "ready" : "local");
      setMessage(result ? "" : "服务端邀请管理未连接；当前只能查看本地教练流程。");
    } catch (_) {
      setStatus("error");
      setMessage("邀请账号读取失败，请稍后刷新。");
    }
  };

  const saveInvitation = async () => {
    if (!draft.username.trim()) {
      setMessage("请先填写登录名。");
      return;
    }
    setStatus("saving");
    try {
      const result = await saveCoachInvitation({
        ...draft,
        displayName: draft.displayName || draft.username,
        dataScope: draft.dataScope || draft.username
      });
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.accountProvisioning?.status === "PASS" ? result.accountProvisioning.message || "登录账号已更新。" : "邀请记录已保存。");
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；邀请记录未写入服务端。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "邀请记录保存失败，请检查登录状态和服务端。");
    }
  };

  const runBatchStatusUpdate = async () => {
    if (selectedBatch === "all") {
      setMessage("请先选择一个具体批次，再批量更新状态。");
      return;
    }
    setStatus("saving");
    try {
      const result = await updateCoachInvitationBatchStatus(selectedBatch, batchStatus);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.batchAction?.message || `已将 ${selectedBatch} 批次更新为「${statusLabel(batchStatus)}」。`);
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；批次状态未写入服务端。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "批次状态更新失败。");
    }
  };

  const removeInvitation = async (username: string, displayName: string) => {
    setStatus("saving");
    try {
      const result = await deleteCoachInvitation(username);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.deletion?.message || `已删除「${displayName}」的邀请记录；登录账号如需禁用请在 users file 中单独处理。`);
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；邀请记录未删除。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "邀请记录删除失败。");
    }
  };

  const runAccountAction = async (username: string, action: "disable" | "enable" | "delete") => {
    setStatus("saving");
    try {
      const result = await updateCoachInvitationAccountStatus(username, action);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.accountAction?.message || "登录账号状态已更新。");
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；登录账号状态未更新。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "登录账号状态更新失败。");
    }
  };

  const runBatchAccountAction = async () => {
    setConfirmingBatchAccountAction(false);
    if (selectedBatch === "all") {
      setMessage("请先选择一个具体批次，再批量更新登录账号。");
      return;
    }
    const usernames = filteredUsers.map((user) => user.username);
    if (usernames.length === 0) {
      setMessage("当前批次没有可操作的登录账号。");
      return;
    }
    setStatus("saving");
    try {
      const result = await updateCoachInvitationBatchAccountStatus(usernames, batchAccountAction);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.accountBatchAction?.message || `已批量处理 ${usernames.length} 个登录账号。`);
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；登录账号批量动作未更新。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "登录账号批量动作失败。");
    }
  };

  const generateNotificationDrafts = async () => {
    if (selectedBatch === "all") {
      setMessage("请先选择一个具体批次，再生成邀请通知。");
      return;
    }
    const usernames = filteredUsers.map((user) => user.username);
    if (usernames.length === 0) {
      setMessage("当前批次没有可生成通知的登录账号。");
      return;
    }
    setStatus("saving");
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const result = await generateCoachInvitationNotifications(usernames, notificationChannel, baseUrl);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setExportPreview(JSON.stringify(result.notificationAction, null, 2));
        setMessage(result.notificationAction?.message || `已生成 ${usernames.length} 条邀请通知草稿。`);
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；邀请通知未生成。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "邀请通知生成失败。");
    }
  };

  const closeDetail = () => {
    const target = detailReturnFocusRef.current;
    setSelectedDetail(null);
    if (target?.isConnected) target.focus();
  };

  const pickConfiguredUser = (user: CoachConfiguredUser, trigger?: HTMLElement) => {
    detailReturnFocusRef.current = trigger ?? null;
    setSelectedDetail({ kind: "user", user });
    setDraft((current) => draftFromConfiguredUser(current, user));
  };

  const prepareAccountProvisioning = (user: CoachConfiguredUser) => {
    setSelectedDetail({ kind: "user", user });
    setDraft((current) => draftFromConfiguredUser(current, user, { provisionAccount: true }));
    setStatus("ready");
    setMessage(accountProvisioningReadyMessage(user));
  };

  const pickInvitation = (invitation: CoachInvitationRecord, trigger?: HTMLElement) => {
    detailReturnFocusRef.current = trigger ?? null;
    setSelectedDetail({ kind: "invitation", invitation });
    setDraft(draftFromInvitation(invitation));
  };

  const generateLoginEntry = (user: CoachConfiguredUser) => {
    setExportPreview(buildCoachLoginEntry(user));
    setStatus("ready");
    setMessage(`已生成「${user.displayName}」的登录入口 JSON；不包含密码。`);
  };

  const generateExport = () => {
    if (!response) {
      setMessage("服务端邀请管理未连接，暂无可导出的邀请报表。");
      return;
    }
    setExportPreview(buildCoachInvitationExport(response, selectedBatch));
    setStatus("ready");
    setMessage(selectedBatch === "all" ? "已生成全部邀请报表 JSON。" : `已生成 ${selectedBatch} 批次邀请报表 JSON。`);
  };

  const runBulkImport = async () => {
    const parsed = parseCoachInvitationImport(importText, {
      inviteBatch: selectedBatch === "all" ? draft.inviteBatch : selectedBatch,
      templateVersion: draft.templateVersion,
      roleFamily: draft.roleFamily,
      status: "invited"
    });
    if (parsed.rejectedRows.length > 0) {
      setStatus("error");
      setMessage(`批量导入有 ${parsed.rejectedRows.length} 行需要修正。`);
      return;
    }
    if (parsed.records.length === 0) {
      setStatus("error");
      setMessage("请先粘贴至少 1 条邀请记录。");
      return;
    }
    setStatus("saving");
    try {
      const result = await importCoachInvitations(parsed.records);
      setResponse(result);
      if (result) {
        setStatus("saved");
        setMessage(result.importAction?.message || `已导入 ${parsed.records.length} 条邀请记录。`);
        setImportText("");
        return;
      }
      setStatus("local");
      setMessage("服务端邀请管理未连接；批量导入未写入服务端。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "批量导入失败。");
    }
  };

  const summary = response?.summary;
  const batchOptions = Array.from(new Set(response?.invitations.map((invitation) => invitation.inviteBatch).filter(Boolean) ?? [])).sort();
  const { filteredInvitations, filteredUsers } = filterInviteManagementRecords(response, selectedBatch, ledgerSearch);
  const saving = status === "saving";
  const batchStatusDisabled = saving || selectedBatch === "all";
  const batchAccountDisabled = saving || selectedBatch === "all" || filteredUsers.length === 0;
  const notificationDisabled = batchAccountDisabled;
  const batchActionHint = buildBatchActionHint({ selectedBatch, filteredUserCount: filteredUsers.length, saving });
  const batchAccountConfirmation = confirmingBatchAccountAction && !batchAccountDisabled
    ? buildBatchAccountActionConfirmation({ action: batchAccountAction, filteredUserCount: filteredUsers.length, selectedBatch })
    : null;
  const selectedOnboardingUser = findInviteManagementOnboardingUser(onboardingReport, selectedDetail);
  return (
    <article className="command-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <PanelTitle icon={<UserPlus size={18} aria-hidden="true" />} title="邀请账号管理" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
            管理试用用户、批次和登录状态；账号开通依赖服务端 users file。
          </p>
        </div>
        <button type="button" className="secondary-button min-h-10 px-3" onClick={loadInvitations} disabled={status === "loading"}>
          <RefreshCcw size={15} aria-hidden="true" />
          {status === "loading" ? "读取中" : "刷新邀请"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="邀请记录" value={`${summary?.totalInvitations ?? 0} 条`} />
        <MetricTile label="批次" value={`${summary?.batchCount ?? 0} 个`} />
        <MetricTile label="草稿" value={`${summary?.draftCount ?? 0} 条`} />
        <MetricTile label="已邀请" value={`${summary?.invitedCount ?? 0} 条`} />
        <MetricTile label="已激活" value={`${summary?.activeCount ?? 0} 条`} />
        <MetricTile label="已暂停" value={`${summary?.pausedCount ?? 0} 条`} />
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface-0 p-4">
        <div className="flex flex-col gap-3">
          <InviteManagementFilters
            batchAccountAction={batchAccountAction}
            batchOptions={batchOptions}
            batchStatus={batchStatus}
            filteredInvitationCount={filteredInvitations.length}
            filteredUserCount={filteredUsers.length}
            ledgerSearch={ledgerSearch}
            notificationChannel={notificationChannel}
            selectedBatch={selectedBatch}
            onBatchAccountActionChange={(action) => {
              setBatchAccountAction(action);
              setConfirmingBatchAccountAction(false);
            }}
            onBatchStatusChange={setBatchStatus}
            onClearLedgerSearch={() => {
              setLedgerSearch("");
              setConfirmingBatchAccountAction(false);
            }}
            onLedgerSearchChange={(value) => {
              setLedgerSearch(value);
              setConfirmingBatchAccountAction(false);
            }}
            onNotificationChannelChange={setNotificationChannel}
            onSelectedBatchChange={(batch) => {
              setSelectedBatch(batch);
              setConfirmingBatchAccountAction(false);
            }}
          />
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <p id="invite-batch-action-hint" className="rounded-card border border-line bg-white p-3 text-sm font-bold leading-6 text-ink-500" role="note">{batchActionHint}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="secondary-button min-h-11 px-3" onClick={runBatchStatusUpdate} disabled={batchStatusDisabled} aria-describedby="invite-batch-action-hint">
                <Layers size={16} aria-hidden="true" />
                批量更新批次状态
              </button>
              <button type="button" className="secondary-button min-h-11 px-3" onClick={generateExport}>
                <Download size={16} aria-hidden="true" />
                生成导出 JSON
              </button>
              <button
                type="button"
                className="secondary-button min-h-11 px-3"
                onClick={() => setConfirmingBatchAccountAction(true)}
                disabled={batchAccountDisabled}
                aria-controls="invite-batch-account-confirm"
                aria-describedby="invite-batch-action-hint"
                aria-expanded={Boolean(batchAccountConfirmation)}
              >
                {batchAccountAction === "enable" ? <UserCheck size={16} aria-hidden="true" /> : batchAccountAction === "disable" ? <UserX size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                批量更新账号状态
              </button>
              <button type="button" className="secondary-button min-h-11 px-3" onClick={generateNotificationDrafts} disabled={notificationDisabled} aria-describedby="invite-batch-action-hint">
                <Mail size={16} aria-hidden="true" />
                生成邀请通知
              </button>
            </div>
          </div>
        </div>
        {batchAccountConfirmation ? (
          <div
            id="invite-batch-account-confirm"
            className="mt-4 rounded-card border border-risk-200 bg-risk-100 p-3"
            role="group"
            aria-label={`批量账号动作确认 ${selectedBatch}`}
          >
            <p className="text-sm font-black leading-6 text-risk-600">{batchAccountConfirmation.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                onClick={runBatchAccountAction}
                aria-label={batchAccountConfirmation.title}
                disabled={saving}
              >
                {batchAccountAction === "enable" ? <UserCheck size={15} aria-hidden="true" /> : batchAccountAction === "disable" ? <UserX size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
                {batchAccountConfirmation.confirmLabel}
              </button>
              <button
                type="button"
                className="secondary-button min-h-11 px-3"
                onClick={() => setConfirmingBatchAccountAction(false)}
                aria-label={`取消批量账号动作 ${selectedBatch}`}
                disabled={saving}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}
        {exportPreview ? (
          <div className="mt-4">
            <Textarea label="导出与通知预览" value={exportPreview} onChange={setExportPreview} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface-0 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1">
            <Textarea
              label="批量导入邀请"
              value={importText}
              onChange={setImportText}
              placeholder="username,displayName,roleFamily,targetRole,inviteBatch,dataScope,templateVersion,status,note"
            />
          </div>
          <button type="button" className="primary-button min-h-11 px-3" onClick={runBulkImport} disabled={status === "saving"}>
            <Upload size={16} aria-hidden="true" />
            批量导入邀请
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-surface-0 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="登录名" value={draft.username} onChange={(value) => setDraft((current) => ({ ...current, username: value }))} placeholder="mia" />
            <Field label="显示名" value={draft.displayName} onChange={(value) => setDraft((current) => ({ ...current, displayName: value }))} placeholder="Mia" />
            <Field label="数据域" value={draft.dataScope} onChange={(value) => setDraft((current) => ({ ...current, dataScope: value }))} placeholder="默认同登录名" />
            <Field label="邀请批次" value={draft.inviteBatch} onChange={(value) => setDraft((current) => ({ ...current, inviteBatch: value }))} />
            <label className="block">
              <span className="text-sm font-black text-ink-700">建档模板版本</span>
              <select className="field-control mt-2" value={draft.templateVersion} onChange={(event) => setDraft((current) => ({ ...current, templateVersion: event.target.value }))} aria-label="建档模板版本">
                {templateVersionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">邀请角色族</span>
              <select className="field-control mt-2" value={draft.roleFamily} onChange={(event) => setDraft((current) => ({ ...current, roleFamily: event.target.value }))} aria-label="邀请角色族">
                {roleFamilyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">邀请状态</span>
              <select className="field-control mt-2" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as CoachInvitationStatus }))} aria-label="邀请状态">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">账号角色</span>
              <select className="field-control mt-2" value={draft.accountRole} onChange={(event) => setDraft((current) => ({ ...current, accountRole: event.target.value as "coach" | "viewer" }))} aria-label="账号角色">
                <option value="coach">可编辑教练用户</option>
                <option value="viewer">只读观察用户</option>
              </select>
            </label>
          </div>
          <Field label="邀请目标岗位" value={draft.targetRole} onChange={(value) => setDraft((current) => ({ ...current, targetRole: value }))} placeholder="测试开发工程师" />
          <div className="mt-4 rounded-card border border-line bg-surface-100 p-3">
            <label className="flex items-center gap-2 text-sm font-black text-ink-800">
              <input
                type="checkbox"
                checked={draft.provisionAccount}
                disabled={response?.accountProvisioning?.enabled === false}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  provisionAccount: event.target.checked,
                  status: event.target.checked ? "active" : current.status
                }))}
              />
              开通或重置登录账号
            </label>
            <div className="mt-3">
              <Field
                label="登录密码"
                type="password"
                value={draft.password}
                onChange={(value) => setDraft((current) => ({ ...current, password: value }))}
                placeholder="至少 8 位"
              />
            </div>
            <p className="mt-2 text-xs font-bold text-ink-500">
              {accountProvisioningText(response)}
            </p>
          </div>
          <Textarea label="邀请备注" value={draft.note} onChange={(value) => setDraft((current) => ({ ...current, note: value }))} placeholder="来源、试用目标、首登关注点。" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="primary-button" onClick={saveInvitation} disabled={status === "saving"}>
              <Save size={16} aria-hidden="true" />
              {status === "saving" ? "保存中" : "保存邀请记录"}
            </button>
            <button
              type="button"
              className="secondary-button min-h-11 px-3"
              onClick={() => {
                setDraft(createCoachInvitationDraft());
                setSelectedDetail(null);
              }}
            >
              新建草稿
            </button>
          </div>
        </div>

        <div>
          <InviteManagementLedger
            accountProvisioning={response?.accountProvisioning}
            invitations={filteredInvitations}
            saving={saving}
            summary={summary}
            users={filteredUsers}
            onGenerateLoginEntry={generateLoginEntry}
            onPickInvitation={pickInvitation}
            onPickUser={pickConfiguredUser}
            onRemoveInvitation={removeInvitation}
            onRunAccountAction={runAccountAction}
            selectedInvitationId={selectedDetail?.kind === "invitation" ? selectedDetail.invitation.id : ""}
            selectedUsername={selectedDetail?.kind === "user" ? selectedDetail.user.username : ""}
          />
        </div>
      </div>

      <InviteManagementDetailPanel
        accountAuditEvents={response?.accountAuditEvents}
        accountProvisioningEnabled={response?.accountProvisioning?.enabled !== false}
        detail={selectedDetail}
        onboardingUser={selectedOnboardingUser}
        saving={saving}
        onClose={closeDetail}
        onPrepareAccountProvisioning={prepareAccountProvisioning}
        onRunAccountAction={runAccountAction}
      />

      {message ? (
        <p className={`mt-4 rounded-control px-3 py-2 text-sm font-bold ${status === "error" ? "bg-risk-100 text-risk-600" : "bg-success-100 text-success-600"}`} role="status">
          {message}
        </p>
      ) : null}
    </article>
  );
}

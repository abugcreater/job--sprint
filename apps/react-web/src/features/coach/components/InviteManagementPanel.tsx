import { Copy, Download, KeyRound, Layers, Mail, RefreshCcw, Save, Trash2, Upload, UserCheck, UserPlus, UserX } from "lucide-react";
import { useEffect, useState } from "react";
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
  type CoachInvitationDraft,
  type CoachInvitationNotificationChannel,
  type CoachInvitationResponse,
  type CoachInvitationStatus
} from "../../../api/coachInvitationClient";
import {
  importCoachInvitations,
  parseCoachInvitationImport
} from "../../../api/coachInvitationImportClient";
import { Field, MetricTile, PanelTitle, Textarea } from "./CoachPrimitives";
import { accountProvisioningText, roleFamilyOptions, statusLabel, statusOptions, templateVersionOptions } from "./inviteManagementConfig";

export function InviteManagementPanel() {
  const [draft, setDraft] = useState<CoachInvitationDraft>(() => createCoachInvitationDraft());
  const [response, setResponse] = useState<CoachInvitationResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "local" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [batchStatus, setBatchStatus] = useState<CoachInvitationStatus>("invited");
  const [batchAccountAction, setBatchAccountAction] = useState<"disable" | "enable" | "delete">("disable");
  const [notificationChannel, setNotificationChannel] = useState<CoachInvitationNotificationChannel>("im");
  const [exportPreview, setExportPreview] = useState("");
  const [importText, setImportText] = useState("");

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
  const filteredInvitations = response?.invitations.filter((invitation) => selectedBatch === "all" || invitation.inviteBatch === selectedBatch) ?? [];
  const filteredUsers = response?.configuredUsers.filter((user) => selectedBatch === "all" || user.inviteBatch === selectedBatch) ?? [];
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-black text-ink-700">批次筛选</span>
              <select className="field-control mt-2" value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)} aria-label="批次筛选">
                <option value="all">全部批次</option>
                {batchOptions.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">批量状态</span>
              <select className="field-control mt-2" value={batchStatus} onChange={(event) => setBatchStatus(event.target.value as CoachInvitationStatus)} aria-label="批量状态">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">批量账号动作</span>
              <select className="field-control mt-2" value={batchAccountAction} onChange={(event) => setBatchAccountAction(event.target.value as "disable" | "enable" | "delete")} aria-label="批量账号动作">
                <option value="disable">禁用账号</option>
                <option value="enable">恢复账号</option>
                <option value="delete">删除账号</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black text-ink-700">邀请通知渠道</span>
              <select className="field-control mt-2" value={notificationChannel} onChange={(event) => setNotificationChannel(event.target.value as CoachInvitationNotificationChannel)} aria-label="邀请通知渠道">
                <option value="im">IM 文案</option>
                <option value="email">邮件文案</option>
                <option value="manual">手动发送文案</option>
              </select>
            </label>
            <div className="rounded-card border border-line bg-surface-100 p-3">
              <p className="text-xs font-black text-ink-500">当前筛选</p>
              <p className="mt-1 text-sm font-black text-ink-900">{filteredInvitations.length} 条邀请 · {filteredUsers.length} 个账号</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-button min-h-11 px-3" onClick={runBatchStatusUpdate} disabled={status === "saving" || selectedBatch === "all"}>
              <Layers size={16} aria-hidden="true" />
              批量更新批次状态
            </button>
            <button type="button" className="secondary-button min-h-11 px-3" onClick={generateExport}>
              <Download size={16} aria-hidden="true" />
              生成导出 JSON
            </button>
            <button type="button" className="secondary-button min-h-11 px-3" onClick={runBatchAccountAction} disabled={status === "saving" || selectedBatch === "all" || filteredUsers.length === 0}>
              {batchAccountAction === "enable" ? <UserCheck size={16} aria-hidden="true" /> : batchAccountAction === "disable" ? <UserX size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
              批量更新账号状态
            </button>
            <button type="button" className="secondary-button min-h-11 px-3" onClick={generateNotificationDrafts} disabled={status === "saving" || selectedBatch === "all" || filteredUsers.length === 0}>
              <Mail size={16} aria-hidden="true" />
              生成邀请通知
            </button>
          </div>
        </div>
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
            <button type="button" className="secondary-button min-h-11 px-3" onClick={() => setDraft(createCoachInvitationDraft())}>
              新建草稿
            </button>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface-0 p-4">
          <p className="text-sm font-black text-ink-900">服务端账号与邀请台账</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
            {summary?.nextActionLabel ?? "连接服务端后可查看已配置账号和邀请记录。"}
          </p>
          {response?.accountProvisioning?.status === "PASS" ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-control bg-success-100 px-3 py-2 text-xs font-black text-success-600" role="status">
              <KeyRound size={14} aria-hidden="true" />
              {response.accountProvisioning.message}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {filteredUsers.slice(0, 6).map((user) => (
              <div
                key={`${user.dataScope}-${user.username}`}
                className="w-full rounded-card border border-line bg-surface-100 p-3 text-left"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setDraft((current) => ({
                    ...current,
                    username: user.username,
                    displayName: user.displayName,
                    dataScope: user.dataScope,
                    inviteBatch: user.inviteBatch,
                    accountRole: user.role === "viewer" ? "viewer" : "coach",
                    password: "",
                    provisionAccount: false
                  }))}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-ink-900">{user.displayName}</span>
                    <span className={`status-chip border border-line bg-white ${user.disabled ? "text-risk-600" : "text-success-600"}`}>
                      {user.disabled ? "已禁用" : "可登录"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-bold text-ink-500">{user.role} · {user.inviteBatch} · {user.dataScope}</span>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => generateLoginEntry(user)}>
                    <Copy size={14} aria-hidden="true" />
                    登录入口
                  </button>
                  <button
                    type="button"
                    className="secondary-button min-h-9 px-3 text-xs"
                    onClick={() => runAccountAction(user.username, user.disabled ? "enable" : "disable")}
                    disabled={user.role === "owner" || status === "saving"}
                  >
                    {user.disabled ? <UserCheck size={14} aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
                    {user.disabled ? "恢复账号" : "禁用账号"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-control border border-risk-200 px-3 text-xs font-black text-risk-600 hover:bg-risk-100"
                    onClick={() => runAccountAction(user.username, "delete")}
                    disabled={user.role === "owner" || status === "saving"}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    删除登录账号
                  </button>
                </div>
              </div>
            ))}
            {filteredInvitations.slice(0, 8).map((invitation) => (
              <div key={invitation.id} className="rounded-card border border-line bg-white p-3">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setDraft({
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
                  })}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-ink-900">{invitation.displayName}</span>
                    <span className="status-chip border border-line bg-white text-ink-700">{statusLabel(invitation.status)}</span>
                  </span>
                  <span className="mt-1 block text-xs font-bold text-ink-500">
                    {invitation.inviteBatch} · {invitation.templateVersion || "role-family-v1"} · {invitation.targetRole || "未填岗位"}
                  </span>
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-control border border-risk-200 px-3 text-xs font-black text-risk-600 hover:bg-risk-100"
                  onClick={() => removeInvitation(invitation.username, invitation.displayName)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  删除邀请记录：{invitation.displayName}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message ? (
        <p className={`mt-4 rounded-control px-3 py-2 text-sm font-bold ${status === "error" ? "bg-risk-100 text-risk-600" : "bg-success-100 text-success-600"}`} role="status">
          {message}
        </p>
      ) : null}
    </article>
  );
}

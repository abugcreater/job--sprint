import { ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList, Download, Edit3, FileText, Filter, Send, Target, Trash2, WifiOff } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { syncStateLabel } from "../../app/syncStatus";
import {
  applicationStatuses,
  applicationRecordToDraft,
  buildApplicationEvidenceContent,
  buildApplicationsExportPayload,
  buildApplicationsDashboard,
  createApplicationDraft,
  filterApplicationRecords,
  isApplicationDraftReady,
  type ApplicationEvidenceRecord,
  type ApplicationFormDraft,
  type ApplicationStatus,
  type ApplicationStatusFilter,
  type ApplicationTaskSummary
} from "../../data/applicationsAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { ApplicationForm } from "./components/ApplicationForm";

export function ApplicationsPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const syncState = useSprintStore((state) => state.syncState);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const updateEvidence = useSprintStore((state) => state.updateEvidence);
  const deleteEvidence = useSprintStore((state) => state.deleteEvidence);
  const [draft, setDraft] = useState<ApplicationFormDraft>(() => createApplicationDraft());
  const [editingRecordId, setEditingRecordId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [exportSummary, setExportSummary] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const dashboard = useMemo(() => buildApplicationsDashboard(sprint, evidenceByTaskId), [sprint, evidenceByTaskId]);
  const visibleRecords = useMemo(() => filterApplicationRecords(dashboard.recentRecords, statusFilter), [dashboard.recentRecords, statusFilter]);
  const editingRecord = useMemo(
    () => dashboard.recentRecords.find((record) => record.id === editingRecordId),
    [dashboard.recentRecords, editingRecordId]
  );

  const updateDraft = useCallback((patch: Partial<ApplicationFormDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationMessage("");
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag]
    }));
  }, []);

  const resetDraft = useCallback((preserve?: ApplicationFormDraft) => {
    setDraft({
      ...createApplicationDraft(),
      source: preserve?.source ?? "",
      salaryRange: preserve?.salaryRange ?? "",
      city: preserve?.city ?? "",
      resumeVersion: preserve?.resumeVersion ?? "",
      tags: preserve?.tags.length ? preserve.tags : createApplicationDraft().tags
    });
    setEditingRecordId(undefined);
  }, []);

  const handleRecord = useCallback(() => {
    if (!isApplicationDraftReady(draft)) {
      setValidationMessage("请至少填写公司和岗位。");
      setFormFeedback("");
      setFormOpen(true);
      return;
    }
    const targetTask = editingRecord
      ? sprint.tasks.find((task) => task.id === editingRecord.taskId) ?? dashboard.targetTask
      : dashboard.targetTask;
    if (!targetTask) return;

    const content = buildApplicationEvidenceContent(targetTask, draft);
    if (editingRecord) {
      updateEvidence(editingRecord.taskId, editingRecord.id, { title: "机会反馈证据", content, verified: true });
      setFormFeedback("已保存机会验证记录。");
    } else {
      addEvidence(targetTask.id, "delivery_record", "机会反馈证据", content);
      setFormFeedback("已新增机会验证记录。");
    }
    resetDraft(draft);
    setFormOpen(false);
    setValidationMessage("");
  }, [addEvidence, dashboard.targetTask, draft, editingRecord, resetDraft, sprint.tasks, updateEvidence]);

  const handleEditRecord = useCallback((record: ApplicationEvidenceRecord) => {
    setEditingRecordId(record.id);
    setDraft(applicationRecordToDraft(record));
    setFormOpen(true);
    setFormFeedback("");
    setValidationMessage("");
  }, []);

  const handleDeleteRecord = useCallback(
    (record: ApplicationEvidenceRecord) => {
      deleteEvidence(record.taskId, record.id);
      if (record.id === editingRecordId) {
        resetDraft(draft);
        setFormOpen(false);
      }
    },
    [deleteEvidence, draft, editingRecordId, resetDraft]
  );

  const handleExport = useCallback(() => {
    const payload = buildApplicationsExportPayload(dashboard.recentRecords, sprint.date);
    triggerJsonDownload("react-applications-export.json", payload);
    setExportSummary(`已生成导出 ${payload.count} 条，本地 JSON 已准备。`);
  }, [dashboard.recentRecords, sprint.date]);

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-brand-700">机会验证 · 本地优先记录</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <BriefcaseBusiness size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">机会验证</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                这里只记录公司、岗位、JD 命中、沟通反馈和下一步动作；不做自动投递，学习和面试仍回到主线推进。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
              <MetricTile label="今日目标" value={`${dashboard.todaySignals.length} 项`} />
              <MetricTile label="本地记录" value={`${dashboard.recordCount} 条`} />
              <MetricTile label="关联任务" value={`${dashboard.deliveryTasks.length} 个`} />
              <MetricTile label="同步状态" value={syncStateLabel(syncState)} icon={<WifiOff size={15} aria-hidden="true" />} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <aside className="space-y-4">
            <TargetPanel title={dashboard.targetTaskTitle} duration={dashboard.targetTask?.durationLabel} signals={dashboard.todaySignals} />
            <ApplicationTaskPanel tasks={dashboard.deliveryTasks} />
            <StatusSummary rows={dashboard.statusSummary} />
          </aside>

          <section className="space-y-4">
            <RecentRecords
              records={visibleRecords}
              allRecordCount={dashboard.recentRecords.length}
              statusFilter={statusFilter}
              exportSummary={exportSummary}
              onStatusFilterChange={setStatusFilter}
              onEdit={handleEditRecord}
              onDelete={handleDeleteRecord}
              onExport={handleExport}
            />
            {formOpen || editingRecord ? (
              <ApplicationForm
                draft={draft}
                disabled={!dashboard.targetTask}
                isEditing={Boolean(editingRecord)}
                validationMessage={validationMessage}
                feedback={formFeedback}
                onChange={updateDraft}
                onToggleTag={toggleTag}
                onRecord={handleRecord}
                onCancelEdit={() => {
                  resetDraft(draft);
                  setFormOpen(false);
                  setValidationMessage("");
                }}
              />
            ) : (
              <ApplicationEntryPanel
                feedback={formFeedback}
                onCreate={() => {
                  resetDraft(draft);
                  setFormOpen(true);
                  setFormFeedback("");
                  setValidationMessage("");
                }}
              />
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface-0 p-3">
      <p className="text-[11px] font-black text-ink-500">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold leading-5 text-ink-900">
        {icon}
        <span>{value}</span>
      </p>
    </div>
  );
}

function TargetPanel({ title, duration, signals }: { title: string; duration?: string; signals: string[] }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <Target size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">今日机会目标</h2>
      </div>
      <p className="mt-3 text-lg font-black leading-7 text-ink-900">{title}</p>
      <p className="mt-2 text-sm font-bold text-ink-500">{duration ?? "记录一条机会反馈后回到今日验收"}</p>
      <ul className="mt-4 space-y-2">
        {signals.map((signal) => (
          <li key={signal} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
            <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
            <span>{signal}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/today"
        className="secondary-button mt-4"
      >
        <ArrowRight size={16} aria-hidden="true" />
        回到今日
      </Link>
    </article>
  );
}

function ApplicationTaskPanel({ tasks }: { tasks: ApplicationTaskSummary[] }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <ClipboardList size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">关联任务（可选）</h2>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-card bg-surface-0 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {task.isCurrent ? <span className="rounded-control bg-success-100 px-2 py-1 text-xs font-black text-success-600">当前</span> : null}
              <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{task.durationLabel}</span>
              <span className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{task.recordCount ? `已记 ${task.recordCount}` : "待反馈"}</span>
            </div>
            <p className="mt-2 text-sm font-extrabold leading-6 text-ink-900">{task.title}</p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-ink-500">{task.description}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ApplicationEntryPanel({ feedback, onCreate }: { feedback: string; onCreate: () => void }) {
  return (
    <article className="command-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <Send size={18} aria-hidden="true" />
            <h2 className="text-base font-black text-ink-900">新增机会记录</h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">默认先看已有记录；需要新增或编辑时再打开表单。</p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          <CheckCircle2 size={16} aria-hidden="true" />
          新增机会记录
        </button>
      </div>
      {feedback ? <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600">{feedback}</p> : null}
    </article>
  );
}

function RecentRecords({
  records,
  allRecordCount,
  statusFilter,
  exportSummary,
  onStatusFilterChange,
  onEdit,
  onDelete,
  onExport
}: {
  records: ApplicationEvidenceRecord[];
  allRecordCount: number;
  statusFilter: ApplicationStatusFilter;
  exportSummary: string;
  onStatusFilterChange: (status: ApplicationStatusFilter) => void;
  onEdit: (record: ApplicationEvidenceRecord) => void;
  onDelete: (record: ApplicationEvidenceRecord) => void;
  onExport: () => void;
}) {
  return (
    <article className="command-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <FileText size={18} aria-hidden="true" />
              <h2 className="text-base font-black text-ink-900">本地机会反馈</h2>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink-500">共 {allRecordCount} 条，当前显示 {records.length} 条。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto]">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-ink-500">
              <Filter size={14} aria-hidden="true" />
              状态筛选
            </span>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as ApplicationStatusFilter)}
              className="min-h-11 w-full rounded-control border border-line bg-surface-0 px-3 text-sm font-bold text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              aria-label="机会状态筛选"
            >
              <option value="all">全部状态</option>
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary-button self-end"
            onClick={onExport}
          >
            <Download size={16} aria-hidden="true" />
            生成本地导出
          </button>
        </div>
      </div>
      {exportSummary ? <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600">{exportSummary}</p> : null}
      {records.length ? (
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-card bg-surface-0 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{record.status}</span>
                    {record.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-extrabold leading-6 text-ink-900">
                    {record.company || "未命名公司"} · {record.role || "未命名岗位"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">
                    {[record.city, record.source, record.salaryRange].filter(Boolean).join(" / ") || "暂无城市、来源或薪资范围"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">
                    {[record.keywords, record.resumeVersion].filter(Boolean).join(" / ") || "暂无关键词或简历版本"}
                  </p>
                  {record.hrFeedback ? (
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-ink-700">沟通反馈：{record.hrFeedback}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-ink-500">{record.notes || record.content}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    aria-label={`编辑机会记录：${record.company || record.title}`}
                    onClick={() => onEdit(record)}
                  >
                    <Edit3 size={15} aria-hidden="true" />
                    编辑
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-risk-600 transition hover:bg-risk-100 focus:outline-none focus:ring-2 focus:ring-risk-600"
                    aria-label={`删除机会记录：${record.company || record.title}`}
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">
          {allRecordCount ? "当前筛选下没有机会反馈，请切换状态。" : "暂无机会反馈。先记录公司、岗位和状态。"}
        </p>
      )}
    </article>
  );
}

function StatusSummary({ rows }: { rows: Array<{ status: ApplicationStatus; count: number }> }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <BriefcaseBusiness size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">状态摘要</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.status} className="rounded-card bg-surface-0 p-3">
            <p className="text-xs font-black text-ink-500">{row.status}</p>
            <p className="mt-1 text-lg font-black text-ink-900">{row.count}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function triggerJsonDownload(filename: string, data: unknown): boolean {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

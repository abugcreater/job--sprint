import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList, Plus, Target, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  applicationRecordToDraft,
  buildApplicationEvidenceContent,
  buildApplicationsExportPayload,
  buildApplicationsDashboard,
  createApplicationDraft,
  filterApplicationRecords,
  isApplicationDraftReady,
  type ApplicationEvidenceRecord,
  type ApplicationFormDraft,
  type ApplicationStatusFilter,
  type ApplicationTaskSummary
} from "../../data/applicationsAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { ApplicationForm } from "./components/ApplicationForm";
import { OpportunityComparisonPanel } from "./components/OpportunityComparisonPanel";
import { OpportunityDetailPanel } from "./components/OpportunityDetailPanel";
import { OpportunityRecordList } from "./components/OpportunityRecordList";

export function ApplicationsPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const updateEvidence = useSprintStore((state) => state.updateEvidence);
  const deleteEvidence = useSprintStore((state) => state.deleteEvidence);
  const restoreEvidence = useSprintStore((state) => state.restoreEvidence);
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<ApplicationFormDraft>(() => createApplicationDraft());
  const [editingRecordId, setEditingRecordId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [compareFeedback, setCompareFeedback] = useState("");
  const [exportSummary, setExportSummary] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [recentlyDeletedRecord, setRecentlyDeletedRecord] = useState<ApplicationEvidenceRecord | null>(null);
  const dashboard = useMemo(() => buildApplicationsDashboard(sprint, evidenceByTaskId), [sprint, evidenceByTaskId]);
  const visibleRecords = useMemo(() => {
    const statusRecords = filterApplicationRecords(dashboard.recentRecords, statusFilter);
    const query = searchQuery.trim().toLocaleLowerCase("zh-CN");
    if (!query) return statusRecords;
    return statusRecords.filter((record) => [record.company, record.role, record.source, record.city, record.keywords, ...record.tags].join(" ").toLocaleLowerCase("zh-CN").includes(query));
  }, [dashboard.recentRecords, searchQuery, statusFilter]);
  const editingRecord = useMemo(
    () => dashboard.recentRecords.find((record) => record.id === editingRecordId),
    [dashboard.recentRecords, editingRecordId]
  );
  const hasProfile = userProfiles.length > 0;
  const selectedRecordId = searchParams.get("record") ?? undefined;
  const explicitSelectedRecord = dashboard.recentRecords.find((record) => record.id === selectedRecordId);
  const selectedRecord = explicitSelectedRecord ?? visibleRecords[0];
  const formOpen = searchParams.get("mode") === "edit";
  const comparisonRecords = comparisonIds.map((recordId) => dashboard.recentRecords.find((record) => record.id === recordId)).filter((record): record is ApplicationEvidenceRecord => Boolean(record));
  const comparisonMode = searchParams.get("mode") === "compare" && comparisonRecords.length === 2;
  const mobileSecondaryView = Boolean(explicitSelectedRecord) || comparisonMode || formOpen;
  const createButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!formOpen || !explicitSelectedRecord || editingRecordId === explicitSelectedRecord.id) return;
    setEditingRecordId(explicitSelectedRecord.id);
    setDraft(applicationRecordToDraft(explicitSelectedRecord));
  }, [editingRecordId, explicitSelectedRecord, formOpen]);

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

  const updateViewParams = useCallback((patch: { record?: string; mode?: "detail" | "compare" | "edit" }) => {
    const next = new URLSearchParams(searchParams);
    patch.record ? next.set("record", patch.record) : next.delete("record");
    patch.mode ? next.set("mode", patch.mode) : next.delete("mode");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("mode") !== "compare" || comparisonRecords.length === 2) return;
    updateViewParams({ record: selectedRecordId, mode: selectedRecordId ? "detail" : undefined });
  }, [comparisonRecords.length, searchParams, selectedRecordId, updateViewParams]);

  const focusEditorTitle = () => window.requestAnimationFrame(() => document.getElementById("application-form-title")?.focus({ preventScroll: true }));

  const openCreateForm = useCallback(() => {
    resetDraft(draft);
    setFormFeedback("");
    setValidationMessage("");
    updateViewParams({ mode: "edit" });
    focusEditorTitle();
  }, [draft, resetDraft, updateViewParams]);

  const closeForm = useCallback(() => {
    resetDraft(draft);
    setValidationMessage("");
    updateViewParams({ record: selectedRecord?.id, mode: selectedRecord ? "detail" : undefined });
    window.requestAnimationFrame(() => createButtonRef.current?.focus({ preventScroll: true }));
  }, [draft, resetDraft, selectedRecord, updateViewParams]);

  const handleRecord = useCallback(() => {
    if (!isApplicationDraftReady(draft)) {
      setValidationMessage("请至少填写公司和岗位。");
      setFormFeedback("");
      updateViewParams({ record: editingRecord?.id, mode: "edit" });
      return;
    }
    const targetTask = editingRecord
      ? sprint.tasks.find((task) => task.id === editingRecord.taskId) ?? dashboard.targetTask
      : dashboard.targetTask;
    if (!targetTask) return;

    const content = buildApplicationEvidenceContent(targetTask, draft);
    let savedRecordId = editingRecord?.id;
    if (editingRecord) {
      updateEvidence(editingRecord.taskId, editingRecord.id, { title: "机会反馈证据", content, verified: true });
      setFormFeedback("已保存机会记录修改。");
    } else {
      addEvidence(targetTask.id, "delivery_record", "机会反馈证据", content);
      setFormFeedback("已新增机会记录，并写入当前任务 Evidence Gate。");
      savedRecordId = useSprintStore.getState().evidenceByTaskId[targetTask.id]?.at(-1)?.id;
    }
    setRecentlyDeletedRecord(null);
    resetDraft(draft);
    setValidationMessage("");
    updateViewParams({ record: savedRecordId, mode: savedRecordId ? "detail" : undefined });
  }, [addEvidence, dashboard.targetTask, draft, editingRecord, resetDraft, sprint.tasks, updateEvidence, updateViewParams]);

  const handleEditRecord = useCallback((record: ApplicationEvidenceRecord) => {
    setEditingRecordId(record.id);
    setDraft(applicationRecordToDraft(record));
    setFormFeedback("");
    setValidationMessage("");
    updateViewParams({ record: record.id, mode: "edit" });
    focusEditorTitle();
  }, [updateViewParams]);

  const handleDeleteRecord = useCallback(
    (record: ApplicationEvidenceRecord) => {
      setRecentlyDeletedRecord(record);
      deleteEvidence(record.taskId, record.id);
      setComparisonIds((current) => current.filter((recordId) => recordId !== record.id));
      if (record.id === editingRecordId) {
        resetDraft(draft);
      }
      if (record.id === selectedRecordId) updateViewParams({});
      setFormFeedback(`已删除「${record.company || record.role || "未命名机会"}」记录，可在机会清单顶部撤销。`);
    },
    [deleteEvidence, draft, editingRecordId, resetDraft, selectedRecordId, updateViewParams]
  );

  const handleUndoDeleteRecord = useCallback(() => {
    if (!recentlyDeletedRecord) return;
    restoreEvidence({
      id: recentlyDeletedRecord.id,
      taskId: recentlyDeletedRecord.taskId,
      type: "delivery_record",
      title: recentlyDeletedRecord.title,
      content: recentlyDeletedRecord.content,
      createdAt: recentlyDeletedRecord.createdAt,
      verified: true
    });
    setRecentlyDeletedRecord(null);
    setFormFeedback("已恢复刚删除的机会记录。");
  }, [recentlyDeletedRecord, restoreEvidence]);

  const handleExport = useCallback(() => {
    const payload = buildApplicationsExportPayload(dashboard.recentRecords, sprint.date);
    const downloaded = triggerJsonDownload("react-applications-export.json", payload);
    setExportSummary(downloaded ? `已生成导出 ${payload.count} 条，本地 JSON 已准备。` : "当前环境无法生成下载，请稍后重试。");
  }, [dashboard.recentRecords, sprint.date]);

  const handleSelectRecord = useCallback((record: ApplicationEvidenceRecord) => {
    updateViewParams({ record: record.id, mode: "detail" });
  }, [updateViewParams]);

  const handleToggleCompare = useCallback((record: ApplicationEvidenceRecord) => {
    setCompareFeedback("");
    if (comparisonIds.includes(record.id)) {
      setComparisonIds(comparisonIds.filter((recordId) => recordId !== record.id));
      return;
    }
    if (comparisonIds.length >= 2) {
      setCompareFeedback("最多比较 2 条，请先移除一条。");
      return;
    }
    const next = [...comparisonIds, record.id];
    setComparisonIds(next);
    if (next.length === 2) updateViewParams({ mode: "compare" });
  }, [comparisonIds, updateViewParams]);

  const handleRemoveCompare = useCallback((recordId: string) => {
    setComparisonIds((current) => current.filter((id) => id !== recordId));
    setCompareFeedback("");
    if (comparisonMode) updateViewParams({ record: selectedRecord?.id, mode: selectedRecord ? "detail" : undefined });
  }, [comparisonMode, selectedRecord, updateViewParams]);

  if (!hasProfile) {
    return (
      <main className="app-main">
        <section className="app-page">
          <article className="command-card p-5">
            <div className="flex items-center gap-3 text-brand-700">
              <span className="grid size-12 place-items-center rounded-control bg-brand-100">
                <BriefcaseBusiness size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-brand-700">机会验证</p>
                <h1 className="text-3xl font-black text-ink-900">先建立你的求职画像</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
              保存目标岗位并生成个人日历后，机会记录才会绑定到你的岗位、公司和 Evidence Gate。
            </p>
            <Link to="/coach" className="primary-button mt-5">
              <ArrowRight size={16} aria-hidden="true" />
              去创建画像
            </Link>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="app-main">
      <section className="app-page">
        <header className={`${mobileSecondaryView ? "hidden lg:block" : "block"} page-intro motion-enter`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">Opportunities · 当前冲刺最近记录</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-ink-950 md:text-[44px]">机会工作台</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                选择一条机会核对事实，最多选两条并排比较。这里只使用你记录的公司、岗位、JD 与沟通反馈，不生成匹配分或自动结论。
              </p>
            </div>
            <button ref={createButtonRef} type="button" className="primary-button shrink-0" onClick={openCreateForm}><Plus size={16} aria-hidden="true" />新增机会</button>
          </div>
        </header>

        <section className={`${mobileSecondaryView ? "hidden lg:grid" : "grid"} gap-3 border-y border-line py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center`} aria-label="今日机会上下文">
          <div>
            <p className="text-xs font-black text-brand-700">今日机会目标</p>
            <p className="mt-1 text-base font-black text-ink-950">{dashboard.targetTaskTitle}</p>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink-500">{dashboard.todaySignals[0]}</p>
          </div>
          <p className="text-sm font-black text-ink-700"><span className="text-2xl text-ink-950">{dashboard.recordCount}</span> 条真实记录</p>
          <Link to="/today" className="secondary-button">回到 Evidence Gate<ArrowRight size={16} aria-hidden="true" /></Link>
        </section>

        {formFeedback && !formOpen ? <p className="rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" role="status">{formFeedback}</p> : null}

        <section className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]" aria-label="机会记录工作区">
          <div className={mobileSecondaryView ? "hidden lg:block" : "block"}>
            <OpportunityRecordList
              records={visibleRecords}
              allRecordCount={dashboard.recentRecords.length}
              selectedRecordId={selectedRecord?.id}
              comparisonIds={comparisonIds}
              statusFilter={statusFilter}
              statusSummary={dashboard.statusSummary}
              searchQuery={searchQuery}
              exportSummary={exportSummary}
              compareFeedback={compareFeedback}
              recentlyDeletedRecord={recentlyDeletedRecord}
              onSearchChange={setSearchQuery}
              onClearFilters={() => { setSearchQuery(""); setStatusFilter("all"); }}
              onStatusFilterChange={setStatusFilter}
              onSelect={handleSelectRecord}
              onToggleCompare={handleToggleCompare}
              onUndoDelete={handleUndoDeleteRecord}
              onDismissDeletedRecord={() => setRecentlyDeletedRecord(null)}
              onExport={handleExport}
            />
          </div>

          <section className={`${mobileSecondaryView ? "block" : "hidden lg:block"} min-w-0 space-y-4`}>
            {!formOpen && (explicitSelectedRecord || comparisonMode) ? (
              <button type="button" className="secondary-button lg:hidden" onClick={() => updateViewParams({})}><ArrowLeft size={16} aria-hidden="true" />返回机会列表</button>
            ) : null}
            {!formOpen && comparisonRecords.length ? <OpportunityComparisonPanel records={comparisonRecords} onRemove={handleRemoveCompare} /> : null}
            {formOpen ? (
              <ApplicationEditorShell onClose={closeForm}>
                <ApplicationForm
                  draft={draft}
                  disabled={!dashboard.targetTask}
                  isEditing={Boolean(editingRecord)}
                  validationMessage={validationMessage}
                  feedback={formFeedback}
                  onChange={updateDraft}
                  onToggleTag={toggleTag}
                  onRecord={handleRecord}
                  onCancelEdit={closeForm}
                />
              </ApplicationEditorShell>
            ) : (
              comparisonMode
                ? null
                : <OpportunityDetailPanel record={selectedRecord} onCreate={openCreateForm} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />
            )}
          </section>
        </section>

        <details className="rounded-workbench border border-line bg-white shadow-soft">
          <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">查看关联任务与机会记录范围</summary>
          <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
            <TargetPanel title={dashboard.targetTaskTitle} duration={dashboard.targetTask?.durationLabel} signals={dashboard.todaySignals} />
            <ApplicationTaskPanel tasks={dashboard.deliveryTasks} />
          </div>
        </details>
      </section>
    </main>
  );
}

function ApplicationEditorShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <section className="fixed inset-0 z-40 overflow-y-auto bg-surface-0 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] lg:static lg:bg-transparent lg:p-0" aria-label="机会记录编辑器">
      <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between border-b border-line bg-surface-0 px-4 py-3 lg:hidden">
        <p className="text-sm font-black text-ink-950">编辑机会事实</p>
        <button type="button" className="grid size-11 place-items-center rounded-control border border-line bg-white text-ink-700" aria-label="关闭机会编辑器" onClick={onClose}><X size={17} aria-hidden="true" /></button>
      </div>
      {children}
    </section>
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

import { ArrowRight, CheckCircle2, ClipboardCheck, Download, FileText, ListChecks, NotebookPen, Pencil, ShieldAlert, SlidersHorizontal, Sparkles, Trash2, WifiOff, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { syncStateLabel } from "../../app/syncStatus";
import { getLegacySnapshot } from "../../data/legacyAdapters";
import { buildCoachDashboard } from "../../data/coachAdapter";
import { buildWeeklyReviewAnalysis } from "../../data/weeklyReviewAdapter";
import {
  buildReviewDashboard,
  buildReviewAiAnalysis,
  buildReviewEvidenceContent,
  buildReviewExportPayload,
  createReviewDraft,
  filterReviewRecords,
  isReviewDraftReady,
  reviewRecordFilters,
  reviewRecordToDraft,
  type ReviewEvidenceRecord,
  type ReviewFormDraft,
  type ReviewRecordFilter,
  type ReviewTaskSummary
} from "../../data/reviewAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { WeeklyReviewPanel } from "./components/WeeklyReviewPanel";
import { useServerOutcome } from "./useServerOutcome";
import type { RiskItem } from "../../types/sprint";

export function ReviewPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const completed = useSprintStore((state) => state.completed);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const delayRecords = useSprintStore((state) => state.delayRecords);
  const syncState = useSprintStore((state) => state.syncState);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const knowledgeBoundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const coachScheduleEvents = useSprintStore((state) => state.coachScheduleEvents);
  const aiArtifacts = useSprintStore((state) => state.aiArtifacts);
  const llmRuns = useSprintStore((state) => state.llmRuns);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const updateEvidence = useSprintStore((state) => state.updateEvidence);
  const deleteEvidence = useSprintStore((state) => state.deleteEvidence);
  const [draft, setDraft] = useState<ReviewFormDraft>(() => createReviewDraft());
  const [recordFilter, setRecordFilter] = useState<ReviewRecordFilter>("all");
  const [editingRecord, setEditingRecord] = useState<{ taskId: string; evidenceId: string } | null>(null);
  const [exportPreview, setExportPreview] = useState("");
  const { saveServerOutcome, serverOutcome, serverOutcomeStatus } = useServerOutcome(sprint.date);
  const legacySnapshot = getLegacySnapshot();
  const dashboard = useMemo(() => buildReviewDashboard(sprint, evidenceByTaskId, legacySnapshot), [sprint, evidenceByTaskId, legacySnapshot]);
  const coachDashboard = useMemo(
    () => buildCoachDashboard({ profiles: userProfiles, boundaries: knowledgeBoundaries, scheduleEvents: coachScheduleEvents, artifacts: aiArtifacts, llmRuns, sprint }),
    [aiArtifacts, coachScheduleEvents, knowledgeBoundaries, llmRuns, sprint, userProfiles]
  );
  const aiAnalysis = useMemo(() => buildReviewAiAnalysis(dashboard, coachDashboard.feedbackSummary), [coachDashboard.feedbackSummary, dashboard]);
  const weeklyAnalysis = useMemo(
    () => buildWeeklyReviewAnalysis({ sprint, evidenceByTaskId, completed, delayRecords, aiFeedback: coachDashboard.feedbackSummary }),
    [coachDashboard.feedbackSummary, completed, delayRecords, evidenceByTaskId, sprint]
  );
  const filteredReviewRecords = useMemo(() => filterReviewRecords(dashboard.reviewRecords, recordFilter), [dashboard.reviewRecords, recordFilter]);

  const updateDraft = useCallback((patch: Partial<ReviewFormDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handleSaveReview = useCallback(() => {
    if (!dashboard.targetTask || !isReviewDraftReady(draft)) return;
    const targetTask = editingRecord ? sprint.tasks.find((task) => task.id === editingRecord.taskId) ?? dashboard.targetTask : dashboard.targetTask;
    const content = buildReviewEvidenceContent(sprint, targetTask, draft);
    if (editingRecord) {
      updateEvidence(editingRecord.taskId, editingRecord.evidenceId, { title: "复盘证据", content, verified: true });
      setEditingRecord(null);
    } else {
      addEvidence(targetTask.id, "review", "复盘证据", content);
    }
    setDraft(createReviewDraft());
  }, [addEvidence, dashboard.targetTask, draft, editingRecord, sprint, updateEvidence]);

  const handleEditReview = useCallback((record: ReviewEvidenceRecord) => {
    if (record.source !== "local") return;
    setDraft(reviewRecordToDraft(record));
    setEditingRecord({ taskId: record.taskId, evidenceId: record.id });
  }, []);

  const handleDeleteReview = useCallback(
    (record: ReviewEvidenceRecord) => {
      if (record.source !== "local") return;
      deleteEvidence(record.taskId, record.id);
      if (editingRecord?.evidenceId === record.id) {
        setEditingRecord(null);
        setDraft(createReviewDraft());
      }
    },
    [deleteEvidence, editingRecord]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingRecord(null);
    setDraft(createReviewDraft());
  }, []);

  const handleExportReviews = useCallback(() => {
    const payload = buildReviewExportPayload(filteredReviewRecords, sprint.date);
    setExportPreview(JSON.stringify(payload, null, 2));
  }, [filteredReviewRecords, sprint.date]);

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-brand-700">复盘归因 · 本地 AI 分析</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <ClipboardCheck size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">复盘归因</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                收束完成情况、缺失证据、原因归因和明日恢复动作；复盘不是总结气氛，而是给下一轮执行和 AI 分析降阻。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
              <MetricTile label="完成进度" value={`${dashboard.completion.done}/${dashboard.completion.total}`} />
              <MetricTile label="证据记录" value={`${dashboard.evidenceRecords.length} 条`} />
              <MetricTile label="复盘记录" value={`${dashboard.reviewRecords.length} 条`} />
              <MetricTile label="同步状态" value={syncStateLabel(syncState)} icon={<WifiOff size={15} aria-hidden="true" />} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <aside className="space-y-4">
            <CompletionPanel completion={dashboard.completion} />
            <ReviewTaskPanel tasks={dashboard.reviewTasks} />
            <RiskSummary risks={dashboard.risks} />
            <TomorrowAdvice advice={dashboard.tomorrowAdvice} />
          </aside>

          <section className="space-y-4">
            <EvidenceList records={dashboard.evidenceRecords} />
            <AiAnalysisPanel analysis={aiAnalysis} />
            <WeeklyReviewPanel
              analysis={weeklyAnalysis}
              serverOutcome={serverOutcome}
              serverStatus={serverOutcomeStatus}
              onSaveServerSnapshot={saveServerOutcome}
            />
            <ReviewForm
              draft={draft}
              disabled={!dashboard.targetTask || !isReviewDraftReady(draft)}
              isEditing={Boolean(editingRecord)}
              onCancelEdit={handleCancelEdit}
              onChange={updateDraft}
              onSave={handleSaveReview}
            />
            <LocalReviewRecords
              records={filteredReviewRecords}
              totalCount={dashboard.reviewRecords.length}
              filter={recordFilter}
              exportPreview={exportPreview}
              onFilterChange={setRecordFilter}
              onExport={handleExportReviews}
              onEdit={handleEditReview}
              onDelete={handleDeleteReview}
            />
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

function CompletionPanel({ completion }: { completion: ReturnType<typeof buildReviewDashboard>["completion"] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <ListChecks size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">今日完成情况</h2>
      </div>
      <p className="mt-4 text-4xl font-black text-ink-900">{completion.donePercent}%</p>
      <div className="mt-4 h-3 overflow-hidden rounded-control bg-surface-0">
        <div className="h-full rounded-control bg-brand-700" style={{ width: `${completion.donePercent}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <SmallStat label="已完成" value={completion.done} />
        <SmallStat label="待完成" value={completion.pending} />
        <SmallStat label="已超时" value={completion.overdue} />
        <SmallStat label="缺证据" value={completion.evidenceMissing} />
      </div>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card bg-surface-0 p-3">
      <p className="text-xs font-black text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-black text-ink-900">{value}</p>
    </div>
  );
}

function ReviewTaskPanel({ tasks }: { tasks: ReviewTaskSummary[] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <NotebookPen size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">复盘目标</h2>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-card bg-surface-0 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {task.isCurrent ? <span className="rounded-control bg-success-100 px-2 py-1 text-xs font-black text-success-600">当前 Evidence Gate</span> : null}
              <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{task.durationLabel}</span>
              <span className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{task.reviewCount ? `已写 ${task.reviewCount}` : "待复盘"}</span>
            </div>
            <p className="mt-2 text-sm font-extrabold leading-6 text-ink-900">{task.title}</p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-ink-500">{task.description}</p>
          </div>
        ))}
      </div>
      <Link
        to="/today"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <ArrowRight size={16} aria-hidden="true" />
        回到今日
      </Link>
    </article>
  );
}

function RiskSummary({ risks }: { risks: RiskItem[] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <ShieldAlert size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">今日风险总结</h2>
      </div>
      <div className="mt-4 space-y-3">
        {risks.map((risk) => (
          <div key={risk.id} className="rounded-card bg-surface-0 p-3">
            <span className={`rounded-control px-2 py-1 text-xs font-black ${risk.level === "high" || risk.level === "medium" ? "bg-risk-100 text-risk-600" : "bg-success-100 text-success-600"}`}>
              {risk.level === "medium" ? "中风险" : risk.level}
            </span>
            <p className="mt-2 text-sm font-extrabold leading-6 text-ink-900">{risk.title}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{risk.reason}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function TomorrowAdvice({ advice }: { advice: string[] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">明日建议</h2>
      </div>
      <ul className="mt-4 space-y-2">
        {advice.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
            <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function EvidenceList({ records }: { records: ReviewEvidenceRecord[] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <FileText size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">Evidence Gate 证据列表</h2>
      </div>
      {records.length ? (
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-card bg-surface-0 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-extrabold text-ink-900">{record.title}</p>
                <span className="shrink-0 rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{typeLabel(record.type)}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-ink-500">{record.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">今日还没有证据，先写一条本地复盘。</p>
      )}
    </article>
  );
}

function AiAnalysisPanel({ analysis }: { analysis: ReturnType<typeof buildReviewAiAnalysis> }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="ai-analysis-input-title">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles size={18} aria-hidden="true" />
        <h2 id="ai-analysis-input-title" className="text-base font-black text-ink-900">
          本地规则版 AI 分析
        </h2>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">
        {analysis.summary}
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <AnalysisList title="事实" items={analysis.facts} />
        <AnalysisList title="欠缺" items={analysis.gaps} />
        <AnalysisList title="动作" items={analysis.recommendations} />
      </div>
      <div className="mt-4 rounded-card bg-brand-100 p-3">
        <p className="text-xs font-black text-brand-700">下一步</p>
        <p className="mt-1 text-sm font-extrabold leading-6 text-ink-900">{analysis.nextAction}</p>
      </div>
    </article>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-card bg-surface-0 p-3">
      <p className="text-sm font-black text-ink-900">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-xs font-semibold leading-5 text-ink-600">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewForm({
  draft,
  disabled,
  isEditing,
  onCancelEdit,
  onChange,
  onSave
}: {
  draft: ReviewFormDraft;
  disabled: boolean;
  isEditing: boolean;
  onCancelEdit: () => void;
  onChange: (patch: Partial<ReviewFormDraft>) => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="review-form-title">
      <div className="flex items-center gap-2 text-brand-700">
        <ClipboardCheck size={18} aria-hidden="true" />
        <h2 id="review-form-title" className="text-base font-black text-ink-900">
          {isEditing ? "编辑本地复盘记录" : "本地复盘记录"}
        </h2>
      </div>
      <div className="mt-5 grid gap-4">
        <ReviewField label="今天能讲的一个项目点是什么？" value={draft.projectPoint} onChange={(value) => onChange({ projectPoint: value })} />
        <ReviewField label="今天能回答的两个面试题是什么？" value={draft.interviewQuestions} onChange={(value) => onChange({ interviewQuestions: value })} />
        <ReviewField label="今天补强的一个知识或技能边界是什么？" value={draft.javaPoint} onChange={(value) => onChange({ javaPoint: value })} />
        <ReviewField label="今天发现了哪些路径问题？" value={draft.pathIssues} onChange={(value) => onChange({ pathIssues: value })} />
        <ReviewField label="今天哪些回答还容易被面试官追问穿？" value={draft.fragileAnswers} onChange={(value) => onChange({ fragileAnswers: value })} />
        <ReviewField label="明天最优先补什么？" value={draft.tomorrowPriority} onChange={(value) => onChange({ tomorrowPriority: value })} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-700 px-4 text-sm font-black text-white shadow-soft transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300"
          disabled={disabled}
          onClick={onSave}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {isEditing ? "更新本地复盘" : "保存本地复盘"}
        </button>
        {isEditing ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
            onClick={onCancelEdit}
          >
            <XCircle size={16} aria-hidden="true" />
            取消编辑
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ReviewField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink-700">{label}</span>
      <textarea
        className="mt-2 min-h-[92px] w-full resize-y rounded-card border border-line bg-surface-0 p-4 text-base font-semibold leading-7 text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LocalReviewRecords({
  records,
  totalCount,
  filter,
  exportPreview,
  onFilterChange,
  onExport,
  onEdit,
  onDelete
}: {
  records: ReviewEvidenceRecord[];
  totalCount: number;
  filter: ReviewRecordFilter;
  exportPreview: string;
  onFilterChange: (filter: ReviewRecordFilter) => void;
  onExport: () => void;
  onEdit: (record: ReviewEvidenceRecord) => void;
  onDelete: (record: ReviewEvidenceRecord) => void;
}) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2 text-brand-700">
          <NotebookPen size={18} aria-hidden="true" />
          <div>
            <h2 className="text-base font-black text-ink-900">本地复盘证据</h2>
            <p className="mt-1 text-xs font-bold text-ink-500">当前显示 {records.length}/{totalCount} 条</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface-0 px-3 text-sm font-black text-ink-700">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">复盘记录筛选</span>
            <select
              aria-label="复盘记录筛选"
              className="bg-transparent text-sm font-black text-ink-700 outline-none"
              value={filter}
              onChange={(event) => onFilterChange(event.target.value as ReviewRecordFilter)}
            >
              {reviewRecordFilters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
            onClick={onExport}
          >
            <Download size={16} aria-hidden="true" />
            导出当前筛选复盘 JSON
          </button>
        </div>
      </div>
      {records.length ? (
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-card bg-surface-0 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-ink-900">{record.title}</p>
                    <span className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{record.source === "local" ? "React 本地" : "旧版只读"}</span>
                  </div>
                  {record.projectPoint ? <p className="mt-2 text-xs font-black text-brand-700">项目点：{record.projectPoint}</p> : null}
                  {record.tomorrowPriority ? <p className="mt-1 text-xs font-black text-success-600">明日优先：{record.tomorrowPriority}</p> : null}
                </div>
                {record.source === "local" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="grid size-10 place-items-center rounded-control border border-line bg-white text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      aria-label={`编辑复盘记录 ${record.projectPoint || record.title}`}
                      onClick={() => onEdit(record)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="grid size-10 place-items-center rounded-control border border-line bg-white text-risk-600 transition hover:bg-risk-100 focus:outline-none focus:ring-2 focus:ring-risk-600"
                      aria-label={`删除复盘记录 ${record.projectPoint || record.title}`}
                      onClick={() => onDelete(record)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-ink-500">{record.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无符合筛选条件的本地复盘证据。写一条复盘后，今日 Evidence Gate 会立即更新。</p>
      )}
      {exportPreview ? (
        <div className="mt-4 rounded-card border border-line bg-ink-900 p-4 text-white">
          <p className="text-xs font-black uppercase text-brand-100">Local export preview</p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-5">{exportPreview}</pre>
        </div>
      ) : null}
    </article>
  );
}

function typeLabel(type: ReviewEvidenceRecord["type"]): string {
  const labels: Record<ReviewEvidenceRecord["type"], string> = {
    review: "复盘",
    oral_score: "口述",
    interview_answer: "回答",
    delivery_record: "机会反馈",
    learning_note: "笔记"
  };

  return labels[type];
}

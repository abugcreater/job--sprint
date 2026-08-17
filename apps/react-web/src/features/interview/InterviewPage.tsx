import { ArrowRight, ClipboardCheck, FileQuestion, Filter, MessageCircleQuestion, Mic2, RotateCcw, Search, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildInterviewDashboard, buildOralEvidenceContent, filterInterviewQuestions,
  findInterviewQuestion, interviewModes, interviewQuestionCategories,
  interviewWeakQuestionMarksStorageKey, readInterviewWeakQuestionMarks, scoreOralAnswer, toggleInterviewWeakQuestion,
  writeInterviewWeakQuestionMarks,
  type InterviewMode, type InterviewQuestionOption,
  type OralScoreAnalysis, type OralTaskSummary
} from "../../data/interviewAdapter";
import { buildApplicationsDashboard } from "../../data/applicationsAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { InterviewAnswerDiscardChangesDialog, InterviewAnswerPanel } from "./components/InterviewAnswerPanel";
import { RecentRecords } from "./components/RecentRecords";
import { useInterviewAnswerDraftProtection } from "./useInterviewAnswerDraftProtection";

export function InterviewPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const storageOwner = useSprintStore((state) => state.storageOwner);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const [mode, setMode] = useState<InterviewMode>("auto");
  const [questionQuery, setQuestionQuery] = useState("");
  const [questionCategory, setQuestionCategory] = useState("all");
  const [weakOnly, setWeakOnly] = useState(false);
  const weakQuestionStorageKey = interviewWeakQuestionMarksStorageKey(storageOwner);
  const [weakQuestionIds, setWeakQuestionIds] = useState<Set<string>>(() => readInterviewWeakQuestionMarks(undefined, storageOwner));
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();
  const [answer, setAnswer] = useState("");
  const [scoreAnalysis, setScoreAnalysis] = useState<OralScoreAnalysis | undefined>();
  const [scoreFeedback, setScoreFeedback] = useState("");

  const activeProfile = useMemo(() => userProfiles.find((profile) => profile.active) ?? userProfiles[0], [userProfiles]);
  const applicationsDashboard = useMemo(() => buildApplicationsDashboard(sprint, evidenceByTaskId), [sprint, evidenceByTaskId]);
  const dashboard = useMemo(
    () => buildInterviewDashboard(sprint, evidenceByTaskId, mode, { profile: activeProfile, opportunities: applicationsDashboard.recentRecords }),
    [activeProfile, applicationsDashboard.recentRecords, evidenceByTaskId, mode, sprint]
  );
  const hasProfile = userProfiles.length > 0;
  const questionCategories = useMemo(() => interviewQuestionCategories(dashboard.candidateQuestions), [dashboard.candidateQuestions]);
  const filteredQuestions = useMemo(
    () =>
      filterInterviewQuestions(dashboard.candidateQuestions, {
        query: questionQuery,
        category: questionCategory,
        weakOnly,
        weakQuestionIds
      }),
    [dashboard.candidateQuestions, questionCategory, questionQuery, weakOnly, weakQuestionIds]
  );
  const activeQuestionId = selectedQuestionId ?? filteredQuestions[0]?.id ?? dashboard.candidateQuestions[0]?.id;
  const activeQuestion = findInterviewQuestion(dashboard.candidateQuestions, activeQuestionId);

  useEffect(() => {
    setWeakQuestionIds(readInterviewWeakQuestionMarks(undefined, storageOwner));
  }, [storageOwner, weakQuestionStorageKey]);

  const interviewAnswerDraftProtection = useInterviewAnswerDraftProtection({
    answer,
    mode,
    activeQuestionId,
    setAnswer,
    setScoreAnalysis,
    setScoreFeedback,
    setMode,
    setQuestionCategory,
    setWeakOnly,
    setSelectedQuestionId
  });
  const answerActionHint = !dashboard.targetTask ? "当前没有可绑定的面试任务，请先回到今日页生成口述行动。"
	    : !activeQuestion ? "当前没有可保存的候选题，请先选择或重置题目筛选。"
	      : !answer.trim() ? "先写一段口述回答，才能评分或保存到 Evidence Gate。" : "保存会写入当前面试任务的 Evidence Gate；AI 评分会一起进入复盘证据。";

  const handleAnswerChange = useCallback((value: string) => {
    if (value.trim() && activeQuestionId) {
      setSelectedQuestionId((current) => current ?? activeQuestionId);
    }
    setAnswer(value);
    setScoreAnalysis(undefined);
    setScoreFeedback("");
  }, [activeQuestionId]);

  const handleScore = useCallback(() => {
    if (!dashboard.targetTask || !activeQuestion || !answer.trim()) {
      setScoreFeedback("请先选择题目并输入一段口述回答。");
      return;
    }
    const analysis = scoreOralAnswer(dashboard.targetTask, activeQuestion, answer);
    setScoreAnalysis(analysis);
    setScoreFeedback("已按本地规则检查结构、证据与风险覆盖；这不是 AI 评分。");
  }, [activeQuestion, answer, dashboard.targetTask]);

  const handleRecord = useCallback(() => {
    if (!dashboard.targetTask || !activeQuestion || !answer.trim()) return;
    const analysis = scoreAnalysis ?? scoreOralAnswer(dashboard.targetTask, activeQuestion, answer);
    addEvidence(dashboard.targetTask.id, "oral_score", "口述训练证据", buildOralEvidenceContent(dashboard.targetTask, activeQuestion, answer, analysis));
    interviewAnswerDraftProtection.resetAfterSave();
    setScoreFeedback("已保存口述证据，并写入 Evidence Gate。");
  }, [activeQuestion, addEvidence, answer, dashboard.targetTask, interviewAnswerDraftProtection, scoreAnalysis]);

  const toggleWeakQuestion = useCallback((questionId: string) => {
    setWeakQuestionIds((current) => {
      const next = toggleInterviewWeakQuestion(current, questionId);
      writeInterviewWeakQuestionMarks(next, undefined, storageOwner);
      return next;
    });
  }, [storageOwner]);

  const resetQuestionFilters = useCallback(() => {
    setQuestionQuery("");
    setQuestionCategory("all");
    setWeakOnly(false);
  }, []);

  if (!hasProfile) {
    return (
      <main className="app-main">
        <section className="app-page">
          <article className="command-card p-5">
            <div className="flex items-center gap-3 text-brand-700">
              <span className="grid size-12 place-items-center rounded-control bg-brand-100">
                <MessageCircleQuestion size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-brand-700">面试训练</p>
                <h1 className="text-3xl font-black text-ink-900">先建立你的目标岗位</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
              保存求职画像后，候选题会围绕你的目标岗位、经验证据和知识边界呈现。
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
        <header className="page-intro motion-enter">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">Interview · 单题练习会话</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-ink-950 md:text-[44px]">面试训练</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                先写一版 60 秒回答，再标记薄弱题；今日追问、题库和本地记录都服务于 Evidence Gate。
              </p>
            </div>
            <p className="text-sm font-black text-ink-700"><span className="text-3xl text-ink-950">{dashboard.recordCount}</span> 条口述证据</p>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-4 xl:col-start-2 xl:row-start-1">
            <InterviewAnswerPanel
              question={activeQuestion}
              answer={answer}
              onAnswerChange={handleAnswerChange}
              onRecord={handleRecord}
              onScore={handleScore}
              onClear={interviewAnswerDraftProtection.requestClearAnswer}
              disabled={!dashboard.targetTask || !activeQuestion || !answer.trim()}
              actionHint={answerActionHint}
              analysis={scoreAnalysis}
              scoreFeedback={scoreFeedback}
              rubricDimensions={dashboard.rubricDimensions}
              weak={Boolean(activeQuestion && weakQuestionIds.has(activeQuestion.id))}
              onToggleWeak={toggleWeakQuestion}
            />
            {scoreFeedback.includes("Evidence Gate") ? <Link to="/review" className="primary-button w-full justify-center">去复盘这次练习<ArrowRight size={16} aria-hidden="true" /></Link> : null}
            <details className="rounded-workbench border border-line bg-white shadow-soft">
              <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">选择其他题目与筛选</summary>
              <div className="border-t border-line p-4">
                <QuestionPicker
                  mode={mode}
                  questions={filteredQuestions}
                  allQuestionCount={dashboard.candidateQuestions.length}
                  categories={questionCategories}
                  query={questionQuery}
                  category={questionCategory}
                  weakOnly={weakOnly}
                  weakQuestionIds={weakQuestionIds}
                  activeQuestionId={activeQuestionId}
                  onModeChange={interviewAnswerDraftProtection.requestModeChange}
                  onQueryChange={setQuestionQuery}
                  onCategoryChange={setQuestionCategory}
                  onWeakOnlyChange={setWeakOnly}
                  onResetFilters={resetQuestionFilters}
                  onPickQuestion={interviewAnswerDraftProtection.requestQuestionChange}
                />
              </div>
            </details>
          </section>

          <aside className="space-y-4 xl:col-start-1 xl:row-start-1">
            <TargetTaskPanel title={dashboard.targetTask?.title} duration={dashboard.targetTask?.durationLabel} />
            <details className="rounded-workbench border border-line bg-white shadow-soft">
              <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">查看今日任务与历史记录</summary>
              <div className="space-y-4 border-t border-line p-4"><OralTaskPanel tasks={dashboard.oralTasks} /><RecentRecords records={dashboard.recentRecords} /></div>
            </details>
          </aside>
        </section>
      </section>
      {interviewAnswerDraftProtection.discardConfirmation ? (
        <InterviewAnswerDiscardChangesDialog
          actionLabel={interviewAnswerDraftProtection.discardConfirmation.actionLabel}
          onContinue={interviewAnswerDraftProtection.continueEditing}
          onDiscard={interviewAnswerDraftProtection.discardChanges}
        />
      ) : null}
    </main>
  );
}

function TargetTaskPanel({ title, duration }: { title?: string; duration?: string }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <Mic2 size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">当前 Evidence Gate</h2>
      </div>
      <p className="mt-3 text-lg font-black leading-7 text-ink-900">{title ?? "今日暂无任务"}</p>
      <p className="mt-2 text-sm font-bold text-ink-500">{duration ?? "完成当前任务前先补一条证据"}</p>
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

function OralTaskPanel({ tasks }: { tasks: OralTaskSummary[] }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <ClipboardCheck size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">今日口述任务</h2>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-card bg-surface-0 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {task.isCurrent ? <span className="rounded-control bg-success-100 px-2 py-1 text-xs font-black text-success-600">当前</span> : null}
              <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{task.durationLabel}</span>
              <span className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{task.evidenceCount ? `已记 ${task.evidenceCount}` : "待记录"}</span>
            </div>
            <p className="mt-2 text-sm font-extrabold leading-6 text-ink-900">{task.title}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function QuestionPicker({
  mode,
  questions,
  allQuestionCount,
  categories,
  query,
  category,
  weakOnly,
  weakQuestionIds,
  activeQuestionId,
  onModeChange,
  onQueryChange,
  onCategoryChange,
  onWeakOnlyChange,
  onResetFilters,
  onPickQuestion
}: {
  mode: InterviewMode;
  questions: InterviewQuestionOption[];
  allQuestionCount: number;
  categories: Array<{ id: string; label: string }>;
  query: string;
  category: string;
  weakOnly: boolean;
  weakQuestionIds: Set<string>;
  activeQuestionId?: string;
  onModeChange: (mode: InterviewMode) => void;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onWeakOnlyChange: (weakOnly: boolean) => void;
  onResetFilters: () => void;
  onPickQuestion: (id: string) => void;
}) {
  const hasFilters = query.trim().length > 0 || category !== "all" || weakOnly;

  return (
    <section className="command-panel" aria-labelledby="question-picker-title">
      <div className="flex items-center gap-2 text-brand-700">
        <FileQuestion size={18} aria-hidden="true" />
        <h2 id="question-picker-title" className="text-base font-black text-ink-900">
          候选题目
        </h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="题型范围">
        {interviewModes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`min-h-10 rounded-control px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${mode === item.id ? "bg-brand-700 text-white" : "border border-line bg-surface-0 text-ink-700 hover:border-brand-600"}`}
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.55fr)_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-ink-500">
            <Search size={14} aria-hidden="true" />
            搜索候选题
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="能力关键词 / 项目 / 证据"
            className="min-h-11 w-full rounded-control border border-line bg-surface-0 px-3 text-sm font-bold text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-ink-500">
            <Filter size={14} aria-hidden="true" />
            分类
          </span>
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="min-h-11 w-full rounded-control border border-line bg-surface-0 px-3 text-sm font-bold text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            aria-label="候选题分类"
          >
            <option value="all">全部分类</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-pressed={weakOnly}
          onClick={() => onWeakOnlyChange(!weakOnly)}
          className={`touch-button ${
            weakOnly ? "bg-brand-700 text-white shadow-soft" : "border border-line bg-white text-ink-700 hover:bg-surface-0"
          }`}
        >
          <Star size={16} aria-hidden="true" />
          只看薄弱题
        </button>

        <button
          type="button"
          disabled={!hasFilters}
          onClick={onResetFilters}
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw size={16} aria-hidden="true" />
          清空筛选
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-500">
        <span className="rounded-control bg-surface-0 px-2.5 py-1">共 {allQuestionCount} 题</span>
        <span className="rounded-control bg-surface-0 px-2.5 py-1">匹配 {questions.length} 题</span>
        <span className="rounded-control bg-surface-0 px-2.5 py-1">薄弱 {weakQuestionIds.size} 题</span>
        <span className="rounded-control bg-success-100 px-2.5 py-1 text-success-600">localStorage fallback</span>
      </div>

      <div className="mt-4 grid gap-3">
        {questions.length ? (
          questions.map((question) => (
            <button
              key={question.id}
              type="button"
              className={`rounded-card border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${question.id === activeQuestionId ? "border-brand-600 bg-brand-100" : "border-line bg-surface-0 hover:border-brand-600"}`}
              onClick={() => onPickQuestion(question.id)}
            >
              <span className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-brand-700">
                <span>{question.source}</span>
                <span className="rounded-control bg-white px-2 py-0.5 text-[11px] font-bold text-ink-500">{question.modeLabel}</span>
                {weakQuestionIds.has(question.id) ? <span className="rounded-control bg-warn-100 px-2 py-0.5 text-[11px] font-bold text-warn-600">薄弱</span> : null}
              </span>
              <span className="mt-2 block text-sm font-extrabold leading-6 text-ink-900">{question.question}</span>
            </button>
          ))
        ) : (
          <div className="rounded-card border border-line bg-surface-0 p-4 text-sm font-semibold leading-6 text-ink-500">没有匹配的候选题，请清空筛选或切换题型范围。</div>
        )}
      </div>
    </section>
  );
}

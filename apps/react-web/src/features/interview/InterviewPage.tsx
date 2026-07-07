import { ArrowRight, CheckCircle2, ClipboardCheck, FileQuestion, Filter, MessageCircleQuestion, Mic2, PenLine, RefreshCw, RotateCcw, Search, Star, StarOff, WifiOff } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { syncStateLabel } from "../../app/syncStatus";
import {
  buildInterviewDashboard,
  buildOralEvidenceContent,
  filterInterviewQuestions,
  findInterviewQuestion,
  interviewModes,
  interviewQuestionCategories,
  readInterviewWeakQuestionMarks,
  scoreOralAnswer,
  toggleInterviewWeakQuestion,
  writeInterviewWeakQuestionMarks,
  type InterviewMode,
  type InterviewQuestionOption,
  type OralScoreAnalysis,
  type OralTaskSummary
} from "../../data/interviewAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { RecentRecords } from "./components/RecentRecords";
import { ScoreAnalysisPanel } from "./components/ScoreAnalysisPanel";

export function InterviewPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const syncState = useSprintStore((state) => state.syncState);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const [mode, setMode] = useState<InterviewMode>("auto");
  const [questionQuery, setQuestionQuery] = useState("");
  const [questionCategory, setQuestionCategory] = useState("all");
  const [weakOnly, setWeakOnly] = useState(false);
  const [weakQuestionIds, setWeakQuestionIds] = useState<Set<string>>(() => readInterviewWeakQuestionMarks());
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();
  const [answer, setAnswer] = useState("");
  const [scoreAnalysis, setScoreAnalysis] = useState<OralScoreAnalysis | undefined>();
  const [scoreFeedback, setScoreFeedback] = useState("");

  const dashboard = useMemo(() => buildInterviewDashboard(sprint, evidenceByTaskId, mode), [sprint, evidenceByTaskId, mode]);
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
  const activeQuestionId = filteredQuestions.some((question) => question.id === selectedQuestionId)
    ? selectedQuestionId
    : filteredQuestions[0]?.id ?? dashboard.candidateQuestions[0]?.id;
  const activeQuestion = findInterviewQuestion(dashboard.candidateQuestions, activeQuestionId);

  const handleAnswerChange = useCallback((value: string) => {
    setAnswer(value);
    setScoreAnalysis(undefined);
    setScoreFeedback("");
  }, []);

  const handleScore = useCallback(() => {
    if (!dashboard.targetTask || !activeQuestion || !answer.trim()) {
      setScoreFeedback("请先选择题目并输入一段口述回答。");
      return;
    }
    const analysis = scoreOralAnswer(dashboard.targetTask, activeQuestion, answer);
    setScoreAnalysis(analysis);
    setScoreFeedback("AI 不可用，已按本地 rubric 给出自检结果。");
  }, [activeQuestion, answer, dashboard.targetTask]);

  const handleRecord = useCallback(() => {
    if (!dashboard.targetTask || !activeQuestion || !answer.trim()) return;
    const analysis = scoreAnalysis ?? scoreOralAnswer(dashboard.targetTask, activeQuestion, answer);
    addEvidence(dashboard.targetTask.id, "oral_score", "口述训练证据", buildOralEvidenceContent(dashboard.targetTask, activeQuestion, answer, analysis));
    setAnswer("");
    setScoreAnalysis(undefined);
    setScoreFeedback("已保存口述和评分复盘，并写入 Evidence Gate。");
  }, [activeQuestion, addEvidence, answer, dashboard.targetTask, scoreAnalysis]);

  const toggleWeakQuestion = useCallback((questionId: string) => {
    setWeakQuestionIds((current) => {
      const next = toggleInterviewWeakQuestion(current, questionId);
      writeInterviewWeakQuestionMarks(next);
      return next;
    });
  }, []);

  const resetQuestionFilters = useCallback(() => {
    setQuestionQuery("");
    setQuestionCategory("all");
    setWeakOnly(false);
  }, []);

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-brand-700">口述训练 · 证据优先</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <MessageCircleQuestion size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">面试训练</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                先写一版 60 秒回答，再标记薄弱题；今日追问、题库和本地记录都服务于 Evidence Gate。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
              <MetricTile label="今日口述任务" value={`${dashboard.oralTasks.length} 个`} />
              <MetricTile label="候选题目" value={`${dashboard.candidateQuestions.length} 题`} />
              <MetricTile label="本地记录" value={`${dashboard.recordCount} 条`} />
              <MetricTile label="同步状态" value={syncStateLabel(syncState)} icon={<WifiOff size={15} aria-hidden="true" />} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <aside className="space-y-4">
            <TargetTaskPanel title={dashboard.targetTask?.title} duration={dashboard.targetTask?.durationLabel} />
            <OralTaskPanel tasks={dashboard.oralTasks} />
            <RecentRecords records={dashboard.recentRecords} />
          </aside>

          <section className="space-y-4">
            <AnswerPanel
              question={activeQuestion}
              answer={answer}
              onAnswerChange={handleAnswerChange}
              onRecord={handleRecord}
              onScore={handleScore}
              disabled={!dashboard.targetTask || !activeQuestion || !answer.trim()}
              analysis={scoreAnalysis}
              scoreFeedback={scoreFeedback}
              rubricDimensions={dashboard.rubricDimensions}
              weak={Boolean(activeQuestion && weakQuestionIds.has(activeQuestion.id))}
              onToggleWeak={toggleWeakQuestion}
            />
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
              onModeChange={(nextMode) => {
                setMode(nextMode);
                setQuestionCategory("all");
                setWeakOnly(false);
                setSelectedQuestionId(undefined);
              }}
              onQueryChange={setQuestionQuery}
              onCategoryChange={setQuestionCategory}
              onWeakOnlyChange={setWeakOnly}
              onResetFilters={resetQuestionFilters}
              onPickQuestion={(questionId) => {
                setSelectedQuestionId(questionId);
                setScoreAnalysis(undefined);
                setScoreFeedback("");
              }}
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
            placeholder="Spring / MQ / JVM / 项目"
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

function AnswerPanel({
  question,
  answer,
  onAnswerChange,
  onRecord,
  onScore,
  disabled,
  analysis,
  scoreFeedback,
  rubricDimensions,
  weak,
  onToggleWeak
}: {
  question?: InterviewQuestionOption;
  answer: string;
  onAnswerChange: (value: string) => void;
  onRecord: () => void;
  onScore: () => void;
  disabled: boolean;
  analysis?: OralScoreAnalysis;
  scoreFeedback: string;
  rubricDimensions: string[];
  weak: boolean;
  onToggleWeak: (questionId: string) => void;
}) {
  return (
    <section className="command-panel border-l-4 border-l-brand-700" aria-labelledby="answer-panel-title">
      <div className="flex items-center gap-2 text-brand-700">
        <PenLine size={18} aria-hidden="true" />
        <h2 id="answer-panel-title" className="text-base font-black text-ink-900">
          回答提示
        </h2>
      </div>
      {question ? (
        <QuestionDetail question={question} weak={weak} onToggleWeak={onToggleWeak} />
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无候选题，请检查题库数据。</p>
      )}

      <label className="mt-5 block">
        <span className="text-sm font-black text-ink-700">我的口述回答</span>
        <textarea
          className="field-control mt-2 min-h-[180px] resize-y p-4 leading-7"
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="先写一版 60 秒口述稿：背景、职责、链路、异常分支、边界和证据。"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="primary-button disabled:bg-ink-400"
          disabled={disabled}
          onClick={onRecord}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          保存口述与AI分析
        </button>
        <button
          type="button"
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={onScore}
        >
          <RefreshCw size={16} aria-hidden="true" />
          AI评分并生成复盘
        </button>
      </div>
      {scoreFeedback ? (
        <p className="mt-3 rounded-control bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700" aria-live="polite">
          {scoreFeedback}
        </p>
      ) : null}

      {analysis ? <ScoreAnalysisPanel analysis={analysis} /> : null}

      <div className="mt-5 rounded-card bg-surface-0 p-4">
        <p className="text-xs font-black uppercase text-ink-500">本地自检维度</p>
        <ul className="mt-2 space-y-2">
          {rubricDimensions.slice(0, 4).map((item) => (
            <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
              <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function QuestionDetail({
  question,
  weak,
  onToggleWeak
}: {
  question: InterviewQuestionOption;
  weak: boolean;
  onToggleWeak: (questionId: string) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-brand-700">
            <span>{question.source}</span>
            <span className="rounded-control bg-surface-0 px-2 py-0.5 text-[11px] font-bold text-ink-500">{question.modeLabel}</span>
            {question.isCurrentTask ? <span className="rounded-control bg-success-100 px-2 py-0.5 text-[11px] font-bold text-success-600">今日追问</span> : null}
          </div>
          <p className="mt-2 text-xl font-black leading-8 text-ink-900">{question.question}</p>
        </div>
        <button
          type="button"
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
            weak ? "bg-warn-100 text-warn-600" : "border border-line bg-white text-ink-700 hover:bg-surface-0"
          }`}
          aria-pressed={weak}
          aria-label={`${weak ? "取消薄弱题标记" : "标记薄弱题"}：${question.question}`}
          onClick={() => onToggleWeak(question.id)}
        >
          {weak ? <StarOff size={16} aria-hidden="true" /> : <Star size={16} aria-hidden="true" />}
          {weak ? "已标记薄弱题" : "标记薄弱题"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="border-t border-line pt-3">
          <p className="text-xs font-black uppercase text-ink-500">详情提示</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-600">{question.hint}</p>
        </section>
        <section className="border-t border-line pt-3">
          <p className="text-xs font-black uppercase text-ink-500">回答结构</p>
          <ol className="mt-2 space-y-1 text-sm font-semibold leading-6 text-ink-600">
            <li>1. 先给结论和适用边界。</li>
            <li>2. 再讲项目链路、异常分支和取舍。</li>
            <li>3. 最后落到指标、证据和复盘动作。</li>
          </ol>
        </section>
      </div>

      <section className="border-t border-line pt-3">
        <p className="text-xs font-black uppercase text-ink-500">预期关键词</p>
        <KeywordRow keywords={question.expectedKeywords} />
      </section>
    </div>
  );
}

function KeywordRow({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {keywords.slice(0, 8).map((keyword) => (
        <span key={keyword} className="rounded-control bg-surface-0 px-2.5 py-1 text-xs font-bold text-ink-500">
          {keyword}
        </span>
      ))}
    </div>
  );
}

import { ArrowRight, BookOpen, Filter, Layers3, NotebookPen, RotateCcw, Search, Star, StarOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildLearningDashboard,
  buildLearningNoteContent,
  filterLearningKnowledgeCards,
  findLearningKnowledgeCard,
  readLearningKnowledgeMarks,
  toggleLearningKnowledgeMark,
  writeLearningKnowledgeMarks,
  type LearningKnowledgeCard,
  type LearningResource,
  type LearningTaskSummary
} from "../../data/learningAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import { LearningNotesPanel, ResourcePanel } from "./components/LearningSidePanels";
import { LearningTaskCard } from "./components/LearningTaskCard";

export function LearningPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const dashboard = useMemo(() => buildLearningDashboard(sprint, evidenceByTaskId), [sprint, evidenceByTaskId]);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("all");
  const [markedOnly, setMarkedOnly] = useState(false);
  const [markedKnowledgeIds, setMarkedKnowledgeIds] = useState<Set<string>>(() => readLearningKnowledgeMarks());
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | undefined>();
  const [noteTaskId, setNoteTaskId] = useState<string | undefined>();
  const [noteDraft, setNoteDraft] = useState("");
  const [noteFeedback, setNoteFeedback] = useState("");
  const [knowledgeFeedback, setKnowledgeFeedback] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>();
  const [resourceFeedback, setResourceFeedback] = useState("");
  const hasProfile = userProfiles.length > 0;

  const filteredKnowledgeCards = useMemo(
    () =>
      filterLearningKnowledgeCards(dashboard.knowledgeCards, {
        query: knowledgeQuery,
        category: knowledgeCategory,
        markedOnly,
        markedIds: markedKnowledgeIds
      }),
    [dashboard.knowledgeCards, knowledgeCategory, knowledgeQuery, markedKnowledgeIds, markedOnly]
  );
  const activeKnowledgeCard = useMemo(
    () => findLearningKnowledgeCard(dashboard.knowledgeCards, selectedKnowledgeId) ?? filteredKnowledgeCards[0] ?? dashboard.knowledgeCards[0],
    [dashboard.knowledgeCards, filteredKnowledgeCards, selectedKnowledgeId]
  );
  const activeResource = useMemo(
    () => dashboard.resources.find((resource) => resource.id === selectedResourceId) ?? dashboard.resources[0],
    [dashboard.resources, selectedResourceId]
  );

  const beginLearningNote = useCallback((task: LearningTaskSummary) => {
    setNoteTaskId(task.id);
    setNoteDraft("");
    setNoteFeedback("");
  }, []);

  const cancelLearningNote = useCallback(() => {
    setNoteTaskId(undefined);
    setNoteDraft("");
  }, []);

  const saveLearningNote = useCallback(
    (task: LearningTaskSummary) => {
      const content = noteDraft.trim();
      if (!content) return;
      const baseContent = buildLearningNoteContent(task);
      addEvidence(
        task.id,
        "learning_note",
        "学习笔记证据",
        `${baseContent} 手动笔记：${content}`
      );
      setNoteFeedback(`已保存到 学习 > 学习笔记，并同步到 Evidence Gate：${task.title}`);
      setNoteTaskId(undefined);
      setNoteDraft("");
    },
    [addEvidence, noteDraft]
  );

  const toggleKnowledgeMark = useCallback((cardId: string) => {
    setMarkedKnowledgeIds((current) => {
      const next = toggleLearningKnowledgeMark(current, cardId);
      writeLearningKnowledgeMarks(next);
      return next;
    });
  }, []);

  const resetKnowledgeFilters = useCallback(() => {
    setKnowledgeQuery("");
    setKnowledgeCategory("all");
    setMarkedOnly(false);
  }, []);

  const selectKnowledgeCard = useCallback((cardId: string) => {
    const card = findLearningKnowledgeCard(dashboard.knowledgeCards, cardId);
    setSelectedKnowledgeId(cardId);
    setKnowledgeFeedback(card ? `已打开「${card.title}」详情。` : "已打开知识卡详情。");
    window.setTimeout(() => {
      const detail = document.getElementById("knowledge-detail-panel");
      if (typeof detail?.scrollIntoView === "function") {
        detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      detail?.focus({ preventScroll: true });
    }, 0);
  }, [dashboard.knowledgeCards]);

  const selectResource = useCallback((resource: LearningResource) => {
    setSelectedResourceId(resource.id);
    setResourceFeedback(resource.hasPath ? `已打开「${resource.label}」资料详情。` : `已打开「${resource.label}」资料摘要；当前缺少可打开路径。`);
  }, []);

  if (!hasProfile) {
    return (
      <main className="app-main">
        <section className="app-page">
          <article className="command-card p-5">
            <div className="flex items-center gap-3 text-brand-700">
              <span className="grid size-12 place-items-center rounded-control bg-brand-100">
                <BookOpen size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-brand-700">知识边界</p>
                <h1 className="text-3xl font-black text-ink-900">先建立你的求职画像</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
              保存目标岗位、经验摘要和项目证据后，知识任务会围绕你的求职方向生成。
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
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-brand-700">知识边界 · 证据沉淀</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">知识边界</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                今日知识任务、资料入口和知识卡只保留能转成岗位表达的内容；学习笔记直接进入 Evidence Gate。
              </p>
            </div>
            <Link to="/stats" className="rounded-card border border-line bg-surface-0 p-4 text-left transition hover:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 xl:min-w-[320px]">
              <span className="text-xs font-black text-ink-500">集中统计</span>
              <span className="mt-1 block text-sm font-extrabold leading-6 text-ink-900">查看知识任务、学习笔记和资料入口</span>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="space-y-3" aria-labelledby="learning-tasks-title">
            <SectionTitle id="learning-tasks-title" icon={<NotebookPen size={18} aria-hidden="true" />} title="今日知识任务" />
            {dashboard.learningTasks.length ? (
              dashboard.learningTasks.map((task) => (
                <LearningTaskCard
                  key={task.id}
                  task={task}
                  isNoteOpen={noteTaskId === task.id}
                  noteDraft={noteTaskId === task.id ? noteDraft : ""}
                  feedback={noteFeedback}
                  onBeginNote={beginLearningNote}
                  onNoteDraftChange={setNoteDraft}
                  onSaveNote={saveLearningNote}
                  onCancelNote={cancelLearningNote}
                />
              ))
            ) : (
            <EmptyPanel text="今日没有知识任务，先回到今日 AI 教练处理当前任务。" />
            )}
          </section>

          <aside className="space-y-4">
            <FocusPanel task={dashboard.focusTask} />
            <ResourcePanel resources={dashboard.resources} activeResource={activeResource} feedback={resourceFeedback} onSelectResource={selectResource} />
            <LearningNotesPanel notes={dashboard.recentNotes} />
          </aside>
        </section>

        <section className="space-y-3" aria-labelledby="knowledge-cards-title">
          <SectionTitle id="knowledge-cards-title" icon={<Layers3 size={18} aria-hidden="true" />} title="知识卡摘要" />
          <KnowledgeBrowser
            cards={dashboard.knowledgeCards}
            filteredCards={filteredKnowledgeCards}
            categories={dashboard.knowledgeCategories}
            query={knowledgeQuery}
            category={knowledgeCategory}
            markedOnly={markedOnly}
            markedIds={markedKnowledgeIds}
            activeCard={activeKnowledgeCard}
            onQueryChange={setKnowledgeQuery}
            onCategoryChange={setKnowledgeCategory}
            onMarkedOnlyChange={setMarkedOnly}
            feedback={knowledgeFeedback}
            onSelectCard={selectKnowledgeCard}
            onToggleMark={toggleKnowledgeMark}
            onResetFilters={resetKnowledgeFilters}
          />
        </section>
      </section>
    </main>
  );
}

function SectionTitle({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-brand-700">
      {icon}
      <h2 id={id} className="text-base font-black text-ink-900">
        {title}
      </h2>
    </div>
  );
}

function FocusPanel({ task }: { task?: LearningTaskSummary }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <NotebookPen size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">笔记入口</h2>
      </div>
      {task ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">
          优先为「{task.title}」补一条知识边界笔记。它会写入 React localStorage，并立即作为今日 Evidence Gate 的学习证据。
        </p>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">当前没有待补学习笔记的任务。</p>
      )}
    </article>
  );
}

function KnowledgeBrowser({
  cards,
  filteredCards,
  categories,
  query,
  category,
  markedOnly,
  markedIds,
  activeCard,
  feedback,
  onQueryChange,
  onCategoryChange,
  onMarkedOnlyChange,
  onSelectCard,
  onToggleMark,
  onResetFilters
}: {
  cards: LearningKnowledgeCard[];
  filteredCards: LearningKnowledgeCard[];
  categories: string[];
  query: string;
  category: string;
  markedOnly: boolean;
  markedIds: Set<string>;
  activeCard?: LearningKnowledgeCard;
  feedback: string;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onMarkedOnlyChange: (markedOnly: boolean) => void;
  onSelectCard: (cardId: string) => void;
  onToggleMark: (cardId: string) => void;
  onResetFilters: () => void;
}) {
  const hasFilters = query.trim().length > 0 || category !== "all" || markedOnly;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft md:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(200px,0.45fr)_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-ink-500">
            <Search size={14} aria-hidden="true" />
            搜索知识卡
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="岗位能力 / 项目 / 证据"
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
            aria-label="知识卡分类"
          >
            <option value="all">全部分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-pressed={markedOnly}
          onClick={() => onMarkedOnlyChange(!markedOnly)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
            markedOnly ? "bg-brand-700 text-white shadow-soft" : "border border-line bg-white text-ink-700 hover:bg-surface-0"
          }`}
        >
          <Star size={16} aria-hidden="true" />
          只看重点
        </button>

        <button
          type="button"
          disabled={!hasFilters}
          onClick={onResetFilters}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw size={16} aria-hidden="true" />
          清空筛选
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-500">
        <span className="rounded-control bg-surface-0 px-2.5 py-1">共 {cards.length} 张</span>
        <span className="rounded-control bg-surface-0 px-2.5 py-1">匹配 {filteredCards.length} 张</span>
        <span className="rounded-control bg-surface-0 px-2.5 py-1">重点 {markedIds.size} 张</span>
        <span className="rounded-control bg-success-100 px-2.5 py-1 text-success-600">localStorage fallback</span>
      </div>
      {feedback ? (
        <p className="mt-3 rounded-control bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        {filteredCards.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            {filteredCards.map((card) => (
              <KnowledgeCard
                key={card.id}
                card={card}
                selected={card.id === activeCard?.id}
                marked={markedIds.has(card.id)}
                onSelect={onSelectCard}
                onToggleMark={onToggleMark}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel text="没有匹配的知识卡。请清空筛选或换一个关键词。" />
        )}

        <KnowledgeDetailPanel card={activeCard} marked={Boolean(activeCard && markedIds.has(activeCard.id))} onToggleMark={onToggleMark} />
      </div>
    </div>
  );
}

function KnowledgeCard({
  card,
  selected,
  marked,
  onSelect,
  onToggleMark
}: {
  card: LearningKnowledgeCard;
  selected: boolean;
  marked: boolean;
  onSelect: (cardId: string) => void;
  onToggleMark: (cardId: string) => void;
}) {
  return (
    <article className={`rounded-card border bg-white p-5 shadow-soft transition ${selected ? "border-brand-600 ring-2 ring-brand-100" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase text-brand-700">{card.category}</p>
        <button
          type="button"
          aria-label={`${marked ? "取消重点标记" : "标记重点"}：${card.title}`}
          aria-pressed={marked}
          onClick={() => onToggleMark(card.id)}
          className={`grid size-9 shrink-0 place-items-center rounded-control transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
            marked ? "bg-brand-100 text-brand-700" : "border border-line bg-white text-ink-500 hover:bg-surface-0"
          }`}
        >
          {marked ? <Star size={16} fill="currentColor" aria-hidden="true" /> : <StarOff size={16} aria-hidden="true" />}
        </button>
      </div>
      <h3 className="mt-2 text-lg font-black leading-tight text-ink-900">{card.title}</h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">{card.publicSummary}</p>
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <KnowledgeLine label="追问" value={card.interviewQuestion} />
        <KnowledgeLine label="岗位映射" value={card.javaMapping} />
      </div>
      <button
        type="button"
        onClick={() => onSelect(card.id)}
        aria-label={`查看详情：${card.title}`}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        查看详情
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </article>
  );
}

function KnowledgeDetailPanel({ card, marked, onToggleMark }: { card?: LearningKnowledgeCard; marked: boolean; onToggleMark: (cardId: string) => void }) {
  if (!card) {
    return <EmptyPanel text="暂无可查看的知识卡详情。" />;
  }

  return (
    <article id="knowledge-detail-panel" className="rounded-card border border-line bg-surface-0 p-5" aria-label="知识卡详情" tabIndex={-1}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-brand-700">{card.category}</p>
          <h3 className="mt-2 text-xl font-black leading-tight text-ink-900">{card.title}</h3>
        </div>
        <button
          type="button"
          aria-pressed={marked}
          onClick={() => onToggleMark(card.id)}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
            marked ? "bg-brand-700 text-white shadow-soft" : "border border-line bg-white text-ink-700 hover:bg-surface-0"
          }`}
        >
          <Star size={16} fill={marked ? "currentColor" : "none"} aria-hidden="true" />
          {marked ? "已标记重点" : "标记重点"}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <KnowledgeLine label="详情摘要" value={card.publicSummary} />
        <KnowledgeLine label="面试追问" value={card.interviewQuestion} />
        <KnowledgeLine label="岗位映射" value={card.javaMapping} />
        <KnowledgeLine label="项目证据" value={card.projectEvidence} />
        <KnowledgeList label="安全表达" values={card.safeWording} />
        <KnowledgeList label="来源标签" values={card.sourceLabels} />
      </div>
    </article>
  );
}

function KnowledgeLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-ink-800">{value || "--"}</p>
    </div>
  );
}

function KnowledgeList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-ink-500">{label}</p>
      <ul className="mt-2 space-y-2">
        {(values.length ? values : ["--"]).map((value) => (
          <li key={value} className="text-sm font-bold leading-6 text-ink-800">
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="rounded-card border border-line bg-white p-5 text-sm font-semibold leading-6 text-ink-500 shadow-soft">{text}</div>;
}

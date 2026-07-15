import { CheckCircle2, ChevronRight, ClipboardCheck, FilePlus2, Mic2, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EvidenceType, ReviewEvidence, Task } from "../../../types/sprint";

interface EvidenceGateProps {
  task?: Task;
  evidence: ReviewEvidence[];
  summary: string;
  onAddEvidence: (type: EvidenceType, title: string, content: string) => void;
}

const baseQuickActions: Array<{ type: EvidenceType; title: string; label: string; icon: typeof FilePlus2; content: string; placeholder: string }> = [
  {
    type: "learning_note",
    title: "学习笔记证据",
    label: "补学习笔记",
    icon: FilePlus2,
    content: "本地记录：已补一条学习或任务证据，可在复盘页继续细化。",
    placeholder: "写下学到了什么、对应项目证据、还没讲顺的追问。"
  },
  {
    type: "oral_score",
    title: "口述训练证据",
    label: "记录口述",
    icon: Mic2,
    content: "本地记录：已完成一轮 60 秒口述训练。",
    placeholder: "粘贴或输入你的口述文本，至少写出结论、链路、边界和下一步。"
  },
  {
    type: "delivery_record",
    title: "机会反馈证据",
    label: "登记机会反馈",
    icon: Send,
    content: "本地记录：已登记一条岗位机会或简历反馈线索。",
    placeholder: "记录公司、岗位、状态、沟通反馈和下一步动作。"
  }
];

type QuickAction = (typeof baseQuickActions)[number];

export function EvidenceGate({ task, evidence, summary, onAddEvidence }: EvidenceGateProps) {
  const rows = buildEvidenceRows(task, evidence);
  const quickActions = useMemo(() => baseQuickActions.filter((action) => shouldShowQuickAction(action.type, task)), [task]);
  const [draft, setDraft] = useState(() => createDraft(baseQuickActions[0], task));
  const [formOpen, setFormOpen] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EvidenceType | "all">("all");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState("");
  const formTriggerRef = useRef<HTMLButtonElement | null>(null);
  const typeSelectRef = useRef<HTMLSelectElement | null>(null);
  const orderedEvidence = useMemo(() => [...evidence].sort((a, b) => timestampOf(b.createdAt) - timestampOf(a.createdAt)), [evidence]);
  const filteredEvidence = useMemo(
    () => (typeFilter === "all" ? orderedEvidence : orderedEvidence.filter((item) => item.type === typeFilter)),
    [orderedEvidence, typeFilter]
  );
  const visibleEvidence = showAllEvidence ? filteredEvidence : filteredEvidence.slice(0, 3);
  const evidenceStats = useMemo(() => buildEvidenceStats(orderedEvidence), [orderedEvidence]);
  const selectedAction = useMemo(() => baseQuickActions.find((action) => action.type === draft.type) ?? baseQuickActions[0], [draft.type]);

  useEffect(() => {
    if (formOpen) typeSelectRef.current?.focus();
  }, [formOpen]);

  const openEvidenceForm = (action: QuickAction, trigger: HTMLButtonElement) => {
    formTriggerRef.current = trigger;
    setDraft(createDraft(action, task));
    setFormOpen(true);
    setFeedback("");
  };

  const closeEvidenceForm = () => {
    setFormOpen(false);
    formTriggerRef.current?.focus();
  };

  const saveEvidence = () => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title || !content) return;
    onAddEvidence(draft.type, title, buildContent(content, task));
    setFeedback(`已保存${typeLabel(draft.type)}证据：${title}`);
    setDraft(createDraft(selectedAction, task));
    closeEvidenceForm();
  };

  return (
    <section className="command-panel" aria-labelledby="evidence-gate-title">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <ClipboardCheck size={19} aria-hidden="true" />
            <h2 id="evidence-gate-title" className="text-lg font-black text-ink-900">
              Evidence Gate（证据门）
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink-700">{summary}</p>
        </div>
        <span className={`status-chip text-sm ${evidence.length ? "bg-success-100 text-success-600" : "bg-warn-100 text-warn-600"}`}>
          {evidence.length ? "可标记完成" : "待补证据"}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line">
        {rows.map((row) => {
          const Icon = row.status === "done" ? CheckCircle2 : row.status === "pending" ? ShieldAlert : ClipboardCheck;
          const tone = row.status === "done" ? "text-success-600 bg-success-100" : row.status === "pending" ? "text-warn-600 bg-warn-100" : "text-ink-500 bg-surface-0";
          return (
            <div key={row.key} className="flex min-h-14 items-center justify-between gap-3 border-t border-line bg-white px-4 first:border-t-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-control ${tone}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink-900">{row.label}</p>
                  <p className="text-xs font-semibold text-ink-500">{row.help}</p>
                </div>
              </div>
              <span className={`status-chip shrink-0 ${tone}`}>{row.statusLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.type}
              type="button"
              className="secondary-button"
              aria-expanded={formOpen && draft.type === action.type}
              onClick={(event) => openEvidenceForm(action, event.currentTarget)}
            >
              <Icon size={16} aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>

      {formOpen ? (
        <div className="mt-4 rounded-card border border-brand-100 bg-surface-0 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(180px,0.34fr)_minmax(0,1fr)]">
            <label className="grid gap-1 text-sm font-bold text-ink-700">
              证据类型
              <select
                ref={typeSelectRef}
                className="field-control bg-white"
                value={draft.type}
                onChange={(event) => {
                  const action = baseQuickActions.find((item) => item.type === event.target.value) ?? baseQuickActions[0];
                  setDraft(createDraft(action, task));
                }}
              >
                {quickActions.map((action) => (
                  <option key={action.type} value={action.type}>
                    {typeLabel(action.type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-ink-700">
              证据标题
              <input
                className="field-control bg-white"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
          </div>
          <label className="mt-3 grid gap-1 text-sm font-bold text-ink-700">
            证据内容
            <textarea
              className="field-control min-h-28 resize-y bg-white leading-6"
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder={selectedAction.placeholder}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="primary-button min-h-11 px-3 text-sm" disabled={!draft.title.trim() || !draft.content.trim()} onClick={saveEvidence}>
              保存证据
            </button>
            <button type="button" className="secondary-button min-h-11 px-3 text-sm" onClick={closeEvidenceForm}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      <div className="mt-5 rounded-card border border-line bg-surface-0 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`min-h-11 rounded-control px-2.5 py-1 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
              typeFilter === "all" ? "bg-brand-700 text-white" : "bg-white text-ink-600 hover:bg-brand-100"
            }`}
            aria-pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            全部 {orderedEvidence.length}
          </button>
          {evidenceStats.map((stat) => (
            <button
              key={stat.type}
              type="button"
              className={`min-h-11 rounded-control px-2.5 py-1 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
                typeFilter === stat.type ? "bg-brand-700 text-white" : "bg-white text-ink-600 hover:bg-brand-100"
              }`}
              aria-pressed={typeFilter === stat.type}
              onClick={() => setTypeFilter(stat.type)}
            >
              {typeLabel(stat.type)} {stat.count}
            </button>
          ))}
        </div>

        <div className={`mt-3 space-y-2 ${showAllEvidence ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
          {visibleEvidence.length ? (
            visibleEvidence.map((item) => {
              const expanded = selectedEvidenceId === item.id;
              return (
                <article key={item.id} className="rounded-card bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-ink-900">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-ink-500">{item.content}</p>
                    </div>
                    <span className="status-chip shrink-0 bg-surface-0 text-ink-500">{typeLabel(item.type)}</span>
                  </div>
                  {expanded ? (
                    <p className="mt-3 rounded-control bg-surface-0 px-3 py-2 text-sm font-semibold leading-6 text-ink-700">{item.content}</p>
                  ) : null}
                  <button
                    type="button"
                    className="secondary-button mt-3 min-h-11 px-3 text-xs"
                    aria-expanded={expanded}
                    onClick={() => setSelectedEvidenceId((current) => (current === item.id ? undefined : item.id))}
                  >
                    {expanded ? "收起详情" : "展开详情"}
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </article>
              );
            })
          ) : (
            <p className="rounded-card bg-white p-3 text-sm font-semibold leading-6 text-ink-500">当前筛选下暂无证据。</p>
          )}
        </div>
        {filteredEvidence.length > 3 ? (
          <button type="button" className="secondary-button mt-3 min-h-11 px-3 text-xs" onClick={() => setShowAllEvidence((current) => !current)}>
            {showAllEvidence ? "收起证据列表" : `查看全部证据（${filteredEvidence.length}）`}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function buildEvidenceRows(task: Task | undefined, evidence: ReviewEvidence[]) {
  const required = task?.evidenceRequired.length ? task.evidenceRequired : ["learning_note", "oral_score", "delivery_record", "review"] satisfies EvidenceType[];
  const evidenceTypes = new Set(evidence.map((item) => item.type));
  return required.map((type, index) => {
    const hasEvidence = evidenceTypes.has(type);
    const pending = index <= evidence.length;
    return {
      key: type,
      label: typeLabel(type),
      help: hasEvidence ? "已有可验收记录" : pending ? "需要补一条可复盘证据" : "当前任务完成后再处理",
      status: hasEvidence ? "done" as const : pending ? "pending" as const : "todo" as const,
      statusLabel: hasEvidence ? "已完成" : pending ? "待补证据" : "未开始"
    };
  });
}

function buildContent(content: string, task?: Task): string {
  return task ? `${content} 当前任务：${task.title}` : content;
}

function createDraft(action: QuickAction, task?: Task) {
  return {
    type: action.type,
    title: action.title,
    content: task ? "" : action.content
  };
}

function shouldShowQuickAction(type: EvidenceType, task?: Task): boolean {
  if (type !== "delivery_record") return true;
  return Boolean(task && (task.type === "resume" || task.type === "delivery" || task.evidenceRequired.includes("delivery_record")));
}

function buildEvidenceStats(evidence: ReviewEvidence[]): Array<{ type: EvidenceType; count: number }> {
  const counts = new Map<EvidenceType, number>();
  for (const item of evidence) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function timestampOf(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function typeLabel(type: EvidenceType): string {
  const labels: Record<EvidenceType, string> = {
    review: "复盘",
    oral_score: "口述",
    interview_answer: "回答",
    delivery_record: "机会反馈",
    learning_note: "笔记"
  };

  return labels[type];
}

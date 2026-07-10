import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { LearningTaskSummary } from "../../../data/learningAdapter";

interface LearningTaskCardProps {
  task: LearningTaskSummary;
  isNoteOpen: boolean;
  noteDraft: string;
  feedback: string;
  onBeginNote: (task: LearningTaskSummary) => void;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: (task: LearningTaskSummary) => void;
  onCancelNote: () => void;
}

export function LearningTaskCard({
  task,
  isNoteOpen,
  noteDraft,
  feedback,
  onBeginNote,
  onNoteDraftChange,
  onSaveNote,
  onCancelNote
}: LearningTaskCardProps) {
  const noteFieldId = `learning-note-${task.id}`;
  const noteActionHintId = `learning-note-action-${task.id}`;
  const noteActionHint = noteDraft.trim()
    ? `保存后会写入「${task.title}」的 Evidence Gate，并出现在学习笔记列表。`
    : "先写一段学习笔记，才能保存到当前知识任务的 Evidence Gate。";

  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {task.isCurrent ? <span className="rounded-control bg-success-100 px-2.5 py-1 text-xs font-black text-success-600">当前 Evidence Gate</span> : null}
            <span className="rounded-control bg-brand-100 px-2.5 py-1 text-xs font-black text-brand-700">{task.durationLabel}</span>
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-control bg-surface-0 px-2.5 py-1 text-xs font-bold text-ink-500">
                {tag}
              </span>
            ))}
          </div>
          <h3 className="mt-3 text-xl font-black leading-tight text-ink-900">{task.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">{task.description}</p>
        </div>
        <span className={`shrink-0 rounded-control px-3 py-1.5 text-sm font-extrabold ${task.noteCount ? "bg-success-100 text-success-600" : "bg-warn-100 text-warn-600"}`}>
          {task.statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Checklist title="必须产出" items={task.deliverables} />
        <Checklist title="面试追问" items={task.interviewQuestions} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-700 px-4 text-sm font-black text-white shadow-soft transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
          aria-label={`为 ${task.title}补学习笔记`}
          aria-expanded={isNoteOpen}
          onClick={() => onBeginNote(task)}
        >
          <ClipboardCheck size={16} aria-hidden="true" />
          {task.noteCount ? "再补一条" : "补学习笔记"}
        </button>
        <Link
          to="/today"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <ArrowRight size={16} aria-hidden="true" />
          回到今日
        </Link>
      </div>

      {isNoteOpen ? (
        <div className="mt-4 rounded-card border border-brand-100 bg-brand-100/40 p-4">
          <label htmlFor={noteFieldId} className="grid gap-2 text-sm font-black text-ink-800">
            学习笔记内容
            <textarea
              id={noteFieldId}
              aria-describedby={noteActionHintId}
              className="field-control min-h-28 resize-y bg-white leading-6"
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder="写下今天真正补到的知识点、对应项目证据、还没讲清楚的追问。"
            />
          </label>
          <p id={noteActionHintId} className="mt-3 rounded-control bg-white px-3 py-2 text-sm font-bold leading-6 text-ink-500" role="status" aria-live="polite">
            {noteActionHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="primary-button min-h-10 px-3 text-sm" aria-describedby={noteActionHintId} disabled={!noteDraft.trim()} onClick={() => onSaveNote(task)}>
              保存学习笔记
            </button>
            <button type="button" className="secondary-button min-h-10 px-3 text-sm" onClick={onCancelNote}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      {feedback && feedback.includes(task.title) ? (
        <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </article>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-card bg-surface-0 p-4">
      <p className="text-xs font-black uppercase text-ink-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {(items.length ? items : ["完成当前学习记录"]).slice(0, 3).map((item) => (
          <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
            <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

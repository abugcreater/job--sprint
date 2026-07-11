import { ClipboardList, Eye, FileText, Link2Off } from "lucide-react";
import type { LearningNoteRecord, LearningResource } from "../../../data/learningAdapter";

export function ResourcePanel({
  resources,
  activeResource,
  feedback,
  onSelectResource
}: {
  resources: LearningResource[];
  activeResource?: LearningResource;
  feedback: string;
  onSelectResource: (resource: LearningResource) => void;
}) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-brand-700">
        <FileText size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">资料入口</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {resources.map((resource) => (
          <button
            key={resource.id}
            type="button"
            className={`rounded-card border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
              resource.id === activeResource?.id ? "border-brand-600 bg-brand-100" : "border-line bg-surface-0 hover:border-brand-600"
            }`}
            aria-pressed={resource.id === activeResource?.id}
            onClick={() => onSelectResource(resource)}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink-900">{resource.label}</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-ink-500">关联 {resource.taskTitles.length} 个学习任务</span>
              </span>
              <Eye className="shrink-0 text-brand-700" size={16} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      {feedback ? (
        <p className="mt-3 rounded-control bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700" aria-live="polite">
          {feedback}
        </p>
      ) : null}
      {activeResource ? <ResourceDetail resource={activeResource} /> : <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无资料入口。</p>}
    </article>
  );
}

export function LearningNotesPanel({ notes }: { notes: LearningNoteRecord[] }) {
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="learning-notes-title">
      <div className="flex items-center gap-2 text-brand-700">
        <ClipboardList size={18} aria-hidden="true" />
        <h2 id="learning-notes-title" className="text-base font-black text-ink-900">
          学习笔记
        </h2>
      </div>
      {notes.length ? (
        <div className="mt-4 space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-card bg-surface-0 p-3">
              <p className="text-xs font-black text-brand-700">{note.taskTitle}</p>
              <h3 className="mt-1 text-sm font-extrabold text-ink-900">{note.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink-600">{note.preview}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无学习笔记。保存后会在这里显示完整入口，并同步到 Evidence Gate。</p>
      )}
    </article>
  );
}

function ResourceDetail({ resource }: { resource: LearningResource }) {
  return (
    <section className="mt-4 rounded-card border border-line bg-surface-0 p-4" aria-label="资料详情">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-control bg-white px-2.5 py-1 text-xs font-black text-ink-500">{resource.kind}</span>
        <span className={`rounded-control px-2.5 py-1 text-xs font-black ${resource.hasPath ? "bg-success-100 text-success-600" : "bg-warn-100 text-warn-600"}`}>
          {resource.hasPath ? "可打开" : "缺少路径"}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-black text-ink-900">{resource.label}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink-600">{resource.summary}</p>
      <div className="mt-3 space-y-2">
        {resource.taskTitles.map((title) => (
          <p key={title} className="rounded-control bg-white px-3 py-2 text-xs font-bold leading-5 text-ink-700">
            {title}
          </p>
        ))}
      </div>
      <button type="button" className="secondary-button mt-3 cursor-not-allowed opacity-60" disabled>
        <Link2Off size={16} aria-hidden="true" />
        缺少资料路径
      </button>
    </section>
  );
}

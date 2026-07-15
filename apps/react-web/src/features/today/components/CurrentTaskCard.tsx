import { Check, Clock3, FileText, LockKeyhole, MapPin, PlayCircle, UnlockKeyhole } from "lucide-react";
import type { Task } from "../../../types/sprint";

interface CurrentTaskCardProps {
  task?: Task;
  hasEvidence: boolean;
  evidenceCount: number;
  onToggleComplete: () => void;
}

export function CurrentTaskCard({ task, hasEvidence, evidenceCount, onToggleComplete }: CurrentTaskCardProps) {
  if (!task) {
    return (
      <section className="command-panel">
        <p className="text-sm font-extrabold text-ink-500">当前任务</p>
        <h2 className="mt-2 text-2xl font-black text-ink-900">今日计划已结束</h2>
        <p className="mt-3 text-sm leading-6 text-ink-700">进入复盘，把证据和机会反馈补齐。</p>
      </section>
    );
  }

  const isDone = task.status === "done";
  const canComplete = hasEvidence || isDone;

  return (
    <section
      className="overflow-hidden rounded-workbench border border-line bg-white shadow-panel"
      aria-labelledby="current-task-title"
    >
      <div className="border-b border-line p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-chip bg-brand-100 text-brand-700">{task.tags[0] ?? task.type}</span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-ink-500">
                <Clock3 size={15} aria-hidden="true" />
                {task.durationLabel}
              </span>
              <span className="status-chip bg-info-100 text-info-600">{evidenceCount ? `证据 ${evidenceCount} 条` : "待补证据"}</span>
            </div>
            <h2 id="current-task-title" className="mt-4 text-xl font-black leading-tight tracking-[-0.03em] text-ink-950 md:text-[34px]">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            className="primary-button w-full shrink-0 disabled:bg-ink-400 sm:w-auto"
            onClick={onToggleComplete}
            disabled={!canComplete}
            aria-disabled={!canComplete}
          >
            {isDone ? <Check size={17} aria-hidden="true" /> : hasEvidence ? <UnlockKeyhole size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            {isDone ? "取消完成" : hasEvidence ? "标记完成" : "先补证据"}
          </button>
        </div>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-ink-700 md:text-base md:font-normal md:leading-7">{task.description}</p>
      </div>

      <div className="hidden gap-0 divide-x divide-line md:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6">
          <p className="text-xs font-extrabold uppercase text-ink-500">必须产出</p>
          <ul className="mt-2 grid gap-2">
            {task.deliverables.map((item) => (
              <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-ink-700">
                <FileText className="mt-0.5 shrink-0 text-brand-700" size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface-0 p-6">
          <p className="text-xs font-extrabold uppercase text-ink-500">验收标准</p>
          <p className="mt-2 text-sm font-bold leading-6 text-ink-900">{task.acceptanceCriteria}</p>
          {task.javaMapping ? (
            <p className="mt-3 inline-flex items-start gap-2 text-sm leading-6 text-ink-700">
              <MapPin className="mt-0.5 shrink-0 text-warn-600" size={16} aria-hidden="true" />
              <span>{task.javaMapping}</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line bg-surface-0 px-5 py-4 md:px-7">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-brand-700 transition hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
          onClick={() => document.getElementById("evidence-gate-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <PlayCircle size={18} aria-hidden="true" />
          继续专注，前往 Evidence Gate
        </button>
      </div>
    </section>
  );
}

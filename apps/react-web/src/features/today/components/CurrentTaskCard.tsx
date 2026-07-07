import { Check, Clock3, FileText, LockKeyhole, MapPin, PlayCircle, UnlockKeyhole } from "lucide-react";
import type { Task } from "../../../types/sprint";

interface CurrentTaskCardProps {
  task?: Task;
  hasEvidence: boolean;
  progressPercent: number;
  evidenceCount: number;
  onToggleComplete: () => void;
}

export function CurrentTaskCard({ task, hasEvidence, progressPercent, evidenceCount, onToggleComplete }: CurrentTaskCardProps) {
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
      className="command-card overflow-hidden border-l-4 border-l-brand-700 p-4 shadow-panel transition-shadow duration-200 md:p-5"
      aria-labelledby="current-task-title"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-chip bg-brand-100 text-brand-700">{task.tags[0] ?? task.type}</span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-ink-500">
              <Clock3 size={15} aria-hidden="true" />
              {task.durationLabel}
            </span>
            <span className="status-chip bg-info-100 text-info-600">{evidenceCount ? `证据 ${evidenceCount} 条` : "待补证据"}</span>
          </div>
          <h2 id="current-task-title" className="mt-3 text-xl font-black leading-tight text-ink-900 md:text-3xl">
            {task.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink-700 md:mt-3 md:text-base md:font-normal md:leading-7">{task.description}</p>
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

      <div className="mt-4 md:mt-5">
        <div className="flex items-center justify-between gap-3 text-sm font-black text-ink-700">
          <span>任务时度</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-0">
          <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }} />
        </div>
      </div>

      <div className="mt-5 hidden gap-4 md:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div>
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

        <div className="rounded-card bg-surface-0 p-4">
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
      <button
        type="button"
        className="mt-4 primary-button w-full sm:w-auto md:mt-5"
        onClick={() => document.getElementById("evidence-gate-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <PlayCircle size={18} aria-hidden="true" />
        继续专注
      </button>
    </section>
  );
}

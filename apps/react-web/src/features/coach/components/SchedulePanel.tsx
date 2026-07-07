import { CalendarPlus, Edit3, Trash2 } from "lucide-react";
import { coachEventKinds, type CoachScheduleDraft } from "../../../data/coachAdapter";
import type { CoachScheduleEvent } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

export function SchedulePanel({
  events,
  draft,
  onChange,
  onEdit,
  onDelete,
  onSave,
  showAll,
  onToggleShowAll
}: {
  events: CoachScheduleEvent[];
  draft: CoachScheduleDraft;
  onChange: (patch: Partial<CoachScheduleDraft>) => void;
  onEdit: (event: CoachScheduleEvent) => void;
  onDelete: (eventId: string) => void;
  onSave: () => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visibleEvents = showAll ? events : events.slice(0, 5);
  const hiddenCount = Math.max(0, events.length - visibleEvents.length);
  return (
    <article className="command-panel">
      <PanelTitle icon={<CalendarPlus size={18} aria-hidden="true" />} title="我的日程" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="日程标题" value={draft.title} onChange={(value) => onChange({ title: value })} />
        <Field label="日期" value={draft.date} onChange={(value) => onChange({ date: value })} />
        <Field label="开始" value={draft.start} onChange={(value) => onChange({ start: value })} />
        <Field label="结束" value={draft.end} onChange={(value) => onChange({ end: value })} />
        <label className="block">
          <span className="text-sm font-black text-ink-700">类型</span>
          <select className="field-control mt-2" value={draft.kind} onChange={(event) => onChange({ kind: event.target.value as CoachScheduleDraft["kind"] })} aria-label="日程类型">
            {coachEventKinds.map((kind) => (
              <option key={kind.value} value={kind.value}>{kind.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[72px] items-end gap-2 text-sm font-black text-ink-700">
          <input className="mb-3 size-4" type="checkbox" checked={draft.evidenceRequired} onChange={(event) => onChange({ evidenceRequired: event.target.checked })} />
          需要证据
        </label>
      </div>
      <Textarea label="安排原因" value={draft.reason} onChange={(value) => onChange({ reason: value })} placeholder="为什么今天要做这件事。" />
      <button type="button" className="primary-button mt-4" onClick={onSave}>
        <CalendarPlus size={16} aria-hidden="true" />
        {draft.id ? "保存日程" : "新增日程"}
      </button>
      <div className="mt-5 grid gap-3">
        {visibleEvents.map((event) => (
          <div key={event.id} className="rounded-card bg-surface-0 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black text-brand-700">{event.date} {event.start}-{event.end}</p>
                <h3 className="mt-1 text-base font-black text-ink-900">{event.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{event.reason}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="icon-button" aria-label={`编辑日程：${event.title}`} onClick={() => onEdit(event)}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" aria-label={`删除日程：${event.title}`} onClick={() => onDelete(event.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {events.length > 5 ? (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-ink-500">
              {showAll ? `已显示全部 ${events.length} 条日程。` : `还有 ${hiddenCount} 条日程未显示，避免今日页被长列表拖垮。`}
            </p>
            <button type="button" className="secondary-button min-h-10 px-3" onClick={onToggleShowAll}>
              {showAll ? "收起日程" : "查看全部日程"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

import { CalendarPlus, CheckCircle2, Edit3, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { coachEventKinds, type CoachScheduleDraft } from "../../../data/coachAdapter";
import type { CoachScheduleEvent } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

export function SchedulePanel({
  events,
  draft,
  recentlyDeletedEvent,
  onChange,
  onEdit,
  onDelete,
  onUndoDelete,
  onDismissDeletedEvent,
  onSave,
  onCancelEdit,
  showAll,
  onToggleShowAll
}: {
  events: CoachScheduleEvent[];
  draft: CoachScheduleDraft;
  recentlyDeletedEvent: CoachScheduleEvent | null;
  onChange: (patch: Partial<CoachScheduleDraft>) => void;
  onEdit: (event: CoachScheduleEvent) => void;
  onDelete: (eventId: string) => void;
  onUndoDelete: () => void;
  onDismissDeletedEvent: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visibleEvents = showAll ? events : events.slice(0, 5);
  const hiddenCount = Math.max(0, events.length - visibleEvents.length);
  const isEditing = Boolean(draft.id);
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(null);

  return (
    <article className="command-panel">
      <PanelTitle icon={<CalendarPlus size={18} aria-hidden="true" />} title="我的日程" />
      <p className="mt-3 rounded-control bg-surface-0 px-3 py-2 text-sm font-bold leading-6 text-ink-500" role="status" aria-live="polite">
        {isEditing ? `正在编辑「${draft.title || "未命名日程"}」，保存后会更新这条个人日程。` : "新增日程会进入今日页，只展示当前画像自己的行动。"}
      </p>
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="primary-button" onClick={onSave}>
          <CalendarPlus size={16} aria-hidden="true" />
          {isEditing ? "保存日程" : "新增日程"}
        </button>
        {isEditing ? (
          <button type="button" className="secondary-button" onClick={() => {
            setConfirmingEventId(null);
            onCancelEdit();
          }}>
            <XCircle size={16} aria-hidden="true" />
            取消编辑
          </button>
        ) : null}
      </div>
      {recentlyDeletedEvent ? (
        <div className="mt-4 rounded-card border border-success-600/30 bg-success-100 p-3" role="status" aria-live="polite">
          <p className="text-sm font-black leading-6 text-success-600">
            已删除「{recentlyDeletedEvent.title}」个人日程，可立即撤销并恢复到今日页行动和 AI 教练日程上下文。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-success-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
              onClick={() => {
                setConfirmingEventId(null);
                onUndoDelete();
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              撤销删除
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              onClick={() => {
                setConfirmingEventId(null);
                onDismissDeletedEvent();
              }}
            >
              <XCircle size={16} aria-hidden="true" />
              不撤销
            </button>
          </div>
        </div>
      ) : null}
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
                <button type="button" className="icon-button" aria-label={`编辑日程：${event.title}`} onClick={() => {
                  setConfirmingEventId(null);
                  onEdit(event);
                }}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`删除日程：${event.title}`}
                  aria-expanded={confirmingEventId === event.id}
                  aria-controls={`schedule-delete-confirm-${event.id}`}
                  onClick={() => setConfirmingEventId(event.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            {confirmingEventId === event.id ? (
              <div id={`schedule-delete-confirm-${event.id}`} className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3" role="status" aria-live="polite">
                <p className="text-sm font-black leading-6 text-risk-600">
                  确认删除「{event.title}」日程？删除后今日页不再展示这条个人行动，相关 Evidence Gate 不会自动补回。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-4 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                    aria-label={`确认删除日程 ${event.title}`}
                    onClick={() => {
                      setConfirmingEventId(null);
                      onDelete(event.id);
                    }}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    aria-label={`取消删除日程 ${event.title}`}
                    onClick={() => setConfirmingEventId(null)}
                  >
                    <XCircle size={16} aria-hidden="true" />
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {events.length > 5 ? (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-ink-500">
              {showAll ? `已显示全部 ${events.length} 条日程。` : `还有 ${hiddenCount} 条日程未显示，避免今日页被长列表拖垮。`}
            </p>
            <button type="button" className="secondary-button min-h-10 px-3" onClick={() => {
              setConfirmingEventId(null);
              onToggleShowAll();
            }}>
              {showAll ? "收起日程" : "查看全部日程"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

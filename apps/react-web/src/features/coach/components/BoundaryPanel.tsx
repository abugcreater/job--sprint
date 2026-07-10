import { CheckCircle2, Edit3, Lightbulb, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  knowledgeBoundaryLevels,
  type KnowledgeBoundaryDraft
} from "../../../data/coachAdapter";
import type { KnowledgeBoundary } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

export function BoundaryPanel({
  boundaries,
  draft,
  activeProfileReady,
  recentlyDeletedBoundary,
  onChange,
  onEdit,
  onDelete,
  onUndoDelete,
  onDismissDeletedBoundary,
  onSave,
  onCancelEdit
}: {
  boundaries: KnowledgeBoundary[];
  draft: KnowledgeBoundaryDraft;
  activeProfileReady: boolean;
  recentlyDeletedBoundary: KnowledgeBoundary | null;
  onChange: (patch: Partial<KnowledgeBoundaryDraft>) => void;
  onEdit: (boundary: KnowledgeBoundary) => void;
  onDelete: (boundaryId: string) => void;
  onUndoDelete: () => void;
  onDismissDeletedBoundary: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
}) {
  const isEditing = Boolean(draft.id);
  const [confirmingBoundaryId, setConfirmingBoundaryId] = useState<string | null>(null);

  return (
    <article className="command-panel">
      <PanelTitle icon={<Lightbulb size={18} aria-hidden="true" />} title="知识边界" />
      <p className="mt-3 rounded-control bg-surface-0 px-3 py-2 text-sm font-bold leading-6 text-ink-500" role="status" aria-live="polite">
        {isEditing ? `正在编辑「${draft.topic || "未命名边界"}」，保存后会更新这条知识边界。` : "新增边界会进入你的个人画像上下文，后续知识、面试和 AI 建议都会引用。"}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
        <Field label="知识主题" value={draft.topic} onChange={(value) => onChange({ topic: value })} placeholder="MQ 幂等 / Figma 组件 / 接口测试" />
        <label className="block">
          <span className="text-sm font-black text-ink-700">掌握程度</span>
          <select className="field-control mt-2" value={draft.level} onChange={(event) => onChange({ level: event.target.value as KnowledgeBoundaryDraft["level"] })} aria-label="掌握程度">
            {knowledgeBoundaryLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>
      <Textarea label="当前缺口" value={draft.gap} onChange={(value) => onChange({ gap: value })} placeholder="现在讲不清楚的机制、场景、边界或证据。" />
      <Textarea label="已有证据" value={draft.evidence} onChange={(value) => onChange({ evidence: value })} placeholder="笔记、项目、链接、复盘或回答片段。" />
      <Textarea label="岗位用途" value={draft.targetUse} onChange={(value) => onChange({ targetUse: value })} placeholder="它会用于哪类 JD、面试题或简历表达。" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="primary-button" disabled={!activeProfileReady} onClick={onSave}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {isEditing ? "保存边界" : "新增边界"}
        </button>
        {isEditing ? (
          <button type="button" className="secondary-button" onClick={() => {
            setConfirmingBoundaryId(null);
            onCancelEdit();
          }}>
            <XCircle size={16} aria-hidden="true" />
            取消编辑
          </button>
        ) : null}
      </div>
      {recentlyDeletedBoundary ? (
        <div className="mt-4 rounded-card border border-success-600/30 bg-success-100 p-3" role="status" aria-live="polite">
          <p className="text-sm font-black leading-6 text-success-600">
            已删除「{recentlyDeletedBoundary.topic}」知识边界，可立即撤销并恢复到 AI 建议、知识卡和面试训练上下文。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-success-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
              onClick={() => {
                setConfirmingBoundaryId(null);
                onUndoDelete();
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              撤销删除
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              onClick={onDismissDeletedBoundary}
            >
              <XCircle size={16} aria-hidden="true" />
              不撤销
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid gap-3">
        {boundaries.length ? boundaries.map((boundary) => (
          <div key={boundary.id} className="rounded-card bg-surface-0 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="rounded-control bg-white px-2 py-1 text-xs font-black text-ink-500">{boundary.level}</span>
                {boundary.sourceConfidence ? (
                  <span className="ml-2 rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">AI {boundary.sourceConfidence}</span>
                ) : null}
                <h3 className="mt-2 text-base font-black text-ink-900">{boundary.topic}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{boundary.gap}</p>
                {boundary.sourceSummary ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-ink-500">来源摘要：{boundary.sourceSummary}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="icon-button" aria-label={`编辑知识边界：${boundary.topic}`} onClick={() => {
                  setConfirmingBoundaryId(null);
                  onEdit(boundary);
                }}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`删除知识边界：${boundary.topic}`}
                  aria-expanded={confirmingBoundaryId === boundary.id}
                  aria-controls={`boundary-delete-confirm-${boundary.id}`}
                  onClick={() => setConfirmingBoundaryId(boundary.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            {confirmingBoundaryId === boundary.id ? (
              <div id={`boundary-delete-confirm-${boundary.id}`} className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3" role="status" aria-live="polite">
                <p className="text-sm font-black leading-6 text-risk-600">
                  确认删除「{boundary.topic}」知识边界？删除后 AI 建议、知识卡和面试训练不会再引用这条边界。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-4 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                    aria-label={`确认删除知识边界 ${boundary.topic}`}
                    onClick={() => {
                      setConfirmingBoundaryId(null);
                      onDelete(boundary.id);
                    }}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    aria-label={`取消删除知识边界 ${boundary.topic}`}
                    onClick={() => setConfirmingBoundaryId(null)}
                  >
                    <XCircle size={16} aria-hidden="true" />
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )) : (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">暂无知识边界。</p>
        )}
      </div>
    </article>
  );
}

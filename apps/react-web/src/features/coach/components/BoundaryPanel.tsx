import { CheckCircle2, Edit3, Lightbulb, Trash2, XCircle } from "lucide-react";
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
  onChange,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit
}: {
  boundaries: KnowledgeBoundary[];
  draft: KnowledgeBoundaryDraft;
  activeProfileReady: boolean;
  onChange: (patch: Partial<KnowledgeBoundaryDraft>) => void;
  onEdit: (boundary: KnowledgeBoundary) => void;
  onDelete: (boundaryId: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <article className="command-panel">
      <PanelTitle icon={<Lightbulb size={18} aria-hidden="true" />} title="知识边界" />
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
          {draft.id ? "保存边界" : "新增边界"}
        </button>
        {draft.id ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            <XCircle size={16} aria-hidden="true" />
            取消编辑
          </button>
        ) : null}
      </div>
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
                <button type="button" className="icon-button" aria-label={`编辑知识边界：${boundary.topic}`} onClick={() => onEdit(boundary)}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" aria-label={`删除知识边界：${boundary.topic}`} onClick={() => onDelete(boundary.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">暂无知识边界。</p>
        )}
      </div>
    </article>
  );
}

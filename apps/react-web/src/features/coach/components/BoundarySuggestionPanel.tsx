import { CheckCircle2, Edit3, Lightbulb, XCircle, Wand2 } from "lucide-react";
import type { BoundarySuggestionFeedbackSummary } from "../../../data/boundarySuggestionFeedbackAdapter";
import type { BoundarySuggestionDraft } from "../../../data/boundarySuggestionAdapter";
import { PanelTitle } from "./CoachPrimitives";

export function BoundarySuggestionPanel({
  sourceText,
  suggestions,
  feedbackReasons,
  feedbackSummary,
  disabled,
  isGenerating,
  onTextChange,
  onGenerate,
  onAccept,
  onRevise,
  onReject,
  onReasonChange
}: {
  sourceText: string;
  suggestions: BoundarySuggestionDraft[];
  feedbackReasons: Record<string, string>;
  feedbackSummary: BoundarySuggestionFeedbackSummary;
  disabled: boolean;
  isGenerating: boolean;
  onTextChange: (value: string) => void;
  onGenerate: () => void;
  onAccept: (suggestion: BoundarySuggestionDraft) => void;
  onRevise: (suggestion: BoundarySuggestionDraft) => void;
  onReject: (suggestion: BoundarySuggestionDraft) => void;
  onReasonChange: (suggestionId: string, reason: string) => void;
}) {
  return (
    <article className="command-panel">
      <PanelTitle icon={<Wand2 size={18} aria-hidden="true" />} title="AI 提取边界" />
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">
        粘贴 JD、简历片段或面试反馈，AI 只生成候选知识边界；确认后才写入正式边界。
      </p>
      <textarea
        className="field-control mt-4 min-h-28 resize-y leading-6"
        aria-label="边界提取素材"
        value={sourceText}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="例如：JD 要求 MQ、Redis、稳定性，面试官关注故障恢复和线上补偿。"
      />
      <button type="button" className="primary-button mt-3" disabled={disabled || isGenerating} onClick={onGenerate}>
        <Wand2 size={16} aria-hidden="true" />
        {isGenerating ? "提取中" : "提取边界草稿"}
      </button>
      {feedbackSummary.totalCount ? (
        <div className="mt-4 rounded-card bg-surface-0 p-4">
          <p className="text-xs font-black uppercase text-ink-500">候选反馈</p>
          <p className="mt-2 text-sm font-bold leading-6 text-ink-700">
            采纳 {feedbackSummary.acceptedCount}，修订 {feedbackSummary.revisionCount}，不采纳 {feedbackSummary.rejectedCount}，需校准 {feedbackSummary.revisionRateLabel}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-ink-500">{feedbackSummary.nextExtractionHint}</p>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{suggestion.level}</span>
                  <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">{suggestion.confidence}</span>
                </div>
                <h3 className="mt-2 text-base font-black text-ink-900">{suggestion.topic}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{suggestion.gap}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-ink-500">证据：{suggestion.evidence}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-ink-500">用途：{suggestion.targetUse}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-ink-500">来源摘要：{suggestion.sourceSummary}</p>
              </div>
              <div className="grid shrink-0 gap-2 sm:w-56">
                <input
                  className="field-control min-h-10 text-sm"
                  aria-label={`候选反馈原因：${suggestion.topic}`}
                  value={feedbackReasons[suggestion.id] ?? ""}
                  onChange={(event) => onReasonChange(suggestion.id, event.target.value)}
                  placeholder="拒绝或修订原因"
                />
                <button type="button" className="primary-button px-3" aria-label={`采纳边界：${suggestion.topic}`} onClick={() => onAccept(suggestion)}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  采纳边界
                </button>
                <button type="button" className="secondary-button px-3" aria-label={`修订边界：${suggestion.topic}`} onClick={() => onRevise(suggestion)}>
                  <Edit3 size={15} aria-hidden="true" />
                  修订后编辑
                </button>
                <button type="button" className="secondary-button px-3" aria-label={`不采纳边界：${suggestion.topic}`} onClick={() => onReject(suggestion)}>
                  <XCircle size={15} aria-hidden="true" />
                  不采纳
                </button>
              </div>
            </div>
          </div>
        ))}
        {!suggestions.length ? (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">
            <Lightbulb className="mr-1 inline" size={15} aria-hidden="true" />
            暂无候选边界。
          </p>
        ) : null}
      </div>
    </article>
  );
}

import { AlertTriangle, CheckCircle2, PenLine, RefreshCw, RotateCcw, Star, StarOff } from "lucide-react";
import type { InterviewQuestionOption, OralScoreAnalysis } from "../../../data/interviewAdapter";
import { ScoreAnalysisPanel } from "./ScoreAnalysisPanel";

export function InterviewAnswerPanel({
  question,
  answer,
  onAnswerChange,
  onRecord,
  onScore,
  onClear,
  disabled,
  actionHint,
  analysis,
  scoreFeedback,
  rubricDimensions,
  weak,
  onToggleWeak
}: {
  question?: InterviewQuestionOption;
  answer: string;
  onAnswerChange: (value: string) => void;
  onRecord: () => void;
  onScore: () => void;
  onClear: () => void;
  disabled: boolean;
  actionHint: string;
  analysis?: OralScoreAnalysis;
  scoreFeedback: string;
  rubricDimensions: string[];
  weak: boolean;
  onToggleWeak: (questionId: string) => void;
}) {
  const actionHintId = "interview-answer-action-hint";
  const canClear = Boolean(answer.trim());

  return (
    <section className="command-panel border-l-4 border-l-brand-700" aria-labelledby="answer-panel-title">
      <div className="flex items-center gap-2 text-brand-700">
        <PenLine size={18} aria-hidden="true" />
        <h2 id="answer-panel-title" className="text-base font-black text-ink-900">
          回答提示
        </h2>
      </div>
      {question ? (
        <QuestionDetail question={question} weak={weak} onToggleWeak={onToggleWeak} />
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无候选题，请检查题库数据。</p>
      )}

      <label className="mt-5 block">
        <span className="text-sm font-black text-ink-700">我的口述回答</span>
        <textarea
          className="field-control mt-2 min-h-[180px] resize-y p-4 leading-7"
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="先写一版 60 秒口述稿：背景、职责、链路、异常分支、边界和证据。"
        />
      </label>
      <p id={actionHintId} className="mt-3 rounded-control bg-surface-0 px-3 py-2 text-sm font-bold leading-6 text-ink-500" role="status" aria-live="polite">
        {actionHint}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="primary-button disabled:bg-ink-400"
          disabled={disabled}
          aria-describedby={actionHintId}
          onClick={onRecord}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          保存口述证据
        </button>
        <button
          type="button"
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          aria-describedby={actionHintId}
          onClick={onScore}
        >
          <RefreshCw size={16} aria-hidden="true" />
          按规则自检
        </button>
        <button
          type="button"
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canClear}
          aria-describedby={actionHintId}
          onClick={onClear}
        >
          <RotateCcw size={16} aria-hidden="true" />
          清空回答
        </button>
      </div>
      {scoreFeedback ? (
        <p className="mt-3 rounded-control bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700" aria-live="polite">
          {scoreFeedback}
        </p>
      ) : null}

      {analysis ? <ScoreAnalysisPanel analysis={analysis} /> : null}

      <details className="mt-5 rounded-card bg-surface-0">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-black uppercase text-ink-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">查看本地自检维度</summary>
        <ul className="space-y-2 border-t border-line p-4">
          {rubricDimensions.slice(0, 4).map((item) => (
            <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
              <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function InterviewAnswerDiscardChangesDialog({ actionLabel, onContinue, onDiscard }: { actionLabel: string; onContinue: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-900/40 p-4 backdrop-blur-[1px] sm:items-center sm:justify-center" role="presentation">
      <section className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-soft" role="alertdialog" aria-modal="true" aria-labelledby="discard-interview-answer-title" aria-describedby="discard-interview-answer-detail">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warn-100 text-warn-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="discard-interview-answer-title" className="text-lg font-black text-ink-950">放弃未保存的口述回答？</h2>
            <p id="discard-interview-answer-detail" className="mt-2 text-sm font-semibold leading-6 text-ink-600">当前回答尚未写入 Evidence Gate。继续编辑会保留回答和题目上下文；放弃后将{actionLabel}。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="primary-button justify-center" onClick={onContinue}>继续编辑</button>
          <button type="button" className="secondary-button justify-center border-risk-200 text-risk-600 hover:bg-risk-100" onClick={onDiscard}>放弃修改</button>
        </div>
      </section>
    </div>
  );
}

function QuestionDetail({
  question,
  weak,
  onToggleWeak
}: {
  question: InterviewQuestionOption;
  weak: boolean;
  onToggleWeak: (questionId: string) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-brand-700">
            <span>{question.source}</span>
            <span className="rounded-control bg-surface-0 px-2 py-0.5 text-[11px] font-bold text-ink-500">{question.modeLabel}</span>
            {question.isCurrentTask ? <span className="rounded-control bg-success-100 px-2 py-0.5 text-[11px] font-bold text-success-600">今日追问</span> : null}
          </div>
          <p className="mt-2 text-xl font-black leading-8 text-ink-900">{question.question}</p>
        </div>
        <button
          type="button"
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control px-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
            weak ? "bg-warn-100 text-warn-600" : "border border-line bg-white text-ink-700 hover:bg-surface-0"
          }`}
          aria-pressed={weak}
          aria-label={`${weak ? "取消薄弱题标记" : "标记薄弱题"}：${question.question}`}
          onClick={() => onToggleWeak(question.id)}
        >
          {weak ? <StarOff size={16} aria-hidden="true" /> : <Star size={16} aria-hidden="true" />}
          {weak ? "已标记薄弱题" : "标记薄弱题"}
        </button>
      </div>

      <details className="rounded-card bg-surface-0">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-black text-ink-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">查看回答提示、结构与关键词</summary>
        <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
          <section className="border-t border-line pt-3">
            <p className="text-xs font-black uppercase text-ink-500">详情提示</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink-600">{question.hint}</p>
          </section>
          <section className="border-t border-line pt-3">
            <p className="text-xs font-black uppercase text-ink-500">回答结构</p>
            <ol className="mt-2 space-y-1 text-sm font-semibold leading-6 text-ink-600">
              <li>1. 先给结论和适用边界。</li>
              <li>2. 再讲项目链路、异常分支和取舍。</li>
              <li>3. 最后落到指标、证据和复盘动作。</li>
            </ol>
          </section>
          <section className="border-t border-line pt-3 md:col-span-2">
            <p className="text-xs font-black uppercase text-ink-500">预期关键词</p>
            <KeywordRow keywords={question.expectedKeywords} />
          </section>
        </div>
      </details>
    </div>
  );
}

function KeywordRow({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {keywords.slice(0, 8).map((keyword) => (
        <span key={keyword} className="rounded-control bg-surface-0 px-2.5 py-1 text-xs font-bold text-ink-500">
          {keyword}
        </span>
      ))}
    </div>
  );
}

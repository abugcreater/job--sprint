import { Gauge } from "lucide-react";
import type { AiFeedbackSummary } from "../../../data/aiFeedbackAdapter";
import { PanelTitle } from "./CoachPrimitives";

export function AiFeedbackPanel({ summary }: { summary: AiFeedbackSummary }) {
  return (
    <article className="command-panel">
      <PanelTitle icon={<Gauge size={18} aria-hidden="true" />} title="AI 反馈复盘" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FeedbackMetric label="已反馈" value={`${summary.reviewedCount} 条`} />
        <FeedbackMetric label="采纳率" value={summary.acceptanceRateLabel} />
        <FeedbackMetric label="采纳日程完成" value={summary.acceptedOutcomeRateLabel} />
        <FeedbackMetric label="执行判断" value={summary.outcomeLabel} />
        <FeedbackMetric label="质量判断" value={summary.qualityLabel} />
      </div>
      <div className="mt-4 rounded-card bg-surface-0 p-4">
        <p className="text-sm font-black text-ink-900">下一轮提示校准</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">{summary.nextPromptHint}</p>
      </div>
      {summary.topRejectedTypes.length || summary.recentRejectionReasons.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-sm font-black text-ink-900">高频拒绝类型</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.topRejectedTypes.length ? summary.topRejectedTypes.map((item) => (
                <span key={item.type} className="rounded-control bg-risk-100 px-2 py-1 text-xs font-black text-risk-600">
                  {item.label} {item.count}
                </span>
              )) : (
                <span className="text-sm font-semibold text-ink-500">暂无被拒类型。</span>
              )}
            </div>
          </div>
          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-sm font-black text-ink-900">最近拒绝原因</p>
            {summary.recentRejectionReasons.length ? (
              <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-ink-500">
                {summary.recentRejectionReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold text-ink-500">暂无拒绝原因。</p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FeedbackMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <p className="text-[11px] font-black text-ink-500">{label}</p>
      <p className="mt-1 text-base font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

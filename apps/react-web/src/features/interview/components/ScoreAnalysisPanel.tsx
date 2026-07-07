import { CheckCircle2 } from "lucide-react";
import type { OralScoreAnalysis } from "../../../data/interviewAdapter";

export function ScoreAnalysisPanel({ analysis }: { analysis: OralScoreAnalysis }) {
  return (
    <section className="mt-4 rounded-card border border-brand-100 bg-brand-100/40 p-4" aria-label="AI评分结果">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-control bg-brand-700 px-3 py-1 text-sm font-black text-white">{analysis.score} 分</span>
        <span className="rounded-control bg-white px-3 py-1 text-sm font-black text-brand-700">{analysis.level}</span>
        <span className="rounded-control bg-white px-3 py-1 text-xs font-bold text-ink-500">本地规则版</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-ink-800">{analysis.summary}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ScoreList title="强项" items={analysis.strengths} tone="success" />
        <ScoreList title="欠缺" items={analysis.gaps} tone="warn" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-black uppercase text-ink-500">建议追问</p>
        <ol className="mt-2 space-y-2">
          {analysis.nextQuestions.slice(0, 3).map((item, index) => (
            <li key={item} className="text-sm font-bold leading-6 text-ink-700">
              {index + 1}. {item}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScoreList({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warn" }) {
  const iconTone = tone === "success" ? "text-success-600" : "text-warn-600";
  return (
    <section className="rounded-card bg-white p-3">
      <p className="text-xs font-black uppercase text-ink-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
            <CheckCircle2 className={`mt-0.5 shrink-0 ${iconTone}`} size={15} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

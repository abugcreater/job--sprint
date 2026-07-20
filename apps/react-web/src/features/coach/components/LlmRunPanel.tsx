import { useState } from "react";
import { History } from "lucide-react";
import { diagnoseLlmRun } from "../../../data/llmRunDiagnosis";
import type { LlmRun } from "../../../types/sprint";
import { PanelTitle } from "./CoachPrimitives";

export function LlmRunPanel({ runs }: { runs: LlmRun[] }) {
  const [showAllRuns, setShowAllRuns] = useState(false);
  const visibleRuns = showAllRuns ? runs : runs.slice(0, 5);
  const hiddenCount = Math.max(0, runs.length - visibleRuns.length);

  return (
    <article className="command-panel">
      <PanelTitle icon={<History size={18} aria-hidden="true" />} title="AI 运行记录" />
      <div className="mt-4 grid gap-3">
        {visibleRuns.length ? visibleRuns.map((run) => {
          const diagnosis = diagnoseLlmRun(run);
          return (
            <div key={run.id} className="rounded-card border border-line bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-control px-2 py-1 text-xs font-black ${diagnosis.tone === "risk" ? "bg-risk-100 text-risk-600" : diagnosis.tone === "success" ? "bg-success-100 text-success-600" : "bg-brand-100 text-brand-700"}`}>{diagnosis.label}</span>
                <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">{run.provider}</span>
                <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">schema {run.schemaStatus}</span>
              </div>
              <p className="mt-3 text-sm font-black text-ink-900">{run.promptVersion} · {run.artifactCount} 条草稿</p>
              <p className="mt-1 break-words text-xs font-bold leading-5 text-ink-500">
                {run.model ? `模型：${run.model} · ` : ""}输入摘要：{run.inputSummaryHash}
              </p>
              <div className={`mt-3 rounded-card p-3 text-sm font-bold leading-6 ${diagnosis.tone === "risk" ? "bg-risk-100 text-risk-600" : "bg-surface-100 text-ink-600"}`}>
                <p>诊断：{diagnosis.title}</p>
                <p className="mt-1">{diagnosis.detail}</p>
                <p className="mt-1">恢复动作：{diagnosis.nextAction}</p>
              </div>
              {run.warning ? <p className="mt-2 text-xs font-bold text-ink-500">原始降级码：{run.warning}</p> : null}
              {run.error ? <p className="mt-2 text-sm font-bold text-risk-600">错误：{run.error}</p> : null}
            </div>
          );
        }) : (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">暂无 AI 运行记录。生成草稿后会记录 provider、schema 和 fallback 状态。</p>
        )}
        {runs.length > 5 ? (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-ink-500">
              {showAllRuns ? `已显示全部 ${runs.length} 条 AI 运行记录。` : `还有 ${hiddenCount} 条 AI 运行记录未显示，先看最近生成和降级状态。`}
            </p>
            <button type="button" className="secondary-button min-h-10 px-3" onClick={() => setShowAllRuns((current) => !current)}>
              {showAllRuns ? "收起运行记录" : "查看全部运行记录"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

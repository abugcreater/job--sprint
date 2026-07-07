import { History } from "lucide-react";
import type { LlmRun } from "../../../types/sprint";
import { PanelTitle } from "./CoachPrimitives";

export function LlmRunPanel({ runs }: { runs: LlmRun[] }) {
  const visibleRuns = runs.slice(0, 5);
  return (
    <article className="command-panel">
      <PanelTitle icon={<History size={18} aria-hidden="true" />} title="AI 运行记录" />
      <div className="mt-4 grid gap-3">
        {visibleRuns.length ? visibleRuns.map((run) => (
          <div key={run.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{run.status}</span>
              <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">{run.provider}</span>
              <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">schema {run.schemaStatus}</span>
            </div>
            <p className="mt-3 text-sm font-black text-ink-900">{run.promptVersion} · {run.artifactCount} 条草稿</p>
            <p className="mt-1 break-words text-xs font-bold leading-5 text-ink-500">
              {run.model ? `模型：${run.model} · ` : ""}输入摘要：{run.inputSummaryHash}
            </p>
            {run.warning ? <p className="mt-2 text-sm font-bold text-risk-600">降级原因：{run.warning}</p> : null}
            {run.error ? <p className="mt-2 text-sm font-bold text-risk-600">错误：{run.error}</p> : null}
          </div>
        )) : (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">暂无 AI 运行记录。生成草稿后会记录 provider、schema 和 fallback 状态。</p>
        )}
      </div>
    </article>
  );
}

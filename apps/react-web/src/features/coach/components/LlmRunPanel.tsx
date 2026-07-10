import { useState } from "react";
import { History } from "lucide-react";
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

function diagnoseLlmRun(run: LlmRun): { label: string; title: string; detail: string; nextAction: string; tone: "success" | "neutral" | "risk" } {
  if (run.warning === "server_unavailable") {
    return {
      label: "本地模式",
      title: "本地前端未连接后端 AI API",
      detail: "当前页面已用本地规则生成草稿，不代表远端大模型或 provider 本身失败。",
      nextAction: "用服务端 runtime 或远端环境复验 /api/coach/artifacts。",
      tone: "neutral"
    };
  }
  if (run.schemaStatus === "failed") {
    return {
      label: "Schema 失败",
      title: "模型响应未通过结构校验",
      detail: "服务端或 provider 有响应，但返回内容不能安全写入 AI 草稿。",
      nextAction: "检查 schema、prompt version 和服务端 llm_runs 日志。",
      tone: "risk"
    };
  }
  if (run.status === "success") {
    return {
      label: "成功",
      title: "真实 provider 生成成功",
      detail: "本次运行通过服务端 AI 接口生成，并通过 schema 校验。",
      nextAction: "继续查看采纳率和采纳后完成率。",
      tone: "success"
    };
  }
  if (run.status === "failed" || run.error) {
    return {
      label: "失败",
      title: "AI 运行失败",
      detail: "本次没有可用草稿，需要检查接口、provider 配置或服务端日志。",
      nextAction: "查看错误码并复跑服务端 AI smoke。",
      tone: "risk"
    };
  }
  return {
    label: "降级",
    title: run.provider === "local-fallback" ? "本地规则降级" : "服务端规则降级",
    detail: "系统生成了可用草稿，但不是一次完整的真实模型成功运行。",
    nextAction: "需要真实模型质量时，用已配置 provider 的服务端环境复验。",
    tone: "neutral"
  };
}

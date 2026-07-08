import { CheckCircle2, CircleAlert, Edit3, Sparkles } from "lucide-react";
import type { buildCoachDashboard } from "../../../data/coachAdapter";
import type { AiArtifact } from "../../../types/sprint";
import { PanelTitle } from "./CoachPrimitives";

export function ArtifactPanel({
  readiness,
  artifacts,
  artifactEdits,
  rejectionReasons,
  isGenerating,
  onGenerate,
  onEditDraft,
  onSaveEdit,
  onAccept,
  onReject,
  onReasonChange,
  showAll,
  onToggleShowAll
}: {
  readiness: ReturnType<typeof buildCoachDashboard>["readiness"];
  artifacts: AiArtifact[];
  artifactEdits: Record<string, Pick<AiArtifact, "title" | "body">>;
  rejectionReasons: Record<string, string>;
  isGenerating: boolean;
  onGenerate: () => void;
  onEditDraft: (artifact: AiArtifact, patch: Partial<Pick<AiArtifact, "title" | "body">>) => void;
  onSaveEdit: (artifact: AiArtifact) => void;
  onAccept: (artifact: AiArtifact) => void;
  onReject: (artifact: AiArtifact) => void;
  onReasonChange: (artifactId: string, reason: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const visibleArtifacts = showAll ? artifacts : artifacts.slice(0, 8);
  const hiddenCount = Math.max(0, artifacts.length - visibleArtifacts.length);
  return (
    <article className="command-panel">
      <PanelTitle icon={<Sparkles size={18} aria-hidden="true" />} title="AI 建议" />
      <div className="mt-4 rounded-card bg-surface-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-ink-900">{readiness.label}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{readiness.detail}</p>
          </div>
          <button type="button" className="primary-button shrink-0" disabled={isGenerating} onClick={onGenerate}>
            <Sparkles size={16} aria-hidden="true" />
            {isGenerating ? "生成中" : "生成 AI 建议"}
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {artifacts.length ? visibleArtifacts.map((artifact) => {
          const edit = artifactEdits[artifact.id] ?? { title: artifact.title, body: artifact.body };
          return (
            <div key={artifact.id} className="rounded-card border border-line bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-control bg-brand-100 px-2 py-1 text-xs font-black text-brand-700">{artifact.type}</span>
                    <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">{artifact.status}</span>
                    <span className="rounded-control bg-surface-0 px-2 py-1 text-xs font-black text-ink-500">{artifact.confidence}</span>
                  </div>
                  <input
                    className="field-control mt-3 font-black"
                    aria-label={`AI 建议标题：${artifact.title}`}
                    value={edit.title}
                    onChange={(event) => onEditDraft(artifact, { title: event.target.value })}
                  />
                  <textarea
                    className="field-control mt-3 min-h-24 resize-y leading-6"
                    aria-label={`AI 建议内容：${artifact.title}`}
                    value={edit.body}
                    onChange={(event) => onEditDraft(artifact, { body: event.target.value })}
                  />
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">原因：{artifact.reason}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink-500">来源：{artifact.sources.join("；") || "unknown"}</p>
                  {artifact.rejectionReason ? <p className="mt-2 text-sm font-bold text-risk-600">拒绝原因：{artifact.rejectionReason}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <button type="button" className="secondary-button min-h-10 px-3" onClick={() => onSaveEdit(artifact)}>
                    <Edit3 size={15} aria-hidden="true" />
                    保存编辑
                  </button>
                  <button type="button" className="primary-button min-h-10 px-3" aria-label={`接受 AI 建议：${artifact.title}`} disabled={artifact.status === "accepted"} onClick={() => onAccept(artifact)}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    接受
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="field-control"
                  aria-label={`拒绝原因：${artifact.title}`}
                  value={rejectionReasons[artifact.id] ?? ""}
                  onChange={(event) => onReasonChange(artifact.id, event.target.value)}
                  placeholder="不采纳的原因"
                />
                <button type="button" className="secondary-button min-h-11 px-3" aria-label={`拒绝 AI 建议：${artifact.title}`} disabled={artifact.status === "accepted" || artifact.status === "rejected"} onClick={() => onReject(artifact)}>
                  <CircleAlert size={15} aria-hidden="true" />
                  拒绝
                </button>
              </div>
            </div>
          );
        }) : (
          <p className="rounded-card bg-surface-0 p-4 text-sm font-semibold text-ink-500">暂无 AI 建议。</p>
        )}
        {artifacts.length > 8 ? (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-ink-500">
              {showAll ? `已显示全部 ${artifacts.length} 条 AI 建议。` : `还有 ${hiddenCount} 条 AI 建议未显示，先处理最靠前的建议。`}
            </p>
            <button type="button" className="secondary-button min-h-10 px-3" onClick={onToggleShowAll}>
              {showAll ? "收起 AI 建议" : "查看全部 AI 建议"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

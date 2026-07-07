import { ArrowRight, CheckCircle2, Circle, ClipboardCheck, LogIn } from "lucide-react";
import type { CoachFirstLoginFlow, CoachFirstLoginStep } from "../../../data/coachFirstLoginFlowAdapter";
import { PanelTitle } from "./CoachPrimitives";

export function FirstLoginFlowPanel({
  flow,
  isGenerating,
  isRecordingInsight,
  onGenerate,
  onRecordInsight
}: {
  flow: CoachFirstLoginFlow;
  isGenerating: boolean;
  isRecordingInsight: boolean;
  onGenerate: () => void;
  onRecordInsight: () => void;
}) {
  const nextStep = flow.nextStep;
  const handlePrimaryAction = () => {
    if (!nextStep) return;
    if (nextStep.id === "ai_review" && nextStep.actionLabel === "生成 AI 草稿") {
      onGenerate();
      return;
    }
    scrollToTarget(nextStep.targetId);
  };

  return (
    <article className="command-panel border-brand-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <PanelTitle icon={<LogIn size={18} aria-hidden="true" />} title="邀请制首登编排" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">{flow.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip bg-brand-100 text-brand-700">{flow.progressLabel}</span>
          <button type="button" className="secondary-button min-h-10 px-3" disabled={isRecordingInsight} onClick={onRecordInsight}>
            <ClipboardCheck size={15} aria-hidden="true" />
            {isRecordingInsight ? "记录中" : "记录首登观察"}
          </button>
          {nextStep ? (
            <button type="button" className="primary-button min-h-10 px-3" disabled={isGenerating} onClick={handlePrimaryAction}>
              <ArrowRight size={15} aria-hidden="true" />
              {isGenerating && nextStep.id === "ai_review" ? "生成中" : nextStep.actionLabel}
            </button>
          ) : (
            <span className="status-chip bg-success-100 text-success-600">首登完成</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
        <span className="status-chip border border-line bg-white text-ink-700">首登完成率 {flow.insight.completionRateLabel}</span>
        <span className="status-chip border border-line bg-white text-ink-700">当前放弃点 {flow.insight.dropOffLabel}</span>
        <span className="status-chip border border-line bg-white text-ink-700">首登风险 {flow.insight.riskLabel}</span>
        <span className="status-chip border border-line bg-white text-ink-700">下一步 {flow.insight.nextActionLabel}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {flow.steps.map((step) => (
          <FirstLoginStepCard key={step.id} step={step} />
        ))}
      </div>
    </article>
  );
}

function FirstLoginStepCard({ step }: { step: CoachFirstLoginStep }) {
  const done = step.status === "done";
  return (
    <button
      type="button"
      className={`min-h-32 rounded-card border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
        done ? "border-success-100 bg-success-100/60" : "border-line bg-surface-0 hover:border-brand-600"
      }`}
      onClick={() => scrollToTarget(step.targetId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-ink-900">{step.label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">{step.detail}</p>
        </div>
        {done ? (
          <CheckCircle2 className="shrink-0 text-success-600" size={18} aria-hidden="true" />
        ) : (
          <Circle className="shrink-0 text-ink-400" size={18} aria-hidden="true" />
        )}
      </div>
    </button>
  );
}

function scrollToTarget(targetId: string) {
  const target = document.getElementById(targetId);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

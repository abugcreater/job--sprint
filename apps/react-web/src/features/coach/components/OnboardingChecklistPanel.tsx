import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { CoachSetupChecklist, CoachSetupStep } from "../../../data/coachSetupChecklistAdapter";
import { PanelTitle } from "./CoachPrimitives";

export function OnboardingChecklistPanel({
  checklist,
  isGenerating,
  onGenerate
}: {
  checklist: CoachSetupChecklist;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const nextStep = checklist.nextStep;
  const handlePrimaryAction = () => {
    if (!nextStep) return;
    if (nextStep.id === "ai_review" && nextStep.actionLabel === "生成草稿") {
      onGenerate();
      return;
    }
    scrollToTarget(nextStep.targetId);
  };

  return (
    <article className="command-panel border-brand-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <PanelTitle icon={<Sparkles size={18} aria-hidden="true" />} title="首次配置" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">{checklist.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip bg-brand-100 text-brand-700">{checklist.progressLabel}</span>
          {nextStep ? (
            <button type="button" className="primary-button min-h-10 px-3" disabled={isGenerating} onClick={handlePrimaryAction}>
              <ArrowRight size={15} aria-hidden="true" />
              {isGenerating && nextStep.id === "ai_review" ? "生成中" : nextStep.actionLabel}
            </button>
          ) : (
            <span className="status-chip bg-success-100 text-success-600">初始化完成</span>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {checklist.steps.map((step) => (
          <SetupStepCard key={step.id} step={step} />
        ))}
      </div>
    </article>
  );
}

function SetupStepCard({ step }: { step: CoachSetupStep }) {
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
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
        <div className={done ? "h-full rounded-full bg-success-600" : "h-full rounded-full bg-brand-700"} style={{ width: `${Math.round((step.current / step.target) * 100)}%` }} />
      </div>
    </button>
  );
}

function scrollToTarget(targetId: string) {
  const target = document.getElementById(targetId);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

import { BookOpenCheck, CalendarCheck2, Check, Sparkles, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CoachStageId = "profile" | "boundaries" | "plan" | "advice";

type CoachStage = {
  id: CoachStageId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
};

const coachStages: CoachStage[] = [
  { id: "profile", label: "画像阶段", shortLabel: "画像", description: "确认目标与真实经历", icon: UserRound },
  { id: "boundaries", label: "知识边界阶段", shortLabel: "知识边界", description: "确认会什么与缺什么", icon: BookOpenCheck },
  { id: "plan", label: "今日计划阶段", shortLabel: "今日计划", description: "生成唯一可执行行动", icon: CalendarCheck2 },
  { id: "advice", label: "AI 建议阶段", shortLabel: "AI 建议", description: "接受、修订或拒绝建议", icon: Sparkles }
];

export function CoachStageNavigation({
  activeStage,
  completedStages,
  progressLabel,
  nextActionLabel,
  isRecording,
  onStageChange,
  onRecordProgress
}: {
  activeStage: CoachStageId;
  completedStages: Record<CoachStageId, boolean>;
  progressLabel: string;
  nextActionLabel: string;
  isRecording: boolean;
  onStageChange: (stage: CoachStageId) => void;
  onRecordProgress: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-workbench border border-line bg-white shadow-soft" aria-labelledby="coach-stage-title">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div>
          <p id="coach-stage-title" className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">准备路径</p>
          <p className="mt-1 text-sm font-black text-ink-950">{progressLabel}</p>
        </div>
        <button type="button" className="secondary-button min-h-11 self-start px-3 text-xs md:self-auto" disabled={isRecording} onClick={onRecordProgress}>
          {isRecording ? "记录中" : "记录建档进度"}
        </button>
      </div>
      <nav className="grid grid-cols-2 md:grid-cols-4" aria-label="准备阶段">
        {coachStages.map((stage, index) => {
          const Icon = stage.icon;
          const active = stage.id === activeStage;
          const complete = completedStages[stage.id];
          return (
            <button
              key={stage.id}
              type="button"
              className={`relative min-h-[92px] border-b border-r border-line px-4 py-4 text-left transition focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600 md:border-b-0 ${
                active ? "bg-ink-950 text-white" : "bg-white text-ink-900 hover:bg-surface-0"
              }`}
              aria-current={active ? "step" : undefined}
              aria-label={stage.label}
              onClick={() => onStageChange(stage.id)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`grid size-8 place-items-center rounded-control ${active ? "bg-white/10 text-brand-100" : complete ? "bg-success-100 text-success-600" : "bg-surface-0 text-ink-500"}`}>
                  {complete ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                </span>
                <span className={`text-[10px] font-black ${active ? "text-ink-300" : "text-ink-400"}`}>{String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="mt-3 block text-sm font-black">{stage.shortLabel}</span>
              <span className={`mt-1 block text-xs font-semibold leading-5 ${active ? "text-ink-300" : "text-ink-500"}`}>{stage.description}</span>
            </button>
          );
        })}
      </nav>
      <p className="border-t border-line bg-surface-0 px-4 py-3 text-xs font-bold leading-5 text-ink-600 md:px-5">
        下一步：<span className="font-black text-ink-950">{nextActionLabel}</span>
      </p>
    </section>
  );
}

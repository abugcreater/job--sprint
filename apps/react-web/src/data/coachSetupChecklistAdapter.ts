import type { AiArtifact, CoachScheduleEvent, KnowledgeBoundary, UserProfile } from "../types/sprint";

export type CoachSetupStepId = "profile" | "boundaries" | "schedule" | "ai_review";
export type CoachSetupStepStatus = "done" | "todo";

export interface CoachSetupStep {
  id: CoachSetupStepId;
  label: string;
  detail: string;
  actionLabel: string;
  targetId: string;
  status: CoachSetupStepStatus;
  current: number;
  target: number;
}

export interface CoachSetupChecklist {
  status: "ready" | "in_progress";
  summary: string;
  progressLabel: string;
  completedCount: number;
  totalCount: number;
  nextStep?: CoachSetupStep;
  steps: CoachSetupStep[];
}

export function buildCoachSetupChecklist({
  activeProfile,
  boundaries,
  scheduleEvents,
  artifacts
}: {
  activeProfile?: UserProfile;
  boundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  artifacts: AiArtifact[];
}): CoachSetupChecklist {
  const profileReady = Boolean(
    activeProfile &&
      clean(activeProfile.targetRole) &&
      clean(activeProfile.experienceSummary) &&
      clean(activeProfile.nonClaims) &&
      activeProfile.dailyMinutes > 0
  );
  const reviewedArtifacts = artifacts.filter((artifact) => artifact.status === "accepted" || artifact.status === "rejected").length;
  const steps: CoachSetupStep[] = [
    setupStep("profile", "目标画像", activeProfile ? `${activeProfile.targetRole || activeProfile.roleFamily} · ${activeProfile.dailyMinutes} 分钟/天` : "未保存目标岗位和时间投入", activeProfile ? "检查画像" : "填写画像", "coach-profile", profileReady ? 1 : 0, 1),
    setupStep("boundaries", "知识边界", `${Math.min(boundaries.length, 3)}/3 条可引用边界`, boundaries.length ? "补齐边界" : "添加边界", "coach-boundaries", Math.min(boundaries.length, 3), 3),
    setupStep("schedule", "个人日程", `${Math.min(scheduleEvents.length, 1)}/1 条今日安排`, scheduleEvents.length ? "检查日程" : "添加日程", "coach-schedule", Math.min(scheduleEvents.length, 1), 1),
    setupStep("ai_review", "AI 草稿确认", `${Math.min(reviewedArtifacts, 1)}/1 条已接受或拒绝`, artifacts.length ? "处理草稿" : "生成草稿", "coach-artifacts", Math.min(reviewedArtifacts, 1), 1)
  ];
  const completedCount = steps.filter((step) => step.status === "done").length;
  const totalCount = steps.length;
  const nextStep = steps.find((step) => step.status === "todo");
  return {
    status: completedCount === totalCount ? "ready" : "in_progress",
    summary: nextStep ? `还差 ${totalCount - completedCount} 项，下一步处理「${nextStep.label}」。` : "初始化完成，后续 AI 建议会基于你的画像、边界和日程持续迭代。",
    progressLabel: `${completedCount}/${totalCount}`,
    completedCount,
    totalCount,
    nextStep,
    steps
  };
}

function setupStep(id: CoachSetupStepId, label: string, detail: string, actionLabel: string, targetId: string, current: number, target: number): CoachSetupStep {
  return {
    id,
    label,
    detail,
    actionLabel,
    targetId,
    status: current >= target ? "done" : "todo",
    current,
    target
  };
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

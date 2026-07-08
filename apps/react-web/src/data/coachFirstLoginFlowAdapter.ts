import type { AiArtifact, CoachScheduleEvent, KnowledgeBoundary, SyncState, UserProfile } from "../types/sprint";

export type CoachFirstLoginStepId = "account_scope" | "profile_template" | "material_boundary" | "first_schedule" | "ai_review";
export type CoachFirstLoginStepStatus = "done" | "todo";

export interface CoachFirstLoginStep {
  id: CoachFirstLoginStepId;
  label: string;
  detail: string;
  actionLabel: string;
  targetId: string;
  status: CoachFirstLoginStepStatus;
}

export interface CoachFirstLoginFlow {
  status: "ready" | "in_progress";
  summary: string;
  progressLabel: string;
  insight: CoachFirstLoginInsight;
  nextStep?: CoachFirstLoginStep;
  steps: CoachFirstLoginStep[];
}

export interface CoachFirstLoginInsight {
  completionRate: number;
  completionRateLabel: string;
  dropOffLabel: string;
  riskLabel: string;
  nextActionLabel: string;
}

export function buildCoachFirstLoginFlow({
  syncState,
  activeProfile,
  boundaries,
  scheduleEvents,
  artifacts
}: {
  syncState: SyncState;
  activeProfile?: UserProfile;
  boundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  artifacts: AiArtifact[];
}): CoachFirstLoginFlow {
  const reviewedArtifacts = artifacts.filter((artifact) => artifact.status === "accepted" || artifact.status === "rejected").length;
  const profileReady = Boolean(activeProfile?.targetRole.trim() && activeProfile.experienceSummary.trim() && activeProfile.nonClaims.trim() && activeProfile.dailyMinutes > 0);
  const steps: CoachFirstLoginStep[] = [
    step("account_scope", "账号状态", accountDetail(syncState), "查看账号状态", "coach-profile", accountReady(syncState)),
    step("profile_template", "求职画像", profileReady ? `${activeProfile?.targetRole} · ${activeProfile?.dailyMinutes} 分钟/天` : "导入简历或手动补齐画像", "导入简历", profileReady ? "coach-profile" : "coach-quick-init", profileReady),
    step("material_boundary", "知识边界", `${Math.min(boundaries.length, 3)}/3 条建议边界`, boundaries.length >= 3 ? "检查边界" : "导入素材", boundaries.length >= 3 ? "coach-boundaries" : "coach-quick-init", boundaries.length >= 3),
    step("first_schedule", "今日行动", `${Math.min(scheduleEvents.length, 1)}/1 条今日安排`, scheduleEvents.length ? "检查日程" : "生成行动", scheduleEvents.length ? "coach-schedule" : "coach-quick-init", scheduleEvents.length > 0),
    step("ai_review", "AI 建议确认", `${Math.min(reviewedArtifacts, 1)}/1 条已处理`, artifacts.length ? "处理建议" : "生成 AI 建议", "coach-artifacts", reviewedArtifacts > 0)
  ];
  const completedCount = steps.filter((item) => item.status === "done").length;
  const nextStep = steps.find((item) => item.status === "todo");
  return {
    status: nextStep ? "in_progress" : "ready",
    summary: nextStep ? `建档还差 ${steps.length - completedCount} 项，下一步是「${nextStep.label}」。` : "建档已完成，可以进入日常 AI 教练迭代。",
    progressLabel: `${completedCount}/${steps.length}`,
    insight: buildInsight(completedCount, steps.length, nextStep),
    nextStep,
    steps
  };
}

function buildInsight(completedCount: number, totalCount: number, nextStep?: CoachFirstLoginStep): CoachFirstLoginInsight {
  const completionRate = Math.round((completedCount / totalCount) * 100);
  return {
    completionRate,
    completionRateLabel: `${completionRate}%`,
    dropOffLabel: nextStep ? nextStep.label : "无待办",
    riskLabel: riskLabel(nextStep?.id),
    nextActionLabel: nextStep ? nextStep.actionLabel : "进入日常迭代"
  };
}

function step(id: CoachFirstLoginStepId, label: string, detail: string, actionLabel: string, targetId: string, done: boolean): CoachFirstLoginStep {
  return {
    id,
    label,
    detail,
    actionLabel,
    targetId,
    status: done ? "done" : "todo"
  };
}

function accountReady(syncState: SyncState): boolean {
  return syncState === "online" || syncState === "local_fallback";
}

function riskLabel(stepId?: CoachFirstLoginStepId): string {
  if (!stepId) return "无风险";
  if (stepId === "account_scope" || stepId === "profile_template") return "高风险";
  if (stepId === "material_boundary") return "中风险";
  return "低风险";
}

function accountDetail(syncState: SyncState): string {
  if (syncState === "online") return "账号已连接，记录会自动保存。";
  if (syncState === "local_fallback") return "当前可本地记录，稍后可导出备份。";
  if (syncState === "syncing") return "正在同步账号数据，暂缓写入关键记录。";
  if (syncState === "conflict") return "存在同步冲突，先备份数据再继续。";
  return "同步失败，先保留本地记录并等待恢复。";
}

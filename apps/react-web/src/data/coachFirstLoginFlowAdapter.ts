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
    step("account_scope", "账号与数据域", accountDetail(syncState), "查看账号状态", "coach-profile", accountReady(syncState)),
    step("profile_template", "首登画像模板", profileReady ? `${activeProfile?.targetRole} · ${activeProfile?.dailyMinutes} 分钟/天` : "套用角色族模板并保存目标画像", "进入首登模板", profileReady ? "coach-profile" : "coach-quick-init", profileReady),
    step("material_boundary", "批量素材与边界", `${Math.min(boundaries.length, 3)}/3 条初始化边界`, boundaries.length >= 3 ? "检查边界" : "导入素材", boundaries.length >= 3 ? "coach-boundaries" : "coach-quick-init", boundaries.length >= 3),
    step("first_schedule", "首条个人日程", `${Math.min(scheduleEvents.length, 1)}/1 条今日安排`, scheduleEvents.length ? "检查日程" : "生成日程", scheduleEvents.length ? "coach-schedule" : "coach-quick-init", scheduleEvents.length > 0),
    step("ai_review", "首条 AI 草稿确认", `${Math.min(reviewedArtifacts, 1)}/1 条已接受或拒绝`, artifacts.length ? "处理草稿" : "生成 AI 草稿", "coach-artifacts", reviewedArtifacts > 0)
  ];
  const completedCount = steps.filter((item) => item.status === "done").length;
  const nextStep = steps.find((item) => item.status === "todo");
  return {
    status: nextStep ? "in_progress" : "ready",
    summary: nextStep ? `邀请制首登还差 ${steps.length - completedCount} 项，下一步是「${nextStep.label}」。` : "首登闭环已完成，可以进入日常 AI 教练迭代。",
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
    dropOffLabel: nextStep ? nextStep.label : "无放弃点",
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
  if (syncState === "online") return "服务端账号已连接，按当前数据域写入。";
  if (syncState === "local_fallback") return "本地试用数据域可写，适合邀请账号首登演练。";
  if (syncState === "syncing") return "正在同步账号数据，暂缓写入关键首登记录。";
  if (syncState === "conflict") return "存在同步冲突，先处理数据域再继续首登。";
  return "同步失败，先保留本地记录并等待恢复。";
}

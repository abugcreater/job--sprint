import type {
  AiArtifact,
  CoachConfidence,
  CoachScheduleEvent,
  CoachScheduleEventKind,
  DailySprint,
  KnowledgeBoundary,
  KnowledgeBoundaryLevel,
  LlmRun, ProfileRoleFamily, UserProfile
} from "../types/sprint";
import { buildAcceptedAiScheduleOutcomes, summarizeAiFeedback, type AiFeedbackSummary } from "./aiFeedbackAdapter";
import { roleFamilyLabel } from "./coachConstantsAdapter";
import { cleanText as clean, newEntityId, normalizeCoachConfidence as normalizeConfidence, optionalCleanText as optionalClean } from "./coachEntityAdapter";
import { buildCoachOutcomeMetrics, type CoachOutcomeMetrics, type EvidenceByTaskId } from "./coachOutcomeMetricsAdapter";
import { buildCoachSetupChecklist, type CoachSetupChecklist } from "./coachSetupChecklistAdapter";
import { buildOpportunityCoachContext, type OpportunitySignal } from "./opportunitySignalsAdapter";
import { roleFamilyPlaybookFor, roleFamilyQuestionBank } from "./roleFamilyPlaybook";

export { coachEventKinds, knowledgeBoundaryLevels, profileRoleFamilies, roleFamilyLabel } from "./coachConstantsAdapter";

export interface CoachDashboard {
  activeProfile?: UserProfile;
  profiles: UserProfile[];
  boundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  artifacts: AiArtifact[];
  llmRuns: LlmRun[];
  draftArtifacts: AiArtifact[];
  acceptedArtifacts: AiArtifact[];
  rejectedArtifacts: AiArtifact[];
  feedbackSummary: AiFeedbackSummary;
  outcomeMetrics: CoachOutcomeMetrics;
  readiness: {
    status: "ready" | "needs_profile" | "needs_boundary";
    label: string;
    detail: string;
  };
  setupChecklist: CoachSetupChecklist;
  metrics: {
    profileCount: number;
    boundaryCount: number;
    scheduleEventCount: number;
    draftCount: number;
    acceptedCount: number;
    rejectedCount: number;
    llmRunCount: number;
  };
}
export interface ProfileDraft {
  id?: string;
  name: string;
  roleFamily: ProfileRoleFamily;
  targetRole: string;
  targetLevel: string;
  cities: string;
  salaryTarget: string;
  companyTypes: string;
  experienceSummary: string;
  projectEvidence: string;
  nonClaims: string;
  dailyMinutes: string;
}

export interface KnowledgeBoundaryDraft {
  id?: string;
  topic: string;
  level: KnowledgeBoundaryLevel;
  gap: string;
  evidence: string;
  targetUse: string;
  sourceSummary?: string;
  sourceConfidence?: CoachConfidence;
  confidence?: CoachConfidence;
  sourceProvider?: string;
  sourcePromptVersion?: string;
  sourceInputHash?: string;
}

export interface CoachScheduleDraft {
  id?: string;
  title: string;
  date: string;
  start: string;
  end: string;
  kind: CoachScheduleEventKind;
  reason: string;
  evidenceRequired: boolean;
}

export function createProfileDraft(profile?: UserProfile): ProfileDraft {
  return {
    id: profile?.id,
    name: profile?.name ?? "我的求职画像",
    roleFamily: profile?.roleFamily ?? "backend",
    targetRole: profile?.targetRole ?? "",
    targetLevel: profile?.targetLevel ?? "",
    cities: profile?.cities ?? "",
    salaryTarget: profile?.salaryTarget ?? "",
    companyTypes: profile?.companyTypes ?? "",
    experienceSummary: profile?.experienceSummary ?? "",
    projectEvidence: profile?.projectEvidence ?? "",
    nonClaims: profile?.nonClaims ?? "",
    dailyMinutes: String(profile?.dailyMinutes ?? 60)
  };
}

export function createBoundaryDraft(boundary?: KnowledgeBoundary): KnowledgeBoundaryDraft {
  return {
    id: boundary?.id,
    topic: boundary?.topic ?? "",
    level: boundary?.level ?? "了解",
    gap: boundary?.gap ?? "",
    evidence: boundary?.evidence ?? "",
    targetUse: boundary?.targetUse ?? "",
    sourceSummary: boundary?.sourceSummary,
    sourceConfidence: boundary?.sourceConfidence,
    sourceProvider: boundary?.sourceProvider,
    sourcePromptVersion: boundary?.sourcePromptVersion,
    sourceInputHash: boundary?.sourceInputHash
  };
}

export function createScheduleDraft(date: string, event?: CoachScheduleEvent): CoachScheduleDraft {
  return {
    id: event?.id,
    title: event?.title ?? "",
    date: event?.date ?? date,
    start: event?.start ?? "20:00",
    end: event?.end ?? "20:30",
    kind: event?.kind ?? "learning",
    reason: event?.reason ?? "",
    evidenceRequired: event?.evidenceRequired ?? true
  };
}

export function buildCoachDashboard({
  profiles,
  boundaries,
  scheduleEvents,
  artifacts,
  llmRuns = [],
  evidenceByTaskId = {},
  sprint
}: {
  profiles: UserProfile[];
  boundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  artifacts: AiArtifact[];
  llmRuns?: LlmRun[];
  evidenceByTaskId?: EvidenceByTaskId;
  sprint?: DailySprint;
}): CoachDashboard {
  const activeProfile = profiles.find((profile) => profile.active) ?? profiles[0];
  const profileBoundaries = activeProfile ? boundaries.filter((boundary) => boundary.profileId === activeProfile.id) : [];
  const profileEvents = activeProfile ? scheduleEvents.filter((event) => event.profileId === activeProfile.id) : [];
  const profileArtifacts = activeProfile ? artifacts.filter((artifact) => artifact.profileId === activeProfile.id) : artifacts;
  const profileRuns = activeProfile ? llmRuns.filter((run) => !run.profileId || run.profileId === activeProfile.id) : llmRuns;
  const acceptedArtifacts = profileArtifacts.filter((artifact) => artifact.status === "accepted");
  const rejectedArtifacts = profileArtifacts.filter((artifact) => artifact.status === "rejected");
  const draftArtifacts = profileArtifacts.filter((artifact) => artifact.status === "draft" || artifact.status === "edited");
  const acceptedOutcomes = sprint ? buildAcceptedAiScheduleOutcomes(profileEvents, acceptedArtifacts, sprint) : [];
  const feedbackSummary = summarizeAiFeedback(acceptedArtifacts, rejectedArtifacts, acceptedOutcomes);
  const setupChecklist = buildCoachSetupChecklist({
    activeProfile,
    boundaries: profileBoundaries,
    scheduleEvents: profileEvents,
    artifacts: profileArtifacts
  });
  const readiness = !activeProfile
    ? {
        status: "needs_profile" as const,
        label: "需要画像",
        detail: "先保存求职画像，AI 建议才能引用岗位、城市、时间投入和不可夸大边界。"
      }
    : profileBoundaries.length === 0
      ? {
          status: "needs_boundary" as const,
          label: "需要知识边界",
          detail: "至少录入一个知识边界，否则 AI 建议无法贴合你的实际情况。"
        }
      : {
          status: "ready" as const,
          label: "可生成建议",
          detail: "画像和知识边界已具备，AI 建议会先进入待确认区，接受后才写入日程或边界。"
        };

  return {
    activeProfile,
    profiles,
    boundaries: profileBoundaries,
    scheduleEvents: profileEvents,
    artifacts: profileArtifacts,
    llmRuns: profileRuns,
    draftArtifacts,
    acceptedArtifacts,
    rejectedArtifacts,
    feedbackSummary,
    outcomeMetrics: buildCoachOutcomeMetrics(sprint, evidenceByTaskId, feedbackSummary),
    readiness,
    setupChecklist,
    metrics: {
      profileCount: profiles.length,
      boundaryCount: profileBoundaries.length,
      scheduleEventCount: profileEvents.length,
      draftCount: draftArtifacts.length,
      acceptedCount: acceptedArtifacts.length,
      rejectedCount: rejectedArtifacts.length,
      llmRunCount: profileRuns.length
    }
  };
}

export function upsertProfile(profiles: UserProfile[], draft: ProfileDraft, now = new Date().toISOString()): UserProfile[] {
  const existing = draft.id ? profiles.find((profile) => profile.id === draft.id) : undefined;
  const profile: UserProfile = {
    id: existing?.id ?? newEntityId("profile"),
    name: clean(draft.name) || "我的求职画像",
    roleFamily: draft.roleFamily,
    targetRole: clean(draft.targetRole),
    targetLevel: clean(draft.targetLevel),
    cities: clean(draft.cities),
    salaryTarget: clean(draft.salaryTarget),
    companyTypes: clean(draft.companyTypes),
    experienceSummary: clean(draft.experienceSummary),
    projectEvidence: clean(draft.projectEvidence),
    nonClaims: clean(draft.nonClaims),
    dailyMinutes: clampMinutes(draft.dailyMinutes),
    active: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  return [profile, ...profiles.filter((item) => item.id !== profile.id).map((item) => ({ ...item, active: false }))];
}

export function upsertKnowledgeBoundary(boundaries: KnowledgeBoundary[], profileId: string, draft: KnowledgeBoundaryDraft, now = new Date().toISOString()): KnowledgeBoundary[] {
  const existing = draft.id ? boundaries.find((boundary) => boundary.id === draft.id) : undefined;
  const boundary: KnowledgeBoundary = {
    id: existing?.id ?? newEntityId("boundary"),
    profileId,
    topic: clean(draft.topic),
    level: draft.level,
    gap: clean(draft.gap),
    evidence: clean(draft.evidence),
    targetUse: clean(draft.targetUse),
    sourceSummary: optionalClean(draft.sourceSummary),
    sourceConfidence: normalizeConfidence(draft.sourceConfidence ?? draft.confidence),
    sourceProvider: optionalClean(draft.sourceProvider),
    sourcePromptVersion: optionalClean(draft.sourcePromptVersion),
    sourceInputHash: optionalClean(draft.sourceInputHash),
    lastValidatedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  return [boundary, ...boundaries.filter((item) => item.id !== boundary.id)];
}

export function upsertCoachScheduleEvent(events: CoachScheduleEvent[], profileId: string, draft: CoachScheduleDraft, acceptedFromArtifactId?: string, now = new Date().toISOString()): CoachScheduleEvent[] {
  const existing = draft.id ? events.find((event) => event.id === draft.id) : undefined;
  const event: CoachScheduleEvent = {
    id: existing?.id ?? newEntityId("event"),
    profileId,
    date: draft.date,
    start: draft.start,
    end: draft.end,
    kind: draft.kind,
    title: clean(draft.title),
    reason: clean(draft.reason),
    evidenceRequired: draft.evidenceRequired,
    acceptedFromArtifactId: acceptedFromArtifactId ?? existing?.acceptedFromArtifactId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  return [event, ...events.filter((item) => item.id !== event.id)];
}

export function canSaveProfile(draft: ProfileDraft): boolean {
  return Boolean(clean(draft.targetRole) && clean(draft.experienceSummary) && clampMinutes(draft.dailyMinutes) > 0);
}

export function canSaveBoundary(draft: KnowledgeBoundaryDraft): boolean {
  return Boolean(clean(draft.topic) && clean(draft.gap));
}

export function canSaveScheduleEvent(draft: CoachScheduleDraft): boolean {
  return Boolean(clean(draft.title) && draft.date && draft.start && draft.end && draft.start < draft.end);
}

export function generateCoachArtifacts({
  profile,
  boundaries,
  opportunitySignals = [],
  sprint,
  now = new Date().toISOString()
}: {
  profile?: UserProfile;
  boundaries: KnowledgeBoundary[];
  opportunitySignals?: OpportunitySignal[];
  sprint: DailySprint;
  now?: string;
}): AiArtifact[] {
  if (!profile) {
    return [];
  }
  const primaryBoundary = weakestBoundary(boundaries);
  const roleLabel = roleFamilyLabel(profile.roleFamily);
  const target = profile.targetRole || roleLabel;
  const playbook = roleFamilyPlaybookFor(profile.roleFamily);
  const opportunity = buildOpportunityCoachContext(opportunitySignals);
  const roleQuestions = primaryBoundary ? roleFamilyQuestionBank(playbook, primaryBoundary.topic, opportunity.focusLabel) : [];
  const sourceBase = [
    `画像：${target}`,
    `角色视角：${playbook.lens}`,
    profile.cities ? `城市：${profile.cities}` : "",
    primaryBoundary ? `知识边界：${primaryBoundary.topic}(${primaryBoundary.level})` : "知识边界：unknown",
    sprint.currentTaskId ? `当前任务：${sprint.tasks.find((task) => task.id === sprint.currentTaskId)?.title ?? sprint.currentTaskId}` : "",
    ...opportunity.sources
  ].filter(Boolean);

  if (!primaryBoundary) {
    return [
      artifact(profile.id, "daily_next_step", `先补一条${roleLabel}知识边界`, `unknown：当前没有可引用的知识边界，先录入一个围绕「${playbook.lens}」的主题，再生成个性化建议。`, `缺少知识边界，不能生成${roleLabel}个性化建议；后续需要能引用${playbook.evidence}。`, sourceBase, "low", sprint.date, now)
    ];
  }

  return [
    artifact(
      profile.id,
      "knowledge_card",
      `${primaryBoundary.topic} 面试表达卡`,
      `围绕「${primaryBoundary.topic}」补一张知识卡：按「${playbook.answerFrame}」组织回答，用「${playbook.evidence}」做证据，最后列出还不能夸大的部分。${opportunity.focusLabel ? `补充 JD 焦点「${opportunity.focusLabel}」下的候选追问。` : ""}${opportunity.knowledgeHint}`,
      `该主题当前为「${primaryBoundary.level}」，薄弱点是「${primaryBoundary.gap || "未写明"}」；角色视角是「${playbook.lens}」。${opportunity.reasonHint}`,
      sourceBase,
      primaryBoundary.level === "可面试追问" ? "medium" : "high",
      sprint.date,
      now
    ),
    artifact(
      profile.id,
      "schedule_suggestion",
      `今晚 ${profile.dailyMinutes} 分钟补 ${primaryBoundary.topic}`,
      `建议新增一条 ${Math.min(profile.dailyMinutes, 60)} 分钟知识任务，聚焦「${playbook.scheduleFocus}」，产出一段可面试回答和一条 Evidence Gate 证据。${opportunity.focusLabel ? `练习目标收敛到「${opportunity.focusLabel}」。` : ""}${opportunity.scheduleHint}`,
      `目标岗位「${target}」需要能解释「${primaryBoundary.targetUse || primaryBoundary.topic}」，并补齐${playbook.evidence}。${opportunity.reasonHint}`,
      sourceBase,
      "high",
      sprint.date,
      now
    ),
    artifact(
      profile.id,
      "interview_question",
      `${target} 追问：${primaryBoundary.topic}`,
      `候选题：${opportunity.focusQuestionHint}${roleQuestions[0]} 追问库：${roleQuestions.slice(1).join("；")}`,
      `从知识边界「${primaryBoundary.topic}」、目标岗位「${target}」、角色题卡库和机会信号生成，并按「${playbook.answerFrame}」检查表达。${opportunity.reasonHint}`,
      sourceBase,
      "medium",
      sprint.date,
      now
    )
  ];
}

export function acceptArtifact({
  artifact,
  boundaries,
  scheduleEvents,
  sprint,
  now = new Date().toISOString()
}: {
  artifact: AiArtifact;
  boundaries: KnowledgeBoundary[];
  scheduleEvents: CoachScheduleEvent[];
  sprint: DailySprint;
  now?: string;
}): { boundaries: KnowledgeBoundary[]; scheduleEvents: CoachScheduleEvent[]; artifact: AiArtifact } {
  if (artifact.type === "knowledge_card") {
    return {
      boundaries: upsertKnowledgeBoundary(boundaries, artifact.profileId, {
        topic: artifact.title.replace(/\s*面试表达卡$/, ""),
        level: "可讲",
        gap: artifact.body,
        evidence: artifact.reason,
        targetUse: artifact.title
      }, now),
      scheduleEvents,
      artifact: { ...artifact, status: "accepted", updatedAt: now }
    };
  }

  const kind: CoachScheduleEventKind = artifact.type === "interview_question" ? "interview" : "learning";
  return {
    boundaries,
    scheduleEvents: upsertCoachScheduleEvent(scheduleEvents, artifact.profileId, {
      title: artifact.title,
      date: artifact.targetDate ?? sprint.date,
      start: "20:00",
      end: "20:30",
      kind,
      reason: `${artifact.reason} ${artifact.body}`,
      evidenceRequired: true
    }, artifact.id, now),
    artifact: { ...artifact, status: "accepted", updatedAt: now }
  };
}

export function rejectArtifact(artifact: AiArtifact, rejectionReason: string, now = new Date().toISOString()): AiArtifact {
  return {
    ...artifact,
    status: "rejected",
    rejectionReason: clean(rejectionReason) || "不适合当前求职目标",
    updatedAt: now
  };
}

export function editArtifact(artifact: AiArtifact, patch: Pick<AiArtifact, "title" | "body">, now = new Date().toISOString()): AiArtifact {
  return {
    ...artifact,
    title: clean(patch.title),
    body: clean(patch.body),
    status: artifact.status === "accepted" || artifact.status === "rejected" ? artifact.status : "edited",
    updatedAt: now
  };
}

function weakestBoundary(boundaries: KnowledgeBoundary[]): KnowledgeBoundary | undefined {
  const order: Record<KnowledgeBoundaryLevel, number> = { "陌生": 0, "了解": 1, "可讲": 2, "可实战": 3, "可面试追问": 4 };
  return [...boundaries].sort((a, b) => order[a.level] - order[b.level] || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())[0];
}

function artifact(profileId: string, type: AiArtifact["type"], title: string, body: string, reason: string, sources: string[], confidence: AiArtifact["confidence"], targetDate: string, now: string): AiArtifact {
  return {
    id: `artifact-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    profileId,
    type,
    title,
    body,
    reason,
    sources,
    confidence,
    status: "draft",
    targetDate,
    createdAt: now,
    updatedAt: now
  };
}

function clampMinutes(value: string | number): number {
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes)) return 30;
  return Math.min(240, Math.max(15, minutes));
}

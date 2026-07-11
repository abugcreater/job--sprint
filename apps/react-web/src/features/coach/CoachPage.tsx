import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  generateBoundarySuggestionsOnServer,
  generateCoachArtifactsOnServer,
  submitCoachFeedback,
  submitCoachOnboardingEvent
} from "../../api/runtimeClient";
import { submitBoundarySuggestionFeedback } from "../../api/boundaryFeedbackClient";
import {
  buildCoachDashboard,
  canSaveBoundary,
  canSaveProfile,
  canSaveScheduleEvent,
  createBoundaryDraft,
  createProfileDraft,
  createScheduleDraft,
  type CoachScheduleDraft,
  type KnowledgeBoundaryDraft,
  type ProfileDraft
} from "../../data/coachAdapter";
import { buildApplicationsDashboard } from "../../data/applicationsAdapter";
import { buildCoachFirstLoginFlow } from "../../data/coachFirstLoginFlowAdapter";
import { generateBoundarySuggestionsFromText, type BoundarySuggestionDraft } from "../../data/boundarySuggestionAdapter";
import { summarizeBoundarySuggestionFeedback, type BoundarySuggestionFeedbackDraft } from "../../data/boundarySuggestionFeedbackAdapter";
import { createLlmRun } from "../../data/llmRunAdapter";
import { buildOpportunitySignals } from "../../data/opportunitySignalsAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import type { AiArtifact } from "../../types/sprint";
import { AiFeedbackPanel } from "./components/AiFeedbackPanel";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { BoundaryPanel } from "./components/BoundaryPanel";
import { BoundarySuggestionPanel } from "./components/BoundarySuggestionPanel";
import { CoachStageNavigation, type CoachStageId } from "./components/CoachStageNavigation";
import { buildCoachStageProgress, CoachDisclosure, CoachStageContext, coachStageTitle } from "./components/CoachStageContext";
import { InitializationWizardPanel } from "./components/InitializationWizardPanel";
import { LlmRunPanel } from "./components/LlmRunPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { SchedulePanel } from "./components/SchedulePanel";

export function CoachPage() {
  const isResumeImportEntry = useSearchParams()[0].get("entry") === "resume-import";
  const sprint = useSprintStore((state) => state.sprint);
  const syncState = useSprintStore((state) => state.syncState);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const knowledgeBoundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const boundarySuggestionFeedback = useSprintStore((state) => state.boundarySuggestionFeedback);
  const coachScheduleEvents = useSprintStore((state) => state.coachScheduleEvents);
  const aiArtifacts = useSprintStore((state) => state.aiArtifacts);
  const llmRuns = useSprintStore((state) => state.llmRuns);
  const saveUserProfile = useSprintStore((state) => state.saveUserProfile);
  const activateUserProfile = useSprintStore((state) => state.activateUserProfile);
  const deleteUserProfile = useSprintStore((state) => state.deleteUserProfile);
  const saveKnowledgeBoundary = useSprintStore((state) => state.saveKnowledgeBoundary);
  const recordBoundarySuggestionFeedback = useSprintStore((state) => state.recordBoundarySuggestionFeedback);
  const deleteKnowledgeBoundary = useSprintStore((state) => state.deleteKnowledgeBoundary);
  const saveCoachScheduleEvent = useSprintStore((state) => state.saveCoachScheduleEvent);
  const deleteCoachScheduleEvent = useSprintStore((state) => state.deleteCoachScheduleEvent);
  const generateAiArtifacts = useSprintStore((state) => state.generateAiArtifacts);
  const addAiArtifacts = useSprintStore((state) => state.addAiArtifacts);
  const addLlmRun = useSprintStore((state) => state.addLlmRun);
  const acceptAiArtifact = useSprintStore((state) => state.acceptAiArtifact);
  const rejectAiArtifact = useSprintStore((state) => state.rejectAiArtifact);
  const editAiArtifact = useSprintStore((state) => state.editAiArtifact);
  const dashboard = useMemo(
    () => buildCoachDashboard({ profiles: userProfiles, boundaries: knowledgeBoundaries, scheduleEvents: coachScheduleEvents, artifacts: aiArtifacts, llmRuns, evidenceByTaskId, sprint }),
    [aiArtifacts, coachScheduleEvents, evidenceByTaskId, knowledgeBoundaries, llmRuns, sprint, userProfiles]
  );
  const opportunitySignals = useMemo(
    () => buildOpportunitySignals(buildApplicationsDashboard(sprint, evidenceByTaskId).recentRecords),
    [evidenceByTaskId, sprint]
  );
  const firstLoginFlow = useMemo(
    () => buildCoachFirstLoginFlow({
      syncState,
      activeProfile: dashboard.activeProfile,
      boundaries: dashboard.boundaries,
      scheduleEvents: dashboard.scheduleEvents,
      artifacts: dashboard.artifacts
    }),
    [dashboard.activeProfile, dashboard.artifacts, dashboard.boundaries, dashboard.scheduleEvents, syncState]
  );
  const boundaryFeedbackSummary = useMemo(() => summarizeBoundarySuggestionFeedback(
    dashboard.activeProfile ? boundarySuggestionFeedback.filter((item) => !item.profileId || item.profileId === dashboard.activeProfile?.id) : boundarySuggestionFeedback
  ), [boundarySuggestionFeedback, dashboard.activeProfile?.id]);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => createProfileDraft(dashboard.activeProfile));
  const [boundaryDraft, setBoundaryDraft] = useState<KnowledgeBoundaryDraft>(() => createBoundaryDraft());
  const [boundarySourceText, setBoundarySourceText] = useState("");
  const [boundarySuggestions, setBoundarySuggestions] = useState<BoundarySuggestionDraft[]>([]);
  const [boundarySuggestionReasons, setBoundarySuggestionReasons] = useState<Record<string, string>>({});
  const [scheduleDraft, setScheduleDraft] = useState<CoachScheduleDraft>(() => createScheduleDraft(sprint.date));
  const [artifactEdits, setArtifactEdits] = useState<Record<string, Pick<AiArtifact, "title" | "body">>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [showAllArtifacts, setShowAllArtifacts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingBoundaries, setIsExtractingBoundaries] = useState(false);
  const [isRecordingFirstLogin, setIsRecordingFirstLogin] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [activeStage, setActiveStage] = useState<CoachStageId>(() => isResumeImportEntry ? "profile" : recommendedCoachStage(dashboard));
  const [showOnboarding, setShowOnboarding] = useState(() => isResumeImportEntry || !dashboard.activeProfile);
  const didFocusResumeImport = useRef(false);
  const completedStages: Record<CoachStageId, boolean> = {
    profile: Boolean(dashboard.activeProfile),
    boundaries: dashboard.boundaries.length > 0,
    plan: dashboard.scheduleEvents.length > 0,
    advice: dashboard.artifacts.some((artifact) => artifact.status === "accepted" || artifact.status === "rejected")
  };
  const stageProgress = buildCoachStageProgress(completedStages);

  useEffect(() => {
    setProfileDraft(createProfileDraft(dashboard.activeProfile));
    setBoundaryDraft(createBoundaryDraft());
    setBoundarySuggestions([]);
    setBoundarySuggestionReasons({});
    setScheduleDraft(createScheduleDraft(sprint.date));
  }, [dashboard.activeProfile?.id, sprint.date]);

  useEffect(() => {
    if (!isResumeImportEntry || activeStage !== "profile" || !showOnboarding || didFocusResumeImport.current) return;
    const animationFrame = window.requestAnimationFrame(() => {
      didFocusResumeImport.current = true;
      const importWorkspace = document.getElementById("coach-quick-init");
      importWorkspace?.focus({ preventScroll: true });
      importWorkspace?.scrollIntoView?.({ block: "start" });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeStage, isResumeImportEntry, showOnboarding]);

  const handleSaveProfile = () => {
    if (!canSaveProfile(profileDraft)) {
      setFeedback("请至少填写目标岗位、经验摘要和每日可投入时间。");
      setProfileFeedback("保存失败：请补齐目标岗位、经验摘要和每日可投入时间。");
      return;
    }
    saveUserProfile(profileDraft);
    setFeedback("求职画像已保存，后续 AI 建议会引用这份画像。");
    setProfileFeedback("画像已保存。");
    setActiveStage("boundaries");
    setShowOnboarding(false);
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = dashboard.profiles.find((item) => item.id === profileId);
    if (!profile) return;
    const confirmed = window.confirm(`删除「${profile.name}」画像？关联知识边界、个人日程和 AI 建议也会一起移除。`);
    if (!confirmed) return;
    deleteUserProfile(profileId);
    setProfileDraft(createProfileDraft());
    setFeedback(`已删除「${profile.name}」画像。`);
    setProfileFeedback(`已删除「${profile.name}」，关联边界、日程和 AI 建议已同步清理。`);
    setActiveStage("profile");
    setShowOnboarding(true);
  };

  const handleSaveBoundary = () => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一份求职画像。");
      return;
    }
    if (!canSaveBoundary(boundaryDraft)) {
      setFeedback("请填写知识主题和当前缺口。");
      return;
    }
    saveKnowledgeBoundary(boundaryDraft);
    setBoundaryDraft(createBoundaryDraft());
    setFeedback("知识边界已保存。");
    setActiveStage("plan");
  };

  const handleGenerateBoundarySuggestions = async () => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一份求职画像。");
      return;
    }
    if (boundarySourceText.trim().length < 12) {
      setFeedback("请粘贴一段 JD、简历或面试反馈，至少 12 个字符。");
      return;
    }
    setIsExtractingBoundaries(true);
    try {
      const response = await generateBoundarySuggestionsOnServer({
        profile: dashboard.activeProfile,
        knowledgeBoundaries: dashboard.boundaries,
        text: boundarySourceText
      });
      if (response?.suggestions.length) {
        setBoundarySuggestions(response.suggestions.map((suggestion) => ({
          ...suggestion,
          sourceConfidence: suggestion.sourceConfidence ?? suggestion.confidence,
          sourceProvider: response.provider,
          sourcePromptVersion: response.promptVersion,
          sourceInputHash: response.inputSummaryHash
        })));
        setFeedback("已生成知识边界候选，请确认后再写入正式边界。");
        return;
      }
      setBoundarySuggestions(createLocalBoundarySuggestions());
      setFeedback("服务端边界提取暂不可用，已用本地规则生成候选。");
    } catch (_) {
      setBoundarySuggestions(createLocalBoundarySuggestions());
      setFeedback("服务端边界提取失败，已用本地规则生成候选。");
    } finally {
      setIsExtractingBoundaries(false);
    }
  };

  const createLocalBoundarySuggestions = () => generateBoundarySuggestionsFromText({
    text: boundarySourceText,
    profile: dashboard.activeProfile,
    existingTopics: dashboard.boundaries.map((boundary) => boundary.topic)
  });

  const handleAcceptBoundarySuggestion = (suggestion: BoundarySuggestionDraft) => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一份求职画像。");
      return;
    }
    recordBoundarySuggestionDecision(suggestion, "accepted");
    saveKnowledgeBoundary(suggestion);
    setBoundarySuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setBoundarySuggestionReasons((current) => removeKey(current, suggestion.id));
    setFeedback(`已采纳「${suggestion.topic}」知识边界。`);
    setActiveStage("plan");
  };

  const handleReviseBoundarySuggestion = (suggestion: BoundarySuggestionDraft) => {
    recordBoundarySuggestionDecision(suggestion, "needs_revision", boundarySuggestionReasons[suggestion.id]);
    setBoundaryDraft({ ...suggestion, id: undefined });
    setBoundarySuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setBoundarySuggestionReasons((current) => removeKey(current, suggestion.id));
    setFeedback(`已把「${suggestion.topic}」载入知识边界表单，请修订后保存。`);
  };

  const handleRejectBoundarySuggestion = (suggestion: BoundarySuggestionDraft) => {
    recordBoundarySuggestionDecision(suggestion, "rejected", boundarySuggestionReasons[suggestion.id]);
    setBoundarySuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setBoundarySuggestionReasons((current) => removeKey(current, suggestion.id));
    setFeedback(`已记录「${suggestion.topic}」不采纳原因。`);
  };

  const recordBoundarySuggestionDecision = (
    suggestion: BoundarySuggestionDraft,
    decision: BoundarySuggestionFeedbackDraft["decision"],
    reason = ""
  ) => {
    const feedbackPayload = {
      profileId: dashboard.activeProfile?.id,
      suggestionId: suggestion.id,
      topic: suggestion.topic,
      decision,
      reason,
      sourceSummary: suggestion.sourceSummary,
      sourceConfidence: suggestion.sourceConfidence ?? suggestion.confidence,
      sourceProvider: suggestion.sourceProvider,
      sourcePromptVersion: suggestion.sourcePromptVersion,
      sourceInputHash: suggestion.sourceInputHash
    };
    recordBoundarySuggestionFeedback(feedbackPayload);
    void submitBoundarySuggestionFeedback(feedbackPayload).catch(() => undefined);
  };

  const handleSaveSchedule = () => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一份求职画像。");
      return;
    }
    if (!canSaveScheduleEvent(scheduleDraft)) {
      setFeedback("请填写日程标题，并确认开始时间早于结束时间。");
      return;
    }
    saveCoachScheduleEvent(scheduleDraft);
    setScheduleDraft(createScheduleDraft(sprint.date));
    setFeedback("自定义日程已加入今日 AI 教练。");
    setActiveStage("advice");
  };

  const handleGenerate = async () => {
    if (dashboard.readiness.status !== "ready") {
      generateAiArtifacts();
      addLlmRun(createLlmRun({
        profileId: dashboard.activeProfile?.id,
        provider: "local-fallback",
        status: "fallback",
        artifactCount: dashboard.activeProfile ? (dashboard.boundaries.length ? 3 : 1) : 0,
        warning: dashboard.readiness.status
      }));
      setFeedback(dashboard.readiness.detail);
      return;
    }
    setIsGenerating(true);
    try {
      const response = await generateCoachArtifactsOnServer({
        profile: dashboard.activeProfile,
        knowledgeBoundaries: dashboard.boundaries,
        scheduleEvents: dashboard.scheduleEvents,
        opportunitySignals,
        sprint
      });
      if (response?.artifacts.length) {
        addAiArtifacts(response.artifacts);
        addLlmRun(response.llmRun ?? createLlmRun({
            profileId: dashboard.activeProfile?.id,
            provider: response.provider,
            model: response.model,
            promptVersion: response.promptVersion,
            schemaVersion: response.schemaVersion,
            inputSummaryHash: response.inputSummaryHash,
            status: response.provider === "anthropic-compatible" && !response.warning ? "success" : "fallback",
            artifactCount: response.artifacts.length,
            warning: response.warning
          }));
        const mode = response.provider === "anthropic-compatible" ? "服务端大模型" : "服务端规则 fallback";
        setFeedback(`${mode}已生成 AI 建议，接受后才会写入正式记录。`);
        return;
      }
      generateAiArtifacts();
      addLlmRun(createLlmRun({
        profileId: dashboard.activeProfile?.id,
        provider: "local-fallback",
        status: "fallback",
        artifactCount: dashboard.boundaries.length ? 3 : 1,
        warning: "server_unavailable"
      }));
      setFeedback("服务端 AI 暂不可用，已使用本地规则生成 AI 建议。");
    } catch (_) {
      generateAiArtifacts();
      addLlmRun(createLlmRun({
        profileId: dashboard.activeProfile?.id,
        provider: "local-fallback",
        status: "fallback",
        artifactCount: dashboard.boundaries.length ? 3 : 1,
        warning: "server_generation_failed"
      }));
      setFeedback("服务端 AI 生成失败，已使用本地规则生成 AI 建议。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecordFirstLoginInsight = async () => {
    const step = firstLoginFlow.nextStep;
    setIsRecordingFirstLogin(true);
    try {
      const event = await submitCoachOnboardingEvent({
        profileId: dashboard.activeProfile?.id,
        stepId: step?.id ?? "complete",
        stepLabel: step?.label ?? "建档完成",
        progressLabel: firstLoginFlow.progressLabel,
        completionRate: firstLoginFlow.insight.completionRate,
        completionRateLabel: firstLoginFlow.insight.completionRateLabel,
        dropOffLabel: firstLoginFlow.insight.dropOffLabel,
        riskLabel: firstLoginFlow.insight.riskLabel,
        nextActionLabel: firstLoginFlow.insight.nextActionLabel,
        source: "react-first-login"
      });
      if (event) {
        setFeedback(`已记录服务端建档进度：${event.completionRateLabel} · ${event.dropOffLabel}。`);
	        return;
      }
      setFeedback("当前处于本地模式，建档进度未写入服务端。");
    } catch (_) {
      setFeedback("建档进度写入服务端失败，请稍后重试。");
    } finally {
      setIsRecordingFirstLogin(false);
    }
  };

  const handleEditArtifact = (artifact: AiArtifact) => {
    const patch = artifactEdits[artifact.id] ?? { title: artifact.title, body: artifact.body };
    if (!patch.title.trim() || !patch.body.trim()) {
      setFeedback("AI 建议标题和内容不能为空。");
      return;
    }
    editAiArtifact(artifact.id, patch);
    setFeedback("AI 建议已编辑，仍需接受或拒绝。");
  };

  const handleRejectArtifact = (artifact: AiArtifact) => {
    const reason = rejectionReasons[artifact.id] ?? "";
    rejectAiArtifact(artifact.id, reason);
    recordArtifactFeedback(artifact, "rejected", reason);
    setFeedback("已拒绝 AI 建议，拒绝原因会进入后续复盘统计。");
  };

  const handleAcceptArtifact = (artifact: AiArtifact) => {
    acceptAiArtifact(artifact.id);
    recordArtifactFeedback(artifact, "accepted");
    setFeedback(artifact.type === "knowledge_card" ? "已接受知识卡建议，并写入知识边界。" : "已接受 AI 建议，并写入自定义日程。");
  };

  const recordArtifactFeedback = (artifact: AiArtifact, decision: "accepted" | "rejected", reason = "") => {
    void submitCoachFeedback({
      profileId: artifact.profileId || dashboard.activeProfile?.id,
      artifactId: artifact.id,
      llmRunId: dashboard.llmRuns[0]?.id,
      artifactType: artifact.type,
      decision,
      reason,
      title: artifact.title
    }).catch(() => undefined);
  };

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="page-intro motion-enter">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">Prepare · 建立求职基线</p>
              <div className="mt-2 flex items-center gap-3">
                <h1 className="text-3xl font-black leading-tight tracking-[-0.035em] text-ink-950 md:text-[44px]">准备工作台</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500 md:text-base">
                依次确认画像、知识边界、今日计划和 AI 建议。一次只处理一个阶段，完成后再进入今天的行动。
              </p>
            </div>
            <Link to="/today" className="secondary-button shrink-0">
              回到今日
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <CoachStageNavigation
          activeStage={activeStage}
          completedStages={completedStages}
          progressLabel={stageProgress.progressLabel}
          nextActionLabel={stageProgress.nextActionLabel}
          isRecording={isRecordingFirstLogin}
          onStageChange={(stage) => {
            setActiveStage(stage);
            if (stage !== "profile") setShowOnboarding(false);
            window.requestAnimationFrame(() => {
              const stageWorkspace = document.getElementById(`coach-stage-${stage}`);
              stageWorkspace?.focus({ preventScroll: true });
              stageWorkspace?.scrollIntoView?.({ block: "start" });
            });
          }}
          onRecordProgress={handleRecordFirstLoginInsight}
        />
        {feedback ? <p className="rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" role="status">{feedback}</p> : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section id={`coach-stage-${activeStage}`} className="workspace-anchor min-w-0 space-y-4" tabIndex={-1} aria-label={`当前准备阶段：${coachStageTitle(activeStage)}`}>
            {activeStage === "profile" ? (
              showOnboarding ? (
                <>
                  <InitializationWizardPanel />
                  <button type="button" className="secondary-button w-full" onClick={() => setShowOnboarding(false)}>改用详细画像表单</button>
                </>
              ) : (
                <ProfilePanel
                  profiles={dashboard.profiles}
                  activeProfileId={dashboard.activeProfile?.id}
                  draft={profileDraft}
                  onChange={(patch) => setProfileDraft((current) => ({ ...current, ...patch }))}
                  onNew={() => setProfileDraft(createProfileDraft())}
                  onActivate={(profile) => {
                    activateUserProfile(profile.id);
                    setFeedback(`已切换到「${profile.name}」。`);
                  }}
                  onEdit={(profile) => setProfileDraft(createProfileDraft(profile))}
                  onDelete={handleDeleteProfile}
                  onSave={handleSaveProfile}
                  feedback={profileFeedback}
                />
              )
            ) : null}

            {activeStage === "boundaries" ? (
              <>
                <BoundarySuggestionPanel
                  sourceText={boundarySourceText}
                  suggestions={boundarySuggestions}
                  feedbackReasons={boundarySuggestionReasons}
                  feedbackSummary={boundaryFeedbackSummary}
                  disabled={!dashboard.activeProfile}
                  isGenerating={isExtractingBoundaries}
                  onTextChange={setBoundarySourceText}
                  onGenerate={handleGenerateBoundarySuggestions}
                  onAccept={handleAcceptBoundarySuggestion}
                  onRevise={handleReviseBoundarySuggestion}
                  onReject={handleRejectBoundarySuggestion}
                  onReasonChange={(suggestionId, reason) => setBoundarySuggestionReasons((current) => ({ ...current, [suggestionId]: reason }))}
                />
                <BoundaryPanel
                  boundaries={dashboard.boundaries}
                  draft={boundaryDraft}
                  activeProfileReady={Boolean(dashboard.activeProfile)}
                  onChange={(patch) => setBoundaryDraft((current) => ({ ...current, ...patch }))}
                  onEdit={(boundary) => setBoundaryDraft(createBoundaryDraft(boundary))}
                  onDelete={deleteKnowledgeBoundary}
                  onSave={handleSaveBoundary}
                  onCancelEdit={() => setBoundaryDraft(createBoundaryDraft())}
                />
              </>
            ) : null}

            {activeStage === "plan" ? (
              <SchedulePanel
                events={dashboard.scheduleEvents}
                draft={scheduleDraft}
                onChange={(patch) => setScheduleDraft((current) => ({ ...current, ...patch }))}
                onEdit={(event) => setScheduleDraft(createScheduleDraft(sprint.date, event))}
                onDelete={deleteCoachScheduleEvent}
                onSave={handleSaveSchedule}
                showAll={showAllSchedules}
                onToggleShowAll={() => setShowAllSchedules((current) => !current)}
              />
            ) : null}

            {activeStage === "advice" ? (
              <>
                <ArtifactPanel
                  readiness={dashboard.readiness}
                  artifacts={dashboard.artifacts}
                  artifactEdits={artifactEdits}
                  rejectionReasons={rejectionReasons}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  onEditDraft={(artifact, patch) => setArtifactEdits((current) => {
                    const existing = current[artifact.id] ?? { title: artifact.title, body: artifact.body };
                    return { ...current, [artifact.id]: { ...existing, ...patch } };
                  })}
                  onSaveEdit={handleEditArtifact}
                  onAccept={handleAcceptArtifact}
                  onReject={handleRejectArtifact}
                  onReasonChange={(artifactId, reason) => setRejectionReasons((current) => ({ ...current, [artifactId]: reason }))}
                  showAll={showAllArtifacts}
                  onToggleShowAll={() => setShowAllArtifacts((current) => !current)}
                />
                <CoachDisclosure title="AI 反馈复盘"><AiFeedbackPanel summary={dashboard.feedbackSummary} /></CoachDisclosure>
                <CoachDisclosure title="AI 运行记录"><LlmRunPanel runs={dashboard.llmRuns} /></CoachDisclosure>
              </>
            ) : null}
          </section>

          <CoachStageContext stage={activeStage} completed={completedStages[activeStage]} />
        </section>
      </section>
    </main>
  );
}

function recommendedCoachStage(dashboard: ReturnType<typeof buildCoachDashboard>): CoachStageId {
  if (!dashboard.activeProfile) return "profile";
  if (!dashboard.boundaries.length) return "boundaries";
  if (!dashboard.scheduleEvents.length) return "plan";
  return "advice";
}

function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

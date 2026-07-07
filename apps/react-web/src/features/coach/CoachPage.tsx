import { Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchCoachOnboardingReport, type CoachOnboardingReportResponse } from "../../api/coachOnboardingReportClient";
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
import { MetricTile } from "./components/CoachPrimitives";
import { FirstLoginFlowPanel } from "./components/FirstLoginFlowPanel";
import { InitializationWizardPanel } from "./components/InitializationWizardPanel";
import { InviteManagementPanel } from "./components/InviteManagementPanel";
import { InviteOnboardingReportPanel } from "./components/InviteOnboardingReportPanel";
import { LlmRunPanel } from "./components/LlmRunPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { SchedulePanel } from "./components/SchedulePanel";

export function CoachPage() {
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
  const [onboardingReport, setOnboardingReport] = useState<CoachOnboardingReportResponse | null>(null);
  const [onboardingReportStatus, setOnboardingReportStatus] = useState<"idle" | "loading" | "ready" | "local" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setProfileDraft(createProfileDraft(dashboard.activeProfile));
    setBoundaryDraft(createBoundaryDraft());
    setBoundarySuggestions([]);
    setBoundarySuggestionReasons({});
    setScheduleDraft(createScheduleDraft(sprint.date));
  }, [dashboard.activeProfile?.id, sprint.date]);

  useEffect(() => {
    void loadOnboardingReport();
  }, []);

  const loadOnboardingReport = async () => {
    setOnboardingReportStatus("loading");
    try {
      const report = await fetchCoachOnboardingReport();
      setOnboardingReport(report);
      setOnboardingReportStatus(report ? "ready" : "local");
    } catch (_) {
      setOnboardingReportStatus("error");
    }
  };

  const handleSaveProfile = () => {
    if (!canSaveProfile(profileDraft)) {
      setFeedback("请至少填写目标岗位、经验摘要和每日可投入时间。");
      return;
    }
    saveUserProfile(profileDraft);
    setFeedback("画像已保存，后续 AI 草稿会引用该画像。");
  };

  const handleSaveBoundary = () => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一个目标画像。");
      return;
    }
    if (!canSaveBoundary(boundaryDraft)) {
      setFeedback("请填写知识主题和当前缺口。");
      return;
    }
    saveKnowledgeBoundary(boundaryDraft);
    setBoundaryDraft(createBoundaryDraft());
    setFeedback("知识边界已保存。");
  };

  const handleGenerateBoundarySuggestions = async () => {
    if (!dashboard.activeProfile) {
      setFeedback("请先保存一个目标画像。");
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
      setFeedback("请先保存一个目标画像。");
      return;
    }
    recordBoundarySuggestionDecision(suggestion, "accepted");
    saveKnowledgeBoundary(suggestion);
    setBoundarySuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setBoundarySuggestionReasons((current) => removeKey(current, suggestion.id));
    setFeedback(`已采纳「${suggestion.topic}」知识边界。`);
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
      setFeedback("请先保存一个目标画像。");
      return;
    }
    if (!canSaveScheduleEvent(scheduleDraft)) {
      setFeedback("请填写日程标题，并确认开始时间早于结束时间。");
      return;
    }
    saveCoachScheduleEvent(scheduleDraft);
    setScheduleDraft(createScheduleDraft(sprint.date));
    setFeedback("自定义日程已加入今日 AI 教练。");
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
        setFeedback(`${mode}已生成 AI 草稿，接受后才会写入正式记录。`);
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
      setFeedback("服务端 AI 暂不可用，已使用本地规则生成草稿。");
    } catch (_) {
      generateAiArtifacts();
      addLlmRun(createLlmRun({
        profileId: dashboard.activeProfile?.id,
        provider: "local-fallback",
        status: "fallback",
        artifactCount: dashboard.boundaries.length ? 3 : 1,
        warning: "server_generation_failed"
      }));
      setFeedback("服务端 AI 生成失败，已使用本地规则生成草稿。");
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
        stepLabel: step?.label ?? "首登完成",
        progressLabel: firstLoginFlow.progressLabel,
        completionRate: firstLoginFlow.insight.completionRate,
        completionRateLabel: firstLoginFlow.insight.completionRateLabel,
        dropOffLabel: firstLoginFlow.insight.dropOffLabel,
        riskLabel: firstLoginFlow.insight.riskLabel,
        nextActionLabel: firstLoginFlow.insight.nextActionLabel,
        source: "react-first-login"
      });
      if (event) {
        setFeedback(`已记录服务端首登观察：${event.completionRateLabel} · ${event.dropOffLabel}。`);
        void loadOnboardingReport();
        return;
      }
      setFeedback("当前处于本地模式，首登观察未写入服务端。");
    } catch (_) {
      setFeedback("首登观察写入服务端失败，请稍后重试。");
    } finally {
      setIsRecordingFirstLogin(false);
    }
  };

  const handleEditArtifact = (artifact: AiArtifact) => {
    const patch = artifactEdits[artifact.id] ?? { title: artifact.title, body: artifact.body };
    if (!patch.title.trim() || !patch.body.trim()) {
      setFeedback("AI 草稿标题和内容不能为空。");
      return;
    }
    editAiArtifact(artifact.id, patch);
    setFeedback("AI 草稿已编辑，仍需接受或拒绝。");
  };

  const handleRejectArtifact = (artifact: AiArtifact) => {
    const reason = rejectionReasons[artifact.id] ?? "";
    rejectAiArtifact(artifact.id, reason);
    recordArtifactFeedback(artifact, "rejected", reason);
    setFeedback("已拒绝 AI 草稿，拒绝原因会进入后续复盘统计。");
  };

  const handleAcceptArtifact = (artifact: AiArtifact) => {
    acceptAiArtifact(artifact.id);
    recordArtifactFeedback(artifact, "accepted");
    setFeedback(artifact.type === "knowledge_card" ? "已接受知识卡草稿，并写入知识边界。" : "已接受 AI 草稿，并写入自定义日程。");
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
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-brand-700">画像 · 知识边界 · AI 草稿</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <Bot size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">AI 教练设置</h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                先保存目标画像和知识边界，再让 AI 生成草稿；草稿必须经你接受后才会写入日程或知识边界。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[560px]">
              <MetricTile label="画像" value={`${dashboard.metrics.profileCount} 个`} />
              <MetricTile label="知识边界" value={`${dashboard.metrics.boundaryCount} 条`} />
              <MetricTile label="AI 草稿" value={`${dashboard.metrics.draftCount} 条`} />
              <MetricTile label="AI 运行" value={`${dashboard.metrics.llmRunCount} 条`} />
              <MetricTile label="机会信号" value={`${opportunitySignals.length} 条`} />
              <MetricTile label="已采纳/拒绝" value={`${dashboard.metrics.acceptedCount}/${dashboard.metrics.rejectedCount}`} />
              <MetricTile label="AI 采纳率" value={dashboard.feedbackSummary.acceptanceRateLabel} />
              <MetricTile label="本周有效推进" value={dashboard.outcomeMetrics.effectiveActionLabel} />
              <MetricTile label="采纳后完成" value={dashboard.outcomeMetrics.acceptedScheduleCompletionLabel} />
              <MetricTile label="面试复盘" value={dashboard.outcomeMetrics.interviewReviewRateLabel} />
            </div>
          </div>
          {feedback ? (
            <p className="mt-4 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" role="status">
              {feedback}
            </p>
          ) : null}
        </header>

        <FirstLoginFlowPanel
          flow={firstLoginFlow}
          isGenerating={isGenerating}
          isRecordingInsight={isRecordingFirstLogin}
          onGenerate={handleGenerate}
          onRecordInsight={handleRecordFirstLoginInsight}
        />
        <InviteOnboardingReportPanel report={onboardingReport} status={onboardingReportStatus} onRefresh={loadOnboardingReport} />
        <InviteManagementPanel />
        {dashboard.setupChecklist.status !== "ready" ? <InitializationWizardPanel /> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <aside className="space-y-4">
            <div id="coach-profile" className="scroll-mt-4">
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
                onSave={handleSaveProfile}
              />
            </div>
            <div id="coach-schedule" className="scroll-mt-4">
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
            </div>
          </aside>

          <section className="space-y-4">
            <div id="coach-boundaries" className="scroll-mt-4 space-y-4">
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
            </div>
            <div id="coach-artifacts" className="scroll-mt-4">
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
            </div>
            <AiFeedbackPanel summary={dashboard.feedbackSummary} />
            <LlmRunPanel runs={dashboard.llmRuns} />
          </section>
        </section>
      </section>
    </main>
  );
}

function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

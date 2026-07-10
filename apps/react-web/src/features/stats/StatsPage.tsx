import { Activity, BarChart3, BookOpen, Bot, BriefcaseBusiness, ClipboardCheck, MessageCircleQuestion, ShieldCheck, UserRound, WifiOff, type LucideIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { syncStateLabel } from "../../app/syncStatus";
import { buildApplicationsDashboard } from "../../data/applicationsAdapter";
import { buildCoachDashboard } from "../../data/coachAdapter";
import { buildInterviewDashboard } from "../../data/interviewAdapter";
import { buildLearningDashboard } from "../../data/learningAdapter";
import { buildReviewDashboard } from "../../data/reviewAdapter";
import { useSprintStore } from "../../stores/sprintStore";

export function StatsPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const completed = useSprintStore((state) => state.completed);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const delayRecords = useSprintStore((state) => state.delayRecords);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const knowledgeBoundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const boundarySuggestionFeedback = useSprintStore((state) => state.boundarySuggestionFeedback);
  const coachScheduleEvents = useSprintStore((state) => state.coachScheduleEvents);
  const aiArtifacts = useSprintStore((state) => state.aiArtifacts);
  const llmRuns = useSprintStore((state) => state.llmRuns);
  const syncState = useSprintStore((state) => state.syncState);
  const lastSavedAt = useSprintStore((state) => state.lastSavedAt);

  const stats = useMemo(() => {
    const coach = buildCoachDashboard({ profiles: userProfiles, boundaries: knowledgeBoundaries, scheduleEvents: coachScheduleEvents, artifacts: aiArtifacts, llmRuns, evidenceByTaskId, sprint });
    const learning = buildLearningDashboard(sprint, evidenceByTaskId);
    const interview = buildInterviewDashboard(sprint, evidenceByTaskId);
    const applications = buildApplicationsDashboard(sprint, evidenceByTaskId);
    const review = buildReviewDashboard(sprint, evidenceByTaskId);
    const evidenceCount = Object.values(evidenceByTaskId).reduce((count, records) => count + records.length, 0);
    const completedCount = Object.values(completed).filter(Boolean).length;
    const llmRunSummary = summarizeLlmRuns(coach.llmRuns);

    return {
      coach,
      learning,
      interview,
      applications,
      review,
      evidenceCount,
      completedCount,
      llmRunSummary
    };
  }, [aiArtifacts, coachScheduleEvents, completed, evidenceByTaskId, knowledgeBoundaries, llmRuns, sprint, userProfiles]);

  const headlineRows = [
    { label: "今日完成", value: `${sprint.progress.done}/${sprint.progress.total}`, detail: `${sprint.progress.pending} 项待推进，${sprint.progress.evidenceMissing} 项缺证据` },
    { label: "本周有效推进", value: stats.coach.outcomeMetrics.effectiveActionLabel, detail: `完成且有验证证据；本地完成记录 ${stats.completedCount} 项`, icon: <Activity size={15} aria-hidden="true" /> },
    { label: "采纳后完成", value: stats.coach.outcomeMetrics.acceptedScheduleCompletionLabel, detail: `${stats.coach.feedbackSummary.completedAcceptedOutcomeCount}/${stats.coach.feedbackSummary.acceptedOutcomeCount} 条采纳日程已完成` },
    { label: "面试复盘", value: stats.coach.outcomeMetrics.interviewReviewRateLabel, detail: `${stats.coach.outcomeMetrics.interviewReviewLabel} · ${stats.coach.outcomeMetrics.interviewReviewCompletedCount}/${stats.coach.outcomeMetrics.interviewReviewTotalCount}` },
    { label: "AI 运行", value: stats.llmRunSummary.valueLabel, detail: stats.llmRunSummary.detailLabel, icon: <Bot size={15} aria-hidden="true" /> },
    { label: "同步状态", value: syncStateLabel(syncState), detail: lastSavedAt ? `最近保存 ${formatDateTime(lastSavedAt)}` : "暂无保存记录", icon: <WifiOff size={15} aria-hidden="true" /> }
  ];

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-sm font-black text-brand-700">集中统计 · 个人进展</p>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                <BarChart3 size={22} aria-hidden="true" />
              </span>
              <h1 className="text-3xl font-black leading-tight md:text-4xl">进展统计</h1>
            </div>
            <p className="max-w-3xl text-sm font-semibold leading-6 text-ink-500">
              这里集中查看个人执行、画像、知识、面试、机会和复盘数据；模块页面只保留完成任务所需的信息。
            </p>
          </div>
        </header>

        <section aria-labelledby="core-stats-title">
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="core-stats-title" className="text-base font-black text-ink-900">关键结果</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink-500">
                优先看推进质量、AI 采纳后执行和面试复盘，不再只分散看各模块头部数字。
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {headlineRows.map((row) => (
              <MetricTile key={row.label} label={row.label} value={row.value} detail={row.detail} icon={row.icon} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <StatPanel
            icon={Activity}
            title="结果闭环"
            rows={[
              ["有效推进", stats.coach.outcomeMetrics.effectiveActionLabel],
              ["采纳日程完成", stats.coach.outcomeMetrics.acceptedScheduleCompletionLabel],
              ["面试复盘率", stats.coach.outcomeMetrics.interviewReviewRateLabel],
              ["下一轮提示", stats.coach.feedbackSummary.nextPromptHint]
            ]}
          />
          <StatPanel
            icon={Bot}
            title="AI 运行质量"
            rows={[
              ["运行总数", `${stats.llmRunSummary.totalCount} 次`],
              ["成功 / 降级", `${stats.llmRunSummary.successCount} / ${stats.llmRunSummary.fallbackCount}`],
              ["失败 / Schema 异常", `${stats.llmRunSummary.failedCount} / ${stats.llmRunSummary.schemaIssueCount}`],
              ["最近状态", stats.llmRunSummary.latestLabel]
            ]}
          />
          <StatPanel
            icon={UserRound}
            title="画像与 AI 建议"
            rows={[
              ["求职画像", `${stats.coach.metrics.profileCount} 个`],
              ["知识边界", `${stats.coach.metrics.boundaryCount} 条`],
              ["待处理 AI 建议", `${stats.coach.metrics.draftCount} 条`],
              ["AI 建议采纳率", stats.coach.feedbackSummary.acceptanceRateLabel]
            ]}
          />
          <StatPanel
            icon={BookOpen}
            title="知识"
            rows={[
              ["今日知识任务", `${stats.learning.learningTasks.length} 个`],
              ["学习笔记", `${stats.learning.noteCount} 条`],
              ["知识卡", `${stats.learning.knowledgeCards.length} 张`],
              ["资料入口", `${stats.learning.resources.length} 个`]
            ]}
          />
          <StatPanel
            icon={MessageCircleQuestion}
            title="面试"
            rows={[
              ["今日口述任务", `${stats.interview.oralTasks.length} 个`],
              ["候选题目", `${stats.interview.candidateQuestions.length} 题`],
              ["本地口述记录", `${stats.interview.recordCount} 条`],
              ["评分维度", `${stats.interview.rubricDimensions.length} 项`]
            ]}
          />
          <StatPanel
            icon={BriefcaseBusiness}
            title="机会"
            rows={[
              ["机会记录", `${stats.applications.recordCount} 条`],
              ["关联任务", `${stats.applications.deliveryTasks.length} 个`],
              ["今日信号", `${stats.applications.todaySignals.length} 项`],
              ["约面/沟通", `${stats.applications.statusSummary.filter((item) => item.status === "约面" || item.status === "已沟通").reduce((count, item) => count + item.count, 0)} 条`]
            ]}
          />
          <StatPanel
            icon={ClipboardCheck}
            title="复盘"
            rows={[
              ["复盘记录", `${stats.review.reviewRecords.length} 条`],
              ["全部证据", `${stats.review.evidenceRecords.length} 条`],
              ["风险项", `${stats.review.risks.length} 条`],
              ["明日建议", `${stats.review.tomorrowAdvice.length} 项`]
            ]}
          />
          <StatPanel
            icon={ShieldCheck}
            title="数据完整度"
            rows={[
              ["本地画像", stats.coach.activeProfile ? "可用" : "未建立"],
              ["知识边界", stats.coach.boundaries.length ? "可用" : "待补充"],
              ["个人日程", stats.coach.scheduleEvents.length ? "可用" : "待生成"],
              ["首登状态", stats.coach.setupChecklist.status === "ready" ? "已完成" : "进行中"]
            ]}
          />
        </section>
      </section>
    </main>
  );
}

function MetricTile({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) {
  return (
    <article className="rounded-card border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-black text-ink-500">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-2xl font-black text-ink-900">
        {icon}
        <span>{value}</span>
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">{detail}</p>
    </article>
  );
}

function StatPanel({ icon: Icon, title, rows }: { icon: LucideIcon; title: string; rows: Array<[string, string]> }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <Icon size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">{title}</h2>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-card bg-surface-0 p-3">
            <p className="text-xs font-black text-ink-500">{label}</p>
            <p className="mt-1 break-words text-sm font-black leading-6 text-ink-900">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function summarizeLlmRuns(runs: Array<{ status: string; schemaStatus: string; provider: string; createdAt: string }>) {
  const successCount = runs.filter((run) => run.status === "success").length;
  const fallbackCount = runs.filter((run) => run.status === "fallback").length;
  const failedCount = runs.filter((run) => run.status === "failed").length;
  const schemaIssueCount = runs.filter((run) => run.schemaStatus === "failed").length;
  const latest = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    totalCount: runs.length,
    successCount,
    fallbackCount,
    failedCount,
    schemaIssueCount,
    valueLabel: runs.length ? `${successCount}/${runs.length}` : "暂无",
    detailLabel: runs.length ? `成功 ${successCount} 次，降级 ${fallbackCount} 次，失败 ${failedCount} 次` : "生成 AI 草稿后会统计 provider、fallback 和 schema 状态",
    latestLabel: latest ? `${llmStatusLabel(latest.status)} · ${latest.provider}` : "暂无运行记录"
  };
}

function llmStatusLabel(status: string) {
  if (status === "success") return "成功";
  if (status === "fallback") return "降级";
  if (status === "failed") return "失败";
  return status;
}

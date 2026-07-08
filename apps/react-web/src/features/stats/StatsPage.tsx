import { BarChart3, BookOpen, BriefcaseBusiness, ClipboardCheck, MessageCircleQuestion, ShieldCheck, UserRound, WifiOff, type LucideIcon } from "lucide-react";
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

    return {
      coach,
      learning,
      interview,
      applications,
      review,
      evidenceCount,
      completedCount
    };
  }, [aiArtifacts, coachScheduleEvents, completed, evidenceByTaskId, knowledgeBoundaries, llmRuns, sprint, userProfiles]);

  const headlineRows = [
    { label: "今日完成", value: `${sprint.progress.done}/${sprint.progress.total}`, detail: `${sprint.progress.pending} 项待推进，${sprint.progress.evidenceMissing} 项缺证据` },
    { label: "Evidence Gate", value: `${stats.evidenceCount} 条`, detail: `本地完成记录 ${stats.completedCount} 项，延期 ${delayRecords.length} 条` },
    { label: "画像完整度", value: stats.coach.activeProfile ? "已建立" : "未建立", detail: stats.coach.activeProfile ? `${stats.coach.activeProfile.targetRole} · ${stats.coach.boundaries.length} 条边界` : "先到画像页建立求职画像" },
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

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="核心统计">
          {headlineRows.map((row) => (
            <MetricTile key={row.label} label={row.label} value={row.value} detail={row.detail} icon={row.icon} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
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

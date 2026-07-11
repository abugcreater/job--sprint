import { ArrowRight, CalendarPlus, CheckCircle2, CircleDot, Clock3, FileText, Route, ShieldCheck, Sparkles, Upload, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildCoachDashboard } from "../../data/coachAdapter";
import { getLegacySnapshot, getLegacyStorageStatus } from "../../data/legacyAdapters";
import { getEvidenceSummary } from "../../data/scheduleAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import type { DelayRecord, EvidenceType, Task } from "../../types/sprint";
import { CurrentTaskCard } from "./components/CurrentTaskCard";
import { EvidenceGate } from "./components/EvidenceGate";
import { ProgressDashboard } from "./components/ProgressDashboard";
import { OralPracticeCard, RiskPanel } from "./components/RiskAndOralPanels";

export function TodayPage() {
  const sprint = useSprintStore((state) => state.sprint);
  const syncState = useSprintStore((state) => state.syncState);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const knowledgeBoundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const coachScheduleEvents = useSprintStore((state) => state.coachScheduleEvents);
  const aiArtifacts = useSprintStore((state) => state.aiArtifacts);
  const lastSavedAt = useSprintStore((state) => state.lastSavedAt);
  const delayRecords = useSprintStore((state) => state.delayRecords);
  const toggleTaskCompletion = useSprintStore((state) => state.toggleTaskCompletion);
  const addEvidence = useSprintStore((state) => state.addEvidence);
  const addDelayRecord = useSprintStore((state) => state.addDelayRecord);
  const legacyStatus = getLegacyStorageStatus();
  const legacySnapshot = getLegacySnapshot();
  const currentTask = sprint.tasks.find((task) => task.id === sprint.currentTaskId);
  const nextTask = sprint.tasks.find((task) => task.id === sprint.nextTaskId);
  const coachDashboard = useMemo(
    () => buildCoachDashboard({ profiles: userProfiles, boundaries: knowledgeBoundaries, scheduleEvents: coachScheduleEvents, artifacts: aiArtifacts }),
    [aiArtifacts, coachScheduleEvents, knowledgeBoundaries, userProfiles]
  );
  const hasActiveProfile = Boolean(coachDashboard.activeProfile);
  const needsSetup = !hasActiveProfile || sprint.tasks.length === 0;
  const evidenceSummary = currentTask
    ? getEvidenceSummary(currentTask.id, sprint.date, evidenceByTaskId, legacySnapshot)
    : { evidence: [], hasEvidence: false, summary: "今日暂无任务，进入复盘即可。" };
  const completionRate = sprint.progress.total ? Math.round((sprint.progress.done / sprint.progress.total) * 100) : 0;
  const requiredEvidenceCount = currentTask?.evidenceRequired.length ?? 0;
  const availableEvidenceTypes = new Set(evidenceSummary.evidence.map((item) => item.type));
  const readyEvidenceCount = currentTask?.evidenceRequired.filter((type) => availableEvidenceTypes.has(type)).length ?? 0;

  const handleAddEvidence = (type: EvidenceType, title: string, content: string) => {
    if (!currentTask) return;
    addEvidence(currentTask.id, type, title, content);
  };

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="page-intro motion-enter">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">{sprint.date} {sprint.weekday} · Today</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-ink-950 md:text-[44px]">今日 AI 教练</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500 md:text-base">
                {needsSetup ? "先建立你的求职基线，再让每一天只推进一个可验证动作。" : `${sprint.theme}。先完成当前任务，再用 Evidence Gate 留下可复盘证据。`}
              </p>
            </div>
          </div>
        </header>

        {needsSetup ? (
          <TodaySetupPanel
            hasProfile={hasActiveProfile}
            boundaryCount={coachDashboard.boundaries.length}
            profileName={coachDashboard.activeProfile?.targetRole}
          />
        ) : (
          <div className="grid gap-5 motion-enter-delayed">
        <div className="hidden md:block">
          <ProgressDashboard
            sprint={sprint}
            syncState={syncState}
            detectedLegacyKeys={legacyStatus.detectedKeys}
            lastSavedAt={lastSavedAt}
            metrics={[
              { label: "今日目标", value: `${sprint.progress.done}/${sprint.progress.total}`, detail: `${completionRate}% 已完成`, tone: "brand", progress: completionRate },
              { label: "当前证据", value: `${evidenceSummary.evidence.length} 条`, detail: requiredEvidenceCount ? `覆盖 ${readyEvidenceCount}/${requiredEvidenceCount} 类要求` : "当前任务未配置证据类型", tone: evidenceSummary.hasEvidence ? "success" : "warn" },
              { label: "计划投入", value: focusDurationLabel(currentTask), detail: currentTask?.durationLabel ?? "等待任务", tone: "info" },
              { label: "计划周期", value: `Day ${sprint.day}`, detail: `共 ${sprint.totalDays} 天`, tone: "brand", progress: Math.round((sprint.day / sprint.totalDays) * 100) }
            ]}
          />
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.68fr)]">
          <div className="space-y-5">
            <CurrentTaskCard
              task={currentTask}
              hasEvidence={evidenceSummary.hasEvidence}
              evidenceCount={evidenceSummary.evidence.length}
              onToggleComplete={() => currentTask && toggleTaskCompletion(currentTask.id)}
            />
            <EvidenceGate task={currentTask} evidence={evidenceSummary.evidence} summary={evidenceSummary.summary} onAddEvidence={handleAddEvidence} />
          </div>

          <TodayContextRail
            advice={buildCoachAdvice(currentTask, evidenceSummary.hasEvidence, sprint.progress.evidenceMissing, coachDashboard)}
            currentTask={currentTask}
            nextTask={nextTask}
            mustAnswer={sprint.mustAnswer}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3" aria-label="今日支持工具">
          <RiskPanel risks={sprint.risks} />
          <OralPracticeCard task={currentTask} onAddEvidence={handleAddEvidence} />
          <DelayPanel task={currentTask} date={sprint.date} records={delayRecords} onAddDelay={addDelayRecord} />
        </section>
          </div>
        )}
      </section>
    </main>
  );
}

function TodaySetupPanel({ hasProfile, boundaryCount, profileName }: { hasProfile: boolean; boundaryCount: number; profileName?: string }) {
  const steps = [
    {
      icon: <Upload size={18} aria-hidden="true" />,
      title: "导入简历或 JD",
      detail: "粘贴简历、JD 或面试反馈，先生成画像建议。",
      done: hasProfile
    },
    {
      icon: <UserRound size={18} aria-hidden="true" />,
      title: "确认求职画像",
      detail: hasProfile ? `当前画像：${profileName ?? "已保存画像"}` : "确认目标岗位、城市、经验摘要和不可夸大边界。",
      done: hasProfile
    },
    {
      icon: <CalendarPlus size={18} aria-hidden="true" />,
      title: "生成今日日历",
      detail: boundaryCount ? "采纳知识边界后，生成今天的个人行动。" : "先采纳至少一条知识边界，再生成今日行动。",
      done: false
    }
  ];

  return (
    <section className="overflow-hidden rounded-workbench border border-line bg-white shadow-panel motion-enter-delayed xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.7fr)]">
      <article className="relative overflow-hidden bg-ink-950 p-6 text-white md:p-9 xl:min-h-[430px]">
        <div className="absolute inset-y-0 right-0 w-1 bg-brand-600" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-100">01 / 建立个人基线</p>
        <h2 className="mt-5 max-w-2xl text-3xl font-black leading-[1.15] tracking-[-0.035em] md:text-5xl">
          {hasProfile ? "画像已经就绪，现在生成今天的唯一行动。" : "先导入真实经历，再开始今天的求职推进。"}
        </h2>
        <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-ink-200 md:text-base">
          今日页只使用你自己的画像和日历，不加载示例任务、旧日程或其他账号的数据。系统先理解目标岗位与经历边界，再安排可验证动作。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to={hasProfile ? "/coach" : "/coach?entry=resume-import"} className="primary-button bg-brand-600 shadow-none hover:bg-brand-700">
            <Upload size={17} aria-hidden="true" />
            {hasProfile ? "生成今日日历" : "导入简历或 JD"}
          </Link>
          <Link to="/coach" className="secondary-button border-white/20 bg-white/5 text-white hover:bg-white/10">
            查看画像设置
          </Link>
        </div>
        <div className="mt-8 flex items-start gap-3 border-t border-white/10 pt-5 text-xs font-bold leading-5 text-ink-300">
          <ShieldCheck className="mt-0.5 shrink-0 text-brand-100" size={17} aria-hidden="true" />
          <p>未建立画像前不展示任何演示数据；本地模式仍可继续记录。</p>
        </div>
      </article>

      <aside className="p-6 md:p-8" aria-label="开始顺序">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-500">Setup path</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-ink-950">三步进入今天的行动</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-4 py-5" aria-current={!step.done && (index === 0 || hasProfile) ? "step" : undefined}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-full border text-sm font-black ${step.done ? "border-success-600 bg-success-100 text-success-600" : index === 0 || hasProfile ? "border-brand-600 bg-brand-100 text-brand-700" : "border-line bg-surface-0 text-ink-400"}`}>
                {step.done ? <CheckCircle2 size={18} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-ink-950">{step.title}</p>
                  {index === 0 && !hasProfile ? <span className="text-[10px] font-black uppercase tracking-wide text-brand-700">当前</span> : null}
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function buildCoachAdvice(task: Task | undefined, hasEvidence: boolean, evidenceMissing: number, coachDashboard: ReturnType<typeof buildCoachDashboard>): string {
  if (!coachDashboard.activeProfile) return "先保存求职画像，今日建议才能引用你的目标岗位、城市、时间投入和不可夸大边界。";
  if (!coachDashboard.boundaries.length) return `「${coachDashboard.activeProfile.targetRole}」画像已就绪，下一步先补一条知识边界。`;
  if (coachDashboard.draftArtifacts.length) return `有 ${coachDashboard.draftArtifacts.length} 条 AI 建议待确认，先接受、编辑或拒绝，再进入执行。`;
  if (!task) return "今日没有可执行任务，先进入复盘确认明日计划。";
  if (!hasEvidence) return `先为「${task.title}」补一条可读回证据，再标记完成。`;
  if (evidenceMissing > 0) return `「${task.title}」已有证据，继续补齐口述或复盘证据会让闭环更稳。`;
  return `「${task.title}」证据已就绪，可以标记完成并进入复盘。`;
}

function TodayContextRail({
  advice,
  currentTask,
  nextTask,
  mustAnswer
}: {
  advice: string;
  currentTask?: Task;
  nextTask?: Task;
  mustAnswer: string[];
}) {
  return (
    <aside className="context-rail" aria-label="今日任务上下文">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles size={18} aria-hidden="true" />
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-ink-500">教练判断</h2>
      </div>
      <p className="mt-4 text-base font-black leading-7 text-ink-950">{advice}</p>
      <Link to="/coach" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-black text-brand-700 transition hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600">
        查看画像与建议 <ArrowRight size={15} aria-hidden="true" />
      </Link>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2 text-ink-500">
          <ArrowRight size={16} aria-hidden="true" />
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">下一动作</h2>
        </div>
        <p className="mt-3 text-sm font-black leading-6 text-ink-950">{nextTask?.title ?? "完成当前任务后进入今日复盘"}</p>
        {nextTask ? <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">{nextTask.durationLabel} · {nextTask.tags[0] ?? nextTask.type}</p> : null}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2 text-ink-500">
          <CircleDot size={16} aria-hidden="true" />
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">必须回答</h2>
        </div>
        <ol className="mt-3 space-y-3">
          {mustAnswer.slice(0, 3).map((item, index) => (
            <li key={item} className="flex gap-3 text-sm font-bold leading-6 text-ink-700">
              <span className="shrink-0 text-xs font-black text-brand-700">0{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2 text-ink-500">
          <Route size={16} aria-hidden="true" />
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">资料入口</h2>
        </div>
        {(currentTask?.sourceLabels ?? []).length ? (
          <ul className="mt-3 space-y-2">
            {(currentTask?.sourceLabels ?? []).slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2 text-xs font-semibold leading-5 text-ink-600">
                <FileText className="mt-0.5 shrink-0 text-brand-700" size={14} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-xs font-semibold leading-5 text-ink-500">当前任务没有额外资料，先完成可验证产出。</p>}
      </div>
    </aside>
  );
}

function DelayPanel({
  task,
  date,
  records,
  onAddDelay
}: {
  task?: Task;
  date: string;
  records: DelayRecord[];
  onAddDelay: (record: Pick<DelayRecord, "taskId" | "date" | "minutes" | "reason" | "recoveryAction">) => void;
}) {
  const [minutes, setMinutes] = useState("30");
  const [reason, setReason] = useState("");
  const [recoveryAction, setRecoveryAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const latest = records[0];

  const handleSubmit = () => {
    const parsedMinutes = Math.max(1, Math.round(Number(minutes) || 0));
    const trimmedReason = reason.trim();
    const trimmedRecovery = recoveryAction.trim();
    if (!trimmedReason || !trimmedRecovery) {
      setValidationMessage(!trimmedReason && !trimmedRecovery ? "请填写延期原因和补救动作。" : !trimmedReason ? "请填写延期原因。" : "请填写补救动作。");
      setFeedback("");
      return;
    }
    onAddDelay({
      taskId: task?.id,
      date,
      minutes: parsedMinutes,
      reason: trimmedReason,
      recoveryAction: trimmedRecovery
    });
    setFeedback(`已登记延期：${parsedMinutes} 分钟，${trimmedReason}。本地已保存，可继续推进。`);
    setValidationMessage("");
    setReason("");
    setRecoveryAction("");
    setMinutes("30");
  };

  return (
    <section className="command-panel" aria-labelledby="delay-panel-title">
      <div className="flex items-center gap-2 text-warn-600">
        <Clock3 size={19} aria-hidden="true" />
        <h2 id="delay-panel-title" className="text-lg font-black text-ink-900">
          延期记录
        </h2>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-ink-700">
          延期分钟
          <input
            className="field-control"
            min="1"
            inputMode="numeric"
            type="number"
            value={minutes}
            onChange={(event) => {
              setMinutes(event.target.value);
              setValidationMessage("");
            }}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink-700">
          延期原因
          <input
            className="field-control"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setValidationMessage("");
            }}
            placeholder="例如临时面试或环境故障"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-ink-700">
          补救动作
          <input
            className="field-control"
            value={recoveryAction}
            onChange={(event) => {
              setRecoveryAction(event.target.value);
              setValidationMessage("");
            }}
            placeholder="例如今晚补复盘并写证据"
          />
        </label>
        <p className={`text-xs font-bold leading-5 ${validationMessage ? "text-risk-600" : "text-ink-500"}`} aria-live="polite">
          {validationMessage || "填写原因和补救动作后会记录到今日延期日志。"}
        </p>
        <button
          type="button"
          className="touch-button bg-warn-600 px-3 text-white hover:opacity-90 focus:ring-warn-600"
          onClick={handleSubmit}
        >
          <Clock3 size={16} aria-hidden="true" />
          登记延期
        </button>
      </div>
      {latest ? (
        <article className="mt-4 rounded-card bg-warn-100 p-3">
          <p className="text-xs font-black uppercase text-warn-600">最近延期</p>
          <p className="mt-1 text-sm font-extrabold leading-6 text-ink-900">
            {latest.minutes} 分钟 · {latest.reason}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink-700">{latest.recoveryAction}</p>
        </article>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-ink-500">暂无延期记录。</p>
      )}
      {feedback ? (
        <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

function focusDurationLabel(task?: Task): string {
  if (!task) return "0 分钟";
  const minutes = durationMinutes(task.startAt, task.endAt);
  return minutes ? `${minutes} 分钟` : task.durationLabel;
}

function durationMinutes(startAt: string, endAt: string): number {
  const start = parseTime(startAt);
  const end = parseTime(endAt);
  if (!start || !end || end <= start) return 0;
  return end - start;
}

function parseTime(value: string): number {
  const match = value.match(/(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

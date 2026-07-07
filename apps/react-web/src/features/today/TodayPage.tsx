import { AlertTriangle, ArrowRight, CircleDot, Clock3, CloudOff, FileText, RefreshCw, Route, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  const evidenceSummary = currentTask
    ? getEvidenceSummary(currentTask.id, sprint.date, evidenceByTaskId, legacySnapshot)
    : { evidence: [], hasEvidence: false, summary: "今日暂无任务，进入复盘即可。" };
  const completionRate = sprint.progress.total ? Math.round((sprint.progress.done / sprint.progress.total) * 100) : 0;
  const requiredEvidenceCount = Math.max(currentTask?.evidenceRequired.length ?? 0, 4);
  const readyEvidenceCount = Math.min(evidenceSummary.evidence.length, requiredEvidenceCount);
  const currentTaskProgress = currentTask?.status === "done" ? 100 : evidenceSummary.hasEvidence ? 60 : 35;

  const handleAddEvidence = (type: EvidenceType, title: string, content: string) => {
    if (!currentTask) return;
    addEvidence(currentTask.id, type, title, content);
  };

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-brand-700">{sprint.date} {sprint.weekday}</p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-ink-900 md:text-4xl">今日 AI 教练</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                {sprint.theme}。先确认下一步建议，再完成任务并补齐 Evidence Gate。
              </p>
            </div>
            <SyncRecoveryPill syncState={syncState} lastSavedAt={lastSavedAt} />
          </div>
        </header>

        <div className="order-2 md:order-none">
          <ProgressDashboard
            sprint={sprint}
            syncState={syncState}
            detectedLegacyKeys={legacyStatus.detectedKeys}
            lastSavedAt={lastSavedAt}
            metrics={[
              { label: "今日目标", value: `${sprint.progress.done}/${sprint.progress.total}`, detail: `${completionRate}% 已完成`, tone: "brand", progress: completionRate },
              { label: "Evidence Gate", value: `${readyEvidenceCount}/${requiredEvidenceCount}`, detail: sprint.progress.evidenceMissing ? "仍需补证据" : "今日证据就绪", tone: sprint.progress.evidenceMissing ? "warn" : "success", progress: Math.round((readyEvidenceCount / requiredEvidenceCount) * 100) },
              { label: "专注时长", value: focusDurationLabel(currentTask), detail: currentTask?.durationLabel ?? "等待任务", tone: "info", progress: currentTaskProgress },
              { label: "已完成", value: `${sprint.progress.done} 个`, detail: `待完成 ${sprint.progress.pending} 个`, tone: "success", progress: completionRate }
            ]}
          />
        </div>

        <section className="order-1 grid gap-4 md:order-none xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
          <div className="space-y-4">
            <CurrentTaskCard
              task={currentTask}
              hasEvidence={evidenceSummary.hasEvidence}
              progressPercent={currentTaskProgress}
              evidenceCount={evidenceSummary.evidence.length}
              onToggleComplete={() => currentTask && toggleTaskCompletion(currentTask.id)}
            />
            <EvidenceGate task={currentTask} evidence={evidenceSummary.evidence} summary={evidenceSummary.summary} onAddEvidence={handleAddEvidence} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <RiskPanel risks={sprint.risks} />
            <DelayPanel task={currentTask} date={sprint.date} records={delayRecords} onAddDelay={addDelayRecord} />
            <OralPracticeCard task={currentTask} onAddEvidence={handleAddEvidence} />
          </div>
        </section>

        <section className="order-3 grid gap-4 md:order-none lg:grid-cols-2 xl:grid-cols-4" aria-label="今日辅助信息">
          <InfoPanel title="AI 教练建议" icon={<Sparkles size={18} aria-hidden="true" />}>
            <p className="text-sm font-bold leading-6 text-ink-700">
              {buildCoachAdvice(currentTask, evidenceSummary.hasEvidence, sprint.progress.evidenceMissing, coachDashboard)}
            </p>
            <Link to="/coach" className="secondary-button mt-3 min-h-10 px-3 text-sm">
              <ArrowRight size={15} aria-hidden="true" />
              进入画像
            </Link>
          </InfoPanel>

          <InfoPanel title="下一任务" icon={<ArrowRight size={18} aria-hidden="true" />}>
            {nextTask ? (
              <>
                <p className="text-base font-black text-ink-900">{nextTask.title}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
                  {nextTask.durationLabel} · {nextTask.tags[0] ?? nextTask.type}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold leading-6 text-ink-500">没有后续任务，优先完成复盘。</p>
            )}
          </InfoPanel>

          <InfoPanel title="今日必须回答" icon={<CircleDot size={18} aria-hidden="true" />}>
            <ul className="space-y-2">
              {sprint.mustAnswer.slice(0, 3).map((item) => (
                <li key={item} className="text-sm font-bold leading-6 text-ink-700">
                  {item}
                </li>
              ))}
            </ul>
          </InfoPanel>

          <InfoPanel title="资料入口" icon={<Route size={18} aria-hidden="true" />}>
            <ul className="space-y-2">
              {(currentTask?.sourceLabels ?? []).slice(0, 3).map((item) => (
                <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-ink-700">
                  <FileText className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </InfoPanel>
        </section>
      </section>
    </main>
  );
}

function buildCoachAdvice(task: Task | undefined, hasEvidence: boolean, evidenceMissing: number, coachDashboard: ReturnType<typeof buildCoachDashboard>): string {
  if (!coachDashboard.activeProfile) return "先保存目标画像，今日建议才能引用你的目标岗位、城市、时间投入和不可夸大边界。";
  if (!coachDashboard.boundaries.length) return `「${coachDashboard.activeProfile.targetRole}」画像已就绪，下一步先补一条知识边界。`;
  if (coachDashboard.draftArtifacts.length) return `有 ${coachDashboard.draftArtifacts.length} 条 AI 草稿待确认，先接受、编辑或拒绝，再进入执行。`;
  if (!task) return "今日没有可执行任务，先进入复盘确认明日计划。";
  if (!hasEvidence) return `先为「${task.title}」补一条可读回证据，再标记完成。`;
  if (evidenceMissing > 0) return `「${task.title}」已有证据，继续补齐口述或复盘证据会让闭环更稳。`;
  return `「${task.title}」证据已就绪，可以标记完成并进入复盘归因。`;
}

function SyncRecoveryPill({ syncState, lastSavedAt }: { syncState: string; lastSavedAt?: string }) {
  const isOffline = syncState === "local_fallback" || syncState === "failed" || syncState === "conflict";
  const tone = syncState === "failed" || syncState === "conflict" ? "bg-risk-100 text-risk-600" : isOffline ? "bg-warn-100 text-warn-600" : "bg-success-100 text-success-600";
  const label = syncState === "online" ? "服务端在线" : syncState === "syncing" ? "同步中" : syncState === "failed" ? "同步失败" : syncState === "conflict" ? "待合并" : "本地模式";
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface-0 p-3 lg:items-end">
      <span className={`status-chip ${tone}`}>
        {isOffline ? <CloudOff size={14} aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}
        {label}
      </span>
      <p className="text-xs font-semibold text-ink-500">
        {lastSavedAt ? `本地保存 ${formatTime(lastSavedAt)}` : isOffline ? "可继续本地记录，数据不会丢失" : "同步状态正常"}
      </p>
      {isOffline ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => setMessage("当前可继续本地记录；恢复服务端后会按本地数据继续同步。")}>
            <AlertTriangle size={14} aria-hidden="true" />
            查看原因
          </button>
          <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => setMessage("已请求重试同步；若仍显示本地模式，请继续记录，稍后刷新页面复查。")}>
            <RefreshCw size={14} aria-hidden="true" />
            重试同步
          </button>
        </div>
      ) : null}
      {message ? <p className="max-w-xs text-xs font-bold leading-5 text-ink-700" aria-live="polite">{message}</p> : null}
    </div>
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

function HeaderChip({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.08] p-3">
      <p className="text-[11px] uppercase text-white/45">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm leading-5 text-white">
        {icon}
        <span className="line-clamp-2">{value}</span>
      </p>
    </div>
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

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function InfoPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <article className="command-panel transition-shadow duration-200">
      <div className="mb-3 flex items-center gap-2 text-brand-700">
        {icon}
        <h2 className="text-sm font-black uppercase text-ink-500">{title}</h2>
      </div>
      {children}
    </article>
  );
}

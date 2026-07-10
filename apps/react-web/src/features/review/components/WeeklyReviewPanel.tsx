import { AlertTriangle, CalendarDays, CheckCircle2, Save, Target } from "lucide-react";
import type { ReactNode } from "react";
import type { CoachOutcomeReport } from "../../../api/coachOutcomesClient";
import type { WeeklyReviewAnalysis } from "../../../data/weeklyReviewAdapter";

export type ServerOutcomeStatus = "idle" | "loading" | "ready" | "saving" | "saved" | "local" | "error";

export function WeeklyReviewPanel({
  analysis,
  serverOutcome,
  serverStatus = "idle",
  onSaveServerSnapshot
}: {
  analysis: WeeklyReviewAnalysis;
  serverOutcome?: CoachOutcomeReport | null;
  serverStatus?: ServerOutcomeStatus;
  onSaveServerSnapshot?: () => void;
}) {
  const snapshotHintId = "weekly-review-snapshot-action";
  const canSaveSnapshot = Boolean(onSaveServerSnapshot) && (serverStatus === "ready" || serverStatus === "saved");
  const snapshotHint = serverOutcomeActionHint(serverStatus, Boolean(onSaveServerSnapshot));

  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="weekly-review-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <CalendarDays size={18} aria-hidden="true" />
            <h2 id="weekly-review-title" className="text-base font-black text-ink-900">本周复盘</h2>
          </div>
          <p className="mt-2 text-xs font-bold text-ink-500">{analysis.dateRangeLabel}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">{analysis.summary}</p>
        </div>
        <div className="rounded-card bg-brand-100 px-4 py-3 text-right">
          <p className="text-xs font-black text-brand-700">闭环分</p>
          <p className="mt-1 text-3xl font-black text-ink-900">{analysis.score}</p>
          <p className="text-xs font-bold text-ink-500">{analysis.scoreLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {analysis.metrics.map((metric) => (
          <div key={metric.label} className="rounded-card bg-surface-0 p-3">
            <p className="text-[11px] font-black text-ink-500">{metric.label}</p>
            <p className="mt-1 text-sm font-extrabold text-ink-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <WeeklyList icon={<CheckCircle2 size={16} aria-hidden="true" />} title="有效信号" items={analysis.signals} />
        <WeeklyList icon={<AlertTriangle size={16} aria-hidden="true" />} title="结果风险" items={analysis.risks} />
        <WeeklyList icon={<Target size={16} aria-hidden="true" />} title="下周焦点" items={analysis.nextWeekFocus} />
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface-0 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black text-ink-900">结果归因</p>
            <p className="mt-1 text-xs font-bold leading-5 text-ink-500">
              {serverOutcome ? serverOutcome.summary : serverOutcomeStatusLabel(serverStatus)}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-xs font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:cursor-not-allowed disabled:text-ink-300"
            aria-describedby={snapshotHintId}
            disabled={!canSaveSnapshot}
            onClick={onSaveServerSnapshot}
          >
            <Save size={14} aria-hidden="true" />
            保存结果快照
          </button>
        </div>
        <p id={snapshotHintId} className="mt-3 rounded-control bg-white px-3 py-2 text-xs font-bold leading-5 text-ink-500" role="status" aria-live="polite">
          {snapshotHint}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SmallMetric label="有效推进" value={serverOutcome ? `${serverOutcome.metrics.effectiveActionCount} 项` : "待同步"} />
          <SmallMetric label="采纳后完成" value={serverOutcome?.metrics.acceptedScheduleCompletionRateLabel ?? "待同步"} />
          <SmallMetric label="面试复盘" value={serverOutcome?.metrics.interviewReviewRateLabel ?? "待同步"} />
        </div>
      </div>
    </article>
  );
}

function serverOutcomeActionHint(status: ServerOutcomeStatus, hasSaveAction: boolean): string {
  if (!hasSaveAction) return "当前入口缺少保存动作，不能写入服务端周结果快照。";
  if (status === "loading") return "正在读取周结果，读取完成后才能保存快照。";
  if (status === "saving") return "正在写入服务端周结果快照。";
  if (status === "local") return "本地模式不会写服务端快照；恢复服务端后再同步本周结果。";
  if (status === "error") return "服务端周结果暂不可用；先保留本地复盘，恢复后再保存快照。";
  if (status === "ready") return "保存会把本周有效推进、采纳后完成和面试复盘率写入服务端快照。";
  if (status === "saved") return "快照已保存；再次保存会刷新本周服务端结果快照。";
  return "等待周结果读取完成后再保存快照。";
}

function serverOutcomeStatusLabel(status: ServerOutcomeStatus): string {
  if (status === "loading") return "正在读取周结果。";
  if (status === "saving") return "正在保存周结果快照。";
  if (status === "saved") return "周结果快照已保存。";
  if (status === "error") return "周结果暂不可用，已保留当前复盘。";
  if (status === "local") return "当前可继续记录，稍后可同步结果快照。";
  return "等待周结果。";
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-white p-3">
      <p className="text-[11px] font-black text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

function WeeklyList({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <section className="rounded-card bg-surface-0 p-3">
      <div className="flex items-center gap-2 text-brand-700">
        {icon}
        <h3 className="text-sm font-black text-ink-900">{title}</h3>
      </div>
      <ul className="mt-2 space-y-2">
        {(items.length ? items : ["暂无足够数据。"]).map((item) => (
          <li key={item} className="text-xs font-semibold leading-5 text-ink-600">{item}</li>
        ))}
      </ul>
    </section>
  );
}

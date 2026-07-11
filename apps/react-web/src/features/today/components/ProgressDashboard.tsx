import { CheckCircle2, Cloud, DatabaseZap, Gauge, Target } from "lucide-react";
import type { ReactNode } from "react";
import type { DailySprint, SyncState } from "../../../types/sprint";

type MetricTone = "brand" | "success" | "warn" | "risk" | "info";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone?: MetricTone;
  progress?: number;
};

interface ProgressDashboardProps {
  sprint: DailySprint;
  syncState: SyncState;
  detectedLegacyKeys: string[];
  lastSavedAt?: string;
  metrics?: DashboardMetric[];
}

const syncLabels: Record<SyncState, string> = {
  online: "服务端在线",
  local_fallback: "本地模式",
  syncing: "同步中",
  failed: "同步失败",
  conflict: "待合并"
};

export function ProgressDashboard({ sprint, syncState, detectedLegacyKeys, lastSavedAt, metrics }: ProgressDashboardProps) {
  const completionRate = sprint.progress.total ? Math.round((sprint.progress.done / sprint.progress.total) * 100) : 0;
  const rows = metrics ?? [
    {
      label: "完成进度",
      value: `${completionRate}%`,
      detail: `已完成 ${sprint.progress.done}，待完成 ${sprint.progress.pending}`,
      tone: "brand" as const,
      progress: completionRate
    },
    {
      label: "Evidence Gate",
      value: sprint.progress.evidenceMissing ? `缺 ${sprint.progress.evidenceMissing}` : "已就绪",
      detail: sprint.progress.evidenceMissing ? "完成前先补证据" : "今日证据可支撑完成",
      tone: sprint.progress.evidenceMissing ? "warn" as const : "success" as const,
      progress: sprint.progress.evidenceMissing ? undefined : 100
    },
    {
      label: "同步状态",
      value: syncLabels[syncState],
      detail: lastSavedAt ? `本地保存 ${formatSavedAt(lastSavedAt)}` : legacyDetail(detectedLegacyKeys),
      tone: syncState === "failed" || syncState === "conflict" ? "risk" as const : "info" as const,
      progress: syncState === "online" ? 100 : undefined
    },
    {
      label: "计划日程",
      value: `Day ${sprint.day}/${sprint.totalDays}`,
      detail: `${sprint.weekday} · ${sprint.date}`,
      tone: "brand" as const,
      progress: Math.round((sprint.day / sprint.totalDays) * 100)
    }
  ];

  return (
    <section className="status-strip" aria-label="今日 AI 教练状态带">
      {rows.map((row) => (
        <MetricCard key={row.label} icon={iconForMetric(row.label, syncState)} {...row} />
      ))}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "brand",
  progress
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: MetricTone;
  progress?: number;
}) {
  const toneClass = {
    brand: "text-brand-700 bg-brand-100",
    success: "text-success-600 bg-success-100",
    warn: "text-warn-600 bg-warn-100",
    risk: "text-risk-600 bg-risk-100",
    info: "text-info-600 bg-info-100"
  }[tone];

  return (
    <article>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-ink-500">{label}</p>
        <span className={`grid size-7 place-items-center rounded-control ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xl font-black tracking-[-0.025em] text-ink-950 md:text-2xl">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">{detail}</p>
      {typeof progress === "number" ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-0" aria-hidden="true">
          <div className={`h-full rounded-full ${progressTone(tone)}`} style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
      ) : null}
    </article>
  );
}

function iconForMetric(label: string, syncState: SyncState): ReactNode {
  if (label.includes("Evidence")) return <Target size={18} aria-hidden="true" />;
  if (label.includes("同步")) return syncState === "local_fallback" ? <DatabaseZap size={18} aria-hidden="true" /> : <Cloud size={18} aria-hidden="true" />;
  if (label.includes("完成") || label.includes("目标")) return <CheckCircle2 size={18} aria-hidden="true" />;
  return <Gauge size={18} aria-hidden="true" />;
}

function progressTone(tone: MetricTone): string {
  return {
    brand: "bg-brand-700",
    success: "bg-success-600",
    warn: "bg-warn-600",
    risk: "bg-risk-600",
    info: "bg-info-600"
  }[tone];
}

function legacyDetail(keys: string[]): string {
  if (!keys.length) return "未检测到旧版本地记录";
  return `检测到旧记录 ${keys.length} 项`;
}

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

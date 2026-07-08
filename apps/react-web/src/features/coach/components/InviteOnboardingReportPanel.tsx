import { RefreshCcw, UsersRound } from "lucide-react";
import type { CoachOnboardingReportResponse } from "../../../api/coachOnboardingReportClient";
import { MetricTile, PanelTitle } from "./CoachPrimitives";

export function InviteOnboardingReportPanel({
  report,
  status,
  onRefresh
}: {
  report: CoachOnboardingReportResponse | null;
  status: "idle" | "loading" | "ready" | "local" | "error";
  onRefresh: () => void;
}) {
  const summary = report?.summary;
  return (
    <article className="command-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <PanelTitle icon={<UsersRound size={18} aria-hidden="true" />} title="管理员建档批次看板" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
            按账号数据域和批次查看建档完成、放弃点和风险。
          </p>
        </div>
        <button type="button" className="secondary-button min-h-10 px-3" onClick={onRefresh} disabled={status === "loading"}>
          <RefreshCcw size={15} aria-hidden="true" />
          {status === "loading" ? "读取中" : "刷新报表"}
        </button>
      </div>

      {summary ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="账号数" value={`${summary.totalUsers} 人`} />
          <MetricTile label="已开始建档" value={`${summary.startedCount} 人`} />
          <MetricTile label="已完成建档" value={`${summary.completedCount} 人`} />
          <MetricTile label="完成率" value={summary.completionRateLabel} />
          <MetricTile label="最高风险" value={summary.highestRiskLabel} />
        </div>
      ) : (
        <p className="mt-4 rounded-card bg-surface-100 p-4 text-sm font-semibold leading-6 text-ink-500">
          {status === "error" ? "建档报表读取失败，请稍后刷新。" : status === "loading" ? "正在读取服务端建档报表。" : "服务端报表未连接；个人建档仍可继续。"}
        </p>
      )}

      {report?.batches.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.batches.slice(0, 4).map((batch) => (
            <div key={batch.inviteBatch} className="rounded-card border border-line bg-surface-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-ink-900">{batch.inviteBatch}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-500">放弃点：{batch.topDropOffLabel}</p>
                </div>
                <span className="status-chip bg-brand-100 text-brand-700">{batch.completionRateLabel}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-600">
                {batch.startedCount}/{batch.totalUsers} 已开始，{batch.completedCount} 已完成，最高风险 {batch.highestRiskLabel}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {report?.users.length ? (
        <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface-0">
          {report.users.slice(0, 5).map((user) => (
            <div key={`${user.dataScope}-${user.username}`} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-ink-900">{user.displayName}</p>
                <p className="mt-1 text-xs font-bold text-ink-500">{user.inviteBatch} · {user.dataScope}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="status-chip border border-line bg-white text-ink-700">{user.summary.firstLoginStatus}</span>
                <span className="status-chip border border-line bg-white text-ink-700">{user.summary.latestCompletionRateLabel}</span>
                <span className="status-chip border border-line bg-white text-ink-700">{user.summary.latestDropOffLabel}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

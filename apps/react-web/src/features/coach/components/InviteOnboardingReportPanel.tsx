import { RefreshCcw, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { CoachOnboardingReportResponse } from "../../../api/coachOnboardingReportClient";
import { MetricTile, PanelTitle } from "./CoachPrimitives";

const BATCH_PREVIEW_LIMIT = 4;
const USER_PREVIEW_LIMIT = 5;

export function InviteOnboardingReportPanel({
  report,
  status,
  onRefresh
}: {
  report: CoachOnboardingReportResponse | null;
  status: "idle" | "loading" | "ready" | "local" | "error";
  onRefresh: () => void;
}) {
  const [batchFilter, setBatchFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [dropOffFilter, setDropOffFilter] = useState("all");
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const summary = report?.summary;
  const batchOptions = useMemo(() => report?.batches.map((batch) => batch.inviteBatch).filter(Boolean) ?? [], [report]);
  const riskOptions = useMemo(() => uniqueOptions([
    ...(report?.batches.map((batch) => batch.highestRiskLabel) ?? []),
    ...(report?.users.map((user) => user.summary.highestRiskLabel || user.summary.latestRiskLabel) ?? [])
  ]), [report]);
  const dropOffOptions = useMemo(() => uniqueOptions([
    ...(report?.batches.map((batch) => batch.topDropOffLabel) ?? []),
    ...(report?.users.map((user) => user.summary.latestDropOffLabel) ?? [])
  ]), [report]);
  const filteredBatches = report?.batches.filter((batch) => matchesBatch(batch.inviteBatch, batchFilter)
    && matchesOption(batch.highestRiskLabel, riskFilter)
    && matchesOption(batch.topDropOffLabel, dropOffFilter)) ?? [];
  const filteredUsers = report?.users.filter((user) => matchesBatch(user.inviteBatch, batchFilter)
    && matchesOption(user.summary.highestRiskLabel || user.summary.latestRiskLabel, riskFilter)
    && matchesOption(user.summary.latestDropOffLabel, dropOffFilter)) ?? [];
  const visibleBatches = showAllBatches ? filteredBatches : filteredBatches.slice(0, BATCH_PREVIEW_LIMIT);
  const visibleUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, USER_PREVIEW_LIMIT);
  const hiddenBatchCount = Math.max(filteredBatches.length - BATCH_PREVIEW_LIMIT, 0);
  const hiddenUserCount = Math.max(filteredUsers.length - USER_PREVIEW_LIMIT, 0);

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

      {report ? (
        <div className="mt-4 grid gap-3 rounded-card border border-line bg-surface-0 p-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-black text-ink-700">批次筛选</span>
            <select className="field-control mt-2" value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)} aria-label="首登批次筛选">
              <option value="all">全部批次</option>
              {batchOptions.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-black text-ink-700">风险筛选</span>
            <select className="field-control mt-2" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="首登风险筛选">
              <option value="all">全部风险</option>
              {riskOptions.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-black text-ink-700">放弃点筛选</span>
            <select className="field-control mt-2" value={dropOffFilter} onChange={(event) => setDropOffFilter(event.target.value)} aria-label="首登放弃点筛选">
              <option value="all">全部放弃点</option>
              {dropOffOptions.map((dropOff) => <option key={dropOff} value={dropOff}>{dropOff}</option>)}
            </select>
          </label>
          <div className="rounded-card border border-line bg-white p-3">
            <p className="text-xs font-black text-ink-500">当前筛选</p>
            <p className="mt-1 text-sm font-black text-ink-900">{filteredBatches.length} 个批次 · {filteredUsers.length} 个用户</p>
          </div>
        </div>
      ) : null}

      {visibleBatches.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleBatches.map((batch) => (
            <div key={batch.inviteBatch} className="rounded-card border border-line bg-surface-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-ink-900">{batch.inviteBatch}</h3>
                  <p className="mt-1 text-sm font-semibold text-ink-500">放弃点：{batch.topDropOffLabel}</p>
                </div>
                <span className="status-chip bg-brand-100 text-brand-700">{batch.completionRateLabel}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-600">
                {batch.startedCount}/{batch.totalUsers} 已开始，{batch.completedCount} 已完成，最高风险 {batch.highestRiskLabel}
              </p>
            </div>
          ))}
          {filteredBatches.length > BATCH_PREVIEW_LIMIT ? (
            <div className="rounded-card border border-line bg-white p-4 text-sm font-bold text-ink-500">
              <p>{showAllBatches ? `已显示全部 ${filteredBatches.length} 个批次。` : `还有 ${hiddenBatchCount} 个批次未显示。`}</p>
              <button type="button" className="secondary-button mt-3 min-h-9 px-3 text-xs" onClick={() => setShowAllBatches((current) => !current)} aria-expanded={showAllBatches}>
                {showAllBatches ? "收起批次" : "查看全部批次"}
              </button>
            </div>
          ) : null}
        </div>
      ) : report ? (
        <p className="mt-4 rounded-card border border-line bg-white p-4 text-sm font-bold text-ink-500">
          当前筛选下没有匹配批次；可切换批次、风险或放弃点。
        </p>
      ) : null}

      {visibleUsers.length ? (
        <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface-0">
          {visibleUsers.map((user) => (
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
          {filteredUsers.length > USER_PREVIEW_LIMIT ? (
            <div className="p-4 text-sm font-bold text-ink-500">
              <p>{showAllUsers ? `已显示全部 ${filteredUsers.length} 个用户。` : `还有 ${hiddenUserCount} 个用户未显示。`}</p>
              <button type="button" className="secondary-button mt-3 min-h-9 px-3 text-xs" onClick={() => setShowAllUsers((current) => !current)} aria-expanded={showAllUsers}>
                {showAllUsers ? "收起用户" : "查看全部用户"}
              </button>
            </div>
          ) : null}
        </div>
      ) : report ? (
        <p className="mt-4 rounded-card border border-line bg-white p-4 text-sm font-bold text-ink-500">
          当前筛选下没有匹配用户；可先放宽风险或放弃点。
        </p>
      ) : null}
    </article>
  );
}

function matchesBatch(value: string, filter: string) {
  return filter === "all" || value === filter;
}

function matchesOption(value: string, filter: string) {
  return filter === "all" || value === filter;
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

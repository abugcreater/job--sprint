import { Check, Download, Filter, GitCompareArrows } from "lucide-react";
import {
  applicationStatuses,
  type ApplicationEvidenceRecord,
  type ApplicationStatus,
  type ApplicationStatusFilter
} from "../../../data/applicationsAdapter";

export function OpportunityRecordList({
  records,
  allRecordCount,
  selectedRecordId,
  comparisonIds,
  statusFilter,
  statusSummary,
  searchQuery,
  exportSummary,
  compareFeedback,
  onSelect,
  onToggleCompare,
  onSearchChange,
  onClearFilters,
  onStatusFilterChange,
  onExport
}: {
  records: ApplicationEvidenceRecord[];
  allRecordCount: number;
  selectedRecordId?: string;
  comparisonIds: string[];
  statusFilter: ApplicationStatusFilter;
  statusSummary: Array<{ status: ApplicationStatus; count: number }>;
  searchQuery: string;
  exportSummary: string;
  compareFeedback: string;
  onSelect: (record: ApplicationEvidenceRecord) => void;
  onToggleCompare: (record: ApplicationEvidenceRecord) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  onStatusFilterChange: (status: ApplicationStatusFilter) => void;
  onExport: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-workbench border border-line bg-white shadow-soft" aria-labelledby="opportunity-list-title">
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">Opportunity list</p>
            <h2 id="opportunity-list-title" className="mt-1 text-lg font-black text-ink-950">机会清单</h2>
            <p className="mt-1 text-xs font-bold text-ink-500">共 {allRecordCount} 条，当前显示 {records.length} 条</p>
          </div>
          <span className="rounded-control bg-surface-0 px-2.5 py-1.5 text-xs font-black text-ink-600">已选 {comparisonIds.length}/2</span>
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-black text-ink-500">搜索已有事实</span>
          <input className="field-control min-h-11" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="公司、岗位、城市、关键词" aria-label="搜索机会记录" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-ink-500">
            <Filter size={14} aria-hidden="true" />
            状态筛选
          </span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as ApplicationStatusFilter)}
            className="field-control min-h-11"
            aria-label="机会状态筛选"
          >
            <option value="all">全部状态</option>
            {applicationStatuses.map((status) => <option key={status} value={status}>{status} {statusSummary.find((row) => row.status === status)?.count ?? 0}</option>)}
          </select>
        </label>
      </div>

      {exportSummary ? <p className="mx-4 mt-3 rounded-control bg-success-100 px-3 py-2 text-xs font-bold text-success-600" role="status">{exportSummary}</p> : null}
      {compareFeedback ? <p className="mx-4 mt-3 rounded-control bg-warn-100 px-3 py-2 text-xs font-bold text-warn-600" role="status">{compareFeedback}</p> : null}

      {records.length ? (
        <ol className="divide-y divide-line" aria-label="机会记录">
          {records.map((record) => {
            const selected = record.id === selectedRecordId;
            const compared = comparisonIds.includes(record.id);
            const comparisonFull = comparisonIds.length >= 2 && !compared;
            return (
              <li key={record.id} className={selected ? "bg-brand-50" : "bg-white"}>
                <button
                  type="button"
                  className="w-full px-4 py-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600"
                  aria-pressed={selected}
                  aria-label={`查看机会详情：${record.company || record.title}`}
                  onClick={() => onSelect(record)}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-ink-950">{record.company || "未命名公司"}</span>
                      <span className="mt-1 block truncate text-sm font-bold text-ink-600">{record.role || "未命名岗位"}</span>
                    </span>
                    <StatusBadge status={record.status} />
                  </span>
                  <span className="mt-3 block text-xs font-bold leading-5 text-ink-500">
                    {[record.city, record.source, record.salaryRange].filter(Boolean).join(" · ") || "城市、来源和薪资待补"}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-5 text-ink-500">
                    {record.hrFeedback || record.notes || "尚未记录招聘方反馈"}
                  </span>
                </button>
                <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5">
                  <span className="text-[11px] font-bold text-ink-400">{formatRecordDate(record.createdAt)}</span>
                  <button
                    type="button"
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
                      compared ? "bg-brand-700 text-white" : "border border-line bg-white text-ink-700"
                    }`}
                    aria-pressed={compared}
                    aria-label={`${compared ? "移出对照" : "加入对照"}：${record.company || record.title}`}
                    aria-disabled={comparisonFull}
                    onClick={() => onToggleCompare(record)}
                  >
                    {compared ? <Check size={14} aria-hidden="true" /> : <GitCompareArrows size={14} aria-hidden="true" />}
                    {compared ? "已加入" : "对照"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-black text-ink-900">{allRecordCount ? "当前筛选没有记录" : "还没有机会记录"}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-ink-500">{allRecordCount ? "切换状态继续查看，不会丢失已有记录。" : "先记录公司和岗位，沟通后再补充其它事实。"}</p>
          {allRecordCount ? <button type="button" className="secondary-button mt-4" onClick={onClearFilters}>清除筛选</button> : null}
        </div>
      )}

      <div className="border-t border-line p-3">
        <button type="button" className="secondary-button w-full" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          生成本地导出
        </button>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone = status === "约面"
    ? "bg-success-100 text-success-600"
    : status === "不匹配"
      ? "bg-risk-100 text-risk-600"
      : "bg-surface-0 text-ink-600";
  return <span className={`shrink-0 rounded-control px-2 py-1 text-[11px] font-black ${tone}`}>{status}</span>;
}

function formatRecordDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

import { CheckCircle2, Download, NotebookPen, Pencil, RotateCcw, SlidersHorizontal, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  reviewRecordFilters,
  type ReviewEvidenceRecord,
  type ReviewRecordFilter
} from "../../../data/reviewAdapter";

type LocalReviewRecordsProps = {
  records: ReviewEvidenceRecord[];
  totalCount: number;
  filter: ReviewRecordFilter;
  exportPreview: string;
  onFilterChange: (filter: ReviewRecordFilter) => void;
  onExport: () => void;
  onEdit: (record: ReviewEvidenceRecord) => void;
  onDelete: (record: ReviewEvidenceRecord) => void;
  recentlyDeletedRecord?: ReviewEvidenceRecord | null;
  onDismissDeletedRecord?: () => void;
  onUndoDelete?: () => void;
};

export function LocalReviewRecords({
  records,
  totalCount,
  filter,
  exportPreview,
  onFilterChange,
  onExport,
  onEdit,
  onDelete,
  recentlyDeletedRecord,
  onDismissDeletedRecord,
  onUndoDelete
}: LocalReviewRecordsProps) {
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(null);
  const deletedRecordLabel = recentlyDeletedRecord?.projectPoint || recentlyDeletedRecord?.title || "";

  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2 text-brand-700">
          <NotebookPen size={18} aria-hidden="true" />
          <div>
            <h2 className="text-base font-black text-ink-900">复盘历史</h2>
            <p className="mt-1 text-xs font-bold text-ink-500">当前显示 {records.length}/{totalCount} 条</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface-0 px-3 text-sm font-black text-ink-700">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">复盘记录筛选</span>
            <select
              aria-label="复盘记录筛选"
              className="bg-transparent text-sm font-black text-ink-700 outline-none"
              value={filter}
              onChange={(event) => {
                setConfirmingRecordId(null);
                onFilterChange(event.target.value as ReviewRecordFilter);
              }}
            >
              {reviewRecordFilters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
            onClick={onExport}
          >
            <Download size={16} aria-hidden="true" />
            导出当前筛选
          </button>
        </div>
      </div>
      {recentlyDeletedRecord ? (
        <div className="mt-4 rounded-card border border-success-600/30 bg-success-100 p-3" role="status" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black leading-6 text-success-600">
              已删除「{deletedRecordLabel}」，可立即撤销并恢复到今日 Evidence Gate。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-success-600 px-4 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
                onClick={() => {
                  setConfirmingRecordId(null);
                  onUndoDelete?.();
                }}
              >
                <RotateCcw size={16} aria-hidden="true" />
                撤销删除
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                onClick={onDismissDeletedRecord}
              >
                <XCircle size={16} aria-hidden="true" />
                不撤销
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {records.length ? (
        <div className="mt-4 space-y-3">
          {records.map((record) => {
            const recordLabel = record.projectPoint || record.title;
            const isConfirming = confirmingRecordId === record.id;

            return (
              <div key={record.id} className="rounded-card bg-surface-0 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-ink-900">{record.title}</p>
                      <span className="rounded-control bg-white px-2 py-1 text-xs font-bold text-ink-500">{record.source === "local" ? "本机记录" : "历史记录"}</span>
                    </div>
                    {record.projectPoint ? <p className="mt-2 text-xs font-black text-brand-700">项目点：{record.projectPoint}</p> : null}
                    {record.tomorrowPriority ? <p className="mt-1 text-xs font-black text-success-600">明日优先：{record.tomorrowPriority}</p> : null}
                  </div>
                  {record.source === "local" ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-control border border-line bg-white text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        aria-label={`编辑复盘记录 ${recordLabel}`}
                        onClick={() => {
                          setConfirmingRecordId(null);
                          onEdit(record);
                        }}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-control border border-line bg-white text-risk-600 transition hover:bg-risk-100 focus:outline-none focus:ring-2 focus:ring-risk-600"
                        aria-label={`删除复盘记录 ${recordLabel}`}
                        aria-expanded={isConfirming}
                        onClick={() => setConfirmingRecordId(record.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-ink-500">{record.content}</p>
                {isConfirming ? (
                  <div className="mt-3 rounded-card border border-risk-200 bg-risk-100 p-3" role="status" aria-live="polite">
                    <p className="text-sm font-black leading-6 text-risk-600">确认删除这条本机复盘证据？删除后会从今日 Evidence Gate 移除。</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-4 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
                        aria-label={`确认删除复盘记录 ${recordLabel}`}
                        onClick={() => {
                          setConfirmingRecordId(null);
                          onDelete(record);
                        }}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        确认删除
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
                        aria-label={`取消删除复盘记录 ${recordLabel}`}
                        onClick={() => setConfirmingRecordId(null)}
                      >
                        <XCircle size={16} aria-hidden="true" />
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无符合筛选条件的复盘记录。写一条复盘后，今日 Evidence Gate 会立即更新。</p>
      )}
      {exportPreview ? (
        <div className="mt-4 rounded-card border border-line bg-ink-900 p-4 text-white">
          <p className="text-xs font-black uppercase text-brand-100">导出预览</p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-5">{exportPreview}</pre>
        </div>
      ) : null}
    </article>
  );
}

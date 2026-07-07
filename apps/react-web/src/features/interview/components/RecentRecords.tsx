import { Mic2 } from "lucide-react";
import type { OralEvidenceRecord } from "../../../data/interviewAdapter";

export function RecentRecords({ records }: { records: OralEvidenceRecord[] }) {
  return (
    <article className="command-panel">
      <div className="flex items-center gap-2 text-brand-700">
        <Mic2 size={18} aria-hidden="true" />
        <h2 className="text-base font-black text-ink-900">本地口述记录</h2>
      </div>
      {records.length ? (
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-card bg-surface-0 p-3">
              <p className="text-sm font-extrabold text-ink-900">{record.title}</p>
              {record.scoreSummary ? (
                <p className="mt-1 rounded-control bg-brand-100 px-2.5 py-1 text-xs font-black text-brand-700">{record.scoreSummary}</p>
              ) : (
                <p className="mt-1 rounded-control bg-warn-100 px-2.5 py-1 text-xs font-black text-warn-600">未评分</p>
              )}
              {record.gaps.length ? <p className="mt-2 text-xs font-bold leading-5 text-ink-600">欠缺：{record.gaps.slice(0, 2).join("、")}</p> : null}
              <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-ink-500">{record.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">暂无口述记录。写一版回答后点击“保存口述与AI分析”。</p>
      )}
    </article>
  );
}

import { GitCompareArrows, X } from "lucide-react";
import type { ApplicationEvidenceRecord } from "../../../data/applicationsAdapter";

const comparisonFields = [
  { label: "状态", value: (record: ApplicationEvidenceRecord) => record.status },
  { label: "来源 / 城市", value: (record: ApplicationEvidenceRecord) => [record.source, record.city].filter(Boolean).join(" / ") },
  { label: "薪资范围", value: (record: ApplicationEvidenceRecord) => record.salaryRange },
  { label: "JD 关键词", value: (record: ApplicationEvidenceRecord) => record.keywords },
  { label: "命中点", value: (record: ApplicationEvidenceRecord) => record.tags.join("、") },
  { label: "沟通反馈", value: (record: ApplicationEvidenceRecord) => record.hrFeedback },
  { label: "下一步事实", value: (record: ApplicationEvidenceRecord) => record.notes }
];

export function OpportunityComparisonPanel({ records, onRemove }: { records: ApplicationEvidenceRecord[]; onRemove: (recordId: string) => void }) {
  if (!records.length) return null;
  return (
    <section className="overflow-hidden rounded-workbench border border-line bg-ink-950 text-white shadow-panel" aria-labelledby="opportunity-comparison-title">
      <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-100"><GitCompareArrows size={17} aria-hidden="true" /><p className="text-xs font-black uppercase tracking-[0.14em]">Fact comparison</p></div>
          <h2 id="opportunity-comparison-title" className="mt-1 text-lg font-black">机会事实对照</h2>
        </div>
        <p className="text-xs font-bold text-ink-300">只对照已记录事实，不生成匹配分或推荐排序</p>
      </header>
      {records.length === 1 ? (
        <div className="px-5 py-5">
          <p className="text-sm font-black">已选择「{records[0].company || records[0].role}」</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-300">再从左侧选择一条机会，即可并排核对状态、JD、反馈和下一步。</p>
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <div className="divide-y divide-white/10 border-b border-white/10">
              {records.map((record, index) => <ComparisonRecordHeader key={record.id} index={index} record={record} onRemove={onRemove} />)}
            </div>
            <div>
              {comparisonFields.map((field) => (
                <section key={field.label} className="border-b border-white/10 px-4 py-4 last:border-0">
                  <h3 className="text-xs font-black text-ink-400">{field.label}</h3>
                  <div className="mt-3 space-y-3">
                    {records.map((record, index) => (
                      <div key={record.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-sm">
                        <span className="grid size-7 place-items-center rounded-full bg-white/10 text-xs font-black text-brand-100" aria-hidden="true">{index === 0 ? "A" : "B"}</span>
                        <p className="min-w-0 break-words font-semibold leading-6 text-ink-100">{field.value(record) || "待补充"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-32 px-5 py-3 text-xs font-black text-ink-400">事实字段</th>
                {records.map((record) => (
                  <th key={record.id} className="px-5 py-3 align-top">
                    <span className="flex items-start justify-between gap-3">
                      <span><span className="block font-black">{record.company || "未命名公司"}</span><span className="mt-1 block text-xs font-bold text-ink-300">{record.role || "未命名岗位"}</span></span>
                      <button type="button" className="grid size-10 shrink-0 place-items-center rounded-control border border-white/15 text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-100" aria-label={`移出对照：${record.company || record.title}`} onClick={() => onRemove(record.id)}><X size={15} aria-hidden="true" /></button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonFields.map((field) => <ComparisonRow key={field.label} label={field.label} records={records} value={field.value} />)}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}

function ComparisonRecordHeader({ index, record, onRemove }: { index: number; record: ApplicationEvidenceRecord; onRemove: (recordId: string) => void }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-brand-100" aria-hidden="true">{index === 0 ? "A" : "B"}</span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-black">{record.company || "未命名公司"}</span>
            <span className="mt-1 block break-words text-xs font-bold text-ink-300">{record.role || "未命名岗位"}</span>
          </span>
        </span>
        <button type="button" className="grid size-10 shrink-0 place-items-center rounded-control border border-white/15 text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-100" aria-label={`移出对照：${record.company || record.title}`} onClick={() => onRemove(record.id)}><X size={15} aria-hidden="true" /></button>
      </span>
    </div>
  );
}

function ComparisonRow({ label, records, value }: { label: string; records: ApplicationEvidenceRecord[]; value: (record: ApplicationEvidenceRecord) => string }) {
  return (
    <tr className="border-b border-white/10 last:border-0">
      <th className="px-5 py-3 text-xs font-black text-ink-400">{label}</th>
      {records.map((record) => <td key={record.id} className="px-5 py-3 font-semibold leading-6 text-ink-100">{value(record) || "待补充"}</td>)}
    </tr>
  );
}

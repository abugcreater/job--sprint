import { ArrowRight, BriefcaseBusiness, Edit3, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ApplicationEvidenceRecord } from "../../../data/applicationsAdapter";

export function OpportunityDetailPanel({
  record,
  onCreate,
  onEdit,
  onDelete
}: {
  record?: ApplicationEvidenceRecord;
  onCreate: () => void;
  onEdit: (record: ApplicationEvidenceRecord) => void;
  onDelete: (record: ApplicationEvidenceRecord) => void;
}) {
  if (!record) {
    return (
      <section className="grid min-h-[420px] place-items-center rounded-workbench border border-line bg-white px-6 py-12 text-center shadow-soft" aria-labelledby="opportunity-empty-title">
        <div className="max-w-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700"><BriefcaseBusiness size={22} aria-hidden="true" /></span>
          <h2 id="opportunity-empty-title" className="mt-4 text-xl font-black text-ink-950">选择一条机会查看事实</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink-500">没有记录时先新增；筛选无结果时切换状态，已有数据不会被清空。</p>
          <button type="button" className="primary-button mt-5" onClick={onCreate}><Plus size={16} aria-hidden="true" />新增机会记录</button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-workbench border border-line bg-white shadow-soft" aria-labelledby="opportunity-detail-title">
      <header className="border-b border-line px-5 py-5 md:px-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">Selected opportunity</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id="opportunity-detail-title" className="text-2xl font-black leading-tight text-ink-950">{record.company || "未命名公司"}</h2>
            <p className="mt-1 text-base font-black text-ink-600">{record.role || "未命名岗位"}</p>
          </div>
          <span className="self-start rounded-control bg-brand-100 px-3 py-1.5 text-xs font-black text-brand-700">{record.status}</span>
        </div>
      </header>

      <div className="grid gap-x-8 md:grid-cols-2">
        <DetailGroup title="岗位事实">
          <DetailRow label="城市" value={record.city} />
          <DetailRow label="来源" value={record.source} />
          <DetailRow label="薪资范围" value={record.salaryRange} />
          <DetailRow label="简历版本" value={record.resumeVersion} />
        </DetailGroup>
        <DetailGroup title="岗位证据">
          <DetailRow label="JD 关键词" value={record.keywords} />
          <DetailRow label="命中点" value={record.tags.join("、")} />
          <DetailRow label="沟通反馈" value={record.hrFeedback} />
          <DetailRow label="下一步事实" value={record.notes} />
        </DetailGroup>
      </div>

      <footer className="flex flex-col gap-3 border-t border-line bg-surface-0 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <Link to="/today" className="secondary-button">
          回到 Evidence Gate
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <div className="flex gap-2">
          <button type="button" className="secondary-button flex-1 sm:flex-none" aria-label={`编辑机会记录：${record.company || record.title}`} onClick={() => onEdit(record)}>
            <Edit3 size={15} aria-hidden="true" />编辑
          </button>
          <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-risk-200 bg-white px-4 text-sm font-black text-risk-600 focus:outline-none focus:ring-2 focus:ring-risk-600 sm:flex-none" aria-label={`删除机会记录：${record.company || record.title}`} onClick={() => onDelete(record)}>
            <Trash2 size={15} aria-hidden="true" />删除
          </button>
        </div>
      </footer>
    </section>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-5 md:px-6">
      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-ink-500">{title}</h3>
      <dl className="mt-3 divide-y divide-line">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-black text-ink-500">{label}</dt>
      <dd className="text-sm font-bold leading-6 text-ink-800">{value || "待补充"}</dd>
    </div>
  );
}

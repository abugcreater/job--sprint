import { CheckCircle2, Edit3, Save, Send, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { applicationStatuses, applicationTagOptions, type ApplicationFormDraft } from "../../../data/applicationsAdapter";

export function ApplicationForm({
  draft,
  disabled,
  isEditing,
  validationMessage,
  feedback,
  onChange,
  onToggleTag,
  onRecord,
  onCancelEdit
}: {
  draft: ApplicationFormDraft;
  disabled: boolean;
  isEditing: boolean;
  validationMessage: string;
  feedback: string;
  onChange: (patch: Partial<ApplicationFormDraft>) => void;
  onToggleTag: (tag: string) => void;
  onRecord: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <section className="command-panel" aria-labelledby="application-form-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-brand-700">
          {isEditing ? <Edit3 size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          <h2 id="application-form-title" className="text-base font-black text-ink-900" tabIndex={-1}>
            {isEditing ? "编辑机会记录" : "本地机会记录"}
          </h2>
        </div>
        <button type="button" className="secondary-button min-h-10 px-3" onClick={onCancelEdit}>
          <XCircle size={16} aria-hidden="true" />
          {isEditing ? "取消编辑" : "取消新增"}
        </button>
      </div>
      {validationMessage ? (
        <p className="mt-3 rounded-control bg-risk-100 px-3 py-2 text-sm font-bold text-risk-600" aria-live="polite">
          {validationMessage}
        </p>
      ) : (
        <p className="mt-3 rounded-control bg-surface-0 px-3 py-2 text-sm font-bold text-ink-500">最少填写公司和岗位；其它字段可在沟通反馈后再补。</p>
      )}
      {feedback ? (
        <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" aria-live="polite">
          {feedback}
        </p>
      ) : null}
      <div className="mt-5">
        <FormGroup title="必填事实">
          <Field label="公司" value={draft.company} onChange={(value) => onChange({ company: value })} />
          <Field label="岗位" value={draft.role} onChange={(value) => onChange({ role: value })} />
          <label className="block">
            <span className="text-sm font-black text-ink-700">状态</span>
            <select className="field-control mt-2" value={draft.status} onChange={(event) => onChange({ status: event.target.value as ApplicationFormDraft["status"] })} aria-label="状态">
              {applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </FormGroup>
      </div>
      <details className="mt-4 rounded-control border border-line bg-surface-0">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">补充岗位事实（可选）</summary>
        <div className="grid gap-4 border-t border-line p-4 md:grid-cols-2">
          <Field label="来源" value={draft.source} onChange={(value) => onChange({ source: value })} placeholder="Boss 直聘 / 猎聘 / 内推 / 官网" />
          <Field label="城市" value={draft.city} onChange={(value) => onChange({ city: value })} />
          <Field label="薪资范围" value={draft.salaryRange} onChange={(value) => onChange({ salaryRange: value })} placeholder="25-35K · 14薪" />
          <Field label="简历版本" value={draft.resumeVersion} onChange={(value) => onChange({ resumeVersion: value })} />
          <label className="block md:col-span-2">
            <span className="text-sm font-black text-ink-700">JD 关键词</span>
            <input className="field-control mt-2" value={draft.keywords} onChange={(event) => onChange({ keywords: event.target.value })} placeholder="Java MQ Redis 稳定性" />
          </label>
        </div>
      </details>
      <div className="mt-4">
        <label className="block">
          <span className="text-sm font-black text-ink-700">沟通反馈</span>
          <textarea className="field-control mt-2 min-h-[104px] resize-y p-4 leading-7" value={draft.hrFeedback} onChange={(event) => onChange({ hrFeedback: event.target.value })} placeholder="记录招聘方原话、约面时间、补资料要求或拒绝原因。" aria-label="沟通反馈" />
        </label>
        <details className="mt-4 rounded-control border border-line bg-surface-0">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">命中点与反馈摘要（可选）</summary>
          <div className="border-t border-line p-4">
          <p className="text-sm font-black text-ink-700">命中点</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {applicationTagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`touch-button min-h-10 px-3 ${draft.tags.includes(tag) ? "bg-brand-700 text-white" : "border border-line bg-white text-ink-700 hover:border-brand-600"}`}
                aria-pressed={draft.tags.includes(tag)}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
            <TextareaField label="反馈摘要" value={draft.notes} onChange={(value) => onChange({ notes: value })} placeholder="记录 JD 命中、能力缺口或下一步动作。" minHeight="min-h-[128px]" />
          </div>
        </details>
      </div>
      <button type="button" className="primary-button mt-4 disabled:bg-ink-400" disabled={disabled} onClick={onRecord}>
        {isEditing ? <Save size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
        {isEditing ? "保存机会反馈" : "记录机会反馈"}
      </button>
    </section>
  );
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <p className="text-xs font-black text-ink-500">{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink-700">{label}</span>
      <input className="field-control mt-2" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  minHeight
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-black text-ink-700">{label}</span>
      <textarea className={`field-control mt-2 ${minHeight} resize-y p-4 leading-7`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
    </label>
  );
}

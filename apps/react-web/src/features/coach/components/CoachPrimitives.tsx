import type { ReactNode } from "react";

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface-0 p-3">
      <p className="text-[11px] font-black text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

export function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-brand-700">
      {icon}
      <h2 className="text-base font-black text-ink-900">{title}</h2>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "number";
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink-700">{label}</span>
      <input className="field-control mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-black text-ink-700">{label}</span>
      <textarea className="field-control mt-2 min-h-24 resize-y p-4 leading-7" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
    </label>
  );
}

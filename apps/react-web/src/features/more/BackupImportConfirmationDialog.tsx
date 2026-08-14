import { AlertTriangle } from "lucide-react";
import type { ReactStateImportResult } from "../../data/moreAdapter";

type ImportSummary = Extract<ReactStateImportResult, { ok: true }>[
  "summary"
];

export function BackupImportConfirmationDialog({ summary, onCancel, onConfirm }: { summary: ImportSummary; onCancel: () => void; onConfirm: () => void }) {
  const items = [
    { label: "完成", value: `${summary.completedCount} 项` },
    { label: "证据", value: `${summary.evidenceCount} 条` },
    { label: "画像", value: `${summary.profileCount} 个` },
    { label: "知识边界", value: `${summary.boundaryCount} 条` },
    { label: "日程", value: `${summary.scheduleEventCount} 条` },
    { label: "AI 建议", value: `${summary.aiArtifactCount} 条` }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-900/40 p-4 backdrop-blur-[1px] sm:items-center sm:justify-center" role="presentation">
      <section className="w-full max-w-lg rounded-card border border-line bg-white p-5 shadow-soft" role="alertdialog" aria-modal="true" aria-labelledby="restore-backup-title" aria-describedby="restore-backup-detail">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warn-100 text-warn-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="restore-backup-title" className="text-lg font-black text-ink-950">确认恢复个人数据？</h2>
            <p id="restore-backup-detail" className="mt-2 text-sm font-semibold leading-6 text-ink-600">恢复会替换当前设备上的完成记录、证据、延期、画像、知识边界、自定义日程和 AI 建议；不会自动合并两份数据。</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="备份内容摘要">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 rounded-card bg-surface-0 p-3">
              <p className="text-xs font-black text-ink-500">{item.label}</p>
              <p className="mt-1 break-words text-sm font-black text-ink-900">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="secondary-button justify-center" onClick={onCancel}>取消</button>
          <button type="button" className="primary-button justify-center" onClick={onConfirm}>确认恢复</button>
        </div>
      </section>
    </div>
  );
}

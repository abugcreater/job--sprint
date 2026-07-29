import { AlertTriangle } from "lucide-react";

export function ReviewDiscardChangesDialog({ onContinue, onDiscard }: { onContinue: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-900/40 p-4 backdrop-blur-[1px] sm:items-center sm:justify-center" role="presentation">
      <section className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-soft" role="alertdialog" aria-modal="true" aria-labelledby="discard-review-changes-title" aria-describedby="discard-review-changes-detail">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warn-100 text-warn-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="discard-review-changes-title" className="text-lg font-black text-ink-950">放弃未保存的复盘修改？</h2>
            <p id="discard-review-changes-detail" className="mt-2 text-sm font-semibold leading-6 text-ink-600">你对当前复盘的本次修改尚未保存。继续编辑会保留输入；放弃后会保留原 Evidence Gate 记录并退出编辑。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="primary-button justify-center" onClick={onContinue}>继续编辑</button>
          <button type="button" className="secondary-button justify-center border-risk-200 text-risk-600 hover:bg-risk-100" onClick={onDiscard}>放弃修改</button>
        </div>
      </section>
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

export function InitializationDiscardChangesDialog({ actionLabel, onContinue, onDiscard }: { actionLabel: string; onContinue: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-900/40 p-4 backdrop-blur-[1px] sm:items-center sm:justify-center" role="presentation">
      <section className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-soft" role="alertdialog" aria-modal="true" aria-labelledby="discard-initialization-changes-title" aria-describedby="discard-initialization-changes-detail">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warn-100 text-warn-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="discard-initialization-changes-title" className="text-lg font-black text-ink-950">放弃未保存的快速建档内容？</h2>
            <p id="discard-initialization-changes-detail" className="mt-2 text-sm font-semibold leading-6 text-ink-600">你输入的简历、JD、画像建议或边界候选尚未写入。继续编辑会保留内容；放弃后将{actionLabel}。</p>
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

import { AlertTriangle, BookOpenCheck, Mic2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { EvidenceType, RiskItem, Task } from "../../../types/sprint";

interface RiskPanelProps {
  risks: RiskItem[];
}

interface OralPracticeCardProps {
  task?: Task;
  onAddEvidence: (type: EvidenceType, title: string, content: string) => void;
}

export function RiskPanel({ risks }: RiskPanelProps) {
  const primaryRisk = risks[0];

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="risk-title">
      <div className="flex items-center gap-2 text-risk-600">
        <ShieldAlert size={19} aria-hidden="true" />
        <h2 id="risk-title" className="text-lg font-black text-ink-900">
          今日风险
        </h2>
      </div>
      {primaryRisk ? (
        <div className="mt-3">
          <p className="inline-flex rounded-control bg-risk-100 px-2.5 py-1 text-xs font-extrabold text-risk-600">{riskLevel(primaryRisk.level)}</p>
          <h3 className="mt-3 text-base font-black text-ink-900">{primaryRisk.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-700">{primaryRisk.reason}</p>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-ink-500">
            <AlertTriangle className="mt-0.5 shrink-0 text-warn-600" size={16} aria-hidden="true" />
            <span>{primaryRisk.mitigation}</span>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-ink-500">暂无明显风险，保持证据闭环。</p>
      )}
    </section>
  );
}

export function OralPracticeCard({ task, onAddEvidence }: OralPracticeCardProps) {
  const question = task?.interviewQuestions[0] ?? "用 60 秒讲清今天的一个项目硬点。";
  const [isWriting, setIsWriting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const saveOralPractice = () => {
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) return;
    onAddEvidence(
      "oral_score",
      "今日口述入口",
      [
        task ? `任务：${task.title}` : "",
        `题目：${question}`,
        `口述文本：${trimmedAnswer}`
      ].filter(Boolean).join("；")
    );
    setFeedback("已保存口述文本，并写入 Evidence Gate。");
    setAnswer("");
    setIsWriting(false);
  };

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-soft" aria-labelledby="oral-title">
      <div className="flex items-center gap-2 text-brand-700">
        <Mic2 size={19} aria-hidden="true" />
        <h2 id="oral-title" className="text-lg font-black text-ink-900">
          今日口述入口
        </h2>
      </div>
      <p className="mt-3 text-base font-black leading-7 text-ink-900">{question}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">先练一题，不追求完美，追求能讲出机制、场景和边界。</p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control bg-brand-700 px-3 text-sm font-extrabold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
        aria-expanded={isWriting}
        onClick={() => {
          setIsWriting(true);
          setFeedback("");
        }}
      >
        <BookOpenCheck size={16} aria-hidden="true" />
        开始口述一题
      </button>
      {isWriting ? (
        <div className="mt-4 rounded-card border border-brand-100 bg-surface-0 p-4">
          <label className="grid gap-2 text-sm font-black text-ink-800">
            口述文本记录
            <textarea
              className="field-control min-h-28 resize-y bg-white leading-6"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="现在先用文字代替语音：写出你的 60 秒回答，至少包含结论、机制、场景和边界。"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="primary-button min-h-10 px-3 text-sm" disabled={!answer.trim()} onClick={saveOralPractice}>
              保存口述证据
            </button>
            <button type="button" className="secondary-button min-h-10 px-3 text-sm" onClick={() => setIsWriting(false)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
      {feedback ? (
        <p className="mt-3 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

function riskLevel(level: RiskItem["level"]): string {
  const labels: Record<RiskItem["level"], string> = {
    none: "无风险",
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    resolved: "已处理"
  };

  return labels[level];
}

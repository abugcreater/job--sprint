import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CoachStageId } from "./CoachStageNavigation";

const stageDetails: Record<CoachStageId, {
  title: string;
  description: string;
  doneWhen: string;
  relatedPath: string;
  relatedLabel: string;
}> = {
  profile: {
    title: "确认求职画像",
    description: "只保留真实目标、经历主线和不可夸大的边界。",
    doneWhen: "存在一份目标岗位、经验摘要和每日投入都有效的画像。",
    relatedPath: "/today",
    relatedLabel: "查看今日入口"
  },
  boundaries: {
    title: "确认知识边界",
    description: "把 JD、简历和面试反馈转成可确认的知识缺口。",
    doneWhen: "当前画像至少有一条已确认知识边界。",
    relatedPath: "/learn",
    relatedLabel: "打开知识工作台"
  },
  plan: {
    title: "生成今日计划",
    description: "今天只安排一个明确、可验证、能留下证据的动作。",
    doneWhen: "当前日期至少存在一条个人日程。",
    relatedPath: "/today",
    relatedLabel: "查看今日行动"
  },
  advice: {
    title: "处理 AI 建议",
    description: "建议必须经过接受、修订或拒绝，不能自动写入正式记录。",
    doneWhen: "至少一条建议已经被接受或拒绝。",
    relatedPath: "/today",
    relatedLabel: "回到今日执行"
  }
};

export function CoachStageContext({ stage, completed }: { stage: CoachStageId; completed: boolean }) {
  const copy = stageDetails[stage];
  return (
    <aside className="context-rail" aria-label="准备阶段说明">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">当前阶段</p>
      <h2 className="mt-2 text-xl font-black text-ink-950">{copy.title}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink-600">{copy.description}</p>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-500">完成条件</p>
        <p className="mt-2 text-sm font-black leading-6 text-ink-950">{copy.doneWhen}</p>
        <p className={`mt-3 text-xs font-black ${completed ? "text-success-600" : "text-warn-600"}`}>{completed ? "当前阶段已有有效记录" : "当前阶段尚未完成"}</p>
      </div>
      <Link to={copy.relatedPath} className="secondary-button mt-5 w-full">
        {copy.relatedLabel}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function CoachDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-workbench border border-line bg-white shadow-soft">
      <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-black text-ink-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600">{title}</summary>
      <div className="border-t border-line p-3">{children}</div>
    </details>
  );
}

export function coachStageTitle(stage: CoachStageId) {
  return stageDetails[stage].title;
}

export function buildCoachStageProgress(completedStages: Record<CoachStageId, boolean>) {
  const orderedStages: Array<{ id: CoachStageId; action: string }> = [
    { id: "profile", action: "确认求职画像" },
    { id: "boundaries", action: "确认至少一条知识边界" },
    { id: "plan", action: "生成今天的唯一行动" },
    { id: "advice", action: "处理第一条 AI 建议" }
  ];
  const completedCount = orderedStages.filter((stage) => completedStages[stage.id]).length;
  const nextStage = orderedStages.find((stage) => !completedStages[stage.id]);
  return {
    progressLabel: `${completedCount}/${orderedStages.length}`,
    nextActionLabel: nextStage?.action ?? "回到今日执行"
  };
}

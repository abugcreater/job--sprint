import type { CoachScheduleEvent, EvidenceType, Task, TaskStatus, TaskType } from "../types/sprint";

const FIXED_OFFSET = "+08:00";

export function buildCoachScheduleTasks(events: CoachScheduleEvent[], date: string, completed: Record<string, boolean>, now: Date): Task[] {
  return events
    .filter((event) => event.date === date)
    .map((event) => {
      const id = `coach-event-${event.id}`;
      const start = parseDateTime(event.date, event.start);
      const end = parseDateTime(event.date, event.end);
      const done = Boolean(completed[id]);
      const status: TaskStatus = done ? "done" : (now.getTime() >= start.getTime() && now.getTime() < end.getTime() ? "active" : "pending");
      const type = coachEventType(event.kind);
      return {
        id,
        day: 0,
        date: event.date,
        weekday: "自定义",
        title: event.title,
        description: event.reason || "用户自定义日程",
        type,
        status,
        startAt: `${event.date} ${event.start}`,
        endAt: `${event.date} ${event.end}`,
        durationLabel: `${event.start}-${event.end}`,
        deliverables: [event.evidenceRequired ? "补一条 Evidence Gate 证据" : "完成自定义日程"],
        interviewQuestions: type === "interview" ? [event.title] : [],
        acceptanceCriteria: event.evidenceRequired ? "完成后补齐一条可读回证据。" : "完成并记录结果。",
        javaMapping: "由用户画像、知识边界或 AI 草稿生成",
        tags: ["自定义日程", coachEventLabel(event.kind)],
        riskIds: [],
        evidenceRequired: event.evidenceRequired ? evidenceRequiredFor(type) : [],
        sourceLabels: event.acceptedFromArtifactId ? ["AI 草稿已接受"] : ["用户自定义"]
      };
    });
}

function coachEventType(kind: CoachScheduleEvent["kind"]): TaskType {
  if (kind === "interview") return "interview";
  if (kind === "opportunity") return "delivery";
  if (kind === "review") return "review";
  if (kind === "recovery") return "rest";
  return "java";
}

function coachEventLabel(kind: CoachScheduleEvent["kind"]): string {
  return {
    learning: "知识任务",
    interview: "面试任务",
    opportunity: "机会任务",
    review: "复盘任务",
    recovery: "低状态任务"
  }[kind];
}

function evidenceRequiredFor(category: string): EvidenceType[] {
  if (category === "interview") return ["oral_score", "interview_answer"];
  if (category === "delivery" || category === "resume") return ["delivery_record", "learning_note"];
  if (category === "review") return ["review"];
  return ["learning_note", "review"];
}

function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${FIXED_OFFSET}`);
}

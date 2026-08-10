import type { Task } from "../types/sprint";
import type { InterviewCandidateContext, InterviewMode, InterviewQuestionOption } from "./interviewAdapter";

export function buildModeCandidateQuestions(
  task: Task,
  mode: Exclude<InterviewMode, "auto">,
  context: InterviewCandidateContext
): InterviewQuestionOption[] {
  if (mode === "java-core") return technicalCoreQuestions(task);
  if (mode === "resume-java") return projectExperienceQuestions(task, context);
  if (mode === "jd-match") return jdMatchQuestions(task, context);
  return aiPracticeQuestions(task, context);
}

function technicalCoreQuestions(task: Task): InterviewQuestionOption[] {
  const keywords = taskKeywords(task);

  return [
    createContextQuestion({
      task,
      mode: "java-core",
      index: 1,
      source: `当前任务 · ${task.title}`,
      question: `围绕「${task.title}」，请讲清要解决的问题、核心机制或链路、关键接口或数据流，以及异常分支。`,
      hint: "先说明场景和机制，再落到失败路径、验证方式与个人贡献边界。",
      expectedKeywords: [...keywords, "核心机制", "异常分支", "验证证据"]
    }),
    createContextQuestion({
      task,
      mode: "java-core",
      index: 2,
      source: `当前任务 · ${task.title}`,
      question: `当「${task.title}」的结果不符合预期时，你会如何定位问题、控制风险并验证恢复？`,
      hint: "按现象、排查顺序、风险控制、恢复验证说明，不把未负责的线上能力说成自己的经验。",
      expectedKeywords: [...keywords, "排查顺序", "风险控制", "恢复验证"]
    })
  ];
}

function projectExperienceQuestions(task: Task, context: InterviewCandidateContext): InterviewQuestionOption[] {
  const projectContext = compactText(context.profile?.projectEvidence || context.profile?.experienceSummary || task.title, 56);
  const targetRole = profileRole(context) ?? "当前目标岗位";
  const boundary = compactText(context.profile?.nonClaims ?? "", 48);

  return [
    createContextQuestion({
      task,
      mode: "resume-java",
      index: 1,
      source: `个人画像 · ${targetRole}`,
      question: `以画像中的「${projectContext}」为例，用 60 秒说明项目背景、你的职责、关键动作、结果和可读回证据。`,
      hint: "只讲画像中已有的真实经历；结果没有量化时，说明当前证据和下一步补证计划。",
      expectedKeywords: [targetRole, "项目背景", "个人职责", "关键动作", "可验证证据"]
    }),
    createContextQuestion({
      task,
      mode: "resume-java",
      index: 2,
      source: `个人画像 · ${targetRole}`,
      question: `围绕「${projectContext}」，哪些部分是你亲自负责的，哪些需要明确协作或能力边界？`,
      hint: boundary ? `画像中的不可夸大边界：${boundary}` : "区分个人产出、团队协作和未经验证的结果。",
      expectedKeywords: ["个人贡献", "团队协作", "能力边界", "证据"]
    })
  ];
}

function jdMatchQuestions(task: Task, context: InterviewCandidateContext): InterviewQuestionOption[] {
  const record = context.opportunities?.find((item) => item.status !== "不匹配" && Boolean(item.role.trim() || item.keywords.trim() || item.tags.length));
  if (!record) {
    const targetRole = profileRole(context) ?? "当前目标岗位";
    return [
      createContextQuestion({
        task,
        mode: "jd-match",
        index: 1,
        source: `目标岗位 · ${targetRole}`,
        question: `当前还没有记录具体 JD。请以「${targetRole}」为目标，说明你会如何核验岗位硬条件、已有证据、能力缺口和补齐动作。`,
        hint: "这是通用匹配练习，不代表某家公司或具体 JD 要求；记录机会后会优先引用那条 JD 信号。",
        expectedKeywords: [targetRole, "岗位硬条件", "项目证据", "能力缺口", "补齐动作"]
      })
    ];
  }

  const company = compactText(record.company || "已记录机会", 36);
  const role = compactText(record.role || profileRole(context) || "目标岗位", 36);
  const keywords = opportunityKeywords(record);

  return [
    createContextQuestion({
      task,
      mode: "jd-match",
      index: 1,
      source: `机会记录 · ${company} · ${role}`,
      question: `面向「${company}」的「${role}」机会，哪些 JD 关键词你能用真实项目证据回答，哪些仍需补齐？`,
      hint: "区分已验证经历与待补能力，不把通用话术当作岗位已匹配的结论。",
      expectedKeywords: [...keywords, "真实证据", "能力缺口"]
    }),
    createContextQuestion({
      task,
      mode: "jd-match",
      index: 2,
      source: `机会记录 · ${company} · ${role}`,
      question: `如果面试官追问「${keywords[0] ?? role}」与这份岗位的匹配关系，你会如何用项目链路、结果和边界作答？`,
      hint: "先说匹配结论，再给项目证据；缺少证据时明确说明补齐动作。",
      expectedKeywords: [...keywords, "项目链路", "结果", "边界"]
    })
  ];
}

function aiPracticeQuestions(task: Task, context: InterviewCandidateContext): InterviewQuestionOption[] {
  const targetRole = profileRole(context) ?? "当前目标岗位";

  return [
    createContextQuestion({
      task,
      mode: "llm-basics",
      index: 1,
      source: `目标岗位 · ${targetRole}`,
      question: `面向「${targetRole}」，你会如何使用 AI 工具提升效率，同时校验输出并保留人工决策？`,
      hint: "说明适用任务、输入材料、人工校验和最终责任，不把 AI 输出直接当成事实或个人成果。",
      expectedKeywords: ["AI 工具", "输入材料", "人工校验", "最终责任"]
    }),
    createContextQuestion({
      task,
      mode: "llm-basics",
      index: 2,
      source: `目标岗位 · ${targetRole}`,
      question: `当 AI 输出错误、不可验证或涉及敏感信息时，你会如何降级处理、留存证据并避免扩大风险？`,
      hint: "覆盖输出校验、敏感数据、人工复核、降级路径和证据留存。",
      expectedKeywords: ["输出校验", "敏感数据", "人工复核", "降级路径", "证据留存"]
    })
  ];
}

function createContextQuestion({
  task,
  mode,
  index,
  source,
  question,
  hint,
  expectedKeywords
}: {
  task: Task;
  mode: Exclude<InterviewMode, "auto">;
  index: number;
  source: string;
  question: string;
  hint: string;
  expectedKeywords: string[];
}): InterviewQuestionOption {
  return {
    id: `${task.id}-${mode}-question-${index}`,
    mode,
    modeLabel: modeLabel(mode),
    source,
    question,
    hint,
    expectedKeywords: uniqueText(expectedKeywords),
    taskId: task.id,
    isCurrentTask: false
  };
}

function taskKeywords(task: Task): string[] {
  return uniqueText([...task.tags, ...task.deliverables]).slice(0, 5);
}

function opportunityKeywords(record: NonNullable<InterviewCandidateContext["opportunities"]>[number]): string[] {
  return uniqueText([...splitText(record.keywords), ...record.tags, record.role]).slice(0, 6);
}

function profileRole(context: InterviewCandidateContext): string | undefined {
  const targetRole = context.profile?.targetRole.trim();
  return targetRole || undefined;
}

function splitText(value: string): string[] {
  return value.split(/[、,，/\n]/).map((item) => item.trim()).filter(Boolean);
}

function uniqueText(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized || "当前准备材料";
}

function modeLabel(mode: Exclude<InterviewMode, "auto">): string {
  return {
    "java-core": "技术核心",
    "resume-java": "项目经历",
    "jd-match": "JD",
    "llm-basics": "AI"
  }[mode];
}

export type CoachOnboardingMaterialKind = "jd" | "resume" | "interview" | "learning" | "other";

export interface CoachOnboardingMaterialSection {
  kind: CoachOnboardingMaterialKind;
  label: string;
  content: string;
}

export interface CoachOnboardingMaterialSummary {
  sectionCount: number;
  labels: string[];
  statusLabel: string;
}

export const onboardingMaterialBlocks: Array<{ kind: CoachOnboardingMaterialKind; label: string; body: string }> = [
  { kind: "jd", label: "JD", body: "JD：粘贴目标岗位职责、硬技能、项目要求和风险信号。" },
  { kind: "resume", label: "简历", body: "简历：粘贴当前简历中的项目、指标、技术栈和可证明材料。" },
  { kind: "interview", label: "面试反馈", body: "面试反馈：粘贴被追问、卡住、被质疑或需要补证据的内容。" },
  { kind: "learning", label: "学习笔记", body: "学习笔记：粘贴最近学习、复盘或已经形成的知识卡内容。" }
];

export function summarizeOnboardingMaterial(text: string): CoachOnboardingMaterialSummary {
  const sections = splitOnboardingMaterial(text);
  const labels = [...new Set(sections.map((section) => section.label))];
  return {
    sectionCount: sections.length,
    labels,
    statusLabel: sections.length ? `已识别 ${sections.length} 段素材：${labels.join("、")}` : "尚未识别到可导入素材"
  };
}

export function splitOnboardingMaterial(text: string): CoachOnboardingMaterialSection[] {
  return text
    .split(/\n-{3,}\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 8)
    .map((chunk) => ({
      kind: inferKind(chunk),
      label: labelForKind(inferKind(chunk)),
      content: chunk
    }));
}

export function appendOnboardingMaterialBlock(current: string, block: { body: string }): string {
  return [current.trim(), block.body].filter(Boolean).join("\n---\n");
}

function inferKind(text: string): CoachOnboardingMaterialKind {
  if (/^JD[:：]|岗位|职责|招聘/.test(text)) return "jd";
  if (/^简历[:：]|项目经历|项目证据|当前简历|量化指标/.test(text)) return "resume";
  if (/^面试反馈[:：]|面试官|追问|卡住|质疑/.test(text)) return "interview";
  if (/^学习笔记[:：]|学习复盘|知识卡|笔记/.test(text)) return "learning";
  return "other";
}

function labelForKind(kind: CoachOnboardingMaterialKind): string {
  return {
    jd: "JD",
    resume: "简历",
    interview: "面试反馈",
    learning: "学习笔记",
    other: "其它"
  }[kind];
}

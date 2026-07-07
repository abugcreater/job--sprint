import {
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardCheck,
  MessageCircleQuestion,
  MoreHorizontal,
  UserRound,
  type LucideIcon
} from "lucide-react";

export type AppRouteId = "today" | "coach" | "learn" | "interview" | "applications" | "review" | "more";

export type AppRoute = {
  id: AppRouteId;
  label: string;
  path: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  summary: string;
  status: string;
  primaryFocus: string;
  migrationScope: string;
};

export const appRoutes: AppRoute[] = [
  {
    id: "today",
    label: "今日",
    path: "/today",
    icon: CalendarCheck,
    eyebrow: "Today",
    title: "今日 AI 教练",
    summary: "把今日建议、当前任务、Evidence Gate、风险和口述入口集中在同一个执行视图。",
    status: "已接入",
    primaryFocus: "AI 建议、执行闭环、证据门禁",
    migrationScope: "保持当前任务、证据门和本地记录稳定可用，并显式展示下一步建议"
  },
  {
    id: "coach",
    label: "画像",
    path: "/coach",
    icon: UserRound,
    eyebrow: "Coach",
    title: "AI 教练设置",
    summary: "维护目标画像、知识边界、自定义日程和 AI 草稿，草稿接受后才写入正式记录。",
    status: "已接入",
    primaryFocus: "用户画像、知识边界、AI 草稿",
    migrationScope: "新增画像、知识边界、自定义日程、AI 草稿接受/拒绝和导出恢复"
  },
  {
    id: "learn",
    label: "知识",
    path: "/learn",
    icon: BookOpen,
    eyebrow: "Learning",
    title: "知识边界",
    summary: "知识卡、资料入口、笔记和今日知识任务只保留能转成岗位表达的内容。",
    status: "已接入",
    primaryFocus: "知识边界、知识卡、学习笔记",
    migrationScope: "已迁移今日知识任务、资料入口、知识卡摘要和本地学习笔记；后续承接用户知识边界输入"
  },
  {
    id: "interview",
    label: "面试",
    path: "/interview",
    icon: MessageCircleQuestion,
    eyebrow: "Interview",
    title: "面试训练",
    summary: "口述练习、追问、薄弱题和本地记录都围绕今日证据补齐。",
    status: "已接入",
    primaryFocus: "文本口述、本地记录、证据补齐",
    migrationScope: "已迁移今日口述任务、候选题目、回答提示和本地口述证据"
  },
  {
    id: "applications",
    label: "机会",
    path: "/applications",
    icon: BriefcaseBusiness,
    eyebrow: "Opportunities",
    title: "机会验证",
    summary: "公司、岗位、JD 命中、沟通反馈和下一步动作沉淀为辅助记录，不做自动投递。",
    status: "已接入",
    primaryFocus: "本地机会记录、JD 命中、反馈证据",
    migrationScope: "已迁移本地机会表单、状态记录和 Evidence Gate 反馈证据；旧 delivery_record 仅作为兼容存储类型"
  },
  {
    id: "review",
    label: "复盘",
    path: "/review",
    icon: ClipboardCheck,
    eyebrow: "Review",
    title: "复盘归因",
    summary: "完成情况、证据补齐、风险总结、本地 AI 分析和明日建议统一进入本地复盘。",
    status: "已接入",
    primaryFocus: "本地复盘、证据列表、风险归因、明日建议",
    migrationScope: "已迁移今日完成情况、证据列表、风险总结、明日建议、本地复盘证据和本地规则版 AI 分析"
  },
  {
    id: "more",
    label: "更多",
    path: "/more",
    icon: MoreHorizontal,
    eyebrow: "More",
    title: "更多入口",
    summary: "同步状态、localStorage、导出恢复和回滚说明集中处理。",
    status: "已接入",
    primaryFocus: "低频工具、导出恢复、离线边界",
    migrationScope: "已迁移同步状态、localStorage 状态、导出恢复和回滚说明"
  }
];

export const routeById = Object.fromEntries(appRoutes.map((route) => [route.id, route])) as Record<AppRouteId, AppRoute>;

export const bottomNavRouteIds: AppRouteId[] = ["today", "coach", "learn", "interview", "more"];

export const desktopNavRouteIds: AppRouteId[] = ["today", "coach", "learn", "interview", "applications", "review", "more"];

export function getBottomNavActiveId(pathname: string): AppRouteId {
  if (pathname.startsWith("/coach")) return "coach";
  if (pathname.startsWith("/learn")) return "learn";
  if (pathname.startsWith("/interview")) return "interview";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/review") || pathname.startsWith("/more")) return "more";
  return "today";
}

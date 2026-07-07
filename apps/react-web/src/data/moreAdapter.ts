import { LEGACY_STORAGE_KEYS, type LegacyStorageStatus } from "./legacyAdapters";
import type { AiArtifact, BoundarySuggestionFeedback, CoachScheduleEvent, DailySprint, DelayRecord, KnowledgeBoundary, LlmRun, ReviewEvidence, SyncState, UserProfile } from "../types/sprint";
export { parseReactStateImportPayload } from "./moreImportAdapter";
export type { ReactStateImportResult } from "./moreImportAdapter";
export interface MoreDashboard {
  dateLabel: string;
  sync: {
    label: string;
    detail: string;
    lastSavedLabel: string;
  };
  storage: {
    available: boolean;
    reactPersisted: boolean;
    reactStorageBytes: number;
    completedCount: number;
    evidenceCount: number;
    delayCount: number;
    profileCount: number;
    boundaryCount: number;
    boundaryFeedbackCount: number;
    aiArtifactCount: number;
    llmRunCount: number;
    scheduleEventCount: number;
    legacyDetectedLabels: string[];
    legacyDetectedCount: number;
  };
  fallback: {
    reactEntry: string;
    webFallbackEntry: string;
    androidFallbackEntry: string;
    rollbackNote: string;
  };
  exportItems: MoreExportItem[];
  nextEntries: MoreEntryLink[];
}
export interface MoreExportItem {
  id: string;
  title: string;
  status: string;
  description: string;
  filename?: string;
}
export interface MoreEntryLink {
  label: string;
  path: string;
  description: string;
}

export interface ReactStateExportPayload {
  exportedAt: string;
  source: "jobSprint.react.v1";
  syncState: SyncState;
  lastSavedAt?: string;
  sprint: {
    date: string;
    day: number;
    totalDays: number;
    currentTaskId?: string;
  };
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles: UserProfile[];
  knowledgeBoundaries: KnowledgeBoundary[];
  boundarySuggestionFeedback: BoundarySuggestionFeedback[];
  coachScheduleEvents: CoachScheduleEvent[];
  aiArtifacts: AiArtifact[];
  llmRuns: LlmRun[];
}

const reactStorageKey = "jobSprint.react.v1";

const legacyLabels: Record<(typeof LEGACY_STORAGE_KEYS)[number], string> = {
  "jobSprint.completed.v1": "旧版完成状态",
  "jobSprint.reviews.v1": "旧版每日复盘",
  "jobSprint.applications.v1": "旧版机会记录",
  "jobSprint.interviewSessions.v1": "旧版面试记录",
  "jobSprint.interviewMistakes.v1": "旧版错题记录",
  "jobSprint.generatedKb.v1": "旧版生成知识库"
};

export function buildMoreDashboard({
  sprint,
  completed,
  evidenceByTaskId,
  delayRecords,
  userProfiles = [],
  knowledgeBoundaries = [],
  boundarySuggestionFeedback = [],
  coachScheduleEvents = [],
  aiArtifacts = [],
  llmRuns = [],
  syncState,
  lastSavedAt,
  legacyStatus,
  storage
}: {
  sprint: DailySprint;
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles?: UserProfile[];
  knowledgeBoundaries?: KnowledgeBoundary[];
  boundarySuggestionFeedback?: BoundarySuggestionFeedback[];
  coachScheduleEvents?: CoachScheduleEvent[];
  aiArtifacts?: AiArtifact[];
  llmRuns?: LlmRun[];
  syncState: SyncState;
  lastSavedAt?: string;
  legacyStatus: LegacyStorageStatus;
  storage?: Storage;
}): MoreDashboard {
  const reactStorageBytes = readStorageBytes(reactStorageKey, storage);
  const evidenceCount = Object.values(evidenceByTaskId).reduce((sum, items) => sum + items.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;

  return {
    dateLabel: `${sprint.date} ${sprint.weekday}`,
    sync: {
      label: syncLabel(syncState),
      detail: syncDetail(syncState),
      lastSavedLabel: lastSavedAt ? formatDateTime(lastSavedAt) : "暂无本地写入"
    },
    storage: {
      available: legacyStatus.available,
      reactPersisted: reactStorageBytes > 0,
      reactStorageBytes,
      completedCount,
      evidenceCount,
      delayCount: delayRecords.length,
      profileCount: userProfiles.length,
      boundaryCount: knowledgeBoundaries.length,
      boundaryFeedbackCount: boundarySuggestionFeedback.length,
      aiArtifactCount: aiArtifacts.length,
      llmRunCount: llmRuns.length,
      scheduleEventCount: coachScheduleEvents.length,
      legacyDetectedLabels: legacyStatus.detectedKeys.map((key) => legacyLabels[key]),
      legacyDetectedCount: legacyStatus.detectedKeys.length
    },
    fallback: {
      reactEntry: "apps/react-web/dist -> apps/android/app/src/main/assets/react",
      webFallbackEntry: "schedule.html + assets/schedule.css + assets/schedule.js",
      androidFallbackEntry: "apps/android/app/src/main/assets/web/schedule.html",
      rollbackNote: "React assets 缺失时 Android 会回退旧 web fallback；Web 侧可直接打开旧 schedule.html。"
    },
    exportItems: [
      {
        id: "react-state",
        title: "导出 React 本地状态",
        status: "可导出",
        description: "包含 React 完成状态、证据记录、延期、画像、知识边界、边界候选反馈、自定义日程、AI 草稿和 AI 运行记录。",
        filename: "job-sprint-react-state.json"
      },
      {
        id: "legacy-completion",
        title: "旧版完成状态 JSON",
        status: "旧版保留",
        description: "旧版入口仍提供完成状态、每日复盘、错题、路径审计、机会记录和延期 JSON。"
      },
      {
        id: "public-safe",
        title: "Android fallback 离线包",
        status: "脚本保留",
        description: "继续由根目录 public-safe 和 Android build 流程维护，不在本页直接生成。"
      }
    ],
    nextEntries: [
      { label: "回到今日", path: "/today", description: "回到当前任务和 Evidence Gate。" },
      { label: "进入画像", path: "/coach", description: "维护目标画像、知识边界和 AI 草稿。" },
      { label: "进入复盘", path: "/review", description: "查看今日证据、风险和本地复盘记录。" }
    ]
  };
}

export function buildReactStateExportPayload({
  sprint,
  completed,
  evidenceByTaskId,
  delayRecords,
  userProfiles = [],
  knowledgeBoundaries = [],
  boundarySuggestionFeedback = [],
  coachScheduleEvents = [],
  aiArtifacts = [],
  llmRuns = [],
  syncState,
  lastSavedAt
}: {
  sprint: DailySprint;
  completed: Record<string, boolean>;
  evidenceByTaskId: Record<string, ReviewEvidence[]>;
  delayRecords: DelayRecord[];
  userProfiles?: UserProfile[];
  knowledgeBoundaries?: KnowledgeBoundary[];
  boundarySuggestionFeedback?: BoundarySuggestionFeedback[];
  coachScheduleEvents?: CoachScheduleEvent[];
  aiArtifacts?: AiArtifact[];
  llmRuns?: LlmRun[];
  syncState: SyncState;
  lastSavedAt?: string;
}): ReactStateExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    source: reactStorageKey,
    syncState,
    lastSavedAt,
    sprint: {
      date: sprint.date,
      day: sprint.day,
      totalDays: sprint.totalDays,
      currentTaskId: sprint.currentTaskId
    },
    completed,
    evidenceByTaskId,
    delayRecords,
    userProfiles,
    knowledgeBoundaries,
    boundarySuggestionFeedback,
    coachScheduleEvents,
    aiArtifacts,
    llmRuns
  };
}

function readStorageBytes(key: string, storage?: Storage): number {
  if (!storage) return 0;
  try {
    return new Blob([storage.getItem(key) ?? ""]).size;
  } catch {
    return 0;
  }
}

function syncLabel(syncState: SyncState): string {
  return {
    online: "服务端在线",
    local_fallback: "本地模式，可继续记录",
    syncing: "同步中",
    failed: "同步失败，可本地记录",
    conflict: "待合并，先保留本地"
  }[syncState];
}

function syncDetail(syncState: SyncState): string {
  if (syncState === "online") return "当前状态已接入同源 /api/runtime；远端可用时会自动同步到服务端数据库。";
  if (syncState === "local_fallback") return "数据保存在当前浏览器或 Android WebView 的 localStorage。";
  if (syncState === "syncing") return "正在与同源 /api/runtime 同步，完成后会回到在线或失败状态。";
  if (syncState === "conflict") return "冲突状态会先保留本地数据；导出 JSON 后再合并，避免覆盖已有证据。";
  return "远端同步失败时仍可继续本地记录；可先导出 JSON 备份，稍后回到今日页或刷新后重试同步。";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

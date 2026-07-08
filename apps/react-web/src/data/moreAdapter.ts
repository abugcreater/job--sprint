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
  storageOwner?: {
    username?: string;
    dataScope?: string;
  };
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
      webFallbackEntry: "React 入口（画像生成日历）",
      androidFallbackEntry: "apps/android/app/src/main/assets/react/index.html",
      rollbackNote: "旧静态日程不再作为用户入口；没有画像或今日日历时只展示建档引导。"
    },
    exportItems: [
      {
        id: "react-state",
        title: "导出个人数据备份",
        status: "可导出",
        description: "包含完成状态、证据记录、延期、画像、知识边界、自定义日程和 AI 建议。",
        filename: "job-sprint-react-state.json"
      },
      {
        id: "legacy-completion",
        title: "旧版本地数据检测",
        status: "只检测不合并",
        description: "旧版完成状态、复盘、错题、机会记录只用于提示迁移风险，不会自动并入今日/知识/面试数据。"
      },
      {
        id: "public-safe",
        title: "Android React 资产",
        status: "随构建同步",
        description: "Android 本地入口使用 React build 资产，和 Web 共享画像生成日历逻辑。"
      }
    ],
    nextEntries: [
      { label: "回到今日", path: "/today", description: "回到当前任务和 Evidence Gate。" },
      { label: "进入画像", path: "/coach", description: "维护求职画像、知识边界和 AI 建议。" },
      { label: "进入复盘", path: "/review", description: "记录今日事实、卡点和明日行动。" }
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
  lastSavedAt,
  storageOwner
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
  storageOwner?: {
    username?: string;
    dataScope?: string;
  };
}): ReactStateExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    source: reactStorageKey,
    storageOwner,
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
  if (syncState === "local_fallback") return "数据保存在当前设备的本地空间，恢复服务端后可继续同步。";
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

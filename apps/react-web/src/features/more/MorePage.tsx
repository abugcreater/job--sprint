import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileJson,
  History,
  Info,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Upload,
  WifiOff,
  type LucideIcon
} from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { buildMoreDashboard, buildReactStateExportPayload, parseReactStateImportPayload, type MoreExportItem } from "../../data/moreAdapter";
import { getLegacyStorageStatus } from "../../data/legacyAdapters";
import { useSprintStore } from "../../stores/sprintStore";

export function MorePage() {
  const sprint = useSprintStore((state) => state.sprint);
  const completed = useSprintStore((state) => state.completed);
  const evidenceByTaskId = useSprintStore((state) => state.evidenceByTaskId);
  const delayRecords = useSprintStore((state) => state.delayRecords);
  const userProfiles = useSprintStore((state) => state.userProfiles);
  const knowledgeBoundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const boundarySuggestionFeedback = useSprintStore((state) => state.boundarySuggestionFeedback);
  const coachScheduleEvents = useSprintStore((state) => state.coachScheduleEvents);
  const aiArtifacts = useSprintStore((state) => state.aiArtifacts);
  const llmRuns = useSprintStore((state) => state.llmRuns);
  const syncState = useSprintStore((state) => state.syncState);
  const lastSavedAt = useSprintStore((state) => state.lastSavedAt);
  const restoreSnapshot = useSprintStore((state) => state.restoreSnapshot);
  const [exportMessage, setExportMessage] = useState("待导出");
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  const dashboard = buildMoreDashboard({
    sprint,
    completed,
    evidenceByTaskId,
    delayRecords,
    userProfiles,
    knowledgeBoundaries,
    boundarySuggestionFeedback,
    coachScheduleEvents,
    aiArtifacts,
    llmRuns,
    syncState,
    lastSavedAt,
    legacyStatus: getLegacyStorageStatus(),
    storage
  });

  const handleExportReactState = useCallback(() => {
    const payload = buildReactStateExportPayload({ sprint, completed, evidenceByTaskId, delayRecords, userProfiles, knowledgeBoundaries, boundarySuggestionFeedback, coachScheduleEvents, aiArtifacts, llmRuns, syncState, lastSavedAt });
    const ok = downloadJson("job-sprint-react-state.json", payload);
    setExportMessage(ok ? "React 本地状态已导出" : "当前环境不支持浏览器下载");
  }, [aiArtifacts, boundarySuggestionFeedback, coachScheduleEvents, completed, delayRecords, evidenceByTaskId, knowledgeBoundaries, lastSavedAt, llmRuns, sprint, syncState, userProfiles]);

  const handleImportReactState = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const payload = JSON.parse(await readFileText(file));
        const result = parseReactStateImportPayload(payload);
        if (!result.ok) {
          setExportMessage(`导入失败：${result.error}`);
          return;
        }
        restoreSnapshot(result.snapshot);
        setExportMessage(`React 本地状态已导入：完成 ${result.summary.completedCount} 项，证据 ${result.summary.evidenceCount} 条，延期 ${result.summary.delayCount} 条，画像 ${result.summary.profileCount} 个，边界反馈 ${result.summary.boundaryFeedbackCount} 条，AI 草稿 ${result.summary.aiArtifactCount} 条，AI 运行 ${result.summary.llmRunCount} 条`);
      } catch {
        setExportMessage("导入失败：JSON 文件无法解析");
      }
    },
    [restoreSnapshot]
  );

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card min-w-0 p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-sm font-black text-brand-700">同步 / 导出 / 回滚</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <DatabaseZap size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">更多入口</h1>
              </div>
              <p className="mt-4 max-w-3xl break-words text-sm font-semibold leading-6 text-ink-500">
                集中处理同步状态、本地数据导出、恢复和回滚说明；失败状态必须给出可执行恢复动作。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
              <MetricTile label="同步状态" value={dashboard.sync.label} icon={<WifiOff size={15} aria-hidden="true" />} />
              <MetricTile label="本地证据" value={`${dashboard.storage.evidenceCount} 条`} />
              <MetricTile label="完成记录" value={`${dashboard.storage.completedCount} 项`} />
              <MetricTile label="延期记录" value={`${dashboard.storage.delayCount} 条`} />
              <MetricTile label="画像/边界" value={`${dashboard.storage.profileCount}/${dashboard.storage.boundaryCount}`} />
              <MetricTile label="边界反馈" value={`${dashboard.storage.boundaryFeedbackCount} 条`} />
              <MetricTile label="AI 草稿" value={`${dashboard.storage.aiArtifactCount} 条`} />
              <MetricTile label="AI 运行" value={`${dashboard.storage.llmRunCount} 条`} />
              <MetricTile label="旧版记录" value={`${dashboard.storage.legacyDetectedCount} 类`} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <aside className="min-w-0 space-y-4">
            <StatusPanel dashboard={dashboard} />
            <FallbackPanel dashboard={dashboard} />
          </aside>

          <section className="min-w-0 space-y-4">
            <ExportPanel
              items={dashboard.exportItems}
              exportMessage={exportMessage}
              onExportReactState={handleExportReactState}
              onImportReactState={handleImportReactState}
            />
            <RollbackPanel dashboard={dashboard} />
            <NextEntries entries={dashboard.nextEntries} />
          </section>
        </section>
      </section>
    </main>
  );
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface-0 p-3">
      <p className="text-[11px] font-black text-ink-500">{label}</p>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 break-words text-sm font-extrabold leading-5 text-ink-900">
        {icon}
        <span className="min-w-0 break-words">{value}</span>
      </p>
    </div>
  );
}

function StatusPanel({ dashboard }: { dashboard: ReturnType<typeof buildMoreDashboard> }) {
  return (
    <article className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
      <PanelTitle icon={WifiOff} title="同步状态" />
      <p className="mt-4 break-words text-3xl font-black text-ink-900">{dashboard.sync.label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink-500">{dashboard.sync.detail}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallStat label="当前日期" value={dashboard.dateLabel} />
        <SmallStat label="最近保存" value={dashboard.sync.lastSavedLabel} />
      </div>
    </article>
  );
}

function FallbackPanel({ dashboard }: { dashboard: ReturnType<typeof buildMoreDashboard> }) {
  return (
    <article className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
      <PanelTitle icon={ShieldCheck} title="localStorage 状态" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallStat label="React 存储" value={dashboard.storage.reactPersisted ? "已检测" : "未写入"} />
        <SmallStat label="存储大小" value={`${dashboard.storage.reactStorageBytes} bytes`} />
        <SmallStat label="旧版 key" value={`${dashboard.storage.legacyDetectedCount} 类`} />
        <SmallStat label="存储可用" value={dashboard.storage.available ? "可用" : "不可用"} />
      </div>
      <div className="mt-4 min-w-0 rounded-card bg-surface-0 p-4">
        <p className="text-xs font-black uppercase text-ink-500">旧版 localStorage</p>
        {dashboard.storage.legacyDetectedLabels.length ? (
          <ul className="mt-2 space-y-1">
            {dashboard.storage.legacyDetectedLabels.map((label) => (
              <li key={label} className="flex gap-2 text-sm font-bold leading-6 text-ink-700">
                <CheckCircle2 className="mt-0.5 shrink-0 text-brand-700" size={15} aria-hidden="true" />
                <span className="min-w-0 break-words">{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink-500">当前浏览器未检测到旧版记录。</p>
        )}
      </div>
    </article>
  );
}

function ExportPanel({
  items,
  exportMessage,
  onExportReactState,
  onImportReactState
}: {
  items: MoreExportItem[];
  exportMessage: string;
  onExportReactState: () => void;
  onImportReactState: (file?: File) => void;
}) {
  return (
    <article className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
      <PanelTitle icon={Download} title="导出与恢复" />
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="min-w-0 rounded-card bg-surface-0 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="rounded-control bg-white px-2 py-1 text-xs font-black text-ink-500">{item.status}</span>
                <h3 className="mt-2 break-words text-base font-black leading-6 text-ink-900">{item.title}</h3>
                <p className="mt-1 break-words text-sm font-semibold leading-6 text-ink-500">{item.description}</p>
              </div>
              {item.id === "react-state" ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-brand-700 px-4 text-sm font-black text-white shadow-soft transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                  onClick={onExportReactState}
                >
                  <FileJson size={16} aria-hidden="true" />
                  导出 JSON
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 min-w-0 rounded-card bg-surface-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="rounded-control bg-white px-2 py-1 text-xs font-black text-ink-500">可导入</span>
            <h3 className="mt-2 break-words text-base font-black leading-6 text-ink-900">导入 React 状态 JSON</h3>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-ink-500">只接受 jobSprint.react.v1 导出文件，并恢复完成、证据、延期、画像、知识边界、AI 草稿和 AI 运行记录。</p>
          </div>
          <label
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-brand-700 bg-white px-4 text-sm font-black text-brand-700 shadow-soft transition hover:bg-brand-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-2"
          >
            <Upload size={16} aria-hidden="true" />
            导入 JSON
            <input
              aria-label="导入 React 状态 JSON"
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void onImportReactState(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <p className="mt-3 break-words text-sm font-bold text-ink-500" role="status">
        {exportMessage}
      </p>
    </article>
  );
}

function RollbackPanel({ dashboard }: { dashboard: ReturnType<typeof buildMoreDashboard> }) {
  const rows = [
    { icon: DatabaseZap, label: "React build", value: dashboard.fallback.reactEntry },
    { icon: RotateCcw, label: "旧版 Web", value: dashboard.fallback.webFallbackEntry },
    { icon: Smartphone, label: "Android fallback", value: dashboard.fallback.androidFallbackEntry }
  ];

  return (
    <article className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
      <PanelTitle icon={History} title="旧版回滚说明" />
      <p className="mt-3 break-words text-sm font-semibold leading-6 text-ink-500">{dashboard.fallback.rollbackNote}</p>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 gap-3 rounded-card bg-surface-0 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-100 text-brand-700">
              <row.icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-ink-500">{row.label}</p>
              <p className="mt-1 break-all text-sm font-extrabold leading-6 text-ink-900">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function NextEntries({ entries }: { entries: Array<{ label: string; path: string; description: string }> }) {
  return (
    <article className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
      <PanelTitle icon={Info} title="后续能力入口" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.path}
            to={entry.path}
            className="group flex min-h-24 min-w-0 items-center justify-between gap-3 rounded-card border border-line bg-surface-0 p-4 text-left transition hover:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <span className="min-w-0">
              <span className="block break-words text-base font-black text-ink-900">{entry.label}</span>
              <span className="mt-1 block break-words text-sm font-semibold leading-6 text-ink-500">{entry.description}</span>
            </span>
            <ArrowRight className="shrink-0 text-brand-700 transition group-hover:translate-x-0.5" size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </article>
  );
}

function PanelTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-brand-700">
      <Icon size={18} aria-hidden="true" />
      <h2 className="min-w-0 break-words text-base font-black text-ink-900">{title}</h2>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-card bg-surface-0 p-3">
      <p className="text-xs font-black text-ink-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black leading-6 text-ink-900">{value}</p>
    </div>
  );
}

function downloadJson(filename: string, data: unknown): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!window.URL || typeof window.URL.createObjectURL !== "function") return false;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsText(file);
  });
}

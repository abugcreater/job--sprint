import { ArrowRight, CheckCircle2, Clock3, DatabaseZap, RotateCcw } from "lucide-react";
import { NavLink } from "react-router-dom";
import { routeById, type AppRouteId } from "../../app/navigation";
import { useSprintStore } from "../../stores/sprintStore";

export function ModulePlaceholderPage({ routeId }: { routeId: Exclude<AppRouteId, "today"> }) {
  const route = routeById[routeId];
  const Icon = route.icon;
  const sprint = useSprintStore((state) => state.sprint);
  const completed = useSprintStore((state) => state.completed);
  const pendingCount = sprint.tasks.filter((task) => !completed[task.id]).length;

  return (
    <main className="min-h-screen bg-surface-0 pb-24 text-ink-900 md:pb-0">
      <section className="mx-auto flex min-h-screen w-full max-w-shell flex-col gap-4 px-4 py-4 md:px-8 md:py-6">
        <header className="rounded-card border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase text-ink-500">{route.eyebrow}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-black leading-tight md:text-4xl">{route.title}</h1>
              </div>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-ink-500">{route.summary}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 md:min-w-[520px]">
              <StatusTile label="接入状态" value={route.status} />
              <StatusTile label="今日剩余" value={`${pendingCount} 个任务`} />
              <StatusTile label="数据模式" value="本地模式" />
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2 text-brand-700">
              <CheckCircle2 size={18} aria-hidden="true" />
              <h2 className="text-base font-black">当前边界</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <BoundaryCard label="主焦点" value={route.primaryFocus} />
              <BoundaryCard label="迁移范围" value={route.migrationScope} />
              <BoundaryCard label="保留路径" value="旧版静态页面和 Android WebView 回退入口" />
              <BoundaryCard label="本阶段不做" value="不扩大到真实服务端写入和账号体系" />
            </div>
          </article>

          <article className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2 text-brand-700">
              <Clock3 size={18} aria-hidden="true" />
              <h2 className="text-base font-black">下一步</h2>
            </div>
            <p className="text-sm font-semibold leading-6 text-ink-500">
              先验证路由、导航和 Android WebView 加载稳定，再逐页推进知识边界、面试、机会验证或复盘。
            </p>
            {routeId === "more" ? <MoreLinks /> : <RouteActions />}
          </article>
        </section>
      </section>
    </main>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface-0 p-3">
      <p className="text-[11px] font-black uppercase text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-5 text-ink-900">{value}</p>
    </div>
  );
}

function BoundaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-surface-0 p-4">
      <p className="text-xs font-black uppercase text-ink-500">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-ink-900">{value}</p>
    </div>
  );
}

function RouteActions() {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <NavLink
        to="/today"
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-700 px-4 text-sm font-black text-white shadow-soft transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <ArrowRight size={16} aria-hidden="true" />
        回到今日
      </NavLink>
      <NavLink
        to="/more"
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <RotateCcw size={16} aria-hidden="true" />
        查看更多
      </NavLink>
    </div>
  );
}

function MoreLinks() {
  return (
    <div className="mt-5 grid gap-2">
      <NavLink
        to="/review"
        className="flex min-h-12 items-center justify-between rounded-control border border-line bg-surface-0 px-4 text-sm font-black text-ink-900 transition hover:border-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 size={16} aria-hidden="true" />
          进入复盘
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </NavLink>
      <div className="flex min-h-12 items-center gap-2 rounded-control border border-line bg-surface-0 px-4 text-sm font-bold text-ink-500">
        <DatabaseZap size={16} aria-hidden="true" />
        设置、导出和远端同步集中在更多入口
      </div>
    </div>
  );
}

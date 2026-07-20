import { useCallback, useEffect, useState } from "react";
import { CloudOff, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AuthSessionContext } from "./authSessionContext";
import { MobileBottomNav } from "./MobileBottomNav";
import { appRoutes, desktopNavRouteIds, routeById, visibleRouteIds, type AppRouteId } from "./navigation";
import { syncStateLabel } from "./syncStatus";
import {
  authSessionMeta,
  authSessionTitle,
  buildLoginHref,
  fetchAuthSession,
  initialAuthSession,
  isOwnerSession,
  logoutAuthSession,
  type AuthSessionState
} from "../api/authClient";
import { useSprintStore } from "../stores/sprintStore";

export function AppShell() {
  const location = useLocation();
  const syncState = useSprintStore((state) => state.syncState);
  const sprint = useSprintStore((state) => state.sprint);
  const [authSession, setAuthSession] = useState<AuthSessionState>(() => initialAuthSession());
  const syncLabel = syncStateLabel(syncState);
  const visibleDesktopRouteIds = visibleRouteIds(desktopNavRouteIds, { owner: isOwnerSession(authSession) });
  const currentRoute = appRoutes.find((route) => location.pathname.startsWith(route.path)) ?? routeById.today;
  const refreshAuth = useCallback(() => {
    let active = true;
    fetchAuthSession().then((session) => {
      if (active) setAuthSession(session);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authSession.status !== "checking") return undefined;
    return refreshAuth();
  }, [authSession.status, refreshAuth]);

  const handleLogout = useCallback(async () => {
    setAuthSession({ status: "checking" });
    useSprintStore.getState().resetRuntimeForOwner(undefined, "local_fallback");
    await logoutAuthSession();
    window.location.href = buildLoginHref();
  }, []);

  return (
    <AuthSessionContext.Provider value={authSession}>
      <a
        href="#app-content"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-control bg-white px-3 py-2 text-sm font-black text-ink-950 shadow-panel transition focus:translate-y-0"
        onClick={(event) => {
          event.preventDefault();
          focusAppContent();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          focusAppContent();
        }}
      >
        跳到主要内容
      </a>
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white shadow-panel md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-control border border-white/15 bg-white/10 text-brand-100">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-100">Job Sprint</p>
              <p className="truncate text-base font-black">{currentRoute.label}作战台</p>
            </div>
          </div>
          <NavLink to="/more" className="status-chip min-h-11 shrink-0 border border-white/15 bg-white/10 text-white" aria-label={`${syncLabel}，打开账号与数据处理同步`}>
            <CloudOff size={14} aria-hidden="true" />
            {syncState === "failed" ? "处理同步" : syncLabel}
          </NavLink>
        </div>
      </header>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-white/10 bg-ink-950 text-white md:flex md:flex-col">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-control border border-white/15 bg-white/10 text-brand-100">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-100">Job Sprint</p>
              <p className="truncate text-base font-black text-white">个人求职作战台</p>
            </div>
          </div>
          <p className="mt-4 text-xs font-bold leading-5 text-ink-300">{sprint.date} {sprint.weekday} · 每次只推进一个可验证动作</p>
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3" aria-label="桌面模块导航">
          {navGroups.map((group) => {
            const routeIds = group.ids.filter((id) => visibleDesktopRouteIds.includes(id));
            if (!routeIds.length) return null;
            return (
              <div key={group.label}>
                <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-400">{group.label}</p>
                <div className="grid gap-1">
                  {routeIds.map((id) => {
                    const item = routeById[id];
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        className={({ isActive }) =>
                          `group relative inline-flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                            isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${isActive ? "bg-brand-100" : "bg-transparent"}`} />
                            <Icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <NavLink to="/more" className="flex min-h-11 items-center justify-between gap-3 rounded-control border border-white/10 bg-white/5 px-3 text-xs font-bold text-ink-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <span className="inline-flex items-center gap-2"><CloudOff size={15} aria-hidden="true" />{syncLabel}</span>
            <span className="text-brand-100">账号</span>
          </NavLink>
          <AuthStatusBar session={authSession} onLogout={handleLogout} dark />
        </div>
      </aside>
      <div id="app-content" tabIndex={-1}>
        <Outlet />
      </div>
      <MobileBottomNav />
    </AuthSessionContext.Provider>
  );
}

function focusAppContent() {
  window.requestAnimationFrame(() => {
    document.getElementById("app-content")?.focus();
  });
}

function AuthStatusBar({
  session,
  onLogout,
  compact = false,
  dark = false
}: {
  session: AuthSessionState;
  onLogout: () => void;
  compact?: boolean;
  dark?: boolean;
}) {
  const title = authSessionTitle(session);
  const meta = authSessionMeta(session);
  const loginHref = buildLoginHref();
  const isAuthenticated = session.status === "authenticated";
  const isAnonymous = session.status === "anonymous";

  return (
    <div className={compact ? "mt-2 flex min-w-0 items-center justify-between gap-2 text-xs" : `mt-3 border-t pt-3 ${dark ? "border-white/10" : "border-line"}`}>
      <div className={compact ? "flex min-w-0 items-center gap-2" : "min-w-0"}>
        <span className={`${compact ? "grid size-7 shrink-0" : "mb-2 inline-grid size-8"} place-items-center rounded-control ${dark ? "bg-white/10 text-brand-100" : "bg-surface-0 text-brand-700"}`}>
          <UserRound size={compact ? 14 : 16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={compact ? `truncate font-black ${dark ? "text-white" : "text-ink-900"}` : `text-xs font-black ${dark ? "text-ink-400" : "text-ink-500"}`}>{compact ? title : "当前账号"}</p>
          <p className={compact ? `truncate font-semibold ${dark ? "text-ink-300" : "text-ink-500"}` : `truncate text-sm font-extrabold ${dark ? "text-white" : "text-ink-900"}`}>{compact ? meta : title}</p>
          {!compact ? <p className={`mt-0.5 truncate text-xs font-semibold ${dark ? "text-ink-400" : "text-ink-500"}`}>{meta}</p> : null}
        </div>
      </div>
      {isAuthenticated ? (
        <button
          type="button"
          className={`${compact ? "status-chip shrink-0" : "mt-3 status-chip"} border ${dark ? "border-white/15 bg-white/10 text-white" : "border-line bg-white text-ink-700"}`}
          onClick={onLogout}
        >
          <LogOut size={14} aria-hidden="true" />
          退出
        </button>
      ) : isAnonymous ? (
        <a
          className={compact ? "status-chip shrink-0 bg-brand-100 text-brand-800" : "mt-3 status-chip bg-brand-100 text-brand-800"}
          href={loginHref}
        >
          <LogIn size={14} aria-hidden="true" />
          登录
        </a>
      ) : null}
    </div>
  );
}

const navGroups: Array<{ label: string; ids: AppRouteId[] }> = [
  { label: "行动", ids: ["today", "applications", "review"] },
  { label: "准备", ids: ["coach", "learn", "interview"] },
  { label: "洞察", ids: ["stats"] },
  { label: "账号与数据", ids: ["more"] },
  { label: "管理员", ids: ["admin"] }
];

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

import { useCallback, useEffect, useState } from "react";
import { CloudOff, LogIn, LogOut, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AuthSessionContext } from "./authSessionContext";
import { MobileBottomNav } from "./MobileBottomNav";
import { desktopNavRouteIds, routeById, visibleRouteIds } from "./navigation";
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
  const syncState = useSprintStore((state) => state.syncState);
  const sprint = useSprintStore((state) => state.sprint);
  const [authSession, setAuthSession] = useState<AuthSessionState>(() => initialAuthSession());
  const syncLabel = syncStateLabel(syncState);
  const syncTone = syncState === "online" ? "bg-success-100 text-success-600" : syncState === "failed" ? "bg-risk-100 text-risk-600" : "bg-warn-100 text-warn-600";
  const visibleDesktopRouteIds = visibleRouteIds(desktopNavRouteIds, { owner: isOwnerSession(authSession) });
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
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase text-brand-700">Job Sprint</p>
            <p className="truncate text-lg font-black text-ink-900">个人求职教练</p>
          </div>
          <NavLink to="/more" className={`status-chip shrink-0 ${syncTone}`} aria-label={`${syncLabel}，打开更多页处理同步`}>
            <CloudOff size={14} aria-hidden="true" />
            {syncState === "failed" ? "处理同步" : syncLabel}
          </NavLink>
        </div>
        <AuthStatusBar session={authSession} onLogout={handleLogout} compact />
      </header>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-white md:flex md:flex-col">
        <div className="border-b border-line p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-control bg-ink-900 text-white">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-brand-700">Job Sprint</p>
              <p className="truncate text-base font-black text-ink-900">执行与证据</p>
            </div>
          </div>
          <div className="mt-4 rounded-card bg-surface-0 p-3">
            <p className="text-xs font-black text-ink-500">今日</p>
            <p className="mt-1 text-sm font-extrabold text-ink-900">{sprint.date} {sprint.weekday}</p>
            <NavLink to="/more" className={`mt-3 status-chip ${syncTone}`} aria-label={`${syncLabel}，打开更多页处理同步`}>
              <RefreshCw size={14} aria-hidden="true" />
              {syncState === "failed" ? "处理同步" : syncLabel}
            </NavLink>
          </div>
          <AuthStatusBar session={authSession} onLogout={handleLogout} />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="桌面模块导航">
          {visibleDesktopRouteIds.map((id) => {
            const item = routeById[id];
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `inline-flex min-h-12 items-center gap-3 rounded-control px-3 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-brand-600 ${
                    isActive ? "bg-brand-700 text-white shadow-soft" : "text-ink-500 hover:bg-surface-0 hover:text-ink-900"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-line p-4 text-xs font-semibold leading-5 text-ink-500">
          个人求职教练 · Evidence Gate 优先
        </div>
      </aside>
      <Outlet />
      <MobileBottomNav />
    </AuthSessionContext.Provider>
  );
}

function AuthStatusBar({
  session,
  onLogout,
  compact = false
}: {
  session: AuthSessionState;
  onLogout: () => void;
  compact?: boolean;
}) {
  const title = authSessionTitle(session);
  const meta = authSessionMeta(session);
  const loginHref = buildLoginHref();
  const isAuthenticated = session.status === "authenticated";
  const isAnonymous = session.status === "anonymous";

  return (
    <div className={compact ? "mt-2 flex min-w-0 items-center justify-between gap-2 text-xs" : "mt-3 border-t border-line pt-3"}>
      <div className={compact ? "flex min-w-0 items-center gap-2" : "min-w-0"}>
        <span className={compact ? "grid size-7 shrink-0 place-items-center rounded-control bg-surface-0 text-brand-700" : "mb-2 inline-grid size-8 place-items-center rounded-control bg-surface-0 text-brand-700"}>
          <UserRound size={compact ? 14 : 16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={compact ? "truncate font-black text-ink-900" : "text-xs font-black text-ink-500"}>{compact ? title : "当前账号"}</p>
          <p className={compact ? "truncate font-semibold text-ink-500" : "truncate text-sm font-extrabold text-ink-900"}>{compact ? meta : title}</p>
          {!compact ? <p className="mt-0.5 truncate text-xs font-semibold text-ink-500">{meta}</p> : null}
        </div>
      </div>
      {isAuthenticated ? (
        <button
          type="button"
          className={compact ? "status-chip shrink-0 border border-line bg-white text-ink-700" : "mt-3 status-chip border border-line bg-white text-ink-700"}
          onClick={onLogout}
        >
          <LogOut size={14} aria-hidden="true" />
          退出
        </button>
      ) : isAnonymous ? (
        <a
          className={compact ? "status-chip shrink-0 bg-brand-700 text-white" : "mt-3 status-chip bg-brand-700 text-white"}
          href={loginHref}
        >
          <LogIn size={14} aria-hidden="true" />
          登录
        </a>
      ) : null}
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

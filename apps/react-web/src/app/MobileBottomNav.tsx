import { Link, useLocation } from "react-router-dom";
import { isOwnerSession } from "../api/authClient";
import { useAuthSessionContext } from "./authSessionContext";
import { bottomNavRouteIds, getBottomNavActiveId, routeById, visibleRouteIds } from "./navigation";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const session = useAuthSessionContext();
  const activeId = getBottomNavActiveId(pathname);
  const routeIds = visibleRouteIds(bottomNavRouteIds, { owner: isOwnerSession(session) });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-panel backdrop-blur md:hidden" aria-label="移动端底部导航">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {routeIds.map((id) => {
          const item = routeById[id];
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-control text-xs font-extrabold transition focus:outline-none focus:ring-2 focus:ring-brand-600 active:scale-[0.98] ${
                active ? "bg-brand-100 text-brand-700" : "text-ink-500 hover:bg-surface-0 hover:text-ink-900"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isOwnerSession } from "../api/authClient";
import { useAuthSessionContext } from "./authSessionContext";
import { bottomNavRouteIds, getBottomNavActiveId, routeById, visibleRouteIds } from "./navigation";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const session = useAuthSessionContext();
  const activeId = getBottomNavActiveId(pathname);
  const routeIds = visibleRouteIds(bottomNavRouteIds, { owner: isOwnerSession(session) });
  const imeOpen = useImeVisibility();

  if (imeOpen) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5 shadow-panel backdrop-blur md:hidden" aria-label="移动端底部导航">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {routeIds.map((id) => {
          const item = routeById[id];
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-control text-[11px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-brand-600 active:scale-[0.98] ${
                active ? "text-brand-700" : "text-ink-500 hover:bg-surface-0 hover:text-ink-900"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {active ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-700" aria-hidden="true" /> : null}
              <Icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function useImeVisibility() {
  const [imeOpen, setImeOpen] = useState(false);
  const imeOpenRef = useRef(false);
  const largestViewportHeight = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    const currentHeight = () => viewport?.height ?? window.innerHeight;
    largestViewportHeight.current = Math.max(largestViewportHeight.current, currentHeight());

    const update = () => {
      const height = currentHeight();
      const active = document.activeElement;
      const editing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable);
      largestViewportHeight.current = Math.max(largestViewportHeight.current, height);
      const nextImeOpen = editing && largestViewportHeight.current - height > 120;
      if (imeOpenRef.current !== nextImeOpen) {
        imeOpenRef.current = nextImeOpen;
        setImeOpen(nextImeOpen);
      }
    };

    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return imeOpen;
}

import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type PendingRouteLeave =
  | {
      kind: "route";
      to: string;
      trigger: HTMLElement;
    }
  | {
      kind: "android-system-back";
    };

declare global {
  interface Window {
    AndroidBackNavigation?: {
      completeBackNavigation: () => void;
    };
  }
}

type RouteLeaveGuardContextValue = {
  registerDirtyCheck: (id: string, isDirty: () => boolean) => () => void;
};

const RouteLeaveGuardContext = createContext<RouteLeaveGuardContextValue | null>(null);

export function RouteLeaveGuardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const checksRef = useRef(new Map<string, () => boolean>());
  const [pendingLeave, setPendingLeave] = useState<PendingRouteLeave | null>(null);

  const hasUnsavedChanges = useCallback(() => Array.from(checksRef.current.values()).some((isDirty) => isDirty()), []);

  const registerDirtyCheck = useCallback((id: string, isDirty: () => boolean) => {
    checksRef.current.set(id, isDirty);
    return () => checksRef.current.delete(id);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleRouteClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;
    const closestAnchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(closestAnchor instanceof HTMLAnchorElement)) return;
    const anchor = closestAnchor;
    if (!event.currentTarget.contains(anchor) || anchor.target || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href?.startsWith("#/")) return;
    const target = href.slice(1);
    if (target === `${location.pathname}${location.search}` || !hasUnsavedChanges()) return;

    event.preventDefault();
    event.stopPropagation();
    setPendingLeave({ kind: "route", to: target, trigger: anchor });
  }, [hasUnsavedChanges, location.pathname, location.search]);

  useEffect(() => {
    const handleAndroidSystemBack = (event: Event) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      setPendingLeave((current) => current ?? { kind: "android-system-back" });
    };
    window.addEventListener("jobsprint:android-back-pressed", handleAndroidSystemBack);
    return () => window.removeEventListener("jobsprint:android-back-pressed", handleAndroidSystemBack);
  }, [hasUnsavedChanges]);

  const continueEditing = useCallback(() => {
    const trigger = pendingLeave?.kind === "route" ? pendingLeave.trigger : undefined;
    setPendingLeave(null);
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, [pendingLeave]);

  const discardAndLeave = useCallback(() => {
    if (!pendingLeave) return;
    const leave = pendingLeave;
    setPendingLeave(null);
    if (leave.kind === "android-system-back") {
      if (window.AndroidBackNavigation?.completeBackNavigation) {
        window.AndroidBackNavigation.completeBackNavigation();
        return;
      }
      window.history.back();
      return;
    }
    navigate(leave.to);
  }, [navigate, pendingLeave]);

  const value = useMemo(() => ({ registerDirtyCheck }), [registerDirtyCheck]);

  return (
    <RouteLeaveGuardContext.Provider value={value}>
      <div onClickCapture={handleRouteClickCapture}>
        {children}
      </div>
      {pendingLeave ? <RouteLeaveConfirmation onContinue={continueEditing} onDiscard={discardAndLeave} /> : null}
    </RouteLeaveGuardContext.Provider>
  );
}

export function useRouteLeaveGuard(isDirty: boolean) {
  const context = useContext(RouteLeaveGuardContext);
  const id = useId();
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  useEffect(() => {
    if (!context) return undefined;
    return context.registerDirtyCheck(id, () => dirtyRef.current);
  }, [context, id]);
}

function RouteLeaveConfirmation({ onContinue, onDiscard }: { onContinue: () => void; onDiscard: () => void }) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/45 p-4" role="presentation">
      <section className="w-full max-w-md rounded-workbench border border-line bg-white p-5 shadow-panel" role="alertdialog" aria-modal="true" aria-labelledby="route-leave-title" aria-describedby="route-leave-detail">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-risk-100 text-risk-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="route-leave-title" className="text-lg font-black text-ink-950">离开当前页面？</h2>
            <p id="route-leave-detail" className="mt-2 text-sm font-semibold leading-6 text-ink-600">当前输入尚未保存。继续编辑会保留内容；离开后这些修改不会自动保存。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button ref={continueButtonRef} type="button" className="primary-button justify-center" onClick={onContinue}>
            <X size={16} aria-hidden="true" />
            继续编辑
          </button>
          <button type="button" className="secondary-button justify-center border-risk-200 text-risk-600 hover:bg-risk-100" onClick={onDiscard}>
            <ArrowRight size={16} aria-hidden="true" />
            放弃修改并离开
          </button>
        </div>
      </section>
    </div>
  );
}

import { KeyRound, Settings2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isOwnerSession } from "../../api/authClient";
import { fetchCoachOnboardingReport, type CoachOnboardingReportResponse } from "../../api/coachOnboardingReportClient";
import { useAuthSessionContext } from "../../app/authSessionContext";
import { InviteManagementPanel } from "../coach/components/InviteManagementPanel";
import { InviteOnboardingReportPanel } from "../coach/components/InviteOnboardingReportPanel";

type AdminWorkspace = "onboarding" | "accounts";

export function AdminPage() {
  const session = useAuthSessionContext();
  const owner = isOwnerSession(session);
  const [onboardingReport, setOnboardingReport] = useState<CoachOnboardingReportResponse | null>(null);
  const [onboardingReportStatus, setOnboardingReportStatus] = useState<"idle" | "loading" | "ready" | "local" | "error">("idle");
  const [workspace, setWorkspace] = useState<AdminWorkspace>("onboarding");

  useEffect(() => {
    if (owner) void loadOnboardingReport();
  }, [owner]);

  const loadOnboardingReport = async () => {
    setOnboardingReportStatus("loading");
    try {
      const report = await fetchCoachOnboardingReport();
      setOnboardingReport(report);
      setOnboardingReportStatus(report ? "ready" : "local");
    } catch (_) {
      setOnboardingReportStatus("error");
    }
  };

  if (session.status === "checking") {
    return (
      <main className="app-main">
        <section className="app-page">
          <article className="command-card p-5">
            <p className="text-sm font-black text-brand-700">权限检查中</p>
            <h1 className="mt-2 text-3xl font-black text-ink-900">正在确认管理员权限</h1>
          </article>
        </section>
      </main>
    );
  }

  if (!owner) {
    return <Navigate to="/more" replace />;
  }

  return (
    <main className="app-main">
      <section className="app-page">
        <header className="command-card p-4 md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex max-w-3xl flex-col gap-3">
              <p className="text-sm font-black text-brand-700">管理员 · 邀请与账号</p>
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-brand-100 text-brand-700">
                  <Settings2 size={22} aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black leading-tight md:text-4xl">管理员中心</h1>
              </div>
              <p className="max-w-3xl text-sm font-semibold leading-6 text-ink-500">
                邀请、批次首登和账号状态在这里集中处理，不再混入普通用户的画像工作流。
              </p>
            </div>
            <nav className="grid gap-2 sm:grid-cols-2 xl:min-w-[460px]" role="tablist" aria-label="管理员工作区">
              <AdminWorkspaceTab
                active={workspace === "onboarding"}
                controls="admin-workspace-onboarding-panel"
                description="查看批次风险、放弃点和首登完成度。"
                icon={<UsersRound size={17} aria-hidden="true" />}
                id="admin-workspace-onboarding-tab"
                label="建档看板"
                onClick={() => setWorkspace("onboarding")}
              />
              <AdminWorkspaceTab
                active={workspace === "accounts"}
                controls="admin-workspace-accounts-panel"
                description="登记邀请、开通账号和处理登录权限。"
                icon={<KeyRound size={17} aria-hidden="true" />}
                id="admin-workspace-accounts-tab"
                label="账号管理"
                onClick={() => setWorkspace("accounts")}
              />
            </nav>
          </div>
        </header>

        {workspace === "onboarding" ? (
          <section
            id="admin-workspace-onboarding-panel"
            role="tabpanel"
            aria-labelledby="admin-workspace-onboarding-tab"
            tabIndex={0}
          >
            <InviteOnboardingReportPanel report={onboardingReport} status={onboardingReportStatus} onRefresh={loadOnboardingReport} />
          </section>
        ) : (
          <section
            id="admin-workspace-accounts-panel"
            role="tabpanel"
            aria-labelledby="admin-workspace-accounts-tab"
            tabIndex={0}
          >
            <InviteManagementPanel onboardingReport={onboardingReport} />
          </section>
        )}
      </section>
    </main>
  );
}

function AdminWorkspaceTab({
  active,
  controls,
  description,
  icon,
  id,
  label,
  onClick
}: {
  active: boolean;
  controls: string;
  description: string;
  icon: ReactNode;
  id: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-16 rounded-card border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${
        active ? "border-brand-200 bg-brand-100 text-brand-700" : "border-line bg-white text-ink-700 hover:bg-surface-0"
      }`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      id={id}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-xs font-bold leading-5 text-ink-500">{description}</span>
    </button>
  );
}

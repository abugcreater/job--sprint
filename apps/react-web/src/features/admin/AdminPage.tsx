import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isOwnerSession } from "../../api/authClient";
import { fetchCoachOnboardingReport, type CoachOnboardingReportResponse } from "../../api/coachOnboardingReportClient";
import { useAuthSessionContext } from "../../app/authSessionContext";
import { InviteManagementPanel } from "../coach/components/InviteManagementPanel";
import { InviteOnboardingReportPanel } from "../coach/components/InviteOnboardingReportPanel";

export function AdminPage() {
  const session = useAuthSessionContext();
  const owner = isOwnerSession(session);
  const [onboardingReport, setOnboardingReport] = useState<CoachOnboardingReportResponse | null>(null);
  const [onboardingReportStatus, setOnboardingReportStatus] = useState<"idle" | "loading" | "ready" | "local" | "error">("idle");

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
        </header>

        <InviteOnboardingReportPanel report={onboardingReport} status={onboardingReportStatus} onRefresh={loadOnboardingReport} />
        <InviteManagementPanel />
      </section>
    </main>
  );
}

import { AlertTriangle } from "lucide-react";
import type { CoachDataScopeConflict } from "../../../api/coachInvitationClient";

export function InviteManagementDataScopeConflicts({ conflicts }: { conflicts: CoachDataScopeConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <section className="mt-4 rounded-card border border-risk-200 bg-risk-100 p-4" role="alert" aria-label="数据域冲突风险">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 shrink-0 text-risk-600" size={18} aria-hidden="true" />
        <div>
          <p className="text-sm font-black text-risk-600">发现 {conflicts.length} 个历史数据域重复配置</p>
          <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-ink-700">
            {conflicts.map((conflict) => (
              <li key={conflict.dataScope}>数据域「{conflict.dataScope}」被登录账号「{conflict.usernames.join("、")}」共用。</li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-600">系统不会自动迁移或改写历史求职数据。请先核验账号归属，再为需保留的账号设置独立数据域并完成开通或重置。</p>
        </div>
      </div>
    </section>
  );
}

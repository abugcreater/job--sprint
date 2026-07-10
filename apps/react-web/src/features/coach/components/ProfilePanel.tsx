import { CheckCircle2, Edit3, RotateCcw, Save, Trash2, UserRound, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buildCoachDashboard, profileRoleFamilies, type ProfileDraft } from "../../../data/coachAdapter";
import type { DeletedUserProfileBundle } from "../../../stores/sprintStoreTypes";
import type { ProfileRoleFamily } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

type CoachProfile = ReturnType<typeof buildCoachDashboard>["profiles"][number];

export function ProfilePanel({
  profiles,
  activeProfileId,
  draft,
  feedback,
  recentlyDeletedProfileBundle,
  onChange,
  onNew,
  onActivate,
  onEdit,
  onDelete,
  onUndoDelete,
  onDismissDeletedProfile,
  onSave
}: {
  profiles: CoachProfile[];
  activeProfileId?: string;
  draft: ProfileDraft;
  feedback?: string;
  recentlyDeletedProfileBundle: DeletedUserProfileBundle | null;
  onChange: (patch: Partial<ProfileDraft>) => void;
  onNew: () => void;
  onActivate: (profile: CoachProfile) => void;
  onEdit: (profile: CoachProfile) => void;
  onDelete: (profileId: string) => void;
  onUndoDelete: () => void;
  onDismissDeletedProfile: () => void;
  onSave: () => void;
}) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const editingExisting = Boolean(draft.id);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const showDeleteConfirm = Boolean(draft.id && confirmDeleteId === draft.id);
  const deleteLabel = draft.name || activeProfile?.name || "当前画像";

  return (
    <article className="command-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <PanelTitle icon={<UserRound size={18} aria-hidden="true" />} title="求职画像" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">
            记录你的目标岗位、经验主线和不可夸大的边界，后续知识、面试和今日行动都会引用这份画像。
          </p>
        </div>
        <button type="button" className="secondary-button min-h-11 px-3" onClick={() => {
          setConfirmDeleteId(null);
          onNew();
        }}>
          新建画像
        </button>
      </div>

      <section className="mt-4 grid gap-3 rounded-card bg-surface-0 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-ink-500">当前求职画像</p>
          <h3 className="mt-2 break-words text-xl font-black leading-7 text-ink-900">{activeProfile?.name ?? "尚未创建画像"}</h3>
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink-500">
            {activeProfile ? `${activeProfile.targetRole || "未填写目标岗位"} · ${activeProfile.cities || "未填写城市"} · 每日 ${activeProfile.dailyMinutes || 0} 分钟` : "保存一个画像后，知识、面试和 AI 建议才会围绕你的目标生成。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={`touch-button px-3 ${profile.id === activeProfileId ? "bg-brand-700 text-white" : "border border-line bg-white text-ink-700"}`}
              onClick={() => {
                setConfirmDeleteId(null);
                onActivate(profile);
              }}
              aria-current={profile.id === activeProfileId ? "true" : undefined}
            >
              {profile.name}
            </button>
          ))}
        </div>
      </section>

      {feedback ? (
        <p className="mt-4 rounded-control bg-success-100 px-3 py-2 text-sm font-bold text-success-600" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      {recentlyDeletedProfileBundle ? (
        <div className="mt-4 rounded-card border border-success-600/30 bg-success-100 p-3" role="status" aria-live="polite">
          <p className="text-sm font-black leading-6 text-success-600">
            已删除「{recentlyDeletedProfileBundle.profile.name}」画像，可立即撤销并恢复{profileBundleSummary(recentlyDeletedProfileBundle)}到 AI 教练上下文。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-success-600 px-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
              onClick={() => {
                setConfirmDeleteId(null);
                onUndoDelete();
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              撤销删除
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              onClick={() => {
                setConfirmDeleteId(null);
                onDismissDeletedProfile();
              }}
            >
              <XCircle size={16} aria-hidden="true" />
              不撤销
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-5 space-y-5">
        <FormGroup title="求职目标">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="画像名称" value={draft.name} onChange={(value) => onChange({ name: value })} />
            <label className="block">
              <span className="text-sm font-black text-ink-700">角色族</span>
              <select className="field-control mt-2" value={draft.roleFamily} onChange={(event) => onChange({ roleFamily: event.target.value as ProfileRoleFamily })} aria-label="角色族">
                {profileRoleFamilies.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <Field label="目标岗位" value={draft.targetRole} onChange={(value) => onChange({ targetRole: value })} placeholder="测试开发 / 前端工程师 / 数据分析师" />
            <Field label="目标等级" value={draft.targetLevel} onChange={(value) => onChange({ targetLevel: value })} placeholder="高级 / 资深 / P6-P7" />
            <Field label="目标城市" value={draft.cities} onChange={(value) => onChange({ cities: value })} />
            <Field label="薪资目标" value={draft.salaryTarget} onChange={(value) => onChange({ salaryTarget: value })} />
            <Field label="公司类型" value={draft.companyTypes} onChange={(value) => onChange({ companyTypes: value })} />
            <Field label="每日分钟" value={draft.dailyMinutes} onChange={(value) => onChange({ dailyMinutes: value })} type="number" />
          </div>
        </FormGroup>

        <FormGroup title="经验与证据">
          <Textarea label="经验摘要" value={draft.experienceSummary} onChange={(value) => onChange({ experienceSummary: value })} placeholder="当前经验、主线能力、最近项目。" />
          <Textarea label="项目证据" value={draft.projectEvidence} onChange={(value) => onChange({ projectEvidence: value })} placeholder="可讲的项目、指标、材料或链接。" />
        </FormGroup>

        <FormGroup title="边界与风险">
          <Textarea label="不可夸大边界" value={draft.nonClaims} onChange={(value) => onChange({ nonClaims: value })} placeholder="不能编造的经历、指标、技术或公司背景。" />
        </FormGroup>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="primary-button" onClick={onSave}>
          <Save size={16} aria-hidden="true" />
          {editingExisting ? "保存画像修改" : "保存画像"}
        </button>
        {activeProfile ? (
          <button type="button" className="secondary-button min-h-11 px-3" onClick={() => {
            setConfirmDeleteId(null);
            onEdit(activeProfile);
          }}>
            <Edit3 size={15} aria-hidden="true" />
            编辑当前画像
          </button>
        ) : null}
        {draft.id ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-risk-600 bg-white px-4 text-sm font-black text-risk-600 transition hover:bg-risk-100 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
            aria-expanded={showDeleteConfirm}
            aria-controls="profile-delete-confirm"
            onClick={() => setConfirmDeleteId(draft.id!)}
          >
            <Trash2 size={15} aria-hidden="true" />
            删除此画像
          </button>
        ) : null}
      </div>
      {showDeleteConfirm && draft.id ? (
        <div id="profile-delete-confirm" className="mt-4 rounded-card border border-risk-200 bg-risk-100 p-4" role="status" aria-live="polite">
          <p className="text-sm font-black leading-6 text-risk-600">
            确认删除「{deleteLabel}」画像？关联知识边界、个人日程、AI 建议、AI 运行记录和候选反馈会一起移除；删除后可在本面板短时撤销整包恢复。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-risk-600 px-4 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-risk-600 focus:ring-offset-2"
              aria-label={`确认删除画像 ${deleteLabel}`}
              onClick={() => {
                setConfirmDeleteId(null);
                onDelete(draft.id!);
              }}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              确认删除
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 text-sm font-black text-ink-700 transition hover:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600"
              aria-label={`取消删除画像 ${deleteLabel}`}
              onClick={() => setConfirmDeleteId(null)}
            >
              <XCircle size={16} aria-hidden="true" />
              取消
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-card border border-line bg-white p-4">
      <legend className="px-1 text-sm font-black text-ink-900">{title}</legend>
      <div className="mt-1">{children}</div>
    </fieldset>
  );
}

function profileBundleSummary(bundle: DeletedUserProfileBundle): string {
  const parts = [
    "画像本身",
    countLabel(bundle.knowledgeBoundaries.length, "条知识边界"),
    countLabel(bundle.coachScheduleEvents.length, "条个人日程"),
    countLabel(bundle.aiArtifacts.length, "条 AI 建议"),
    countLabel(bundle.llmRuns.length, "条 AI 运行记录"),
    countLabel(bundle.boundarySuggestionFeedback.length, "条候选反馈")
  ].filter(Boolean);
  return parts.join("、");
}

function countLabel(count: number, label: string): string | null {
  return count > 0 ? `${count} ${label}` : null;
}

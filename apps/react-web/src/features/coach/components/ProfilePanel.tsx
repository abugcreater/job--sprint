import { Edit3, Save, UserRound } from "lucide-react";
import { buildCoachDashboard, profileRoleFamilies, type ProfileDraft } from "../../../data/coachAdapter";
import type { ProfileRoleFamily } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

export function ProfilePanel({
  profiles,
  activeProfileId,
  draft,
  onChange,
  onNew,
  onActivate,
  onEdit,
  onSave
}: {
  profiles: ReturnType<typeof buildCoachDashboard>["profiles"];
  activeProfileId?: string;
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  onNew: () => void;
  onActivate: (profile: ReturnType<typeof buildCoachDashboard>["profiles"][number]) => void;
  onEdit: (profile: ReturnType<typeof buildCoachDashboard>["profiles"][number]) => void;
  onSave: () => void;
}) {
  return (
    <article className="command-panel">
      <PanelTitle icon={<UserRound size={18} aria-hidden="true" />} title="目标画像" />
      <div className="mt-4 flex flex-wrap gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={`touch-button px-3 ${profile.id === activeProfileId ? "bg-brand-700 text-white" : "border border-line bg-white text-ink-700"}`}
            onClick={() => onActivate(profile)}
          >
            {profile.name}
          </button>
        ))}
        <button type="button" className="secondary-button min-h-10 px-3" onClick={onNew}>
          新建画像
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="画像名称" value={draft.name} onChange={(value) => onChange({ name: value })} />
        <label className="block">
          <span className="text-sm font-black text-ink-700">角色族</span>
          <select className="field-control mt-2" value={draft.roleFamily} onChange={(event) => onChange({ roleFamily: event.target.value as ProfileRoleFamily })} aria-label="角色族">
            {profileRoleFamilies.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </label>
        <Field label="目标岗位" value={draft.targetRole} onChange={(value) => onChange({ targetRole: value })} placeholder="Java 后端 / 测试开发 / 前端工程师" />
        <Field label="目标等级" value={draft.targetLevel} onChange={(value) => onChange({ targetLevel: value })} placeholder="高级 / 资深 / P6-P7" />
        <Field label="目标城市" value={draft.cities} onChange={(value) => onChange({ cities: value })} />
        <Field label="薪资目标" value={draft.salaryTarget} onChange={(value) => onChange({ salaryTarget: value })} />
        <Field label="公司类型" value={draft.companyTypes} onChange={(value) => onChange({ companyTypes: value })} />
        <Field label="每日分钟" value={draft.dailyMinutes} onChange={(value) => onChange({ dailyMinutes: value })} />
      </div>
      <Textarea label="经验摘要" value={draft.experienceSummary} onChange={(value) => onChange({ experienceSummary: value })} placeholder="当前经验、主线能力、最近项目。" />
      <Textarea label="项目证据" value={draft.projectEvidence} onChange={(value) => onChange({ projectEvidence: value })} placeholder="可讲的项目、指标、材料或链接。" />
      <Textarea label="不可夸大边界" value={draft.nonClaims} onChange={(value) => onChange({ nonClaims: value })} placeholder="不能编造的经历、指标、技术或公司背景。" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="primary-button" onClick={onSave}>
          <Save size={16} aria-hidden="true" />
          保存画像
        </button>
        {profiles.map((profile) => (
          <button key={`edit-${profile.id}`} type="button" className="secondary-button min-h-11 px-3" onClick={() => onEdit(profile)}>
            <Edit3 size={15} aria-hidden="true" />
            编辑 {profile.name}
          </button>
        ))}
      </div>
    </article>
  );
}

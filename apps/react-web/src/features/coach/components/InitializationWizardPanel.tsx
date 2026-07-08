import { CalendarPlus, CheckCircle2, FileText, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  canSaveProfile,
  createProfileDraft,
  createScheduleDraft,
  profileRoleFamilies,
  type ProfileDraft
} from "../../../data/coachAdapter";
import { coachOnboardingTemplates } from "../../../data/coachOnboardingTemplateAdapter";
import { appendOnboardingMaterialBlock, onboardingMaterialBlocks, summarizeOnboardingMaterial } from "../../../data/coachOnboardingMaterialAdapter";
import { generateBoundarySuggestionsFromText, type BoundarySuggestionDraft } from "../../../data/boundarySuggestionAdapter";
import { buildResumeProfilePreview, type ResumeProfilePreview } from "../../../data/resumeProfileAdapter";
import { useSprintStore } from "../../../stores/sprintStore";
import type { ProfileRoleFamily } from "../../../types/sprint";
import { Field, PanelTitle, Textarea } from "./CoachPrimitives";

export function InitializationWizardPanel() {
  const sprint = useSprintStore((state) => state.sprint);
  const profiles = useSprintStore((state) => state.userProfiles);
  const boundaries = useSprintStore((state) => state.knowledgeBoundaries);
  const saveUserProfile = useSprintStore((state) => state.saveUserProfile);
  const saveKnowledgeBoundary = useSprintStore((state) => state.saveKnowledgeBoundary);
  const saveCoachScheduleEvent = useSprintStore((state) => state.saveCoachScheduleEvent);
  const activeProfile = useMemo(() => profiles.find((profile) => profile.active) ?? profiles[0], [profiles]);
  const activeBoundaries = useMemo(() => activeProfile ? boundaries.filter((boundary) => boundary.profileId === activeProfile.id) : [], [activeProfile, boundaries]);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => createProfileDraft(activeProfile));
  const [sourceText, setSourceText] = useState("");
  const [templateId, setTemplateId] = useState<ProfileRoleFamily>("backend");
  const [suggestions, setSuggestions] = useState<BoundarySuggestionDraft[]>([]);
  const [resumePreview, setResumePreview] = useState<ResumeProfilePreview | null>(null);
  const [message, setMessage] = useState("");
  const materialSummary = useMemo(() => summarizeOnboardingMaterial(sourceText), [sourceText]);

  useEffect(() => {
    setProfileDraft(createProfileDraft(activeProfile));
  }, [activeProfile?.id]);

  const handleApplyTemplate = () => {
    const template = coachOnboardingTemplates.find((item) => item.id === templateId) ?? coachOnboardingTemplates[0];
    setProfileDraft((current) => ({
      ...current,
      roleFamily: template.roleFamily,
      targetRole: current.targetRole.trim() ? current.targetRole : template.targetRole,
      nonClaims: current.nonClaims.trim() ? current.nonClaims : template.nonClaims
    }));
    setSourceText((current) => current.trim() ? current : template.sourceText);
    setMessage(`已套用「${template.label}」建档模板。`);
  };

  const handleAppendMaterialBlock = (block: { body: string; label: string }) => {
    setSourceText((current) => appendOnboardingMaterialBlock(current, block));
    setMessage(`已追加「${block.label}」素材段。`);
  };

  const handlePreviewImport = () => {
    if (sourceText.trim().length < 12) {
      setMessage("请粘贴一段简历、JD 或面试反馈。");
      return;
    }
    const preview = buildResumeProfilePreview(sourceText, profileDraft);
    setProfileDraft(preview.draft);
    setSuggestions(preview.boundarySuggestions);
    setResumePreview(preview);
    setMessage(`已生成画像建议：${preview.summary}`);
  };

  const handleConfirmProfile = () => {
    if (!canSaveProfile(profileDraft)) {
      setMessage("请先确认目标岗位、经验摘要和每日可投入时间。");
      return;
    }
    saveUserProfile(profileDraft);
    const nextSuggestions = generateBoundarySuggestionsFromText({
      text: sourceText,
      profile: { targetRole: profileDraft.targetRole, roleFamily: profileDraft.roleFamily },
      existingTopics: activeBoundaries.map((boundary) => boundary.topic)
    });
    const mergedSuggestions = resumePreview?.boundarySuggestions.length ? resumePreview.boundarySuggestions : nextSuggestions;
    setSuggestions(mergedSuggestions);
    setMessage(mergedSuggestions.length ? "求职画像已保存，已准备好可确认的知识边界。" : "求职画像已保存，可以继续补充简历或 JD 来生成边界。");
  };

  const handleResumeFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setSourceText(text);
      const preview = buildResumeProfilePreview(text, profileDraft);
      setProfileDraft(preview.draft);
      setSuggestions(preview.boundarySuggestions);
      setResumePreview(preview);
      setMessage(`已读取「${file.name}」，请确认画像建议。`);
    } catch {
      setMessage("文件读取失败，请改用粘贴简历文本。");
    }
  };

  const handleAcceptTopBoundaries = () => {
    if (!suggestions.length) {
      setMessage("请先生成边界候选。");
      return;
    }
    const state = useSprintStore.getState();
    const profile = state.userProfiles.find((item) => item.active) ?? state.userProfiles[0];
    if (!profile) {
      setMessage("请先确认并保存求职画像。");
      return;
    }
    const existingCount = state.knowledgeBoundaries.filter((boundary) => boundary.profileId === profile.id).length;
    const slots = Math.max(0, 3 - existingCount);
    if (!slots) {
      setMessage("知识边界已达到建档标准。");
      return;
    }
    suggestions.slice(0, slots).forEach((suggestion) => saveKnowledgeBoundary(suggestion));
    setSuggestions((current) => current.slice(slots));
    setMessage(`已采纳 ${Math.min(slots, suggestions.length)} 条知识边界。`);
  };

  const handleCreateFirstSchedule = () => {
    const state = useSprintStore.getState();
    const profile = state.userProfiles.find((item) => item.active) ?? state.userProfiles[0];
    const boundary = profile ? state.knowledgeBoundaries.find((item) => item.profileId === profile.id) : undefined;
    const topic = boundary?.topic ?? suggestions[0]?.topic;
    if (!profile || !topic) {
      setMessage("请先保存求职画像并采纳至少一条知识边界。");
      return;
    }
    saveCoachScheduleEvent({
      ...createScheduleDraft(sprint.date),
      title: `补 ${topic} 面试表达`,
      kind: "learning",
      reason: `围绕「${profile.targetRole || "目标岗位"}」补齐「${topic}」的机制、证据和不可夸大边界。`
    });
    setMessage("已生成今天的第一条行动。");
  };

  return (
    <article id="coach-quick-init" className="command-panel scroll-mt-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <PanelTitle icon={<Sparkles size={18} aria-hidden="true" />} title="导入简历建档" />
          <p className="mt-2 text-sm font-semibold leading-6 text-ink-500">粘贴简历、JD 或面试反馈，先生成画像建议；确认后再写入你的求职画像。</p>
        </div>
        {message ? <p className="rounded-control bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700" role="status">{message}</p> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="text-sm font-black text-ink-700">建档模板</span>
          <select className="field-control mt-2" value={templateId} onChange={(event) => setTemplateId(event.target.value as ProfileRoleFamily)} aria-label="建档模板">
            {coachOnboardingTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
          </select>
        </label>
        <button type="button" className="secondary-button mt-7 min-h-11 px-3" onClick={handleApplyTemplate}>
          套用模板
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="快速建档目标岗位" value={profileDraft.targetRole} onChange={(value) => setProfileDraft((current) => ({ ...current, targetRole: value }))} placeholder="测试开发 / 前端工程师 / 数据分析师" />
        <label className="block">
          <span className="text-sm font-black text-ink-700">角色方向</span>
          <select className="field-control mt-2" value={profileDraft.roleFamily} onChange={(event) => setProfileDraft((current) => ({ ...current, roleFamily: event.target.value as ProfileRoleFamily }))} aria-label="角色方向">
            {profileRoleFamilies.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
        <Field label="快速建档每日分钟" value={profileDraft.dailyMinutes} onChange={(value) => setProfileDraft((current) => ({ ...current, dailyMinutes: value }))} />
        <Field label="快速建档不可夸大边界" value={profileDraft.nonClaims} onChange={(value) => setProfileDraft((current) => ({ ...current, nonClaims: value }))} placeholder="不能包装的经历" />
      </div>
      <Textarea label="快速建档经验摘要" value={profileDraft.experienceSummary} onChange={(value) => setProfileDraft((current) => ({ ...current, experienceSummary: value }))} placeholder="当前经验、主线能力、最近项目。" />
      <div className="mt-4 rounded-card bg-surface-0 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-ink-700">
              <FileText size={16} aria-hidden="true" />
              批量素材包
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">{materialSummary.statusLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onboardingMaterialBlocks.map((block) => (
              <button key={block.kind} type="button" className="secondary-button min-h-9 px-3" onClick={() => handleAppendMaterialBlock(block)}>
                追加{block.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-ink-900">导入简历文件</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">支持文本简历、Markdown 或从文档复制出的纯文本。</p>
          </div>
          <label className="secondary-button min-h-11 cursor-pointer px-3">
            <Upload size={16} aria-hidden="true" />
            上传简历文本
            <input
              aria-label="上传简历文本"
              className="sr-only"
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              onChange={(event) => {
                void handleResumeFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <Textarea label="导入素材" value={sourceText} onChange={setSourceText} placeholder="粘贴简历、JD、面试反馈或学习笔记；多段素材可用 --- 分隔。" />
      {resumePreview ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
          <div className="rounded-card bg-brand-100 p-4">
            <p className="text-sm font-black text-brand-700">画像建议</p>
            <ul className="mt-2 space-y-1">
              {resumePreview.highlights.map((item) => (
                <li key={item} className="text-sm font-bold leading-6 text-ink-800">{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-card bg-surface-0 p-4">
            <p className="text-sm font-black text-ink-900">需要确认</p>
            <ul className="mt-2 space-y-1">
              {(resumePreview.warnings.length ? resumePreview.warnings : ["信息已满足建档要求，请确认后写入。"]).map((item) => (
                <li key={item} className="text-sm font-bold leading-6 text-ink-600">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="primary-button" onClick={handlePreviewImport}>
          <Sparkles size={16} aria-hidden="true" />
          生成画像建议
        </button>
        <button type="button" className="secondary-button" onClick={handleConfirmProfile}>
          <CheckCircle2 size={16} aria-hidden="true" />
          确认写入画像
        </button>
        <button type="button" className="secondary-button" onClick={handleAcceptTopBoundaries}>
          <CheckCircle2 size={16} aria-hidden="true" />
          采纳建议边界
        </button>
        <button type="button" className="secondary-button" onClick={handleCreateFirstSchedule}>
          <CalendarPlus size={16} aria-hidden="true" />
          生成今日行动
        </button>
      </div>
      {suggestions.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-card bg-surface-0 p-3">
              <p className="text-sm font-black text-ink-900">{suggestion.topic}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink-500">{suggestion.gap}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

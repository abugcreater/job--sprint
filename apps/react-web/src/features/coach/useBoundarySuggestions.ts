import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { submitBoundarySuggestionFeedback } from "../../api/boundaryFeedbackClient";
import { generateBoundarySuggestionsOnServer } from "../../api/runtimeClient";
import type { KnowledgeBoundaryDraft } from "../../data/coachAdapter";
import { generateBoundarySuggestionsFromText, type BoundarySuggestionDraft } from "../../data/boundarySuggestionAdapter";
import { summarizeBoundarySuggestionFeedback, type BoundarySuggestionFeedbackDraft } from "../../data/boundarySuggestionFeedbackAdapter";
import { useSprintStore } from "../../stores/sprintStore";
import type { KnowledgeBoundary, UserProfile } from "../../types/sprint";
import type { CoachStageId } from "./components/CoachStageNavigation";

type BoundarySuggestionOptions = {
  activeProfile?: UserProfile;
  boundaries: KnowledgeBoundary[];
  setBoundaryDraft: Dispatch<SetStateAction<KnowledgeBoundaryDraft>>;
  setFeedback: Dispatch<SetStateAction<string>>;
  setRecentlyDeletedBoundary: Dispatch<SetStateAction<KnowledgeBoundary | null>>;
  setActiveStage: Dispatch<SetStateAction<CoachStageId>>;
};

export function useBoundarySuggestions({
  activeProfile,
  boundaries,
  setBoundaryDraft,
  setFeedback,
  setRecentlyDeletedBoundary,
  setActiveStage
}: BoundarySuggestionOptions) {
  const feedbackRecords = useSprintStore((state) => state.boundarySuggestionFeedback);
  const saveKnowledgeBoundary = useSprintStore((state) => state.saveKnowledgeBoundary);
  const recordFeedback = useSprintStore((state) => state.recordBoundarySuggestionFeedback);
  const [sourceText, setSourceText] = useState("");
  const [suggestions, setSuggestions] = useState<BoundarySuggestionDraft[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const feedbackSummary = useMemo(
    () => summarizeBoundarySuggestionFeedback(
      activeProfile ? feedbackRecords.filter((item) => !item.profileId || item.profileId === activeProfile.id) : feedbackRecords
    ),
    [activeProfile?.id, feedbackRecords]
  );

  const localSuggestions = () => generateBoundarySuggestionsFromText({
    text: sourceText,
    profile: activeProfile,
    existingTopics: boundaries.map((boundary) => boundary.topic)
  });
  const recordDecision = (suggestion: BoundarySuggestionDraft, decision: BoundarySuggestionFeedbackDraft["decision"], reason = "") => {
    const payload = {
      profileId: activeProfile?.id,
      suggestionId: suggestion.id,
      topic: suggestion.topic,
      decision,
      reason,
      sourceSummary: suggestion.sourceSummary,
      sourceConfidence: suggestion.sourceConfidence ?? suggestion.confidence,
      sourceProvider: suggestion.sourceProvider,
      sourcePromptVersion: suggestion.sourcePromptVersion,
      sourceInputHash: suggestion.sourceInputHash
    };
    recordFeedback(payload);
    void submitBoundarySuggestionFeedback(payload).catch(() => undefined);
  };
  const removeSuggestion = (suggestionId: string) => {
    setSuggestions((current) => current.filter((item) => item.id !== suggestionId));
    setReasons((current) => removeKey(current, suggestionId));
  };

  const generateSuggestions = async () => {
    if (!activeProfile) {
      setFeedback("请先保存一份求职画像。");
      return;
    }
    if (sourceText.trim().length < 12) {
      setFeedback("请粘贴一段 JD、简历或面试反馈，至少 12 个字符。");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await generateBoundarySuggestionsOnServer({ profile: activeProfile, knowledgeBoundaries: boundaries, text: sourceText });
      if (response?.suggestions.length) {
        setSuggestions(response.suggestions.map((suggestion) => ({
          ...suggestion,
          sourceConfidence: suggestion.sourceConfidence ?? suggestion.confidence,
          sourceProvider: response.provider,
          sourcePromptVersion: response.promptVersion,
          sourceInputHash: response.inputSummaryHash
        })));
        setFeedback("已生成知识边界候选，请确认后再写入正式边界。");
        return;
      }
      setSuggestions(localSuggestions());
      setFeedback("服务端边界提取暂不可用，已用本地规则生成候选。");
    } catch (_) {
      setSuggestions(localSuggestions());
      setFeedback("服务端边界提取失败，已用本地规则生成候选。");
    } finally {
      setIsGenerating(false);
    }
  };
  const acceptSuggestion = (suggestion: BoundarySuggestionDraft) => {
    if (!activeProfile) return setFeedback("请先保存一份求职画像。");
    recordDecision(suggestion, "accepted");
    saveKnowledgeBoundary(suggestion);
    setRecentlyDeletedBoundary(null);
    removeSuggestion(suggestion.id);
    setFeedback(`已采纳「${suggestion.topic}」知识边界。`);
    setActiveStage("plan");
  };
  const reviseSuggestion = (suggestion: BoundarySuggestionDraft) => {
    recordDecision(suggestion, "needs_revision", reasons[suggestion.id]);
    setBoundaryDraft({ ...suggestion, id: undefined });
    removeSuggestion(suggestion.id);
    setFeedback(`已把「${suggestion.topic}」载入知识边界表单，请修订后保存。`);
  };
  const rejectSuggestion = (suggestion: BoundarySuggestionDraft) => {
    recordDecision(suggestion, "rejected", reasons[suggestion.id]);
    removeSuggestion(suggestion.id);
    setFeedback(`已记录「${suggestion.topic}」不采纳原因。`);
  };
  const resetSuggestions = () => {
    setSuggestions([]);
    setReasons({});
  };

  return {
    sourceText,
    setSourceText,
    suggestions,
    reasons,
    setReasons,
    isGenerating,
    feedbackSummary,
    generateSuggestions,
    acceptSuggestion,
    reviseSuggestion,
    rejectSuggestion,
    resetSuggestions
  };
}

function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

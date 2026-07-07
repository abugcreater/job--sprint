function normalizeFeedbackList(value) {
  return Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === "object" && item.artifactId && item.decision)
      .map((item) => ({
        id: text(item, "id") || `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        profileId: text(item, "profileId"),
        artifactId: text(item, "artifactId"),
        llmRunId: text(item, "llmRunId"),
        artifactType: text(item, "artifactType") || "unknown",
        decision: text(item, "decision"),
        reason: text(item, "reason"),
        title: text(item, "title"),
        createdAt: text(item, "createdAt") || new Date().toISOString()
      }))
    : [];
}

function summarizeFeedback(feedbackList) {
  const reviewed = normalizeFeedbackList(feedbackList).filter((item) => ["accepted", "rejected"].includes(item.decision));
  const acceptedCount = reviewed.filter((item) => item.decision === "accepted").length;
  const rejected = reviewed.filter((item) => item.decision === "rejected");
  const acceptanceRate = reviewed.length ? Math.round((acceptedCount / reviewed.length) * 100) : 0;
  const rejectedTypeCounts = rejected.reduce((counts, item) => {
    const type = item.artifactType || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const topRejectedTypes = Object.entries(rejectedTypeCounts)
    .map(([type, count]) => ({ type, count, label: artifactTypeLabel(type) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"))
    .slice(0, 3);
  const recentRejectionReasons = rejected
    .map((item) => text(item, "reason"))
    .filter(Boolean)
    .slice(0, 5);
  return {
    reviewedCount: reviewed.length,
    acceptedCount,
    rejectedCount: rejected.length,
    acceptanceRate,
    acceptanceRateLabel: reviewed.length ? `${acceptanceRate}%` : "暂无",
    qualityLabel: feedbackQualityLabel(reviewed.length, acceptanceRate),
    topRejectedTypes,
    recentRejectionReasons,
    nextPromptHint: nextPromptHint(topRejectedTypes, recentRejectionReasons)
  };
}

function feedbackQualityLabel(reviewedCount, acceptanceRate) {
  if (!reviewedCount) return "等待反馈";
  if (acceptanceRate >= 70) return "建议贴合";
  if (acceptanceRate >= 40) return "需要校准";
  return "偏离目标";
}

function nextPromptHint(topRejectedTypes, recentRejectionReasons) {
  if (!topRejectedTypes.length && !recentRejectionReasons.length) {
    return "先接受或拒绝至少一条草稿，AI 教练才有质量反馈可复用。";
  }
  const typeHint = topRejectedTypes.length ? `少生成${topRejectedTypes.map((item) => item.label).join("、")}类低贴合建议` : "继续沿用已采纳建议的方向";
  const reasonHint = recentRejectionReasons[0] ? `重点避开：${recentRejectionReasons[0]}` : "继续观察拒绝原因";
  return `${typeHint}；${reasonHint}。`;
}

function artifactTypeLabel(type) {
  return {
    knowledge_card: "知识卡",
    schedule_suggestion: "日程建议",
    interview_question: "候选题",
    daily_next_step: "下一步"
  }[type] || "未知";
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = {
  normalizeFeedbackList,
  summarizeFeedback
};

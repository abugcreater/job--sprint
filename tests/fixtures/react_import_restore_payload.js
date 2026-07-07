function buildReactImportRestorePayload(now = new Date().toISOString()) {
  return {
    exportedAt: now,
    source: "jobSprint.react.v1",
    syncState: "online",
    sprint: { date: "2026-07-05", day: 5, totalDays: 30, currentTaskId: "functional-import-task" },
    completed: { "functional-import-task": true },
    evidenceByTaskId: {
      "functional-import-task": [{
        id: "functional-import-evidence",
        taskId: "functional-import-task",
        type: "review",
        title: "导入恢复证据",
        content: "导入恢复内容",
        createdAt: now,
        verified: true
      }]
    },
    delayRecords: [{
      id: "functional-import-delay",
      taskId: "functional-import-task",
      date: "2026-07-05",
      minutes: 40,
      reason: "导入恢复延期原因",
      recoveryAction: "导入后补救动作",
      createdAt: now
    }],
    userProfiles: [{
      id: "functional-import-profile",
      name: "导入恢复画像",
      roleFamily: "backend",
      targetRole: "导入 Java 后端",
      targetLevel: "高级",
      cities: "杭州",
      salaryTarget: "30-40K",
      companyTypes: "业务平台",
      experienceSummary: "导入画像经验摘要",
      projectEvidence: "导入画像项目证据",
      nonClaims: "导入画像不可夸大边界",
      dailyMinutes: 60,
      active: true,
      createdAt: now,
      updatedAt: now
    }],
    knowledgeBoundaries: [{
      id: "functional-import-boundary",
      profileId: "functional-import-profile",
      topic: "导入恢复知识边界",
      level: "可讲",
      gap: "导入恢复缺口",
      evidence: "导入恢复证据",
      targetUse: "导入恢复用途",
      createdAt: now,
      updatedAt: now
    }],
    coachScheduleEvents: [{
      id: "functional-import-event",
      profileId: "functional-import-profile",
      date: "2026-07-05",
      start: "20:00",
      end: "20:30",
      kind: "learning",
      title: "导入恢复日程",
      reason: "导入恢复日程原因",
      evidenceRequired: true,
      createdAt: now,
      updatedAt: now
    }],
    aiArtifacts: [{
      id: "functional-import-artifact",
      profileId: "functional-import-profile",
      type: "schedule_suggestion",
      title: "导入恢复 AI 草稿",
      body: "导入恢复 AI 草稿内容",
      reason: "导入恢复 AI 草稿原因",
      sources: ["导入恢复画像"],
      confidence: "medium",
      status: "draft",
      targetDate: "2026-07-05",
      createdAt: now,
      updatedAt: now
    }],
    llmRuns: [{
      id: "functional-import-llm-run",
      profileId: "functional-import-profile",
      provider: "local-fallback",
      model: "local-coach-rules",
      promptVersion: "coach-artifacts-v1",
      schemaVersion: "coach-artifact-list-v1",
      inputSummaryHash: "functional-import-summary",
      artifactCount: 1,
      schemaStatus: "pass",
      status: "fallback",
      createdAt: now
    }]
  };
}

module.exports = { buildReactImportRestorePayload };

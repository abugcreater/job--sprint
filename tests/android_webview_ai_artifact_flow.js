async function exerciseAiArtifactDrafts({ page, clickWebView, prefix, assert }) {
  await clickWebView(page.getByRole("button", { name: "生成 AI 草稿" }));
  const artifactsPanel = page.locator("#coach-artifacts");
  const artifactTitles = artifactsPanel.locator('input[aria-label^="AI 草稿标题："]');
  const artifactBodies = artifactsPanel.locator('textarea[aria-label^="AI 草稿内容："]');
  const artifactRejectReasons = artifactsPanel.locator('input[aria-label^="拒绝原因："]');
  await waitForArtifactCount(page, 2);

  const initialTypes = await artifactTypes(artifactTitles);
  const knowledgeIndex = initialTypes.indexOf("knowledge_card");
  const actionIndex = initialTypes.findIndex((type, index) => type && type !== "knowledge_card" && index !== knowledgeIndex);
  assert.ok(knowledgeIndex >= 0, `AI artifacts should include a knowledge_card draft, got ${initialTypes.join(",")}`);
  assert.ok(actionIndex >= 0, `AI artifacts should include an action/interview draft, got ${initialTypes.join(",")}`);

  const knowledgeTitle = await artifactTitles.nth(knowledgeIndex).inputValue();
  await clickWebView(artifactsPanel.getByRole("button", { name: `接受 AI 草稿：${knowledgeTitle}` }));
  await page.getByRole("status").filter({ hasText: "已接受知识卡草稿" }).waitFor();

  await artifactTitles.nth(actionIndex).fill(`${prefix}AI 日程草稿 已编辑`);
  await artifactBodies.nth(actionIndex).fill(`${prefix}AI 日程草稿内容：先补机制，再补项目证据。`);
  await clickWebView(artifactsPanel.getByRole("button", { name: "保存编辑" }).nth(actionIndex));
  await page.getByRole("status").filter({ hasText: "AI 草稿已编辑" }).waitFor({ timeout: 10000 }).catch(() => null);

  const rejectButtons = artifactsPanel.locator('button[aria-label^="拒绝 AI 草稿："]');
  await artifactRejectReasons.nth(actionIndex).fill(`${prefix}拒绝原因：今天先不加候选题。`);
  await clickWebView(rejectButtons.nth(actionIndex));
  await page.getByText(`拒绝原因：${prefix}拒绝原因：今天先不加候选题。`).waitFor();
}

async function addCoachSchedule(page, clickWebView, draft) {
  await page.getByLabel("日程标题").fill(draft.title);
  await page.getByLabel("日期").fill(draft.date);
  await page.getByLabel("开始").fill(draft.start);
  await page.getByLabel("结束").fill(draft.end);
  await page.getByLabel("日程类型").selectOption(draft.type);
  await page.getByLabel("安排原因").fill(draft.reason);
  await clickWebView(page.getByRole("button", { name: "新增日程" }));
  await page.getByText(draft.title).waitFor();
}

function waitForArtifactCount(page, minCount) {
  return page.waitForFunction(
    (count) => document.querySelectorAll('#coach-artifacts input[aria-label^="AI 草稿标题："]').length >= count,
    minCount,
    { timeout: 30000 }
  );
}

function artifactTypes(artifactTitles) {
  return artifactTitles.evaluateAll((inputs) => inputs.map((input) => {
    let node = input.parentElement;
    while (node && node.id !== "coach-artifacts") {
      const text = node.textContent || "";
      const type = ["knowledge_card", "interview_question", "daily_next_step"].find((candidate) => text.includes(candidate));
      if (type) return type;
      node = node.parentElement;
    }
    return "";
  }));
}

module.exports = {
  addCoachSchedule,
  exerciseAiArtifactDrafts
};

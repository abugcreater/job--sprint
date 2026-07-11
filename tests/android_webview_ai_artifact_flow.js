async function exerciseAiArtifactDrafts({ page, clickWebView, prefix, assert }) {
  await clickWebView(page.getByRole("button", { name: "生成 AI 建议" }));
  const artifactsPanel = page.locator("#coach-stage-advice");
  const artifactTitles = artifactsPanel.locator('input[aria-label^="AI 建议标题："]');
  const artifactBodies = artifactsPanel.locator('textarea[aria-label^="AI 建议内容："]');
  const artifactRejectReasons = artifactsPanel.locator('input[aria-label^="拒绝原因："]');
  await waitForArtifactCount(page, 2);

  const initialTypes = await artifactTypes(artifactTitles);
  const acceptIndex = Math.max(0, initialTypes.findIndex((type) => type && type !== "knowledge_card"));
  const rejectIndex = initialTypes.findIndex((_, index) => index !== acceptIndex);
  assert.ok(initialTypes[acceptIndex], `AI artifacts should include an acceptable draft, got ${initialTypes.join(",")}`);
  assert.ok(rejectIndex >= 0, `AI artifacts should include a second draft to reject, got ${initialTypes.join(",")}`);

  const acceptTitle = await artifactTitles.nth(acceptIndex).inputValue();
  await clickWebView(artifactsPanel.getByRole("button", { name: `接受 AI 建议：${acceptTitle}` }));
  await page.getByRole("status").filter({ hasText: /已接受/ }).waitFor();

  await artifactTitles.nth(rejectIndex).fill(`${prefix}AI 建议草稿 已编辑`);
  await artifactBodies.nth(rejectIndex).fill(`${prefix}AI 建议草稿内容：先补机制，再补项目证据。`);
  await clickWebView(artifactsPanel.getByRole("button", { name: "保存编辑" }).nth(rejectIndex));
  await page.getByRole("status").filter({ hasText: "AI 建议已编辑" }).waitFor({ timeout: 10000 }).catch(() => null);

  const rejectButtons = artifactsPanel.locator('button[aria-label^="拒绝 AI 建议："]');
  await artifactRejectReasons.nth(rejectIndex).fill(`${prefix}拒绝原因：今天先不加候选题。`);
  await clickWebView(rejectButtons.nth(rejectIndex));
  await page.getByText(`拒绝原因：${prefix}拒绝原因：今天先不加候选题。`).waitFor();
}

async function addCoachSchedule(page, clickWebView, draft) {
  if (!await page.getByLabel("日程标题").count()) {
    await clickWebView(page.getByRole("button", { name: "今日计划阶段" }));
  }
  await page.getByLabel("日程标题").fill(draft.title);
  await page.getByLabel("日期").fill(draft.date);
  await page.getByLabel("开始").fill(draft.start);
  await page.getByLabel("结束").fill(draft.end);
  await page.getByLabel("日程类型").selectOption(draft.type);
  await page.getByLabel("安排原因").fill(draft.reason);
  await clickWebView(page.getByRole("button", { name: "新增日程" }));
  await page.getByText("自定义日程已加入今日 AI 教练。", { exact: true }).waitFor();
}

function waitForArtifactCount(page, minCount) {
  return page.waitForFunction(
    (count) => document.querySelectorAll('#coach-stage-advice input[aria-label^="AI 建议标题："]').length >= count,
    minCount,
    { timeout: 30000 }
  );
}

function artifactTypes(artifactTitles) {
  return artifactTitles.evaluateAll((inputs) => inputs.map((input) => {
    let node = input.parentElement;
    while (node && node.id !== "coach-stage-advice") {
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

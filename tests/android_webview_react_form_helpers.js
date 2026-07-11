async function clickWebView(locator) {
  const target = locator.first();
  await target.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  try {
    await target.click({ timeout: 5000 });
  } catch (error) {
    if (!String(error && error.message).includes("Timeout")) throw error;
    await target.click({ force: true, timeout: 5000 });
  }
}

async function fillApplication(page, draft) {
  const form = page.locator("section[aria-labelledby='application-form-title']");
  await form.getByLabel("公司").fill(draft.company);
  await form.getByLabel("岗位").fill(draft.role);
  await form.getByLabel("状态").selectOption(draft.status);
  for (const details of [form.locator("details").nth(0), form.locator("details").nth(1)]) {
    if (!await details.evaluate((element) => element.open)) await details.locator("summary").click();
  }
  await form.getByLabel("来源").fill(draft.source);
  await form.getByLabel("薪资范围").fill(draft.salaryRange);
  await form.getByLabel("城市").fill(draft.city);
  await form.getByLabel("简历版本").fill(draft.resumeVersion);
  await form.getByLabel("JD 关键词").fill(draft.keywords);
  await form.getByLabel("沟通反馈").fill(draft.hrFeedback);
  await form.getByLabel("反馈摘要").fill(draft.notes);
}

async function fillReview(page, draft) {
  const form = page.locator("section[aria-labelledby='review-form-title']");
  await form.getByLabel("今天完成了什么可证明的结果？").fill(draft.projectPoint);
  await form.getByLabel("今天最大的卡点是什么？").fill(draft.pathIssues);
  await form.getByLabel("明天第一件事是什么？").fill(draft.tomorrowPriority);
  const optionalDetails = form.locator("details");
  if (!await optionalDetails.evaluate((element) => element.open)) await optionalDetails.locator("summary").click();
  await form.getByLabel("哪些面试题或表达已经能回答？").fill(draft.interviewQuestions);
  await form.getByLabel("今天补强了哪个知识边界？").fill(draft.javaPoint);
  await form.getByLabel("哪个回答还容易被追问？").fill(draft.fragileAnswers);
}

async function configureRemoteUrlBridge(page, webViewUrl, assert) {
  const result = await page.evaluate((nextUrl) => {
    const bridge = window.AndroidRemoteSettings;
    if (!bridge || typeof bridge.setRemoteUrl !== "function" || typeof bridge.reloadRemote !== "function") {
      return { ok: false, reason: "remote_settings_bridge_missing", href: window.location.href };
    }
    const saved = bridge.setRemoteUrl(nextUrl);
    if (saved) bridge.reloadRemote();
    return { ok: Boolean(saved), href: window.location.href };
  }, webViewUrl).catch((error) => ({ ok: false, reason: error.message || String(error), href: page.url() }));
  assert.ok(result.ok, `Android remote settings bridge should accept configured URL: ${JSON.stringify(result)}`);
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

module.exports = { clickWebView, configureRemoteUrlBridge, fillApplication, fillReview };

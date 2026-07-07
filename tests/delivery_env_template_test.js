const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadDeliveryEnvFile } = require("../tools/delivery_env_file");
const { validateDeliveryExternalInputs } = require("../tools/validate_delivery_external_inputs");
const {
  deliveryEnvKeys,
  deliveryEnvTemplateContent,
  deliveryEnvTemplatePath,
  missingDeliveryEnvKeys,
  writeDeliveryEnvTemplate
} = require("../tools/write_delivery_env_template");

const repoRoot = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-delivery-env-template-"));

function commandExists() {
  return true;
}

function mode(file) {
  return (fs.statSync(file).mode & 0o777).toString(8).padStart(4, "0");
}

function testTemplateContainsOnlyKeysAndBlankSecretValues() {
  const content = deliveryEnvTemplateContent();
  for (const key of deliveryEnvKeys) {
    assert(content.includes(`${key}=`), `template should include ${key}`);
  }
  assert(content.includes("JOB_SPRINT_FINAL_DELIVERY_REPORT=docs/evidence/final-delivery/final-delivery.json"));
  for (const forbidden of ["acceptance-pass", "store-pass", "key-pass", "PRIVATE KEY"]) {
    assert(!content.includes(forbidden), `template should not include ${forbidden}`);
  }
}

function testWriteOutsideRepositoryTemplate() {
  const output = path.join(tmpRoot, "job-sprint-delivery.env");
  const report = writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output]);
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.output, output);
  assert.strictEqual(report.mode, "0600");
  assert.strictEqual(mode(output), "0600");
  assert.strictEqual(report.keys.length, deliveryEnvKeys.length);
  assert(report.nextCommand.includes(`--delivery-env-file ${output}`));
  const loaded = loadDeliveryEnvFile(repoRoot, {}, ["--delivery-env-file", output]);
  assert.strictEqual(loaded.info.loaded, true);
  assert(loaded.info.loadedKeys.includes("JOB_SPRINT_AUTH_PASSWORD"));
  const inputReport = validateDeliveryExternalInputs(repoRoot, loaded.env, {
    commandExists,
    args: [],
    envFileInfo: loaded.info
  });
  assert.strictEqual(inputReport.status, "USER_ACTION_REQUIRED");
  assert(inputReport.checks.some((check) => check.id === "server_sync_inputs" && check.missing.includes("JOB_SPRINT_DEPLOY_HOST")));
  assert(inputReport.checks.some((check) => check.id === "final_delivery_report_input" && check.status === "PASS"));
}

function testRefusesRepositoryOutput() {
  const output = path.join(repoRoot, "tmp-job-sprint-delivery.env");
  assert.throws(
    () => writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output]),
    (error) => error.code === "delivery_env_template_inside_repository"
  );
  fs.rmSync(output, { force: true });
}

function testKeepsExistingFileUnlessForced() {
  const output = path.join(tmpRoot, "overwrite.env");
  writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output]);
  fs.writeFileSync(output, "CUSTOM_VALUE=keep-me\n", { mode: 0o600 });
  const existing = writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output]);
  assert.strictEqual(existing.status, "PASS_WITH_LIMITS");
  assert.strictEqual(existing.overwritten, false);
  assert.strictEqual(existing.note, "existing_file_left_unchanged");
  assert.strictEqual(fs.readFileSync(output, "utf8"), "CUSTOM_VALUE=keep-me\n");
  const forced = writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output, "--force"]);
  assert.strictEqual(forced.status, "PASS");
  assert.strictEqual(forced.overwritten, true);
  assert.strictEqual(mode(output), "0600");
}

function testMergeMissingKeysPreservesExistingValues() {
  const output = path.join(tmpRoot, "merge-missing.env");
  const existing = [
    "JOB_SPRINT_ANDROID_KEYSTORE=/private/release.p12",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD=keep-store-password",
    "JOB_SPRINT_ANDROID_KEY_ALIAS=job-sprint-release",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD=keep-key-password",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256=aa".replace("aa", "aa".repeat(32)),
    ""
  ].join("\n");
  fs.writeFileSync(output, existing, { mode: 0o600 });
  const beforeMissing = missingDeliveryEnvKeys(existing);
  assert(beforeMissing.includes("JOB_SPRINT_DEPLOY_HOST"));
  assert(!beforeMissing.includes("JOB_SPRINT_ANDROID_KEYSTORE"));

  const report = writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output, "--merge-missing"]);
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.overwritten, false);
  assert.strictEqual(report.merged, true);
  assert(report.addedKeys.includes("JOB_SPRINT_DEPLOY_HOST"));
  assert(report.addedKeys.includes("JOB_SPRINT_FINAL_DELIVERY_REPORT"));
  assert(!report.addedKeys.includes("JOB_SPRINT_ANDROID_KEYSTORE"));

  const merged = fs.readFileSync(output, "utf8");
  assert(merged.includes("JOB_SPRINT_ANDROID_STORE_PASSWORD=keep-store-password"));
  assert(merged.includes("JOB_SPRINT_DEPLOY_HOST="));
  assert(merged.includes("JOB_SPRINT_FINAL_DELIVERY_REPORT=docs/evidence/final-delivery/final-delivery.json"));
  assert.strictEqual(missingDeliveryEnvKeys(merged).length, 0);
  assert.strictEqual(mode(output), "0600");

  const second = writeDeliveryEnvTemplate(repoRoot, {}, ["--output", output, "--merge-missing"]);
  assert.strictEqual(second.status, "PASS");
  assert.strictEqual(second.addedKeys.length, 0);
  assert.strictEqual(second.note, "no_missing_keys");
}

function testEnvTemplatePathCanUseEnvOverride() {
  const output = path.join(tmpRoot, "from-env.env");
  assert.strictEqual(
    deliveryEnvTemplatePath(repoRoot, { JOB_SPRINT_DELIVERY_ENV_TEMPLATE: output }, []),
    output
  );
}

testTemplateContainsOnlyKeysAndBlankSecretValues();
testWriteOutsideRepositoryTemplate();
testRefusesRepositoryOutput();
testKeepsExistingFileUnlessForced();
testMergeMissingKeysPreservesExistingValues();
testEnvTemplatePathCanUseEnvOverride();

console.log("交付 env 模板测试：6 项通过。");

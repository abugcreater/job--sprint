const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  initAndroidReleaseSigning,
  updateEnvContent
} = require("../tools/init_android_release_signing");

const repoRoot = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "job-sprint-signing-init-"));
const certSha256 = "ab".repeat(32);
const certSha256WithColons = certSha256.match(/../g).join(":").toUpperCase();

function deterministicBytes() {
  return Buffer.from("12345678901234567890123456789012");
}

function fakeKeytool(file) {
  return (command, args) => {
    assert.strictEqual(command, "keytool");
    if (args.includes("-genkeypair")) {
      fs.writeFileSync(file, "fake-keystore", { mode: 0o600 });
      return "generated";
    }
    if (args.includes("-list")) {
      return `Certificate fingerprints:\n\t SHA256: ${certSha256WithColons}\n`;
    }
    throw new Error(`unexpected args: ${args.join(" ")}`);
  };
}

function mode(file) {
  return (fs.statSync(file).mode & 0o777).toString(8).padStart(4, "0");
}

function testPreviewRequiresExplicitWrite() {
  const envFile = path.join(tmpRoot, "preview.env");
  const keystore = path.join(tmpRoot, "preview.p12");
  const report = initAndroidReleaseSigning(repoRoot, {}, [
    "--delivery-env-file",
    envFile,
    "--keystore",
    keystore
  ]);
  assert.strictEqual(report.status, "USER_ACTION_REQUIRED");
  assert.strictEqual(report.reason, "write_env_confirmation_required");
  assert(report.nextCommand.includes("--write-env"));
  assert(!fs.existsSync(envFile));
  assert(!fs.existsSync(keystore));
}

function testWriteEnvCreatesKeystoreAndKeepsReportRedacted() {
  const envFile = path.join(tmpRoot, "write.env");
  const keystore = path.join(tmpRoot, "write.p12");
  const report = initAndroidReleaseSigning(repoRoot, {}, [
    "--delivery-env-file",
    envFile,
    "--keystore",
    keystore,
    "--write-env"
  ], {
    execFileSync: fakeKeytool(keystore),
    randomBytes: deterministicBytes
  });
  assert.strictEqual(report.status, "PASS");
  assert.strictEqual(report.certSha256, certSha256);
  assert.strictEqual(mode(envFile), "0600");
  assert.strictEqual(mode(keystore), "0600");
  const envText = fs.readFileSync(envFile, "utf8");
  assert(envText.includes(`JOB_SPRINT_ANDROID_KEYSTORE=${keystore}`));
  assert(envText.includes(`JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256=${certSha256}`));
  assert(envText.includes("JOB_SPRINT_ANDROID_STORE_PASSWORD="));
  assert(envText.includes("JOB_SPRINT_ANDROID_KEY_PASSWORD="));
  const serializedReport = JSON.stringify(report);
  assert(!serializedReport.includes("12345678901234567890123456789012"));
  assert(!serializedReport.includes("JOB_SPRINT_ANDROID_STORE_PASSWORD"));
  assert(!serializedReport.includes("JOB_SPRINT_ANDROID_KEY_PASSWORD"));
}

function testRefusesRepositoryKeystore() {
  assert.throws(
    () => initAndroidReleaseSigning(repoRoot, {}, [
      "--delivery-env-file",
      path.join(tmpRoot, "repo-keystore.env"),
      "--keystore",
      path.join(repoRoot, "release.p12"),
      "--write-env"
    ]),
    (error) => error.code === "android_release_keystore_inside_repository"
  );
}

function testRefusesExistingSigningValuesUnlessForced() {
  assert.throws(
    () => updateEnvContent("JOB_SPRINT_ANDROID_KEY_ALIAS=existing\n", {
      JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint-release"
    }),
    (error) => error.code === "android_release_signing_env_conflict"
      && error.conflicts.includes("JOB_SPRINT_ANDROID_KEY_ALIAS")
  );
  const forced = updateEnvContent("JOB_SPRINT_ANDROID_KEY_ALIAS=existing\n", {
    JOB_SPRINT_ANDROID_KEY_ALIAS: "job-sprint-release"
  }, { force: true });
  assert(forced.includes("JOB_SPRINT_ANDROID_KEY_ALIAS=job-sprint-release"));
}

testPreviewRequiresExplicitWrite();
testWriteEnvCreatesKeystoreAndKeepsReportRedacted();
testRefusesRepositoryKeystore();
testRefusesExistingSigningValuesUnlessForced();

console.log("Android release signing init tests passed");

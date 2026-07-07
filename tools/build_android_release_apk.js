#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");
const { envFileErrorInfo, loadDeliveryEnvFile } = require("./delivery_env_file");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argSet = new Set(args);
const verifyOnly = argSet.has("--verify-only");
const allowUnpinnedCert = argSet.has("--allow-unpinned-cert");
let effectiveEnv = process.env;
let envFileInfo = null;

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function envValue(name) {
  const value = effectiveEnv[name];
  return value && value.trim() ? value.trim() : null;
}

function loadEffectiveEnv() {
  try {
    const loaded = loadDeliveryEnvFile(root, process.env, args);
    effectiveEnv = loaded.env;
    envFileInfo = loaded.info;
    return true;
  } catch (error) {
    const report = {
      status: "FAIL",
      reason: "delivery_env_file_error",
      envFile: envFileErrorInfo(error),
      requiredInputs: [
        "Pass --delivery-env-file as a path outside this git repository.",
        "Keep secrets out of committed files."
      ]
    };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return false;
  }
}

function repoPath(...parts) {
  return path.join(root, ...parts);
}

function relative(file) {
  return path.relative(root, file);
}

function isInsideRepository(file) {
  const rel = path.relative(root, path.resolve(root, file));
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function output(report, exitCode) {
  const reportPath = argValue("--report") || envValue("JOB_SPRINT_ANDROID_RELEASE_VERIFICATION_EVIDENCE");
  const withEnvFile = envFileInfo && envFileInfo.configured ? { envFile: envFileInfo, ...report } : report;
  const serialized = JSON.stringify(withEnvFile, null, 2);
  if (reportPath) {
    const absoluteReportPath = path.resolve(root, reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, `${serialized}\n`);
  }
  console.log(serialized);
  if (exitCode) process.exitCode = exitCode;
}

function findApksigner() {
  const direct = envValue("JOB_SPRINT_APKSIGNER") || envValue("APKSIGNER");
  if (direct && fs.existsSync(direct)) return direct;

  const sdkRoots = [
    envValue("ANDROID_HOME"),
    envValue("ANDROID_SDK_ROOT"),
    "/opt/homebrew/share/android-commandlinetools"
  ].filter(Boolean);

  const candidates = [];
  for (const sdkRoot of sdkRoots) {
    const buildToolsDir = path.join(sdkRoot, "build-tools");
    if (!fs.existsSync(buildToolsDir)) continue;
    for (const version of fs.readdirSync(buildToolsDir).sort().reverse()) {
      candidates.push(path.join(buildToolsDir, version, "apksigner"));
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || "apksigner";
}

function normalizeDigest(value) {
  return value ? value.replace(/[^a-fA-F0-9]/g, "").toLowerCase() : null;
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function requireSigningEnv() {
  const required = [
    "JOB_SPRINT_ANDROID_KEYSTORE",
    "JOB_SPRINT_ANDROID_STORE_PASSWORD",
    "JOB_SPRINT_ANDROID_KEY_ALIAS",
    "JOB_SPRINT_ANDROID_KEY_PASSWORD",
    "JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"
  ];
  const missing = required.filter((key) => !envValue(key));
  if (missing.length) {
    output({
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_signing_env_missing",
      missing,
      requiredInputs: [
        "Use a stable private release keystore outside the git repo.",
        "Expose signing values through shell env or user-level Gradle properties.",
        "Set JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256 to the expected release certificate fingerprint.",
        "Run npm run build:android:release again."
      ]
    }, 2);
    return false;
  }

  const keystore = envValue("JOB_SPRINT_ANDROID_KEYSTORE");
  if (!fs.existsSync(keystore) || !fs.statSync(keystore).isFile()) {
    output({
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_keystore_missing",
      keystore
    }, 2);
    return false;
  }
  if (isInsideRepository(keystore)) {
    output({
      status: "USER_ACTION_REQUIRED",
      reason: "formal_android_release_keystore_inside_repo",
      keystore: relative(path.resolve(root, keystore)),
      requiredInputs: [
        "Move the stable private release keystore outside the git repository.",
        "Point JOB_SPRINT_ANDROID_KEYSTORE at that external file.",
        "Run npm run build:android:release again."
      ]
    }, 2);
    return false;
  }
  return true;
}

function runGradleReleaseBuild() {
  const result = spawnSync("gradle", [
    "-p",
    "apps/android",
    ":app:validateReleaseSigningConfig",
    ":app:assembleRelease"
  ], {
    cwd: root,
    env: effectiveEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    output({
      status: "FAIL",
      reason: "gradle_release_build_failed",
      stdoutTail: tail(result.stdout),
      stderrTail: tail(result.stderr)
    }, result.status || 1);
    return false;
  }
  return true;
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-30);
}

function newestReleaseApk() {
  const explicit = argValue("--apk") || envValue("JOB_SPRINT_ANDROID_RELEASE_APK");
  if (explicit) return path.resolve(root, explicit);

  const outputDir = repoPath("apps/android/app/build/outputs/apk/release");
  if (!fs.existsSync(outputDir)) return null;

  const apks = fs.readdirSync(outputDir)
    .filter((entry) => entry.endsWith(".apk"))
    .map((entry) => path.join(outputDir, entry))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return apks[0] || null;
}

function verifyApk(apkPath) {
  if (!apkPath || !fs.existsSync(apkPath)) {
    output({
      status: "FAIL",
      reason: "release_apk_missing",
      apk: apkPath ? relative(apkPath) : null
    }, 1);
    return false;
  }

  if (/unsigned/i.test(path.basename(apkPath))) {
    output({
      status: "UNSIGNED",
      reason: "release_apk_name_indicates_unsigned",
      apk: relative(apkPath)
    }, 1);
    return false;
  }

  const apksigner = findApksigner();
  let raw = "";
  try {
    raw = execFileSync(apksigner, ["verify", "--verbose", "--print-certs", apkPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    output({
      status: "FAIL",
      reason: "apksigner_verify_failed",
      apk: relative(apkPath),
      outputTail: tail(`${error.stdout || ""}\n${error.stderr || ""}`)
    }, error.status || 1);
    return false;
  }

  const digestMatch = raw.match(/(?:Signer #1|V[0-9.]+ Signer): certificate SHA-256 digest:\s*([A-Fa-f0-9:]+)/);
  const dnMatch = raw.match(/(?:Signer #1|V[0-9.]+ Signer): certificate DN:\s*(.+)/);
  const certSha256 = normalizeDigest(digestMatch && digestMatch[1]);
  const certificateDn = dnMatch ? dnMatch[1].trim() : null;
  const expectedSha256 = normalizeDigest(envValue("JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256"));
  const isDebug = /CN=Android Debug/i.test(certificateDn || "");
  const schemeRows = raw.split(/\r?\n/)
    .filter((line) => /^Verified using /.test(line))
    .map((line) => line.trim());

  if (!certSha256) {
    output({
      status: "FAIL",
      reason: "release_certificate_digest_missing",
      apk: relative(apkPath),
      signerOutputTail: tail(raw)
    }, 1);
    return false;
  }

  if (isDebug) {
    output({
      status: "DEBUG_SIGNED",
      reason: "debug_certificate_is_not_a_formal_release",
      apk: relative(apkPath),
      apkSha256: fileSha256(apkPath),
      certificateDn,
      certSha256
    }, 1);
    return false;
  }

  if (!expectedSha256 && !allowUnpinnedCert) {
    output({
      status: "SIGNED_UNPINNED",
      reason: "release_certificate_sha256_not_pinned",
      apk: relative(apkPath),
      apkSha256: fileSha256(apkPath),
      certificateDn,
      certSha256,
      nextAction: "Set JOB_SPRINT_ANDROID_RELEASE_CERT_SHA256 to this digest only after confirming this is the long-term release keystore."
    }, verifyOnly ? 1 : 2);
    return false;
  }

  if (expectedSha256 && certSha256 !== expectedSha256) {
    output({
      status: "CERT_MISMATCH",
      reason: "release_certificate_sha256_does_not_match_expected",
      apk: relative(apkPath),
      apkSha256: fileSha256(apkPath),
      certificateDn,
      certSha256,
      expectedSha256
    }, 1);
    return false;
  }

  output({
    status: expectedSha256 ? "FORMAL_SIGNED" : "SIGNED_UNPINNED",
    apk: relative(apkPath),
    apkSha256: fileSha256(apkPath),
    sizeBytes: fs.statSync(apkPath).size,
    certificateDn,
    certSha256,
    verifiedSchemes: schemeRows
  }, 0);
  return true;
}

if (!loadEffectiveEnv()) {
  process.exit();
}

if (!verifyOnly && !requireSigningEnv()) {
  process.exit();
}

if (!verifyOnly && !runGradleReleaseBuild()) {
  process.exit();
}

verifyApk(newestReleaseApk());

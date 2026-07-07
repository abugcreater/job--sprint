const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function displayPath(root, file) {
  const absolute = path.resolve(root, file);
  const rel = path.relative(root, absolute);
  return rel.startsWith("..") ? absolute : rel;
}

function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walkFiles(dir, base = dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, base, files);
    } else if (entry.name !== ".DS_Store") {
      files.push(path.relative(base, fullPath));
    }
  }
  return files;
}

function fileHashMap(dir) {
  return Object.fromEntries(walkFiles(dir)
    .sort()
    .map((relativePath) => [relativePath, fileSha256(path.join(dir, relativePath))]));
}

function mapDiff(left, right, leftLabel = "dist", rightLabel = "android_fallback") {
  const issues = [];
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of Array.from(keys).sort()) {
    if (!Object.prototype.hasOwnProperty.call(left, key)) {
      issues.push(`missing_in_${leftLabel}:${key}`);
    } else if (!Object.prototype.hasOwnProperty.call(right, key)) {
      issues.push(`missing_in_${rightLabel}:${key}`);
    } else if (left[key] !== right[key]) {
      issues.push(`hash_mismatch:${key}`);
    }
  }
  return issues;
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function tail(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).slice(-20);
}

function binaryFileDescription(root, file) {
  const result = spawnSync("file", [file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000
  });
  if (result.status !== 0) {
    return {
      ok: false,
      outputLines: tail(`${result.stdout}\n${result.stderr}`)
    };
  }
  return { ok: true, description: result.stdout.trim() };
}

function isLinuxElf(description) {
  return /\bELF\b/.test(description)
    && /\bx86-64\b/.test(description)
    && /Linux|GNU\/Linux|SYSV/.test(description);
}

function serverDeliveryPackageCheck(root) {
  const packageRoot = path.join(root, "dist", "server-delivery");
  const manifestFile = path.join(packageRoot, "server-delivery-manifest.json");
  const publicSafeRoot = path.join(root, "dist", "public-safe");
  const rustBinary = path.join(root, "apps", "rust-api", "target", "release", "job-sprint-api");
  const missing = [packageRoot, manifestFile].filter((entry) => !fs.existsSync(entry));
  if (missing.length) {
    return {
      id: "server_delivery_package",
      status: "USER_ACTION_REQUIRED",
      reason: "server_delivery_package_missing",
      missing: missing.map((file) => displayPath(root, file)),
      requiredInputs: [
        "Run npm run build:server-delivery after npm run build:public-safe and npm run build:rust:linux.",
        "Use the generated dist/server-delivery package as the server sync source."
      ]
    };
  }

  let manifest;
  try {
    manifest = readJsonFile(manifestFile);
  } catch (error) {
    return {
      id: "server_delivery_package",
      status: "FAIL",
      reason: "server_delivery_manifest_invalid_json",
      manifest: displayPath(root, manifestFile),
      error: error.message
    };
  }

  const rustArtifact = manifest.artifacts && manifest.artifacts.rustBinary;
  const publicSafeArtifact = manifest.artifacts && manifest.artifacts.publicSafe;
  if (!rustArtifact || !publicSafeArtifact || !publicSafeArtifact.files) {
    return {
      id: "server_delivery_package",
      status: "FAIL",
      reason: "server_delivery_manifest_missing_artifacts",
      manifest: displayPath(root, manifestFile)
    };
  }

  const issues = [];
  const packageBinary = path.join(packageRoot, rustArtifact.packagePath || "bin/job-sprint-api");
  if (!fs.existsSync(rustBinary) || !fs.statSync(rustBinary).isFile()) {
    issues.push("current_rust_release_binary_missing");
  }
  if (!fs.existsSync(packageBinary) || !fs.statSync(packageBinary).isFile()) {
    issues.push("delivery_rust_binary_missing");
  }
  if (fs.existsSync(rustBinary) && fs.existsSync(packageBinary)) {
    const currentBinarySha = fileSha256(rustBinary);
    const packageBinarySha = fileSha256(packageBinary);
    const currentBinaryType = binaryFileDescription(root, rustBinary);
    const packageBinaryType = binaryFileDescription(root, packageBinary);
    if (!currentBinaryType.ok || !isLinuxElf(currentBinaryType.description)) {
      issues.push("current_rust_release_binary_not_linux_elf");
    }
    if (!packageBinaryType.ok || !isLinuxElf(packageBinaryType.description)) {
      issues.push("delivery_rust_binary_not_linux_elf");
    }
    if (rustArtifact.sha256 !== currentBinarySha) {
      issues.push("delivery_manifest_rust_sha256_stale");
    }
    if (packageBinarySha !== currentBinarySha) {
      issues.push("delivery_rust_binary_hash_mismatch");
    }
  }

  const packagePublicSafe = path.join(packageRoot, publicSafeArtifact.packagePath || "public-safe");
  if (!fs.existsSync(packagePublicSafe) || !fs.statSync(packagePublicSafe).isDirectory()) {
    issues.push("delivery_public_safe_missing");
  }
  if (!fs.existsSync(publicSafeRoot) || !fs.statSync(publicSafeRoot).isDirectory()) {
    issues.push("current_public_safe_missing");
  }
  if (fs.existsSync(publicSafeRoot) && fs.existsSync(packagePublicSafe)) {
    const currentPublicSafeMap = fileHashMap(publicSafeRoot);
    const packagePublicSafeMap = fileHashMap(packagePublicSafe);
    const manifestPublicSafeMap = publicSafeArtifact.files || {};
    issues.push(...mapDiff(currentPublicSafeMap, packagePublicSafeMap, "current_public_safe", "server_delivery_public_safe"));
    issues.push(...mapDiff(currentPublicSafeMap, manifestPublicSafeMap, "current_public_safe", "server_delivery_manifest_public_safe"));
  }

  if (issues.length) {
    return {
      id: "server_delivery_package",
      status: "USER_ACTION_REQUIRED",
      reason: "server_delivery_package_stale",
      manifest: displayPath(root, manifestFile),
      issues: issues.slice(0, 20),
      requiredInputs: [
        "Run npm run build:server-delivery to refresh the server sync package.",
        "Run npm run validate:delivery again before remote sync."
      ]
    };
  }

  return {
    id: "server_delivery_package",
    status: "PASS",
    packageRoot: displayPath(root, packageRoot),
    manifest: displayPath(root, manifestFile),
    rustBinarySha256: rustArtifact.sha256,
    publicSafeFileCount: Object.keys(publicSafeArtifact.files).length
  };
}

module.exports = {
  isLinuxElf,
  serverDeliveryPackageCheck
};

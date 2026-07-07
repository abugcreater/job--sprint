#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const packageRoot = path.join(repoRoot, "dist", "server-delivery");
const publicSafeRoot = path.join(repoRoot, "dist", "public-safe");
const reactDistRoot = path.join(repoRoot, "apps", "react-web", "dist");
const rustBinary = path.join(repoRoot, "apps", "rust-api", "target", "release", "job-sprint-api");
const manifestPath = path.join(packageRoot, "server-delivery-manifest.json");

function relative(file) {
  return path.relative(repoRoot, file);
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireFile(file, nextAction) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.log(JSON.stringify({
      status: "USER_ACTION_REQUIRED",
      reason: "delivery_source_file_missing",
      missing: relative(file),
      nextAction
    }, null, 2));
    process.exit(2);
  }
}

function requireDir(dir, nextAction) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.log(JSON.stringify({
      status: "USER_ACTION_REQUIRED",
      reason: "delivery_source_dir_missing",
      missing: relative(dir),
      nextAction
    }, null, 2));
    process.exit(2);
  }
}

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function binaryFileDescription(file) {
  const result = spawnSync("file", [file], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000
  });
  if (result.status !== 0) {
    return {
      ok: false,
      outputLines: String(`${result.stdout}\n${result.stderr}`).split(/\r?\n/).filter(Boolean).slice(-20)
    };
  }
  return { ok: true, description: result.stdout.trim() };
}

function isLinuxElf(description) {
  return /\bELF\b/.test(description)
    && /\bx86-64\b/.test(description)
    && /Linux|GNU\/Linux|SYSV/.test(description);
}

requireDir(publicSafeRoot, "Run npm run build:public-safe before building the server delivery package.");
requireFile(path.join(publicSafeRoot, "build-manifest.json"), "Run npm run build:public-safe to generate the public-safe manifest.");
requireDir(reactDistRoot, "Run cd apps/react-web && npm run build before building the server delivery package.");
requireFile(path.join(reactDistRoot, "index.html"), "Run cd apps/react-web && npm run build to generate the React entry.");
requireFile(rustBinary, "Run npm run build:rust:linux before building the server delivery package.");

const rustBinaryType = binaryFileDescription(rustBinary);
if (!rustBinaryType.ok || !isLinuxElf(rustBinaryType.description)) {
  console.log(JSON.stringify({
    status: "USER_ACTION_REQUIRED",
    reason: "server_delivery_source_binary_not_linux_elf",
    binary: relative(rustBinary),
    binaryDescription: rustBinaryType.description || null,
    outputLines: rustBinaryType.outputLines || [],
    requiredInputs: [
      "Build or provide a Linux x86_64 release binary before building the server delivery package.",
      "Do not package a macOS Mach-O binary as dist/server-delivery/bin/job-sprint-api."
    ]
  }, null, 2));
  process.exit(2);
}

fs.rmSync(packageRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(packageRoot, "bin"), { recursive: true });
fs.mkdirSync(path.join(packageRoot, "apps", "react-web"), { recursive: true });
fs.mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
fs.cpSync(publicSafeRoot, packageRoot, { recursive: true });
fs.cpSync(publicSafeRoot, path.join(packageRoot, "dist", "public-safe"), { recursive: true });
fs.cpSync(reactDistRoot, path.join(packageRoot, "apps", "react-web", "dist"), { recursive: true });
fs.copyFileSync(rustBinary, path.join(packageRoot, "bin", "job-sprint-api"));
fs.chmodSync(path.join(packageRoot, "bin", "job-sprint-api"), 0o755);

const publicSafeHashes = fileHashMap(publicSafeRoot);
const reactDistHashes = fileHashMap(reactDistRoot);
const manifest = {
  schemaVersion: 1,
  generatedBy: "tools/build_server_delivery_package.js",
  gitCommit: gitCommit(),
  packageRoot: relative(packageRoot),
  artifacts: {
    rustBinary: {
      source: relative(rustBinary),
      packagePath: "bin/job-sprint-api",
      sha256: fileSha256(rustBinary),
      sizeBytes: fs.statSync(rustBinary).size
    },
    publicSafe: {
      source: relative(publicSafeRoot),
      packagePath: "dist/public-safe",
      manifest: "dist/public-safe/build-manifest.json",
      fileCount: Object.keys(publicSafeHashes).length,
      files: publicSafeHashes
    },
    reactDist: {
      source: relative(reactDistRoot),
      packagePath: "apps/react-web/dist",
      entry: "apps/react-web/dist/index.html",
      fileCount: Object.keys(reactDistHashes).length,
      files: reactDistHashes
    }
  },
  publicSafeSourceHashes: readJson(path.join(publicSafeRoot, "build-manifest.json")).sourceHashes
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: "PASS",
  packageRoot: relative(packageRoot),
  manifest: relative(manifestPath),
  rustBinarySha256: manifest.artifacts.rustBinary.sha256,
  publicSafeFileCount: manifest.artifacts.publicSafe.fileCount
}, null, 2));

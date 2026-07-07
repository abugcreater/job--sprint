#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const targetRoots = [
  path.join(repoRoot, "dist", "public-safe"),
  path.join(repoRoot, "apps", "android", "app", "src", "main", "assets", "web")
];

const rules = [
  { id: "local-user-path", pattern: /\/Users\/(?!Shared\b)[A-Za-z0-9._-]+\b/ },
  { id: "cloud-secret-dir", pattern: /tencentcloud|tecentcloud|qcloud|dnspod|腾讯云/i },
  { id: "private-key", pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: "secret-token", pattern: /\bsk-[A-Za-z0-9_-]{8,}\b|ANTHROPIC_AUTH_TOKEN|AUTH_TOKEN\s*=|SECRET\s*=|PASSWORD\s*=/i },
  { id: "private-ip", pattern: /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/ },
  { id: "company-name", pattern: /同程旅行/ },
  { id: "internal-project-name", pattern: /SearchFrontAPI|SearchCore|searchblackhole|searchpackage/i },
  { id: "key-file-ref", pattern: /fk_sha|\.pem\b|id_rsa\b/i }
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

for (const targetRoot of targetRoots) {
  if (!fs.existsSync(targetRoot)) {
    console.error(`${path.relative(repoRoot, targetRoot)} not found; run node tools/build_public_safe_bundle.js first`);
    process.exit(1);
  }
}

const findings = [];
for (const targetRoot of targetRoots) {
  for (const file of walk(targetRoot)) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (_) {
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      rules.forEach((rule) => {
        if (rule.pattern.test(line)) {
          findings.push({
            root: path.relative(repoRoot, targetRoot),
            file: path.relative(targetRoot, file),
            line: index + 1,
            rule: rule.id,
            note: "公网安全包命中禁止模式，请先脱敏。"
          });
        }
      });
    });
  }
}

if (findings.length) {
  console.error(`public-safe scan failed: ${findings.length} findings`);
  findings.forEach((item) => {
    console.error(`- ${item.root}/${item.file}:${item.line} [${item.rule}] ${item.note}`);
  });
  process.exit(1);
}

console.log("public-safe scan passed: dist bundle and Android fallback assets");

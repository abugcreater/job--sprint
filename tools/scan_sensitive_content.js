#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const ignoreDirs = new Set([".git", "node_modules", "dist", "build", "target", ".gradle", ".idea"]);
const ignoreRelativeDirs = new Set(["docs/evidence"]);
const ignoreFiles = new Set(["package-lock.json", "scan_sensitive_content.js", "scan_public_bundle.js"]);
const privateDeployHostPattern = new RegExp(["app", "jobdailyschedule", "site"].join("[.]"), "i");
const privatePersonalNamePattern = new RegExp(["冯", "凯"].join(""));
const privatePersonalPinyinPattern = new RegExp(["feng", "kai"].join("[-_]?"), "i");
const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function normalizeEscapedDots(line) {
  return line.replace(/\\\./g, ".");
}

function isAllowedIp(ip) {
  const parts = ip.split(".").map((item) => Number.parseInt(item, 10));
  if (parts.length !== 4 || parts.some((item) => Number.isNaN(item) || item < 0 || item > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && c === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

const rules = [
  { id: "private-key", pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: "anthropic-token", pattern: /ANTHROPIC_AUTH_TOKEN\s*=\s*['"]?[^'"\s,;]+/i },
  { id: "sk-token", pattern: /\bsk-[A-Za-z0-9][A-Za-z0-9_-]{16,}\b/ },
  { id: "secret-assignment", pattern: /(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { id: "ssh-private-path", pattern: /\/[^\s'"]+\.pem\b|id_rsa\b/ },
  { id: "private-local-path", test: (line) => /\/Users\/(?!Shared\b)[A-Za-z0-9._-]+\b/.test(line) },
  { id: "real-deploy-domain", test: (line) => privateDeployHostPattern.test(normalizeEscapedDots(line)) },
  { id: "real-server-ip", test: (line) => {
    const matches = normalizeEscapedDots(line).match(ipv4Pattern) || [];
    return matches.some((ip) => !isAllowedIp(ip) && ip.split(".").some((part) => Number.parseInt(part, 10) >= 10));
  } },
  { id: "personal-name", test: (line) => privatePersonalNamePattern.test(line) },
  { id: "personal-name-pinyin", test: (line) => privatePersonalPinyinPattern.test(line) }
];

function walk(dir, files = [], root = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relativeDir = path.relative(root, fullPath).split(path.sep).join("/");
    if (entry.isDirectory() && ignoreRelativeDirs.has(relativeDir)) continue;
    if (entry.isDirectory()) {
      walk(fullPath, files, root);
    } else if (!ignoreFiles.has(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  return [
    ".js", ".json", ".html", ".css", ".md", ".txt", ".sh", ".yml", ".yaml",
    ".ts", ".tsx", ".java", ".rs", ".xml", ".gradle", ".properties", ".example",
    ".gitignore", ".webmanifest", ".svg", ".toml"
  ].includes(ext) || !ext;
}

function shouldIgnoreLine(line) {
  return /replace-with-your-token|your-anthropic-compatible-host|your-domain\.example\.com|your-token|test-token-that-must-not-leak|opaque-test-token|auth-disabled|-test-password|pass-2026|reset-2026|KEY_[A-Z0-9_]*PASSWORD|\*\*\*REDACTED\*\*\*|--exclude "\*\.(pem|key)"|\*\.(pem|key)/i.test(line);
}

function ruleMatches(rule, line) {
  if (rule.test) {
    return rule.test(line);
  }
  return rule.pattern.test(line);
}

function scanLine(line) {
  if (shouldIgnoreLine(line)) return [];
  return rules
    .filter((rule) => ruleMatches(rule, line))
    .map((rule) => rule.id);
}

function scanRoot(root = repoRoot) {
  const findings = [];
  for (const file of walk(root)) {
    if (!isTextFile(file)) continue;
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (_) {
      continue;
    }
    text.split(/\r?\n/).forEach((line, index) => {
      scanLine(line).forEach((rule) => {
        findings.push({
          file: path.relative(root, file),
          line: index + 1,
          rule,
          note: "已隐藏命中内容，请打开文件人工确认。"
        });
      });
    });
  }
  return findings;
}

function main() {
  const findings = scanRoot(repoRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    scannedRoot: repoRoot,
    findings
  };

  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (findings.length === 0) {
    console.log("敏感内容扫描：未发现高风险命中。");
  } else {
    console.log(`敏感内容扫描：发现 ${findings.length} 个需要人工确认的位置。`);
    findings.forEach((item) => {
      console.log(`- ${item.file}:${item.line} [${item.rule}] ${item.note}`);
    });
  }

  if (findings.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    scanLine,
    scanRoot,
    shouldIgnoreLine
  };
}

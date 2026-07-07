const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "apps", "react-web", "dist");
const targetDir = path.join(root, "apps", "android", "app", "src", "main", "assets", "react");

function assertInsideRoot(target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${target}`);
  }
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  fs.copyFileSync(source, target);
}

function listFiles(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rows.push(...listFiles(fullPath));
    } else {
      rows.push(path.relative(dir, fullPath));
    }
  }
  return rows;
}

if (!fs.existsSync(sourceDir)) {
  throw new Error("apps/react-web/dist does not exist. Run: cd apps/react-web && npm run build");
}

if (!fs.existsSync(path.join(sourceDir, "index.html"))) {
  throw new Error("apps/react-web/dist/index.html is missing. Run: cd apps/react-web && npm run build");
}

assertInsideRoot(targetDir);
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
copyRecursive(sourceDir, targetDir);

const files = listFiles(targetDir);
console.log(`Synced React build to ${path.relative(root, targetDir)}`);
console.log(`Files: ${files.length}`);

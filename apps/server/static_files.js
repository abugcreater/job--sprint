const fs = require("fs");
const path = require("path");
const { hasPermission } = require("./auth");

const ROOT = path.resolve(__dirname, "../..");
const APP_PREFIX = "/job-sprint";
const REACT_ENTRY_PATH = "/react/index.html";
const REACT_DEFAULT_ENTRY = `${REACT_ENTRY_PATH}#/today`;
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function securityHeaders(extra = {}) {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), camera=()",
    ...extra
  };
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, securityHeaders({
    "content-type": contentType,
    "cache-control": "no-store"
  }));
  res.end(body);
}

function normalizePathname(pathname) {
  if (pathname === APP_PREFIX || pathname === `${APP_PREFIX}/`) {
    return "/";
  }
  if (pathname.startsWith(`${APP_PREFIX}/`)) {
    return pathname.slice(APP_PREFIX.length);
  }
  return pathname;
}

function safePath(urlPath) {
  let cleanPath = "";
  try {
    cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch (_) {
    return { error: "bad_request" };
  }
  const relativePath = cleanPath === "/" ? REACT_ENTRY_PATH : cleanPath;
  if (relativePath === "/react/" || relativePath === REACT_ENTRY_PATH || relativePath.startsWith("/react/assets/")) {
    const reactRoot = path.resolve(ROOT, "apps", "react-web", "dist");
    const reactRelativePath = relativePath === "/react/" ? "/index.html" : relativePath.slice("/react".length);
    const resolved = path.resolve(reactRoot, `.${reactRelativePath}`);
    const relative = path.relative(reactRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return { error: "forbidden" };
    }
    return { filePath: resolved };
  }
  const allowed = relativePath === "/schedule.html"
    || relativePath === "/login.html"
    || relativePath === "/sw.js"
    || relativePath === "/assets/manifest.webmanifest"
    || relativePath.startsWith("/assets/")
    || relativePath.startsWith("/data/");
  if (!allowed) {
    return { error: "forbidden" };
  }
  const resolved = path.resolve(ROOT, `.${relativePath}`);
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { error: "forbidden" };
  }
  return { filePath: resolved };
}

function requestBase(pathname) {
  return pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`) ? APP_PREFIX : "";
}

function loginPathFor(reqPathname, nextPathname = REACT_DEFAULT_ENTRY) {
  const base = requestBase(reqPathname);
  const next = nextPathname.startsWith("/") ? nextPathname : REACT_DEFAULT_ENTRY;
  return `${base}/login.html?next=${encodeURIComponent(`${base}${next}`)}`;
}

function isPrivateStatic(pathname) {
  return pathname === "/"
    || pathname === "/schedule.html"
    || pathname === "/assets/embedded-data.js"
    || pathname === "/react"
    || pathname === "/react/"
    || pathname === REACT_ENTRY_PATH
    || pathname.startsWith("/react/assets/")
    || pathname.startsWith("/data/");
}

function isPublicApi(pathname) {
  return pathname === "/api/health" || pathname.startsWith("/api/auth/");
}

function isPrivateApi(pathname) {
  return pathname.startsWith("/api/") && !isPublicApi(pathname);
}

function mustUsePublicSafeStatic(urlPath, authState) {
  const cleanPath = normalizePathname(urlPath.split("?")[0]);
  return authState
    && authState.authenticated
    && !hasPermission(authState, "data:private")
    && (cleanPath.startsWith("/data/") || cleanPath === "/assets/embedded-data.js");
}

function publicSafePath(urlPath) {
  let cleanPath = "";
  try {
    cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch (_) {
    return null;
  }
  const relativePath = cleanPath === "/" ? "/schedule.html" : cleanPath;
  const canUsePublicSafe = relativePath.startsWith("/data/")
    || relativePath === "/assets/embedded-data.js";
  if (!canUsePublicSafe) return null;
  const publicRoot = path.join(ROOT, "dist", "public-safe");
  const resolved = path.resolve(publicRoot, `.${relativePath}`);
  const relative = path.relative(publicRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return fs.existsSync(resolved) ? resolved : null;
}

function serveFile(filePath, res) {
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, securityHeaders({
      "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
      "cache-control": ext === ".json" || ext === ".html" ? "no-store" : "public, max-age=60"
    }));
    fs.createReadStream(filePath).pipe(res);
  });
}

function serveStatic(urlPath, res, authState = null) {
  const safe = safePath(urlPath);
  if (safe && safe.error === "bad_request") {
    sendText(res, 400, "Bad request");
    return;
  }
  if (!safe || safe.error === "forbidden") {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (mustUsePublicSafeStatic(urlPath, authState)) {
    const publicSafeFile = publicSafePath(urlPath);
    if (!publicSafeFile) {
      sendText(res, 403, "Forbidden");
      return;
    }
    serveFile(publicSafeFile, res);
    return;
  }
  serveFile(safe.filePath, res);
}

module.exports = {
  APP_PREFIX,
  REACT_DEFAULT_ENTRY,
  REACT_ENTRY_PATH,
  isPrivateApi,
  isPrivateStatic,
  isPublicApi,
  loginPathFor,
  normalizePathname,
  publicSafePath,
  requestBase,
  safePath,
  serveStatic
};

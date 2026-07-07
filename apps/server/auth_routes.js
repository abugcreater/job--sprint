const {
  SESSION_TTL_MS,
  getAuthConfig,
  isSecureRequest,
  publicUser,
  safeEqual,
  sessionCookie,
  sha256,
  signSession,
  verifySession
} = require("./auth");
const {
  readBody,
  securityHeaders,
  sendBadJson,
  sendJson
} = require("./http_utils");

const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.JOB_SPRINT_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_RATE_LIMIT_MAX = Number(process.env.JOB_SPRINT_LOGIN_RATE_LIMIT_MAX || 8);
const loginFailures = new Map();

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function loginRateKey(req, username) {
  const normalizedUser = String(username || "").trim().toLowerCase();
  return `${clientIp(req)}:${sha256(normalizedUser).slice(0, 16)}`;
}

function pruneLoginFailures(now = Date.now()) {
  for (const [key, item] of loginFailures.entries()) {
    if (!item || now - item.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginFailures.delete(key);
    }
  }
}

function loginRateState(req, username, now = Date.now()) {
  pruneLoginFailures(now);
  const key = loginRateKey(req, username);
  const item = loginFailures.get(key);
  const attempts = item ? item.count : 0;
  const retryAfterMs = item ? Math.max(0, LOGIN_RATE_LIMIT_WINDOW_MS - (now - item.firstAt)) : 0;
  return {
    key,
    limited: attempts >= LOGIN_RATE_LIMIT_MAX,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
  };
}

function recordFailedLogin(key, now = Date.now()) {
  const item = loginFailures.get(key);
  if (!item || now - item.firstAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: now });
    return;
  }
  item.count += 1;
}

function clearLoginFailures(key) {
  loginFailures.delete(key);
}

async function handleAuth(req, res, pathname) {
  if (pathname === "/api/auth/session" && req.method === "GET") {
    const authState = verifySession(req);
    const status = authState.authenticated ? 200 : authState.reason === "auth_not_configured" ? 503 : 401;
    sendJson(res, status, {
      ok: true,
      authenticated: authState.authenticated,
      authConfigured: authState.config.configured,
      authDisabled: authState.config.disabled,
      user: authState.authenticated ? authState.userProfile : null,
      authMethod: authState.authenticated ? authState.authMethod : null
    });
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const config = getAuthConfig();
    if (config.disabled) {
      sendJson(res, 200, { ok: true, authenticated: true, authDisabled: true });
      return;
    }
    if (!config.configured) {
      sendJson(res, 503, {
        ok: false,
        error: "auth_not_configured",
        message: "job-sprint 应用层认证未配置。请设置 JOB_SPRINT_USERS_JSON 或 JOB_SPRINT_USERS_FILE，并提供至少 32 字符的 JOB_SPRINT_SESSION_SECRET。"
      });
      return;
    }

    let payload;
    try {
      payload = await readBody(req);
    } catch (error) {
      sendBadJson(res, error);
      return;
    }

    const username = String(payload.username || "");
    const password = String(payload.password || "");
    const rateState = loginRateState(req, username);
    if (rateState.limited) {
      res.writeHead(429, securityHeaders({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": String(rateState.retryAfterSeconds)
      }));
      res.end(JSON.stringify({
        ok: false,
        error: "too_many_login_attempts",
        message: "登录失败次数过多，请稍后再试。"
      }, null, 2));
      return;
    }

    const userConfig = config.userMap.get(username);
    const valid = Boolean(userConfig) && safeEqual(sha256(password), userConfig.passwordHash);
    if (!valid) {
      recordFailedLogin(rateState.key);
      sendJson(res, 401, { ok: false, error: "invalid_credentials", message: "用户名或密码不正确。" });
      return;
    }
    clearLoginFailures(rateState.key);

    const token = signSession({
      user: userConfig.username,
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS
    }, config.sessionSecret);

    res.writeHead(200, securityHeaders({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": sessionCookie(token, {
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
        secure: isSecureRequest(req)
      })
    }));
    res.end(JSON.stringify({ ok: true, authenticated: true, user: publicUser(userConfig) }, null, 2));
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    res.writeHead(200, securityHeaders({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": sessionCookie("", { maxAge: 0, secure: isSecureRequest(req) })
    }));
    res.end(JSON.stringify({ ok: true, authenticated: false }, null, 2));
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

module.exports = {
  handleAuth,
  loginRateState
};

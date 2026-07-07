const crypto = require("crypto");
const fs = require("fs");

const SESSION_COOKIE = "job_sprint_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_SESSION_SECRET_LENGTH = 32;
const ROLE_PERMISSIONS = {
  owner: ["*"],
  coach: [
    "module:today",
    "module:schedule",
    "module:knowledge",
    "module:interview",
    "module:applications",
    "module:review",
    "module:tools",
    "module:settings",
    "runtime:read",
    "runtime:write",
    "ai:use",
    "data:private"
  ],
  viewer: [
    "module:today",
    "module:schedule",
    "module:knowledge",
    "module:interview",
    "module:applications",
    "module:review",
    "module:settings",
    "runtime:read",
    "layout:view",
    "data:public"
  ]
};
const GUEST_ROLE = "viewer";
const DEFAULT_OWNER_ROLE = "owner";

function isAuthDisabled() {
  return String(process.env.JOB_SPRINT_AUTH_DISABLED || "").toLowerCase() === "true";
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizePermissions(role, extraPermissions = []) {
  const base = ROLE_PERMISSIONS[role] || [];
  return Array.from(new Set(base.concat(Array.isArray(extraPermissions) ? extraPermissions : [])));
}

function publicUser(userConfig) {
  if (!userConfig) return null;
  const permissions = normalizePermissions(userConfig.role, userConfig.permissions);
  return {
    username: userConfig.username,
    displayName: userConfig.displayName || userConfig.username,
    role: userConfig.role,
    dataScope: userConfig.dataScope || userConfig.username,
    inviteBatch: userConfig.inviteBatch || "default",
    permissions,
    readOnly: !permissions.includes("*") && !permissions.includes("runtime:write")
  };
}

function parseJsonConfig(raw, source) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return { error: `invalid_json:${source}`, message: error.message };
  }
}

function usersFromConfigObject(configObject) {
  const rows = Array.isArray(configObject) ? configObject : configObject && configObject.users;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const username = String(row.username || "").trim();
      const role = String(row.role || (username === "guest" ? GUEST_ROLE : DEFAULT_OWNER_ROLE)).trim();
      const passwordHash = String(row.passwordHash || row.passwordSha256 || "").trim().toLowerCase();
      const password = row.password ? String(row.password) : "";
      const effectivePasswordHash = passwordHash || (password ? sha256(password) : "");
      return {
        username,
        displayName: String(row.displayName || username || "").trim(),
        role,
        dataScope: String(row.dataScope || username || "").trim(),
        inviteBatch: String(row.inviteBatch || row.invitationBatch || "default").trim() || "default",
        passwordHash: effectivePasswordHash,
        permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
        disabled: Boolean(row.disabled)
      };
    })
    .filter((user) => user.username && user.passwordHash && /^[a-f0-9]{64}$/i.test(user.passwordHash) && !user.disabled);
}

function loadConfiguredUsers() {
  const inline = process.env.JOB_SPRINT_USERS_JSON || "";
  if (inline) {
    const parsed = parseJsonConfig(inline, "JOB_SPRINT_USERS_JSON");
    if (parsed && parsed.error) {
      return { users: [], error: parsed.error };
    }
    return { users: usersFromConfigObject(parsed), error: null };
  }

  const usersFile = process.env.JOB_SPRINT_USERS_FILE || "";
  if (usersFile) {
    try {
      const parsed = parseJsonConfig(fs.readFileSync(usersFile, "utf8"), "JOB_SPRINT_USERS_FILE");
      if (parsed && parsed.error) {
        return { users: [], error: parsed.error };
      }
      return { users: usersFromConfigObject(parsed), error: null };
    } catch (error) {
      return { users: [], error: `users_file_unreadable:${error.code || "unknown"}` };
    }
  }

  const user = process.env.JOB_SPRINT_AUTH_USER || "";
  const password = process.env.JOB_SPRINT_AUTH_PASSWORD || "";
  const passwordHash = process.env.JOB_SPRINT_AUTH_PASSWORD_SHA256 || "";
  const normalizedHash = passwordHash.toLowerCase();
  const hasValidPasswordHash = !passwordHash || /^[a-f0-9]{64}$/i.test(passwordHash);
  const effectivePasswordHash = passwordHash ? normalizedHash : (password ? sha256(password) : "");
  if (!user || !effectivePasswordHash || !hasValidPasswordHash) {
    return { users: [], error: hasValidPasswordHash ? null : "invalid_legacy_password_hash" };
  }
  return {
    users: [{
      username: user,
      displayName: user,
      role: DEFAULT_OWNER_ROLE,
      dataScope: user,
      inviteBatch: "default",
      passwordHash: effectivePasswordHash,
      permissions: [],
      disabled: false
    }],
    error: null
  };
}

function usersByName(users) {
  return users.reduce((map, user) => {
    map.set(user.username, user);
    return map;
  }, new Map());
}

function primaryDataScope(users) {
  const owner = users.find((user) => user.username === "kai")
    || users.find((user) => user.role === DEFAULT_OWNER_ROLE)
    || users[0];
  return owner ? owner.dataScope || owner.username : "kai";
}

function bearerTokensFromEnv(users) {
  const inline = process.env.JOB_SPRINT_BEARER_TOKENS_JSON || "";
  const tokenFile = process.env.JOB_SPRINT_BEARER_TOKENS_FILE || "";
  let parsed = null;
  if (inline) {
    parsed = parseJsonConfig(inline, "JOB_SPRINT_BEARER_TOKENS_JSON");
  } else if (tokenFile) {
    try {
      parsed = parseJsonConfig(fs.readFileSync(tokenFile, "utf8"), "JOB_SPRINT_BEARER_TOKENS_FILE");
    } catch (error) {
      return { tokens: [], error: `bearer_tokens_file_unreadable:${error.code || "unknown"}` };
    }
  }
  if (!parsed) return { tokens: [], error: null };
  if (parsed.error) return { tokens: [], error: parsed.error };
  const rows = Array.isArray(parsed) ? parsed : parsed.tokens;
  if (!Array.isArray(rows)) return { tokens: [], error: null };
  const knownUsers = usersByName(users);
  return {
    error: null,
    tokens: rows
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const tokenHash = String(row.tokenHash || row.sha256 || "").trim().toLowerCase();
        const token = row.token ? String(row.token) : "";
        return {
          label: String(row.label || "").slice(0, 80),
          tokenHash: tokenHash || (token ? sha256(token) : ""),
          username: String(row.username || "").trim(),
          expiresAt: row.expiresAt || null,
          permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : []
        };
      })
      .filter((token) => token.tokenHash && /^[a-f0-9]{64}$/i.test(token.tokenHash) && knownUsers.has(token.username))
  };
}

function getAuthConfig() {
  if (isAuthDisabled()) {
    const user = {
      username: "auth-disabled",
      displayName: "本地免登录",
      role: DEFAULT_OWNER_ROLE,
      dataScope: "kai",
      inviteBatch: "default",
      passwordHash: "",
      permissions: [],
      disabled: false
    };
    return {
      disabled: true,
      configured: true,
      users: [user],
      userMap: usersByName([user]),
      bearerTokens: [],
      sessionSecret: String("auth-disabled"),
      dataOwner: "kai"
    };
  }
  const sessionSecret = process.env.JOB_SPRINT_SESSION_SECRET || "";
  const sessionSecretReady = sessionSecret.length >= MIN_SESSION_SECRET_LENGTH;
  const userConfig = loadConfiguredUsers();
  const bearerConfig = bearerTokensFromEnv(userConfig.users);
  return {
    disabled: false,
    configured: Boolean(userConfig.users.length && sessionSecretReady && !userConfig.error && !bearerConfig.error),
    users: userConfig.users,
    userMap: usersByName(userConfig.users),
    bearerTokens: bearerConfig.tokens,
    sessionSecret,
    sessionSecretReady,
    configError: userConfig.error || bearerConfig.error || null,
    dataOwner: primaryDataScope(userConfig.users)
  };
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return raw.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function signSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function authenticatedState(config, userConfig, authMethod, tokenMeta = null) {
  const profile = publicUser(userConfig);
  const permissions = tokenMeta && tokenMeta.permissions && tokenMeta.permissions.length
    ? Array.from(new Set(profile.permissions.concat(tokenMeta.permissions)))
    : profile.permissions;
  const user = { ...profile, permissions, readOnly: !permissions.includes("*") && !permissions.includes("runtime:write") };
  return { authenticated: true, user: user.username, userProfile: user, config, authMethod };
}

function verifyBearerToken(req, config) {
  const raw = String(req.headers.authorization || "");
  const match = raw.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const presented = match[1].trim();
  if (!presented) {
    return { authenticated: false, user: null, config, reason: "bad_bearer_token" };
  }
  const presentedHash = sha256(presented);
  const now = Date.now();
  const tokenMeta = (config.bearerTokens || []).find((token) => {
    const notExpired = !token.expiresAt || Number.isNaN(Date.parse(token.expiresAt)) || Date.parse(token.expiresAt) > now;
    return notExpired && safeEqual(token.tokenHash, presentedHash);
  });
  if (!tokenMeta) {
    return { authenticated: false, user: null, config, reason: "bad_bearer_token" };
  }
  const userConfig = config.userMap.get(tokenMeta.username);
  if (!userConfig) {
    return { authenticated: false, user: null, config, reason: "bearer_user_not_found" };
  }
  return authenticatedState(config, userConfig, "bearer", tokenMeta);
}

function verifySession(req) {
  const config = getAuthConfig();
  if (config.disabled) {
    return authenticatedState(config, config.users[0], "disabled");
  }
  if (!config.configured) {
    return { authenticated: false, user: null, config, reason: config.configError || "auth_not_configured" };
  }
  const bearerState = verifyBearerToken(req, config);
  if (bearerState) {
    return bearerState;
  }
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token || !token.includes(".")) {
    return { authenticated: false, user: null, config, reason: "missing_session" };
  }
  const [body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) {
    return { authenticated: false, user: null, config, reason: "bad_session" };
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const userConfig = payload && payload.user ? config.userMap.get(payload.user) : null;
    if (!payload || !userConfig || Number(payload.exp) < Date.now()) {
      return { authenticated: false, user: null, config, reason: "expired_session" };
    }
    return authenticatedState(config, userConfig, "session");
  } catch (_) {
    return { authenticated: false, user: null, config, reason: "bad_session" };
  }
}

function hasPermission(authState, permission) {
  const permissions = authState && authState.userProfile && Array.isArray(authState.userProfile.permissions)
    ? authState.userProfile.permissions
    : [];
  return permissions.includes("*") || permissions.includes(permission);
}

function isSecureRequest(req) {
  if (String(process.env.JOB_SPRINT_COOKIE_SECURE || "").toLowerCase() === "true") {
    return true;
  }
  if (req.socket && req.socket.encrypted) {
    return true;
  }
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  return forwardedProto === "https";
}

function sessionCookie(value, options = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

module.exports = {
  SESSION_TTL_MS,
  getAuthConfig,
  hasPermission,
  isSecureRequest,
  publicUser,
  safeEqual,
  sessionCookie,
  sha256,
  signSession,
  verifySession
};

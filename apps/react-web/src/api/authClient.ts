import { appPath, canUseServerRuntime } from "./runtimeClient";

export type AuthSessionStatus = "local" | "checking" | "authenticated" | "anonymous" | "unconfigured" | "failed";

export interface AuthUser {
  username: string;
  displayName?: string;
  role?: string;
  dataScope?: string;
  inviteBatch?: string;
  permissions?: string[];
  readOnly?: boolean;
}

export interface AuthSessionState {
  status: AuthSessionStatus;
  user?: AuthUser | null;
  authConfigured?: boolean;
  authDisabled?: boolean;
  error?: string;
}

interface AuthSessionPayload {
  authenticated?: boolean;
  authConfigured?: boolean;
  authDisabled?: boolean;
  user?: AuthUser | null;
}

export async function fetchAuthSession(): Promise<AuthSessionState> {
  if (!canUseServerRuntime()) {
    return { status: "local", authConfigured: false, authDisabled: true };
  }
  try {
    const response = await fetch(appPath("/api/auth/session"), {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    const payload = await readAuthPayload(response);
    if (response.status === 503) {
      return { status: "unconfigured", authConfigured: false, authDisabled: payload.authDisabled };
    }
    if (response.status === 401 || response.status === 403) {
      return { status: "anonymous", authConfigured: payload.authConfigured, authDisabled: payload.authDisabled };
    }
    if (!response.ok) {
      return { status: "failed", error: `auth_session_failed:${response.status}` };
    }
    if (payload.authDisabled) {
      return { status: "local", authConfigured: false, authDisabled: true };
    }
    if (payload.authenticated && payload.user) {
      return { status: "authenticated", user: payload.user, authConfigured: payload.authConfigured, authDisabled: false };
    }
    return { status: "anonymous", authConfigured: payload.authConfigured, authDisabled: payload.authDisabled };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "auth_session_failed" };
  }
}

export async function logoutAuthSession(): Promise<void> {
  if (!canUseServerRuntime()) return;
  await fetch(appPath("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
}

export function initialAuthSession(): AuthSessionState {
  return canUseServerRuntime() ? { status: "checking" } : { status: "local", authConfigured: false, authDisabled: true };
}

export function buildLoginHref(hash = currentHash()): string {
  const next = `/react/index.html${hash}`;
  return appPath(`/login.html?next=${encodeURIComponent(appPath(next))}`);
}

export function authSessionTitle(session: AuthSessionState): string {
  if (session.status === "authenticated" && session.user) {
    return session.user.displayName || session.user.username || "已登录";
  }
  if (session.status === "checking") return "登录检测中";
  if (session.status === "anonymous") return "未登录";
  if (session.status === "unconfigured") return "认证未配置";
  if (session.status === "failed") return "无法确认账号";
  return "本地模式";
}

export function authSessionMeta(session: AuthSessionState): string {
  if (session.status === "authenticated" && session.user) {
    const role = roleLabel(session.user.role);
    const scope = dataScopeLabel(session.user.dataScope);
    const batch = session.user.inviteBatch ? ` · ${session.user.inviteBatch}` : "";
    const mode = session.user.readOnly ? "只读" : "可编辑";
    return `${role} · ${scope}${batch} · ${mode}`;
  }
  if (session.status === "checking") return "正在读取服务器会话";
  if (session.status === "anonymous") return "请登录后继续写入";
  if (session.status === "unconfigured") return "服务器缺少认证配置";
  if (session.status === "failed") return "保留本地可读状态";
  return "数据只在当前设备";
}

export function roleLabel(role?: string): string {
  if (role === "admin") return "管理员";
  if (role === "member") return "成员";
  if (role === "guest") return "访客";
  return role || "用户";
}

export function dataScopeLabel(scope?: string): string {
  if (scope === "private") return "个人数据";
  if (scope === "public-safe") return "脱敏数据";
  if (scope === "all") return "全部数据";
  return scope || "默认数据域";
}

async function readAuthPayload(response: Response): Promise<AuthSessionPayload> {
  try {
    return await response.json() as AuthSessionPayload;
  } catch (_) {
    return {};
  }
}

function currentHash(): string {
  if (typeof window === "undefined") return "#/today";
  return window.location.hash || "#/today";
}

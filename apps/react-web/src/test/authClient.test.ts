import {
  authSessionMeta,
  authSessionTitle,
  buildLoginHref,
  dataScopeLabel,
  fetchAuthSession,
  initialAuthSession,
  roleLabel
} from "../api/authClient";

describe("authClient", () => {
  it("summarizes authenticated users with role, data scope and edit mode", () => {
    const session = {
      status: "authenticated" as const,
      user: {
        username: "kai",
        displayName: "Kai",
        role: "member",
        dataScope: "private",
        inviteBatch: "2026-07-alpha",
        readOnly: false
      }
    };

    expect(authSessionTitle(session)).toBe("Kai");
    expect(authSessionMeta(session)).toBe("成员 · 个人数据 · 2026-07-alpha · 可编辑");
    expect(roleLabel("admin")).toBe("管理员");
    expect(roleLabel("guest")).toBe("访客");
    expect(dataScopeLabel("public-safe")).toBe("脱敏数据");
  });

  it("builds the login handoff for prefixed server deployments", () => {
    window.history.pushState({}, "", "/job-sprint/react/index.html#/coach");

    expect(buildLoginHref()).toBe("/job-sprint/login.html?next=%2Fjob-sprint%2Freact%2Findex.html%23%2Fcoach");
  });

  it("keeps tests and local files in local auth mode without hitting the network", async () => {
    expect(initialAuthSession()).toEqual({ status: "local", authConfigured: false, authDisabled: true });
    await expect(fetchAuthSession()).resolves.toEqual({ status: "local", authConfigured: false, authDisabled: true });
  });
});

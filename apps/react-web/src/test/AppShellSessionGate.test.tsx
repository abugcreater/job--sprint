import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSprintStore } from "../stores/sprintStore";

const auth = vi.hoisted(() => ({
  fetch: vi.fn()
}));

vi.mock("../api/authClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/authClient")>();
  return {
    ...actual,
    initialAuthSession: () => ({ status: "checking" as const }),
    fetchAuthSession: () => auth.fetch()
  };
});

import { AppShell } from "../app/AppShell";

describe("AppShell session gate", () => {
  beforeEach(() => {
    auth.fetch.mockReset();
    useSprintStore.setState({
      completed: { "old-account-task": true },
      storageOwner: { username: "candidate-a", dataScope: "candidate-a" }
    });
  });

  it("does not render a stale route while the session is unresolved, then clears it for an anonymous session", async () => {
    let resolveSession: (session: { status: "anonymous" }) => void = () => undefined;
    auth.fetch.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve;
    }));

    render(
      <MemoryRouter initialEntries={["/today"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/today" element={<p>旧账号求职记录</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "正在确认当前账号" })).toBeInTheDocument();
    expect(screen.queryByText("旧账号求职记录")).not.toBeInTheDocument();

    resolveSession({ status: "anonymous" });

    expect(await screen.findByRole("heading", { name: "登录后继续使用" })).toBeInTheDocument();
    expect(screen.queryByText("旧账号求职记录")).not.toBeInTheDocument();
    expect(useSprintStore.getState().storageOwner).toBeUndefined();
    expect(useSprintStore.getState().completed).toEqual({});
  });

  it("keeps unknown cached state hidden when the session check fails", async () => {
    auth.fetch.mockResolvedValue({ status: "failed", error: "network_unavailable" });

    render(
      <MemoryRouter initialEntries={["/today"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/today" element={<p>旧账号求职记录</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "暂时无法确认当前账号" })).toBeInTheDocument();
    expect(screen.queryByText("旧账号求职记录")).not.toBeInTheDocument();
    expect(useSprintStore.getState().storageOwner).toEqual({ username: "candidate-a", dataScope: "candidate-a" });
  });
});

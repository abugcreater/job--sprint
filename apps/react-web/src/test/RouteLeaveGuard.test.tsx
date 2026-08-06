import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, Link, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, vi } from "vitest";
import { RouteLeaveGuardProvider, useRouteLeaveGuard } from "../app/RouteLeaveGuard";

function GuardedHarness() {
  const [dirty, setDirty] = useState(false);
  const location = useLocation();
  useRouteLeaveGuard(dirty);

  return (
    <main>
      <label>
        <input type="checkbox" checked={dirty} onChange={(event) => setDirty(event.target.checked)} />
        有未保存修改
      </label>
      <Link to="/next">前往下一页</Link>
      <p>当前路径：{location.pathname}</p>
    </main>
  );
}

function renderHarness(initialEntries = ["/start"], initialIndex?: number) {
  const router = createMemoryRouter([
    {
      path: "*",
      element: (
        <RouteLeaveGuardProvider>
          <GuardedHarness />
        </RouteLeaveGuardProvider>
      )
    }
  ], { initialEntries, initialIndex });
  return { router, ...render(<RouterProvider router={router} future={{ v7_startTransition: true }} />) };
}

afterEach(() => {
  delete window.AndroidBackNavigation;
});

describe("RouteLeaveGuard", () => {
  it("keeps a dirty draft on in-app navigation until the user explicitly discards it", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("checkbox", { name: "有未保存修改" }));
    fireEvent.click(screen.getByRole("link", { name: "前往下一页" }));

    expect(screen.getByRole("alertdialog", { name: "离开当前页面？" })).toBeInTheDocument();
    expect(screen.getByText("当前路径：/start")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.queryByRole("alertdialog", { name: "离开当前页面？" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "有未保存修改" })).toBeChecked();
    expect(screen.getByText("当前路径：/start")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "前往下一页" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改并离开" }));
    expect(screen.getByText("当前路径：/next")).toBeInTheDocument();
  });

  it("uses the browser leave prompt only when a registered draft is dirty", () => {
    renderHarness();
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: "有未保存修改" }));
    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });

  it("keeps a dirty draft on browser history return until the user explicitly discards it", async () => {
    const { router } = renderHarness(["/start", "/next"], 1);

    fireEvent.click(screen.getByRole("checkbox", { name: "有未保存修改" }));
    await act(async () => {
      await router.navigate(-1);
    });

    expect(screen.getByRole("alertdialog", { name: "离开当前页面？" })).toBeInTheDocument();
    expect(screen.getByText("当前路径：/next")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.getByRole("checkbox", { name: "有未保存修改" })).toBeChecked();
    expect(screen.getByText("当前路径：/next")).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "放弃修改并离开" }));
    });

    await waitFor(() => expect(screen.getByText("当前路径：/start")).toBeInTheDocument());
  });

  it("asks before Android system back and only calls the native bridge after discard", () => {
    const completeBackNavigation = vi.fn();
    Object.defineProperty(window, "AndroidBackNavigation", {
      configurable: true,
      value: { completeBackNavigation }
    });
    renderHarness();

    fireEvent.click(screen.getByRole("checkbox", { name: "有未保存修改" }));
    const dirtyBackEvent = new Event("jobsprint:android-back-pressed", { cancelable: true });
    act(() => {
      window.dispatchEvent(dirtyBackEvent);
    });

    expect(dirtyBackEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole("alertdialog", { name: "离开当前页面？" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
    expect(screen.getByRole("checkbox", { name: "有未保存修改" })).toBeChecked();
    expect(completeBackNavigation).not.toHaveBeenCalled();

    const secondDirtyBackEvent = new Event("jobsprint:android-back-pressed", { cancelable: true });
    act(() => {
      window.dispatchEvent(secondDirtyBackEvent);
    });
    fireEvent.click(screen.getByRole("button", { name: "放弃修改并离开" }));
    expect(completeBackNavigation).toHaveBeenCalledTimes(1);
  });

  it("does not block Android system back when the current page is clean", () => {
    renderHarness();

    const cleanBackEvent = new Event("jobsprint:android-back-pressed", { cancelable: true });
    window.dispatchEvent(cleanBackEvent);

    expect(cleanBackEvent.defaultPrevented).toBe(false);
    expect(screen.queryByRole("alertdialog", { name: "离开当前页面？" })).not.toBeInTheDocument();
  });
});

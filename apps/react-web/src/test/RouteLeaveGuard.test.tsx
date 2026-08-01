import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { HashRouter, Link, useLocation } from "react-router-dom";
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

function renderHarness() {
  window.location.hash = "#/start";
  return render(
    <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <RouteLeaveGuardProvider>
        <GuardedHarness />
      </RouteLeaveGuardProvider>
    </HashRouter>
  );
}

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
});

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthSessionContext } from "../app/authSessionContext";
import { AdminPage } from "../features/admin/AdminPage";

const ownerSession = {
  status: "authenticated" as const,
  user: {
    username: "kai",
    displayName: "Kai",
    role: "owner",
    dataScope: "all",
    permissions: ["*"]
  },
  authConfigured: true,
  authDisabled: false
};

describe("AdminPage", () => {
  it("separates onboarding insights from account management for owners", async () => {
    render(
      <AuthSessionContext.Provider value={ownerSession}>
        <MemoryRouter initialEntries={["/admin"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AdminPage />
        </MemoryRouter>
      </AuthSessionContext.Provider>
    );

    expect(await screen.findByRole("heading", { name: "管理员中心" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /建档看板/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /账号管理/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel", { name: /建档看板/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "管理员建档批次看板" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邀请账号管理" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /账号管理/ }));

    expect(screen.getByRole("tab", { name: /建档看板/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /账号管理/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /账号管理/ })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "邀请账号管理" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "管理员建档批次看板" })).not.toBeInTheDocument();
  });
});

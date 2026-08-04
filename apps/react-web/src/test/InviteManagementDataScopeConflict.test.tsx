import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { CoachInvitationResponse } from "../api/coachInvitationClient";
import { InviteManagementPanel } from "../features/coach/components/InviteManagementPanel";

const fetchCoachInvitations = vi.hoisted(() => vi.fn());
const saveCoachInvitation = vi.hoisted(() => vi.fn());

vi.mock("../api/coachInvitationClient", async () => ({
  ...(await vi.importActual<typeof import("../api/coachInvitationClient")>("../api/coachInvitationClient")),
  fetchCoachInvitations,
  saveCoachInvitation
}));

describe("InviteManagementPanel data scope conflict", () => {
  it("blocks account provisioning before it sends a duplicated data scope", async () => {
    const response: CoachInvitationResponse = {
      ok: true, storage: "sqlite", invitations: [],
      configuredUsers: [{ username: "mia", displayName: "Mia", dataScope: "mia", inviteBatch: "2026-07-beta", role: "coach" }],
      summary: { totalInvitations: 0, batchCount: 1, draftCount: 0, invitedCount: 0, activeCount: 0, pausedCount: 0, nextActionLabel: "检查账号。" }
    };
    fetchCoachInvitations.mockResolvedValue(response);
    render(<InviteManagementPanel />);

    await screen.findByText("Mia");
    fireEvent.change(screen.getByLabelText("登录名"), { target: { value: "mia-shadow" } });
    fireEvent.change(screen.getByLabelText("数据域（每个账号必须独立）"), { target: { value: "mia" } });
    fireEvent.click(screen.getByLabelText("开通或重置登录账号"));
    fireEvent.change(screen.getByLabelText("登录密码"), { target: { value: "Shadow-pass-2026!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存邀请记录" }));

    expect(screen.getByText("数据域「mia」已由登录账号「mia」使用；请为每个邀请账号使用独立数据域。")).toBeInTheDocument();
    expect(saveCoachInvitation).not.toHaveBeenCalled();
  });
});

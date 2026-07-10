import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { CoachInvitationResponse } from "../api/coachInvitationClient";
import { InviteManagementPanel } from "../features/coach/components/InviteManagementPanel";

const mockFetchCoachInvitations = vi.hoisted(() => vi.fn());
const mockUpdateCoachInvitationBatchAccountStatus = vi.hoisted(() => vi.fn());

vi.mock("../api/coachInvitationClient", async () => {
  const actual = await vi.importActual<typeof import("../api/coachInvitationClient")>("../api/coachInvitationClient");
  return {
    ...actual,
    fetchCoachInvitations: mockFetchCoachInvitations,
    updateCoachInvitationBatchAccountStatus: mockUpdateCoachInvitationBatchAccountStatus
  };
});

function batchAccountResponse(overrides: Partial<CoachInvitationResponse> = {}): CoachInvitationResponse {
  return {
    ok: true,
    storage: "sqlite",
    invitations: [
      {
        id: "invite-batch-1",
        username: "batch-user-1",
        displayName: "Batch User 1",
        dataScope: "batch-user-1",
        inviteBatch: "2026-07-beta",
        templateVersion: "role-family-v1",
        roleFamily: "qa",
        targetRole: "测试开发工程师",
        status: "active",
        note: "批量账号动作验证",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z"
      }
    ],
    configuredUsers: [
      {
        username: "batch-user-1",
        displayName: "Batch User 1",
        dataScope: "batch-user-1",
        inviteBatch: "2026-07-beta",
        role: "coach"
      },
      {
        username: "batch-user-2",
        displayName: "Batch User 2",
        dataScope: "batch-user-2",
        inviteBatch: "2026-07-beta",
        role: "coach"
      }
    ],
    summary: {
      totalInvitations: 1,
      batchCount: 1,
      templateVersionCount: 1,
      draftCount: 0,
      invitedCount: 0,
      activeCount: 1,
      pausedCount: 0,
      nextActionLabel: "检查批量账号动作。"
    },
    ...overrides
  };
}

describe("InviteManagementPanel batch account actions", () => {
  beforeEach(() => {
    mockFetchCoachInvitations.mockReset();
    mockUpdateCoachInvitationBatchAccountStatus.mockReset();
  });

  it("requires confirmation before running destructive batch account actions", async () => {
    mockFetchCoachInvitations.mockResolvedValue(batchAccountResponse());
    mockUpdateCoachInvitationBatchAccountStatus.mockResolvedValue(batchAccountResponse({
      accountBatchAction: {
        status: "PASS",
        action: "disable",
        requestedCount: 2,
        affectedCount: 2,
        skippedCount: 0,
        message: "已批量禁用 2 个登录账号"
      }
    }));

    render(<InviteManagementPanel />);

    fireEvent.change(await screen.findByLabelText("批次筛选"), { target: { value: "2026-07-beta" } });
    fireEvent.change(screen.getByLabelText("批量账号动作"), { target: { value: "delete" } });
    fireEvent.click(screen.getByRole("button", { name: "批量更新账号状态" }));

    expect(screen.getByText("确认批量删除 2026-07-beta 批次的 2 个登录账号？删除后这些用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。")).toBeInTheDocument();
    expect(mockUpdateCoachInvitationBatchAccountStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "取消批量账号动作 2026-07-beta" }));

    expect(screen.queryByText("确认批量删除 2026-07-beta 批次的 2 个登录账号？删除后这些用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。")).not.toBeInTheDocument();
    expect(mockUpdateCoachInvitationBatchAccountStatus).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("批量账号动作"), { target: { value: "disable" } });
    fireEvent.click(screen.getByRole("button", { name: "批量更新账号状态" }));

    expect(screen.getByText("确认批量禁用 2026-07-beta 批次的 2 个登录账号？禁用后这些用户无法登录；数据域、邀请记录和历史求职数据会保留，owner 可稍后恢复。")).toBeInTheDocument();
    expect(mockUpdateCoachInvitationBatchAccountStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认批量禁用 2026-07-beta 2 个账号" }));

    await waitFor(() => expect(mockUpdateCoachInvitationBatchAccountStatus).toHaveBeenCalledWith(["batch-user-1", "batch-user-2"], "disable"));
    expect(await screen.findByText("已批量禁用 2 个登录账号")).toBeInTheDocument();
  });
});

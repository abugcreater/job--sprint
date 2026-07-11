import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { CoachInvitationResponse } from "../api/coachInvitationClient";
import { InviteManagementPanel } from "../features/coach/components/InviteManagementPanel";
import { buildBatchActionHint } from "../features/coach/components/inviteManagementBatchActions";

const mockFetchCoachInvitations = vi.hoisted(() => vi.fn());
const mockDeleteCoachInvitation = vi.hoisted(() => vi.fn());
const mockUpdateCoachInvitationAccountStatus = vi.hoisted(() => vi.fn());

vi.mock("../api/coachInvitationClient", async () => {
  const actual = await vi.importActual<typeof import("../api/coachInvitationClient")>("../api/coachInvitationClient");
  return {
    ...actual,
    fetchCoachInvitations: mockFetchCoachInvitations,
    deleteCoachInvitation: mockDeleteCoachInvitation,
    updateCoachInvitationAccountStatus: mockUpdateCoachInvitationAccountStatus
  };
});

function invitationResponse(overrides: Partial<CoachInvitationResponse> = {}): CoachInvitationResponse {
  return {
    ok: true,
    storage: "sqlite",
    invitations: [
      {
        id: "invite-beta",
        username: "beta-user",
        displayName: "Beta User",
        dataScope: "beta-user",
        inviteBatch: "2026-07-beta",
        templateVersion: "role-family-v1",
        roleFamily: "qa",
        targetRole: "测试开发工程师",
        status: "invited",
        note: "首批试用",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z"
      }
    ],
    configuredUsers: [],
    summary: {
      totalInvitations: 1,
      batchCount: 1,
      templateVersionCount: 1,
      draftCount: 0,
      invitedCount: 1,
      activeCount: 0,
      pausedCount: 0,
      nextActionLabel: "继续邀请首批试用用户。"
    },
    ...overrides
  };
}

function invitationLedgerResponse(): CoachInvitationResponse {
  const configuredUsers = Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    return {
      username: `ledger-user-${number}`,
      displayName: `Ledger User ${number}`,
      dataScope: `ledger-user-${number}`,
      inviteBatch: "2026-07-beta",
      role: "coach"
    };
  });
  const invitations = Array.from({ length: 9 }, (_, index) => {
    const number = index + 1;
    return {
      id: `invite-ledger-${number}`,
      username: `candidate-${number}`,
      displayName: `Candidate ${number}`,
      dataScope: `candidate-${number}`,
      inviteBatch: "2026-07-beta",
      templateVersion: "role-family-v1",
      roleFamily: "qa",
      targetRole: "测试开发工程师",
      status: "invited" as const,
      note: "长列表验证",
      createdAt: "2026-07-08T10:00:00.000Z",
      updatedAt: "2026-07-08T10:00:00.000Z"
    };
  });
  return invitationResponse({
    configuredUsers,
    invitations,
    summary: {
      totalInvitations: invitations.length,
      batchCount: 1,
      templateVersionCount: 1,
      draftCount: 0,
      invitedCount: invitations.length,
      activeCount: 0,
      pausedCount: 0,
      nextActionLabel: "继续邀请首批试用用户。"
    }
  });
}

function accountResponse(
  configuredUsers: CoachInvitationResponse["configuredUsers"],
  overrides: Partial<CoachInvitationResponse> = {}
): CoachInvitationResponse {
  return invitationResponse({
    invitations: [],
    configuredUsers,
    summary: {
      totalInvitations: 0,
      batchCount: 1,
      templateVersionCount: 1,
      draftCount: 0,
      invitedCount: 0,
      activeCount: 0,
      pausedCount: 0,
      nextActionLabel: "检查登录账号生命周期。"
    },
    ...overrides
  });
}

describe("InviteManagementPanel", () => {
  beforeEach(() => {
    mockFetchCoachInvitations.mockReset();
    mockDeleteCoachInvitation.mockReset();
    mockUpdateCoachInvitationAccountStatus.mockReset();
  });

  it("explains why bulk invitation controls are disabled", async () => {
    mockFetchCoachInvitations.mockResolvedValue(invitationResponse());

    render(<InviteManagementPanel />);

    expect(await screen.findByText("批量操作未就绪：请先选择一个具体批次，避免误操作全部试用用户。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量更新批次状态" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "批量更新账号状态" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "生成邀请通知" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "批量更新账号状态" })).toHaveAttribute("aria-describedby", "invite-batch-action-hint");

    fireEvent.change(screen.getByLabelText("批次筛选"), { target: { value: "2026-07-beta" } });

    expect(await screen.findByText("当前批次没有可操作的登录账号：可先导入或开通账号；批次邀请状态仍可更新。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量更新批次状态" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "批量更新账号状态" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "生成邀请通知" })).toBeDisabled();
  });

  it("summarizes the ready state for a concrete batch with login accounts", () => {
    expect(buildBatchActionHint({ selectedBatch: "2026-07-beta", filteredUserCount: 2, saving: false }))
      .toBe("批量操作就绪：将处理 2026-07-beta 批次的 2 个登录账号。");
    expect(buildBatchActionHint({ selectedBatch: "2026-07-beta", filteredUserCount: 2, saving: true }))
      .toBe("批量操作处理中：请等待当前保存完成。");
  });

  it("lets users expand long account and invitation ledgers", async () => {
    mockFetchCoachInvitations.mockResolvedValue(invitationLedgerResponse());

    render(<InviteManagementPanel />);

    expect(await screen.findByText("Ledger User 1")).toBeInTheDocument();
    expect(screen.queryByText("Ledger User 7")).not.toBeInTheDocument();
    expect(screen.getByText("还有 1 个登录账号未显示。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看全部登录账号" }));

    expect(screen.getByText("Ledger User 7")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 7 个登录账号。")).toBeInTheDocument();

    expect(screen.getByText("Candidate 8")).toBeInTheDocument();
    expect(screen.queryByText("Candidate 9")).not.toBeInTheDocument();
    expect(screen.getByText("还有 1 条邀请记录未显示。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看全部邀请记录" }));

    expect(screen.getByText("Candidate 9")).toBeInTheDocument();
    expect(screen.getByText("已显示全部 9 条邀请记录。")).toBeInTheDocument();
  });

  it("filters account and invitation ledgers by search before expanding long lists", async () => {
    mockFetchCoachInvitations.mockResolvedValue(invitationLedgerResponse());

    render(<InviteManagementPanel />);

    expect(await screen.findByText("Ledger User 1")).toBeInTheDocument();
    expect(screen.queryByText("Ledger User 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Candidate 9")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("账号搜索"), { target: { value: "candidate-9" } });

    expect(screen.getByText("Candidate 9")).toBeInTheDocument();
    expect(screen.queryByText("Ledger User 1")).not.toBeInTheDocument();
    expect(screen.getByText("1 条邀请 · 0 个账号")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("账号搜索"), { target: { value: "ledger-user-7" } });

    expect(screen.getByText("Ledger User 7")).toBeInTheDocument();
    expect(screen.queryByText("Candidate 9")).not.toBeInTheDocument();
    expect(screen.getByText("0 条邀请 · 1 个账号")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "清空搜索" }));

    expect(screen.getByText("Ledger User 1")).toBeInTheDocument();
    expect(screen.queryByText("Ledger User 7")).not.toBeInTheDocument();
    expect(screen.getByText("9 条邀请 · 7 个账号")).toBeInTheDocument();
  });

  it("requires confirmation before deleting invitation records", async () => {
    mockFetchCoachInvitations.mockResolvedValue(invitationResponse());
    mockDeleteCoachInvitation.mockResolvedValue(invitationResponse({
      invitations: [],
      summary: {
        totalInvitations: 0,
        batchCount: 0,
        templateVersionCount: 0,
        draftCount: 0,
        invitedCount: 0,
        activeCount: 0,
        pausedCount: 0,
        nextActionLabel: "暂无邀请记录。"
      },
      deletion: {
        status: "PASS",
        username: "beta-user",
        removedCount: 1,
        message: "已删除 Beta User 邀请记录"
      }
    }));

    render(<InviteManagementPanel />);

    expect(await screen.findByText("Beta User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除邀请记录：Beta User" }));

    expect(screen.getByText("确认删除「Beta User」邀请记录？删除后管理员看板不再展示这条试用用户登记；已开通的登录账号不会自动删除。")).toBeInTheDocument();
    expect(mockDeleteCoachInvitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "取消删除邀请记录 Beta User" }));

    expect(screen.queryByText("确认删除「Beta User」邀请记录？删除后管理员看板不再展示这条试用用户登记；已开通的登录账号不会自动删除。")).not.toBeInTheDocument();
    expect(mockDeleteCoachInvitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "删除邀请记录：Beta User" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除邀请记录 Beta User" }));

    await waitFor(() => expect(mockDeleteCoachInvitation).toHaveBeenCalledWith("beta-user"));
    expect(await screen.findByText("已删除 Beta User 邀请记录")).toBeInTheDocument();
  });

  it("requires confirmation before changing login account status", async () => {
    const activeUser = {
      username: "active-user",
      displayName: "Active User",
      dataScope: "active-user",
      inviteBatch: "2026-07-beta",
      role: "coach"
    };
    const disabledUser = {
      username: "disabled-user",
      displayName: "Disabled User",
      dataScope: "disabled-user",
      inviteBatch: "2026-07-beta",
      role: "coach",
      disabled: true
    };
    mockFetchCoachInvitations.mockResolvedValue(accountResponse([activeUser, disabledUser]));
    mockUpdateCoachInvitationAccountStatus
      .mockResolvedValueOnce(accountResponse([{ ...activeUser, disabled: true }, disabledUser], {
        accountAction: {
          status: "PASS",
          username: "active-user",
          action: "disable",
          disabled: true,
          message: "已禁用 Active User 登录账号"
        }
      }))
      .mockResolvedValueOnce(accountResponse([{ ...activeUser, disabled: true }, { ...disabledUser, disabled: false }], {
        accountAction: {
          status: "PASS",
          username: "disabled-user",
          action: "enable",
          disabled: false,
          message: "已恢复 Disabled User 登录账号"
        }
      }))
      .mockResolvedValueOnce(accountResponse([{ ...activeUser, disabled: true }], {
        accountAction: {
          status: "PASS",
          username: "disabled-user",
          action: "delete",
          removedCount: 1,
          message: "已删除 Disabled User 登录账号"
        }
      }));

    render(<InviteManagementPanel />);

    const activeRowButton = await screen.findByRole("button", { name: /Active User/ });
    const activeRow = activeRowButton.closest("div") as HTMLElement;

    fireEvent.click(within(activeRow).getByRole("button", { name: "禁用账号" }));

    expect(screen.getByText("确认禁用「Active User」登录账号？禁用后该用户无法登录；数据域和历史数据会保留，owner 可稍后恢复。")).toBeInTheDocument();
    expect(mockUpdateCoachInvitationAccountStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "取消账号动作 Active User" }));

    expect(screen.queryByText("确认禁用「Active User」登录账号？禁用后该用户无法登录；数据域和历史数据会保留，owner 可稍后恢复。")).not.toBeInTheDocument();
    expect(mockUpdateCoachInvitationAccountStatus).not.toHaveBeenCalled();

    fireEvent.click(within(activeRow).getByRole("button", { name: "禁用账号" }));
    fireEvent.click(screen.getByRole("button", { name: "确认禁用账号 Active User" }));

    await waitFor(() => expect(mockUpdateCoachInvitationAccountStatus).toHaveBeenCalledWith("active-user", "disable"));
    expect(await screen.findByText("已禁用 Active User 登录账号")).toBeInTheDocument();

    const disabledRow = screen.getByRole("button", { name: /Disabled User/ }).closest("div") as HTMLElement;
    fireEvent.click(within(disabledRow).getByRole("button", { name: "恢复账号" }));

    expect(screen.getByText("确认恢复「Disabled User」登录账号？恢复后该用户可以再次登录，并继续使用自己的数据域。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认恢复账号 Disabled User" }));

    await waitFor(() => expect(mockUpdateCoachInvitationAccountStatus).toHaveBeenCalledWith("disabled-user", "enable"));
    expect(await screen.findByText("已恢复 Disabled User 登录账号")).toBeInTheDocument();

    const restoredRow = screen.getByRole("button", { name: /Disabled User/ }).closest("div") as HTMLElement;
    fireEvent.click(within(restoredRow).getByRole("button", { name: "删除登录账号" }));

    expect(screen.getByText("确认删除「Disabled User」登录账号？删除后该用户无法登录；数据域、邀请记录和历史求职数据不会自动删除。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认删除登录账号 Disabled User" }));

    await waitFor(() => expect(mockUpdateCoachInvitationAccountStatus).toHaveBeenCalledWith("disabled-user", "delete"));
    expect(await screen.findByText("已删除 Disabled User 登录账号")).toBeInTheDocument();
  });
});

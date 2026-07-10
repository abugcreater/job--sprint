import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { CoachInvitationResponse } from "../api/coachInvitationClient";
import type { CoachOnboardingReportResponse } from "../api/coachOnboardingReportClient";
import { InviteManagementPanel } from "../features/coach/components/InviteManagementPanel";

const mockFetchCoachInvitations = vi.hoisted(() => vi.fn());
const mockUpdateCoachInvitationAccountStatus = vi.hoisted(() => vi.fn());

vi.mock("../api/coachInvitationClient", async () => {
  const actual = await vi.importActual<typeof import("../api/coachInvitationClient")>("../api/coachInvitationClient");
  return {
    ...actual,
    fetchCoachInvitations: mockFetchCoachInvitations,
    updateCoachInvitationAccountStatus: mockUpdateCoachInvitationAccountStatus
  };
});

function inviteManagementResponse(): CoachInvitationResponse {
  return {
    ok: true,
    storage: "sqlite",
    configuredUsers: [
      {
        username: "ledger-user-1",
        displayName: "Ledger User 1",
        dataScope: "ledger-user-1",
        inviteBatch: "2026-07-beta",
        role: "coach"
      }
    ],
    accountAuditEvents: [
      {
        id: "account-audit-other-user-disable",
        createdAt: "2026-07-08T12:04:00.000Z",
        actorUsername: "owner",
        action: "disable",
        username: "other-user",
        role: "",
        dataScope: "other-user",
        inviteBatch: "2026-07-beta",
        affectedUsernames: ["other-user"],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "已禁用 other-user。"
      },
      {
        id: "account-audit-ledger-user-1-delete",
        createdAt: "2026-07-08T12:03:00.000Z",
        actorUsername: "kai",
        action: "batch_delete",
        username: "",
        role: "",
        dataScope: "",
        inviteBatch: "2026-07-beta",
        affectedUsernames: ["ledger-user-1"],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "已删除 1 个登录账号。"
      },
      {
        id: "account-audit-ledger-user-1-enable",
        createdAt: "2026-07-08T12:02:30.000Z",
        actorUsername: "kai",
        action: "batch_enable",
        username: "",
        role: "",
        dataScope: "",
        inviteBatch: "2026-07-beta",
        affectedUsernames: ["ledger-user-1"],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "已恢复 1 个登录账号。"
      },
      {
        id: "account-audit-ledger-user-1-reset",
        createdAt: "2026-07-08T12:02:00.000Z",
        actorUsername: "kai",
        action: "password_reset",
        username: "ledger-user-1",
        role: "coach",
        dataScope: "ledger-user-1",
        inviteBatch: "2026-07-beta",
        affectedUsernames: [],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "登录密码已重置。"
      },
      {
        id: "account-audit-ledger-user-1-created",
        createdAt: "2026-07-08T12:01:00.000Z",
        actorUsername: "kai",
        action: "created",
        username: "ledger-user-1",
        role: "coach",
        dataScope: "ledger-user-1",
        inviteBatch: "2026-07-beta",
        affectedUsernames: [],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "登录账号已开通。"
      },
      {
        id: "account-audit-ledger-user-1",
        createdAt: "2026-07-08T12:00:00.000Z",
        actorUsername: "kai",
        action: "batch_disable",
        username: "",
        role: "",
        dataScope: "",
        inviteBatch: "2026-07-beta",
        affectedUsernames: ["ledger-user-1"],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "已禁用 1 个登录账号。"
      },
      {
        id: "account-audit-ledger-user-1-single-disable",
        createdAt: "2026-07-08T11:59:00.000Z",
        actorUsername: "kai",
        action: "disable",
        username: "ledger-user-1",
        role: "coach",
        dataScope: "ledger-user-1",
        inviteBatch: "2026-07-beta",
        affectedUsernames: [],
        affectedCount: 1,
        requestedCount: 1,
        skippedCount: 0,
        skippedUsers: [],
        message: "单账号禁用记录。"
      }
    ],
    invitations: [
      {
        id: "invite-ledger-1",
        username: "candidate-1",
        displayName: "Candidate 1",
        dataScope: "candidate-1",
        inviteBatch: "2026-07-beta",
        templateVersion: "role-family-v1",
        roleFamily: "qa",
        targetRole: "测试开发工程师",
        status: "invited",
        note: "长列表验证",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T11:30:00.000Z"
      }
    ],
    summary: {
      totalInvitations: 1,
      batchCount: 1,
      templateVersionCount: 1,
      draftCount: 0,
      invitedCount: 1,
      activeCount: 0,
      pausedCount: 0,
      nextActionLabel: "继续邀请首批试用用户。"
    }
  };
}

function onboardingReport(): CoachOnboardingReportResponse {
  return {
    ok: true,
    storage: "sqlite",
    summary: {
      totalUsers: 1,
      startedCount: 1,
      completedCount: 0,
      completionRate: 40,
      completionRateLabel: "40%",
      topDropOffs: [{ label: "首登画像模板", count: 1 }],
      highestRiskLabel: "高风险"
    },
    batches: [
      {
        inviteBatch: "2026-07-beta",
        totalUsers: 1,
        startedCount: 1,
        completedCount: 0,
        completionRate: 40,
        completionRateLabel: "40%",
        topDropOffs: [{ label: "首登画像模板", count: 1 }],
        topDropOffLabel: "首登画像模板",
        highestRiskLabel: "高风险"
      }
    ],
    users: [
      {
        username: "ledger-user-1",
        displayName: "Ledger User 1",
        dataScope: "ledger-user-1",
        inviteBatch: "2026-07-beta",
        latestEvent: {
          id: "onboarding-event-1",
          stepId: "profile_template",
          stepLabel: "首登画像模板",
          progressLabel: "2/5",
          completionRate: 40,
          completionRateLabel: "40%",
          dropOffLabel: "首登画像模板",
          riskLabel: "高风险",
          nextActionLabel: "继续建档",
          source: "manual",
          createdAt: "2026-07-08T11:45:00.000Z"
        },
        summary: {
          eventCount: 1,
          latestCompletionRate: 40,
          latestCompletionRateLabel: "40%",
          latestDropOffLabel: "首登画像模板",
          latestRiskLabel: "高风险",
          highestRiskLabel: "高风险",
          nextActionLabel: "继续建档",
          firstLoginStatus: "首登进行中"
        }
      }
    ]
  };
}

describe("InviteManagementDetailPanel", () => {
  beforeEach(() => {
    mockFetchCoachInvitations.mockReset();
    mockUpdateCoachInvitationAccountStatus.mockReset();
  });

  it("shows account and invitation details when picking ledger rows", async () => {
    mockFetchCoachInvitations.mockResolvedValue(inviteManagementResponse());
    mockUpdateCoachInvitationAccountStatus.mockResolvedValue(inviteManagementResponse());

    render(<InviteManagementPanel onboardingReport={onboardingReport()} />);

    expect(screen.queryByRole("dialog", { name: "账号详情抽屉" })).not.toBeInTheDocument(); expect(await screen.findByText("点选账号或邀请记录会从右侧打开详情抽屉；当前筛选、搜索和批量动作状态会保留。")).toBeInTheDocument();

    const userButton = (await screen.findByText("Ledger User 1")).closest("button") as HTMLElement;
    fireEvent.click(userButton);

    const detailPanel = await screen.findByRole("dialog", { name: "账号详情抽屉" });
    expect(within(detailPanel).getByRole("heading", { name: "Ledger User 1" })).toBeInTheDocument();
    expect(within(userButton).getByText("详情已打开")).toBeInTheDocument();
    expect(within(detailPanel).getAllByText("ledger-user-1").length).toBeGreaterThan(0);
    expect(within(detailPanel).getByText("2026-07-beta")).toBeInTheDocument();
    expect(within(detailPanel).getAllByText("可登录").length).toBeGreaterThan(0);
    expect(within(detailPanel).getByText("首登进行中")).toBeInTheDocument();
    expect(within(detailPanel).getByText("40%")).toBeInTheDocument();
    expect(within(detailPanel).getByText("高风险")).toBeInTheDocument();
    expect(within(detailPanel).getByText("首登画像模板")).toBeInTheDocument();
    expect(within(detailPanel).getByText("继续建档")).toBeInTheDocument();
    expect(within(detailPanel).getByText("最近动态")).toBeInTheDocument();
    expect(within(detailPanel).getByText("优先展示服务端账号审计、再补充首登和台账状态。")).toBeInTheDocument();
    expect(within(detailPanel).getByText("审计筛选")).toBeInTheDocument();
    expect(within(detailPanel).getByText("6/6 条匹配")).toBeInTheDocument();
    expect(within(detailPanel).getByText("最近首登观察")).toBeInTheDocument();
    expect(within(detailPanel).getByText("首登画像模板 · 2/5 · 高风险")).toBeInTheDocument();
    expect(within(detailPanel).getByText("批量删除账号")).toBeInTheDocument();
    expect(within(detailPanel).getByText("登录账号已开通")).toBeInTheDocument();
    expect(within(detailPanel).getByText("批量禁用账号")).toBeInTheDocument();
    expect(within(detailPanel).getByText("已禁用 1 个登录账号。；操作人：kai")).toBeInTheDocument();
    expect(within(detailPanel).queryByText("已禁用 other-user。；操作人：owner")).not.toBeInTheDocument();
    expect(within(detailPanel).getByText("登录账号当前可用")).toBeInTheDocument();
    expect(within(detailPanel).getByText("归属邀请批次")).toBeInTheDocument();
    expect(within(detailPanel).queryByText("单账号禁用记录。；操作人：kai")).not.toBeInTheDocument();

    fireEvent.click(within(detailPanel).getByRole("button", { name: "查看全部审计（6）" }));

    expect(within(detailPanel).getByText("单账号禁用记录。；操作人：kai")).toBeInTheDocument();

    fireEvent.change(within(detailPanel).getByLabelText("账号审计搜索"), { target: { value: "重置" } });

    expect(within(detailPanel).getByText("1/6 条匹配")).toBeInTheDocument();
    expect(within(detailPanel).getByText("登录密码已重置")).toBeInTheDocument();
    expect(within(detailPanel).queryByText("批量删除账号")).not.toBeInTheDocument();

    fireEvent.change(within(detailPanel).getByLabelText("账号审计搜索"), { target: { value: "" } });
    fireEvent.change(within(detailPanel).getByLabelText("账号审计类型筛选"), { target: { value: "deletion" } });

    expect(within(detailPanel).getByText("1/6 条匹配")).toBeInTheDocument();
    expect(within(detailPanel).getByText("批量删除账号")).toBeInTheDocument();
    expect(within(detailPanel).queryByText("批量禁用账号")).not.toBeInTheDocument();
    expect(within(detailPanel).queryByText("登录账号已开通")).not.toBeInTheDocument();
    expect(within(detailPanel).getByText("删除类审计只能证明账号曾被移除；恢复需要重新开通或重置密码，历史数据域不会自动删除。")).toBeInTheDocument();
    expect(within(detailPanel).getByText("账号下一步")).toBeInTheDocument();

    const provisionCheckbox = screen.getByLabelText("开通或重置登录账号") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("登录密码") as HTMLInputElement;

    expect(provisionCheckbox.checked).toBe(false);

    fireEvent.change(passwordInput, { target: { value: "stale-password" } });
    fireEvent.click(within(detailPanel).getByRole("button", { name: "开通/重置密码" }));

    expect(provisionCheckbox.checked).toBe(true);
    expect(passwordInput.value).toBe("");
    expect(screen.getByText("已将「Ledger User 1」切到开通/重置模式；请在左侧输入新密码后保存，系统不会显示旧密码。")).toBeInTheDocument();
    expect(mockUpdateCoachInvitationAccountStatus).not.toHaveBeenCalled();

    fireEvent.click(within(detailPanel).getByRole("button", { name: "禁用账号" }));

    expect(mockUpdateCoachInvitationAccountStatus).not.toHaveBeenCalled();
    expect(within(detailPanel).getByText("确认禁用「Ledger User 1」登录账号？禁用后该用户无法登录；数据域和历史数据会保留，owner 可稍后恢复。")).toBeInTheDocument();

    fireEvent.click(within(detailPanel).getByRole("button", { name: "确认禁用账号 Ledger User 1" }));

    await waitFor(() => {
      expect(mockUpdateCoachInvitationAccountStatus).toHaveBeenCalledWith("ledger-user-1", "disable");
    });

    const invitationButton = screen.getByText("Candidate 1").closest("button") as HTMLElement;
    fireEvent.click(invitationButton);

    expect(within(detailPanel).getByRole("heading", { name: "Candidate 1" })).toBeInTheDocument();
    expect(within(detailPanel).getByText("邀请记录")).toBeInTheDocument();
    expect(within(detailPanel).getByText("测试开发工程师")).toBeInTheDocument();
    expect(within(detailPanel).getAllByText("长列表验证").length).toBeGreaterThan(0);
    expect(within(detailPanel).getByText("暂无服务端首登观察；可在建档看板刷新，或等用户完成首登步骤后再查看。")).toBeInTheDocument();
    expect(within(detailPanel).getByText("邀请记录最近更新")).toBeInTheDocument();
    expect(within(detailPanel).getByText("邀请记录已登记")).toBeInTheDocument();
    expect(within(detailPanel).getByText("运营备注已补充")).toBeInTheDocument();
    expect(within(detailPanel).getByText("当前状态：已邀请；目标岗位：测试开发工程师。")).toBeInTheDocument();

    fireEvent.click(within(detailPanel).getByRole("button", { name: "关闭账号详情抽屉" }));

    expect(screen.queryByRole("dialog", { name: "账号详情抽屉" })).not.toBeInTheDocument();
    expect(screen.queryByText("详情已打开")).not.toBeInTheDocument(); expect(invitationButton).toHaveFocus();
  });
});

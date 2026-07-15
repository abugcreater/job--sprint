import { fireEvent, render, screen } from "@testing-library/react";
import type { CoachOnboardingReportResponse } from "../api/coachOnboardingReportClient";
import { InviteOnboardingReportPanel } from "../features/coach/components/InviteOnboardingReportPanel";

function onboardingReport(): CoachOnboardingReportResponse {
  const batches = [
    batch("2026-07-alpha", "高风险", "求职画像", 6),
    batch("2026-07-beta", "中风险", "知识边界", 8),
    batch("2026-07-gamma", "低风险", "今日行动", 10),
    batch("2026-07-delta", "高风险", "AI 建议确认", 4),
    batch("2026-07-epsilon", "无风险", "无待办", 12)
  ];
  const users = [
    user("alpha-1", "Alpha User 1", "2026-07-alpha", "高风险", "求职画像"),
    user("alpha-2", "Alpha User 2", "2026-07-alpha", "高风险", "求职画像"),
    user("beta-1", "Beta User 1", "2026-07-beta", "中风险", "知识边界"),
    user("gamma-1", "Gamma User 1", "2026-07-gamma", "低风险", "今日行动"),
    user("delta-1", "Delta User 1", "2026-07-delta", "高风险", "AI 建议确认"),
    user("epsilon-1", "Epsilon User 1", "2026-07-epsilon", "无风险", "无待办")
  ];
  return {
    ok: true,
    storage: "sqlite",
    summary: {
      totalUsers: users.length,
      startedCount: 5,
      completedCount: 1,
      completionRate: 16,
      completionRateLabel: "16%",
      topDropOffs: [{ label: "求职画像", count: 2 }],
      highestRiskLabel: "高风险"
    },
    batches,
    users
  };
}

describe("InviteOnboardingReportPanel", () => {
  it("filters onboarding batches by batch, risk and drop-off", () => {
    render(<InviteOnboardingReportPanel report={onboardingReport()} status="ready" onRefresh={() => undefined} />);

    expect(screen.getByRole("heading", { name: "2026-07-alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "2026-07-epsilon" })).not.toBeInTheDocument();
    expect(screen.getByText("还有 1 个批次未显示。")).toBeInTheDocument();
    expect(screen.queryByText("Epsilon User 1")).not.toBeInTheDocument();
    expect(screen.getByText("还有 1 个用户未显示。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看全部批次" }));
    fireEvent.click(screen.getByRole("button", { name: "查看全部用户" }));

    expect(screen.getByRole("heading", { name: "2026-07-epsilon" })).toBeInTheDocument();
    expect(screen.getByText("Epsilon User 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("首登风险筛选"), { target: { value: "高风险" } });

    expect(screen.getByText("2 个批次 · 3 个用户")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026-07-alpha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026-07-delta" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "2026-07-beta" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("首登放弃点筛选"), { target: { value: "求职画像" } });

    expect(screen.getByText("1 个批次 · 2 个用户")).toBeInTheDocument();
    expect(screen.getByText("Alpha User 1")).toBeInTheDocument();
    expect(screen.queryByText("Delta User 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("首登批次筛选"), { target: { value: "2026-07-delta" } });

    expect(screen.getByText("0 个批次 · 0 个用户")).toBeInTheDocument();
    expect(screen.getByText("当前筛选下没有匹配批次；可切换批次、风险或放弃点。")).toBeInTheDocument();
    expect(screen.getByText("当前筛选下没有匹配用户；可先放宽风险或放弃点。")).toBeInTheDocument();
  });
});

function batch(inviteBatch: string, highestRiskLabel: string, topDropOffLabel: string, totalUsers: number) {
  return {
    inviteBatch,
    topDropOffLabel,
    totalUsers,
    startedCount: Math.max(totalUsers - 1, 0),
    completedCount: Math.max(totalUsers - 3, 0),
    completionRate: 50,
    completionRateLabel: "50%",
    topDropOffs: [{ label: topDropOffLabel, count: 1 }],
    highestRiskLabel
  };
}

function user(username: string, displayName: string, inviteBatch: string, riskLabel: string, dropOffLabel: string) {
  return {
    username,
    displayName,
    dataScope: username,
    inviteBatch,
    latestEvent: null,
    summary: {
      eventCount: 1,
      latestCompletionRate: dropOffLabel === "无待办" ? 100 : 40,
      latestCompletionRateLabel: dropOffLabel === "无待办" ? "100%" : "40%",
      latestDropOffLabel: dropOffLabel,
      latestRiskLabel: riskLabel,
      highestRiskLabel: riskLabel,
      nextActionLabel: dropOffLabel === "无待办" ? "进入日常迭代" : "继续建档",
      firstLoginStatus: dropOffLabel === "无待办" ? "已完成" : "进行中"
    }
  };
}

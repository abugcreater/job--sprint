import { render, screen } from "@testing-library/react";
import { LlmRunPanel } from "../features/coach/components/LlmRunPanel";
import type { LlmRun } from "../types/sprint";

describe("LlmRunPanel", () => {
  it("turns runtime diagnosis codes into distinct user recovery actions", () => {
    render(<LlmRunPanel runs={[
      run("auth_required", "2026-07-24T09:00:00+08:00"),
      run("rate_limited", "2026-07-24T08:30:00+08:00"),
      run("provider_not_configured", "2026-07-24T08:00:00+08:00"),
      run("api_timeout", "2026-07-24T07:30:00+08:00"),
      run("api_contract_error", "2026-07-24T07:00:00+08:00")
    ]} />);

    expect(screen.getByText("诊断：登录态或 AI 权限缺失")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：重新登录后再生成，不要把这条记录当成模型失败。")).toBeInTheDocument();
    expect(screen.getByText("诊断：AI 服务正在限流")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：请等待片刻后再生成；不要连续点击或反复刷新页面。")).toBeInTheDocument();
    expect(screen.getByText("诊断：服务端已连接，但未启用真实 provider")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：需要真实模型时，由维护者在仓库外配置 provider 后再生成。")).toBeInTheDocument();
    expect(screen.getByText("诊断：AI 服务响应超时")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：稍后再生成；若持续超时，由维护者检查 runtime、provider 网络和超时配置。")).toBeInTheDocument();
    expect(screen.getByText("诊断：AI 响应不符合安全写入合同")).toBeInTheDocument();
    expect(screen.getByText("诊断码：auth_required")).toBeInTheDocument();
    expect(screen.getByText("诊断码：rate_limited")).toBeInTheDocument();
    expect(screen.getByText("诊断码：provider_not_configured")).toBeInTheDocument();
    expect(screen.getByText("诊断码：api_timeout")).toBeInTheDocument();
    expect(screen.getByText("诊断码：api_contract_error")).toBeInTheDocument();
  });

  it("uses user-facing labels when the page safely falls back to local rules", () => {
    render(<LlmRunPanel runs={[run("server_unavailable", "2026-08-12T09:00:00+08:00")]} />);

    expect(screen.getByText("本地建议可用")).toBeInTheDocument();
    expect(screen.getByText("建议来源：本地规则")).toBeInTheDocument();
    expect(screen.getByText("结构校验：通过")).toBeInTheDocument();
    expect(screen.getByText("诊断：本地规则建议已生成")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：需要真实模型建议时，请使用已部署服务，或请维护者检查服务端运行情况。")).toBeInTheDocument();
    expect(screen.queryByText("local-fallback")).not.toBeInTheDocument();
    expect(screen.queryByText("schema pass")).not.toBeInTheDocument();
  });
});

function run(warning: string, createdAt: string): LlmRun {
  return {
    id: `run-${warning}`,
    provider: "local-fallback",
    promptVersion: "coach-artifacts-v1",
    schemaVersion: "coach-artifact-list-v1",
    inputSummaryHash: warning,
    artifactCount: 2,
    schemaStatus: "pass",
    status: "fallback",
    warning,
    createdAt
  };
}

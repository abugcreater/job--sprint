import { render, screen } from "@testing-library/react";
import { LlmRunPanel } from "../features/coach/components/LlmRunPanel";
import type { LlmRun } from "../types/sprint";

describe("LlmRunPanel", () => {
  it("turns runtime diagnosis codes into distinct user recovery actions", () => {
    render(<LlmRunPanel runs={[
      run("auth_required", "2026-07-24T09:00:00+08:00"),
      run("provider_not_configured", "2026-07-24T08:00:00+08:00"),
      run("api_contract_error", "2026-07-24T07:00:00+08:00")
    ]} />);

    expect(screen.getByText("诊断：登录态或 AI 权限缺失")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：重新登录后再生成，不要把这条记录当成模型失败。")).toBeInTheDocument();
    expect(screen.getByText("诊断：服务端已连接，但未启用真实 provider")).toBeInTheDocument();
    expect(screen.getByText("恢复动作：需要真实模型时，由维护者在仓库外配置 provider 后再生成。")).toBeInTheDocument();
    expect(screen.getByText("诊断：AI 响应不符合安全写入合同")).toBeInTheDocument();
    expect(screen.getByText("诊断码：auth_required")).toBeInTheDocument();
    expect(screen.getByText("诊断码：provider_not_configured")).toBeInTheDocument();
    expect(screen.getByText("诊断码：api_contract_error")).toBeInTheDocument();
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

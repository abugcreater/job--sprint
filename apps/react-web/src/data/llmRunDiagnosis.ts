import type { LlmRun } from "../types/sprint";

export interface LlmRunDiagnosis {
  code: string;
  label: string;
  title: string;
  detail: string;
  nextAction: string;
  tone: "success" | "neutral" | "risk";
}

export function llmRunProviderLabel(provider: string): string {
  if (provider === "local-fallback") return "本地规则";
  if (provider === "anthropic-compatible") return "服务端 AI";
  return provider;
}

export function llmRunSchemaStatusLabel(status: LlmRun["schemaStatus"]): string {
  if (status === "pass") return "通过";
  if (status === "failed") return "未通过";
  return "未校验";
}

export function diagnoseLlmRun(run: LlmRun): LlmRunDiagnosis {
  if (run.warning === "auth_required") {
    return {
      code: "auth_required",
      label: "需登录",
      title: "登录态或 AI 权限缺失",
      detail: "服务端 AI API 可达，但本次请求没有可用登录态或 AI 使用权限；系统只保留了可审核的本地规则草稿。",
      nextAction: "重新登录后再生成，不要把这条记录当成模型失败。",
      tone: "neutral"
    };
  }
  if (run.warning === "rate_limited") {
    return {
      code: "rate_limited",
      label: "请求过多",
      title: "AI 服务正在限流",
      detail: "服务端或上游 provider 暂时拒绝了本次请求；系统没有自动重复发送，也不会把草稿写入正式记录。",
      nextAction: "请等待片刻后再生成；不要连续点击或反复刷新页面。",
      tone: "neutral"
    };
  }
  if (run.warning === "api_timeout") {
    return {
      code: "api_timeout",
      label: "响应超时",
      title: "AI 服务响应超时",
      detail: "请求已发出但未在当前时间窗口取得可用结果；系统保留本地规则草稿，不把它当作模型成功。",
      nextAction: "稍后再生成；若持续超时，由维护者检查 runtime、provider 网络和超时配置。",
      tone: "risk"
    };
  }
  if (run.warning === "provider_not_configured") {
    return {
      code: "provider_not_configured",
      label: "未配置模型",
      title: "服务端已连接，但未启用真实 provider",
      detail: "当前规则草稿可继续审核；这说明运行时和 schema 可用，不等于真实模型调用失败。",
      nextAction: "需要真实模型时，由维护者在仓库外配置 provider 后再生成。",
      tone: "neutral"
    };
  }
  if (run.warning === "ai_generation_fallback") {
    return {
      code: "ai_generation_fallback",
      label: "模型降级",
      title: "真实 provider 本轮未完成，已安全降级",
      detail: "系统保留了规则草稿，避免无效响应写入正式数据；这不是一次真实模型成功。",
      nextAction: "稍后使用已配置的服务端 runtime 复验，并检查 provider 网络、token 和模型设置。",
      tone: "risk"
    };
  }
  if (run.warning === "api_unavailable") {
    return {
      code: "api_unavailable",
      label: "服务异常",
      title: "服务端 AI API 当前异常",
      detail: "请求已经到达服务端，但 API 返回了不可用状态；本地规则草稿不会掩盖这条运行问题。",
      nextAction: "检查 Node/Rust runtime 后再生成；普通用户无需查看或修改服务器配置。",
      tone: "risk"
    };
  }
  if (run.warning === "api_contract_error") {
    return {
      code: "api_contract_error",
      label: "响应异常",
      title: "AI 响应不符合安全写入合同",
      detail: "服务端返回内容无法验证为可用草稿，系统不会把它写入正式日程或知识边界。",
      nextAction: "检查服务端响应和 schema 后再生成；不要手工猜测或补写 AI 结果。",
      tone: "risk"
    };
  }
  if (run.warning === "server_generation_failed") {
    return {
      code: "server_generation_failed",
      label: "生成未完成",
      title: "服务端生成请求未完成",
      detail: "当前已回退为本地规则草稿，但未拿到可确认的服务端 AI 结果。",
      nextAction: "确认登录和 runtime 可用后再生成；持续失败时由维护者检查服务端日志。",
      tone: "risk"
    };
  }
  if (run.warning === "server_unavailable") {
    return {
      code: "server_unavailable",
      label: "本地建议可用",
      title: "本地规则建议已生成",
      detail: "当前页面没有连接后端 AI API，因此未调用真实模型；已生成的草稿仍可由你审核和采用。",
      nextAction: "需要真实模型建议时，请使用已部署服务，或请维护者检查服务端运行情况。",
      tone: "neutral"
    };
  }
  if (run.schemaStatus === "failed") {
    return {
      code: "schema_failed",
      label: "Schema 失败",
      title: "模型响应未通过结构校验",
      detail: "服务端或 provider 有响应，但返回内容不能安全写入 AI 草稿。",
      nextAction: "检查 schema、prompt version 和服务端 llm_runs 日志。",
      tone: "risk"
    };
  }
  if (run.status === "success") {
    return {
      code: "provider_success",
      label: "成功",
      title: "真实 provider 生成成功",
      detail: "本次运行通过服务端 AI 接口生成，并通过 schema 校验。",
      nextAction: "继续查看采纳率和采纳后完成率。",
      tone: "success"
    };
  }
  if (run.status === "failed" || run.error) {
    return {
      code: "run_failed",
      label: "失败",
      title: "AI 运行失败",
      detail: "本次没有可用草稿，需要检查接口、provider 配置或服务端日志。",
      nextAction: "查看错误码并复跑服务端 AI smoke。",
      tone: "risk"
    };
  }
  return {
    code: "fallback",
    label: "降级",
    title: run.provider === "local-fallback" ? "本地规则降级" : "服务端规则降级",
    detail: "系统生成了可用草稿，但不是一次完整的真实模型成功运行。",
    nextAction: "需要真实模型质量时，用已配置 provider 的服务端环境复验。",
    tone: "neutral"
  };
}

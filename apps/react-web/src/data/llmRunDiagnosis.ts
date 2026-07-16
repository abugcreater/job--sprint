import type { LlmRun } from "../types/sprint";

export interface LlmRunDiagnosis {
  label: string;
  title: string;
  detail: string;
  nextAction: string;
  tone: "success" | "neutral" | "risk";
}

export function diagnoseLlmRun(run: LlmRun): LlmRunDiagnosis {
  if (run.warning === "server_unavailable") {
    return {
      label: "本地模式",
      title: "本地前端未连接后端 AI API",
      detail: "当前页面已用本地规则生成草稿，不代表远端大模型或 provider 本身失败。",
      nextAction: "用服务端 runtime 或远端环境复验 /api/coach/artifacts。",
      tone: "neutral"
    };
  }
  if (run.schemaStatus === "failed") {
    return {
      label: "Schema 失败",
      title: "模型响应未通过结构校验",
      detail: "服务端或 provider 有响应，但返回内容不能安全写入 AI 草稿。",
      nextAction: "检查 schema、prompt version 和服务端 llm_runs 日志。",
      tone: "risk"
    };
  }
  if (run.status === "success") {
    return {
      label: "成功",
      title: "真实 provider 生成成功",
      detail: "本次运行通过服务端 AI 接口生成，并通过 schema 校验。",
      nextAction: "继续查看采纳率和采纳后完成率。",
      tone: "success"
    };
  }
  if (run.status === "failed" || run.error) {
    return {
      label: "失败",
      title: "AI 运行失败",
      detail: "本次没有可用草稿，需要检查接口、provider 配置或服务端日志。",
      nextAction: "查看错误码并复跑服务端 AI smoke。",
      tone: "risk"
    };
  }
  return {
    label: "降级",
    title: run.provider === "local-fallback" ? "本地规则降级" : "服务端规则降级",
    detail: "系统生成了可用草稿，但不是一次完整的真实模型成功运行。",
    nextAction: "需要真实模型质量时，用已配置 provider 的服务端环境复验。",
    tone: "neutral"
  };
}

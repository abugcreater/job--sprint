#!/usr/bin/env node
const fs = require("fs");

const DEFAULT_URL = "http://127.0.0.1:5173/api/coach/artifacts";
const DEFAULT_TIMEOUT_MS = 6000;
const EXPECTED_SCHEMA_VERSION = "coach-artifact-list-v1";

const defaultPayload = {
  profile: {
    id: "coach-runtime-smoke",
    targetRole: "泛 IT 求职者",
    roleFamily: "other",
    dailyMinutes: 45
  },
  knowledgeBoundaries: [
    {
      topic: "运行时诊断",
      level: "了解",
      gap: "需要区分纯前端、本地 API、provider 和 schema 问题"
    }
  ],
  opportunitySignals: [],
  sprint: {
    date: "2026-07-10",
    currentTask: { title: "AI 运行记录诊断 smoke" }
  }
};

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return value.join("; ");
  return value ? String(value) : "";
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function looksLikeHtml(contentType, bodyText) {
  const content = String(contentType || "").toLowerCase();
  const trimmed = String(bodyText || "").trim().toLowerCase();
  return content.includes("text/html") || trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

function hasValidArtifacts(payload) {
  return Array.isArray(payload && payload.artifacts)
    && payload.artifacts.length > 0
    && payload.artifacts.every((artifact) => artifact && artifact.type && artifact.title && artifact.body);
}

function baseDiagnosis(overrides) {
  return {
    status: "PASS_WITH_LIMITS",
    code: "unknown",
    runtimeApiReachable: false,
    providerUsable: null,
    schemaUsable: null,
    userFacingReason: "",
    nextAction: "",
    ...overrides
  };
}

function classifyCoachArtifactsRuntime(response) {
  const statusCode = Number(response.statusCode || response.status || 0);
  const contentType = normalizeHeaderValue(response.contentType || response.headers && response.headers["content-type"]);
  const bodyText = String(response.bodyText || response.text || "");
  const json = response.json || parseJson(bodyText);

  if (looksLikeHtml(contentType, bodyText)) {
    return baseDiagnosis({
      code: "frontend_html_fallback",
      runtimeApiReachable: false,
      providerUsable: false,
      schemaUsable: false,
      userFacingReason: "请求命中了前端 HTML，而不是 /api/coach/artifacts JSON；当前多半是纯 Vite 前端服务。",
      nextAction: "启动 Node/Rust API runtime，或给 Vite dev server 配置 API proxy 后再复验。"
    });
  }

  if (statusCode === 0) {
    return baseDiagnosis({
      status: "FAIL",
      code: "runtime_unreachable",
      userFacingReason: "无法连接目标地址，本地服务可能没有启动或端口不对。",
      nextAction: "确认 URL、端口和服务进程，再重新运行 diagnose:coach-runtime。"
    });
  }

  if (statusCode === 401 || statusCode === 403) {
    return baseDiagnosis({
      code: "auth_required",
      runtimeApiReachable: true,
      providerUsable: null,
      schemaUsable: null,
      userFacingReason: "服务端 API 可达，但当前请求没有 AI 使用权限或缺少登录态。",
      nextAction: "使用已登录 Cookie 复验，或在本地临时关闭鉴权后只做开发 smoke。"
    });
  }

  if (statusCode === 404) {
    return baseDiagnosis({
      code: "api_route_missing",
      runtimeApiReachable: false,
      providerUsable: false,
      schemaUsable: false,
      userFacingReason: "目标服务返回 404，说明当前 runtime 未暴露 /api/coach/artifacts。",
      nextAction: "确认请求打到 Job Sprint Node/Rust API runtime，而不是错误端口或静态站点。"
    });
  }

  if (statusCode === 405) {
    return baseDiagnosis({
      code: "method_not_allowed",
      runtimeApiReachable: true,
      providerUsable: null,
      schemaUsable: null,
      userFacingReason: "API 路由存在，但请求方法不符合合同；coach artifacts 必须使用 POST。",
      nextAction: "用默认 POST payload 复验，不要用浏览器地址栏 GET 判断 AI 是否失败。"
    });
  }

  if (statusCode >= 500) {
    return baseDiagnosis({
      status: "FAIL",
      code: "api_unavailable",
      runtimeApiReachable: true,
      providerUsable: false,
      schemaUsable: false,
      userFacingReason: "服务端 API 可达但返回 5xx，当前是运行时不可用或后端异常。",
      nextAction: "查看 Node/Rust 服务日志和 provider env，再复跑服务端 smoke。"
    });
  }

  if (!json) {
    return baseDiagnosis({
      status: "FAIL",
      code: "invalid_json",
      runtimeApiReachable: true,
      providerUsable: false,
      schemaUsable: false,
      userFacingReason: "服务端返回了非 HTML 内容，但不是可解析 JSON。",
      nextAction: "检查反向代理、静态 fallback 和 API 响应头。"
    });
  }

  if (json.error) {
    return baseDiagnosis({
      code: "api_contract_error",
      runtimeApiReachable: true,
      providerUsable: null,
      schemaUsable: false,
      userFacingReason: `API 返回业务错误：${json.error}。`,
      nextAction: "按错误信息补齐画像、权限或请求 payload 后复验。"
    });
  }

  if (json.llmRun && json.llmRun.schemaStatus === "failed") {
    return baseDiagnosis({
      status: "FAIL",
      code: "schema_failed",
      runtimeApiReachable: true,
      providerUsable: json.provider !== "local-fallback",
      schemaUsable: false,
      userFacingReason: "服务端拿到了 AI 响应，但 llmRun schema 校验失败。",
      nextAction: "检查 provider 原始响应、prompt version 和 schemaVersion。"
    });
  }

  if (!hasValidArtifacts(json) || (json.schemaVersion && json.schemaVersion !== EXPECTED_SCHEMA_VERSION)) {
    return baseDiagnosis({
      status: "FAIL",
      code: "schema_failed",
      runtimeApiReachable: true,
      providerUsable: json.provider !== "local-fallback",
      schemaUsable: false,
      userFacingReason: "API 返回 JSON，但 artifacts 合同不完整或 schemaVersion 不符合当前合同。",
      nextAction: "检查 /api/coach/artifacts 返回结构，避免把无效草稿写入前端。"
    });
  }

  if (json.provider === "local-fallback" && json.warning) {
    return baseDiagnosis({
      code: "provider_failed_fallback",
      runtimeApiReachable: true,
      providerUsable: false,
      schemaUsable: true,
      userFacingReason: "服务端 API 可用，但真实 provider 调用失败后回退到了本地规则草稿。",
      nextAction: "查看 provider 错误、网络、token 和模型配置，再复跑远端 coach smoke。"
    });
  }

  if (json.provider === "local-fallback") {
    return baseDiagnosis({
      code: "provider_not_configured",
      runtimeApiReachable: true,
      providerUsable: false,
      schemaUsable: true,
      userFacingReason: "服务端 API 可用且 schema 通过，但当前没有启用真实 provider，只生成本地规则草稿。",
      nextAction: "需要验证真实模型时，配置仓库外 provider env 后使用服务端 runtime 复验。"
    });
  }

  return baseDiagnosis({
    status: "PASS",
    code: "provider_success",
    runtimeApiReachable: true,
    providerUsable: true,
    schemaUsable: true,
    userFacingReason: "服务端 API、真实 provider 和 artifacts schema 均通过。",
    nextAction: "继续看采纳率、采纳后完成率和长期质量归因。"
  });
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
}

function hasArg(args, name) {
  return args.includes(name);
}

function readPayload(args) {
  const payloadPath = argValue(args, "--payload");
  if (!payloadPath) return defaultPayload;
  return JSON.parse(fs.readFileSync(payloadPath, "utf8"));
}

async function fetchCoachArtifactsRuntime(options = {}) {
  const url = options.url || DEFAULT_URL;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (options.cookie) headers.cookie = options.cookie;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(options.payload || defaultPayload),
      signal: controller.signal,
      redirect: "manual"
    });
    const bodyText = await response.text();
    return {
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "",
      bodyText
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runCli(args = process.argv.slice(2)) {
  const url = argValue(args, "--url") || DEFAULT_URL;
  const timeoutMs = Number(argValue(args, "--timeout-ms") || DEFAULT_TIMEOUT_MS);
  const cookie = argValue(args, "--cookie");
  let diagnosis;
  try {
    const response = await fetchCoachArtifactsRuntime({
      url,
      timeoutMs,
      cookie,
      payload: readPayload(args)
    });
    diagnosis = classifyCoachArtifactsRuntime(response);
  } catch (error) {
    diagnosis = baseDiagnosis({
      status: "FAIL",
      code: "runtime_unreachable",
      userFacingReason: `请求失败：${error && error.message ? error.message : String(error)}。`,
      nextAction: "确认 URL、端口、网络和服务进程后重新运行。"
    });
  }

  const report = {
    status: diagnosis.status,
    code: diagnosis.code,
    url,
    runtimeApiReachable: diagnosis.runtimeApiReachable,
    providerUsable: diagnosis.providerUsable,
    schemaUsable: diagnosis.schemaUsable,
    userFacingReason: diagnosis.userFacingReason,
    nextAction: diagnosis.nextAction
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (hasArg(args, "--strict") && diagnosis.status !== "PASS") process.exitCode = 1;
  return report;
}

if (require.main === module) {
  runCli();
}

module.exports = {
  classifyCoachArtifactsRuntime,
  fetchCoachArtifactsRuntime,
  runCli
};

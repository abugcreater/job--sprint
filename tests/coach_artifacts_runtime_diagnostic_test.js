#!/usr/bin/env node
const assert = require("assert");
const { classifyCoachArtifactsRuntime } = require("../tools/diagnose_coach_artifacts_runtime");

function classify(response) {
  return classifyCoachArtifactsRuntime(response);
}

function testFrontendHtmlFallback() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "text/html; charset=utf-8",
    bodyText: "<!doctype html><html><body>Vite app</body></html>"
  });
  assert.strictEqual(diagnosis.code, "frontend_html_fallback");
  assert.strictEqual(diagnosis.runtimeApiReachable, false);
  assert.strictEqual(diagnosis.providerUsable, false);
}

function testAuthRequiredIsApiReachable() {
  const diagnosis = classify({
    statusCode: 401,
    contentType: "application/json",
    bodyText: JSON.stringify({ error: "auth_required" })
  });
  assert.strictEqual(diagnosis.code, "auth_required");
  assert.strictEqual(diagnosis.runtimeApiReachable, true);
}

function testApiUnavailable() {
  const diagnosis = classify({
    statusCode: 503,
    contentType: "application/json",
    bodyText: JSON.stringify({ error: "service_unavailable" })
  });
  assert.strictEqual(diagnosis.code, "api_unavailable");
  assert.strictEqual(diagnosis.status, "FAIL");
}

function testProviderNotConfigured() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "application/json",
    bodyText: JSON.stringify({
      provider: "local-fallback",
      schemaVersion: "coach-artifact-list-v1",
      artifacts: [{ type: "daily_next_step", title: "先补画像", body: "补一条边界" }]
    })
  });
  assert.strictEqual(diagnosis.code, "provider_not_configured");
  assert.strictEqual(diagnosis.runtimeApiReachable, true);
  assert.strictEqual(diagnosis.providerUsable, false);
  assert.strictEqual(diagnosis.schemaUsable, true);
}

function testProviderFailedFallback() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "application/json",
    bodyText: JSON.stringify({
      provider: "local-fallback",
      warning: "ai_generation_fallback",
      schemaVersion: "coach-artifact-list-v1",
      artifacts: [{ type: "knowledge_card", title: "规则草稿", body: "provider 失败后 fallback" }]
    })
  });
  assert.strictEqual(diagnosis.code, "provider_failed_fallback");
  assert.strictEqual(diagnosis.runtimeApiReachable, true);
  assert.strictEqual(diagnosis.providerUsable, false);
  assert.strictEqual(diagnosis.schemaUsable, true);
}

function testSchemaFailedWhenArtifactsAreInvalid() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "application/json",
    bodyText: JSON.stringify({
      provider: "anthropic-compatible",
      schemaVersion: "coach-artifact-list-v1",
      artifacts: [{ type: "knowledge_card", title: "缺少正文" }]
    })
  });
  assert.strictEqual(diagnosis.code, "schema_failed");
  assert.strictEqual(diagnosis.status, "FAIL");
  assert.strictEqual(diagnosis.schemaUsable, false);
}

function testProviderSuccess() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "application/json",
    bodyText: JSON.stringify({
      provider: "anthropic-compatible",
      model: "deepseek-v4-flash",
      schemaVersion: "coach-artifact-list-v1",
      artifacts: [{ type: "interview_question", title: "MQ 追问", body: "说一下故障恢复链路" }]
    })
  });
  assert.strictEqual(diagnosis.code, "provider_success");
  assert.strictEqual(diagnosis.status, "PASS");
  assert.strictEqual(diagnosis.providerUsable, true);
  assert.strictEqual(diagnosis.schemaUsable, true);
}

function testInvalidJson() {
  const diagnosis = classify({
    statusCode: 200,
    contentType: "application/json",
    bodyText: "{bad json"
  });
  assert.strictEqual(diagnosis.code, "invalid_json");
  assert.strictEqual(diagnosis.status, "FAIL");
}

testFrontendHtmlFallback();
testAuthRequiredIsApiReachable();
testApiUnavailable();
testProviderNotConfigured();
testProviderFailedFallback();
testSchemaFailedWhenArtifactsAreInvalid();
testProviderSuccess();
testInvalidJson();

console.log("coach artifacts runtime diagnostic tests passed");

const http = require("http");
const {
  getAuthConfig,
  isSecureRequest,
  sessionCookie,
  verifySession
} = require("./auth");
const { handleAuth } = require("./auth_routes");
const {
  handleGenerateBoundarySuggestions,
  handleGenerateCoachArtifacts,
  handleGenerateKb,
  handleScore,
  handleTranscribe
} = require("./ai_routes");
const { handleCoachBoundaryFeedback, handleCoachFeedback, handleCoachInvitations, handleCoachOnboardingEvents, handleCoachOnboardingReport, handleCoachOutcomes } = require("./coach_feedback_routes");
const {
  readRuntimeState,
  writeRuntimeState
} = require("./runtime_store");
const {
  handleApplications,
  handleInterviewMistakes,
  handleProgress,
  handleReviews,
  handleRuntime
} = require("./runtime_routes");
const {
  REACT_DEFAULT_ENTRY,
  REACT_ENTRY_PATH,
  isPrivateApi,
  isPrivateStatic,
  loginPathFor,
  normalizePathname,
  requestBase,
  serveStatic
} = require("./static_files");
const {
  localScore,
  scoreWithAnthropic
} = require("./ai_tools");
const {
  sendJson,
  sendRedirect
} = require("./http_utils");

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "127.0.0.1";

function rejectUnauthenticated(req, res, pathname, authState) {
  if (pathname === "/" || pathname === "/schedule.html" || pathname === "/react" || pathname === "/react/" || pathname === REACT_ENTRY_PATH) {
    const parsed = new URL(req.url, "http://localhost");
    const nextPathname = pathname === "/schedule.html" ? "/schedule.html" : REACT_DEFAULT_ENTRY;
    sendRedirect(res, loginPathFor(parsed.pathname, nextPathname));
    return;
  }
  const status = authState.reason === "auth_not_configured" ? 503 : 401;
  sendJson(res, status, {
    ok: false,
    authenticated: false,
    error: authState.reason || "unauthorized",
    message: status === 503 ? "job-sprint 应用层认证未配置，私有资源保持关闭。" : "请先登录 job-sprint。"
  });
}

function requireAuth(req, res, pathname) {
  const authState = verifySession(req);
  if (authState.authenticated) {
    return authState;
  }
  rejectUnauthenticated(req, res, pathname, authState);
  return null;
}

async function route(req, res) {
  const parsedUrl = new URL(req.url, "http://localhost");
  const pathname = normalizePathname(parsedUrl.pathname);
  let authState = null;
  if (pathname === "/react") {
    sendRedirect(res, `${requestBase(parsedUrl.pathname)}${REACT_ENTRY_PATH}`);
    return;
  }
  if (pathname === "/api/health") {
    const authConfig = getAuthConfig();
    sendJson(res, 200, {
      ok: true,
      authConfigured: authConfig.configured,
      authDisabled: authConfig.disabled,
      userCount: authConfig.users ? authConfig.users.length : 0,
      bearerTokenCount: authConfig.bearerTokens ? authConfig.bearerTokens.length : 0,
      apiConfigured: Boolean(process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_AUTH_TOKEN),
      model: process.env.ANTHROPIC_MODEL || null,
      runtimeStorage: "server-json"
    });
    return;
  }

  if (pathname.startsWith("/api/auth/")) {
    await handleAuth(req, res, pathname);
    return;
  }

  if (isPrivateApi(pathname)) {
    authState = requireAuth(req, res, pathname);
    if (!authState) return;
  }

  if (pathname === "/api/progress") {
    await handleProgress(req, res, authState);
    return;
  }

  if (pathname === "/api/runtime") {
    await handleRuntime(req, res, authState);
    return;
  }

  if (pathname === "/api/reviews") {
    await handleReviews(req, res, authState);
    return;
  }

  if (pathname === "/api/applications" || pathname.startsWith("/api/applications/")) {
    const id = pathname === "/api/applications" ? "" : decodeURIComponent(pathname.slice("/api/applications/".length));
    await handleApplications(req, res, id, authState);
    return;
  }

  if (pathname === "/api/interview-mistakes" || pathname.startsWith("/api/interview-mistakes/")) {
    const id = pathname === "/api/interview-mistakes" ? "" : decodeURIComponent(pathname.slice("/api/interview-mistakes/".length));
    await handleInterviewMistakes(req, res, id, authState);
    return;
  }

  if (pathname === "/api/score-answer" && req.method === "POST") {
    await handleScore(req, res, authState);
    return;
  }

  if (pathname === "/api/generate-kb") {
    await handleGenerateKb(req, res, authState);
    return;
  }

  if (pathname === "/api/coach/artifacts") {
    await handleGenerateCoachArtifacts(req, res, authState);
    return;
  }

  if (pathname === "/api/coach/boundary-suggestions") {
    await handleGenerateBoundarySuggestions(req, res, authState);
    return;
  }

  if (pathname === "/api/coach/boundary-feedback") return handleCoachBoundaryFeedback(req, res, authState);
  if (pathname === "/api/coach/feedback") return handleCoachFeedback(req, res, authState);
  if (pathname === "/api/coach/outcomes") return handleCoachOutcomes(req, res, authState);
  if (pathname === "/api/coach/onboarding-events") return handleCoachOnboardingEvents(req, res, authState);
  if (pathname === "/api/coach/onboarding-report") return handleCoachOnboardingReport(req, res, authState);
  if (pathname === "/api/coach/invitations") return handleCoachInvitations(req, res, authState);

  if (pathname === "/api/transcribe") {
    await handleTranscribe(req, res, authState);
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "api_not_found" });
    return;
  }

  if (isPrivateStatic(pathname)) {
    authState = requireAuth(req, res, pathname);
    if (!authState) return;
    if (pathname === "/") {
      sendRedirect(res, `${requestBase(parsedUrl.pathname)}${REACT_DEFAULT_ENTRY}`);
      return;
    }
  }

  serveStatic(pathname, res, authState);
}

if (require.main === module) {
  http.createServer((req, res) => {
    route(req, res).catch((error) => {
      sendJson(res, 500, { error: "internal_error", message: error.message });
    });
  }).listen(PORT, HOST, () => {
    console.log(`schedule coach server listening on http://${HOST}:${PORT}`);
  });
}

module.exports = {
  route,
  localScore,
  scoreWithAnthropic,
  readRuntimeState,
  writeRuntimeState,
  normalizePathname,
  getAuthConfig,
  verifySession,
  sessionCookie,
  isSecureRequest
};

const fs = require("fs");
const path = require("path");
const { hasPermission } = require("./auth");
const {
  generateCoachArtifactsWithAnthropic,
  localGenerateCoachArtifacts
} = require("./coach_ai_tools");
const {
  generateBoundarySuggestionsWithAnthropic,
  localGenerateBoundarySuggestions
} = require("./coach_boundary_suggestions");
const {
  generateKbWithAnthropic,
  localGenerateKb,
  localScore,
  scoreWithAnthropic
} = require("./ai_tools");
const {
  maxTranscribeBytes,
  parseMultipartAudio,
  readBody,
  readRawBody,
  sendJson
} = require("./http_utils");

const ROOT = path.resolve(__dirname, "../..");

function requirePermission(req, res, authState, permission) {
  if (hasPermission(authState, permission)) {
    return true;
  }
  sendJson(res, 403, {
    ok: false,
    error: "forbidden",
    message: "当前账号没有访问该功能的权限。"
  });
  return false;
}

async function handleTranscribe(req, res, authState) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!requirePermission(req, res, authState, "ai:use")) return;
  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    sendJson(res, 400, {
      ok: false,
      error: "malformed_upload",
      message: "请使用 multipart/form-data 上传 audio 文件。"
    });
    return;
  }
  let raw;
  try {
    raw = await readRawBody(req, maxTranscribeBytes());
  } catch (error) {
    if (error.code === "BODY_TOO_LARGE") {
      sendJson(res, 413, {
        ok: false,
        error: "audio_too_large",
        message: "音频文件过大，请控制单次回答录音长度。"
      });
      return;
    }
    sendJson(res, 400, { ok: false, error: "upload_failed", message: "音频上传失败。" });
    return;
  }
  const parsed = parseMultipartAudio(raw, contentType);
  if (parsed.error) {
    sendJson(res, 400, {
      ok: false,
      error: "malformed_upload",
      message: "未找到有效 audio 文件。"
    });
    return;
  }
  const provider = String(process.env.ASR_PROVIDER || "none").toLowerCase();
  if (provider === "none") {
    sendJson(res, 200, {
      ok: false,
      mode: "not_configured",
      provider,
      audioBytes: parsed.audio.length,
      message: "ASR 服务未配置，可继续手动输入"
    });
    return;
  }
  sendJson(res, 501, {
    ok: false,
    mode: "provider_not_implemented",
    provider,
    message: "当前服务端只完成录音上传闭环，ASR provider 尚未接入。"
  });
}

function loadInterviewContext() {
  const contextPath = path.join(ROOT, "data", "interview_context.json");
  return JSON.parse(fs.readFileSync(contextPath, "utf8"));
}

async function handleGenerateKb(req, res, authState) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!requirePermission(req, res, authState, "ai:use")) return;
  let payload = null;
  try {
    payload = await readBody(req);
    const context = loadInterviewContext();
    const aiResult = await generateKbWithAnthropic(payload, context);
    sendJson(res, 200, aiResult || localGenerateKb(payload, context));
  } catch (error) {
    try {
      const context = loadInterviewContext();
      sendJson(res, 200, {
        ...localGenerateKb(payload || {}, context),
        warning: "ai_generation_fallback"
      });
    } catch (fallbackError) {
      sendJson(res, 502, {
        error: "generate_kb_failed",
        message: fallbackError.message
      });
    }
  }
}

async function handleGenerateCoachArtifacts(req, res, authState) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!requirePermission(req, res, authState, "ai:use")) return;
  let payload = null;
  try {
    payload = await readBody(req);
    if (!payload.profile || typeof payload.profile !== "object" || !payload.profile.id) {
      sendJson(res, 400, {
        ok: false,
        error: "profile_required",
        message: "请先保存一个目标画像，再生成 AI 教练草稿。"
      });
      return;
    }
    const aiResult = await generateCoachArtifactsWithAnthropic(payload);
    sendJson(res, 200, aiResult || localGenerateCoachArtifacts(payload));
  } catch (error) {
    const fallback = payload && payload.profile ? localGenerateCoachArtifacts(payload) : null;
    sendJson(res, fallback ? 200 : 502, fallback ? {
      ...fallback,
      warning: "ai_generation_fallback"
    } : {
      error: "coach_artifacts_failed",
      message: error.message
    });
  }
}

async function handleGenerateBoundarySuggestions(req, res, authState) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!requirePermission(req, res, authState, "ai:use")) return;
  let payload = null;
  try {
    payload = await readBody(req);
    const fallback = localGenerateBoundarySuggestions(payload);
    if (fallback.ok === false) {
      sendJson(res, 400, fallback);
      return;
    }
    const aiResult = await generateBoundarySuggestionsWithAnthropic(payload);
    sendJson(res, 200, aiResult || fallback);
  } catch (error) {
    const fallback = payload ? localGenerateBoundarySuggestions(payload) : null;
    sendJson(res, fallback && fallback.ok !== false ? 200 : 502, fallback && fallback.ok !== false ? {
      ...fallback,
      warning: "ai_generation_fallback"
    } : {
      error: "boundary_suggestions_failed",
      message: error.message
    });
  }
}

async function handleScore(req, res, authState) {
  if (!requirePermission(req, res, authState, "ai:use")) return;
  let payload = null;
  try {
    payload = await readBody(req);
    if (!payload.question || !payload.answer) {
      sendJson(res, 400, { error: "question and answer are required" });
      return;
    }
    const context = loadInterviewContext();
    const aiScore = await scoreWithAnthropic(payload, context);
    sendJson(res, 200, aiScore || localScore(payload));
  } catch (error) {
    const fallback = payload && payload.question && payload.answer ? localScore(payload) : null;
    sendJson(res, fallback ? 200 : 502, fallback || {
      error: "score_answer_failed",
      message: error.message
    });
  }
}

module.exports = {
  handleGenerateBoundarySuggestions,
  handleGenerateCoachArtifacts,
  handleGenerateKb,
  handleScore,
  handleTranscribe
};

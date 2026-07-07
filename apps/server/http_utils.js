const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

function maxTranscribeBytes() {
  return Number(process.env.ASR_MAX_AUDIO_BYTES || 8 * 1024 * 1024);
}

function securityHeaders(extra = {}) {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "geolocation=(), camera=()",
    ...extra
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, securityHeaders({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }));
  res.end(JSON.stringify(payload, null, 2));
}

function sendRedirect(res, location) {
  res.writeHead(302, securityHeaders({
    "location": location,
    "cache-control": "no-store"
  }));
  res.end();
}

function sendBadJson(res, error) {
  sendJson(res, 400, { error: "bad_json", message: error.message });
}

function readBody(req, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("invalid json body"));
      }
    });
    req.on("error", reject);
  });
}

function readRawBody(req, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let exceeded = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        if (!exceeded) {
          exceeded = true;
          const error = new Error("request body too large");
          error.code = "BODY_TOO_LARGE";
          reject(error);
        }
        return;
      }
      if (!exceeded) {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipartAudio(buffer, contentType) {
  const boundaryMatch = String(contentType || "").match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    return { error: "missing_boundary" };
  }
  const boundary = Buffer.from(`--${boundaryMatch[1].replace(/^"|"$/g, "")}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  let offset = 0;
  while (offset < buffer.length) {
    const partStart = buffer.indexOf(boundary, offset);
    if (partStart === -1) break;
    const headerStart = partStart + boundary.length;
    if (buffer.slice(headerStart, headerStart + 2).toString() === "--") break;
    const headerEnd = buffer.indexOf(headerSeparator, headerStart);
    if (headerEnd === -1) break;
    const headers = buffer.slice(headerStart, headerEnd).toString("utf8");
    const contentStart = headerEnd + headerSeparator.length;
    const nextBoundary = buffer.indexOf(boundary, contentStart);
    if (nextBoundary === -1) break;
    let contentEnd = nextBoundary;
    if (contentEnd >= 2 && buffer[contentEnd - 2] === 13 && buffer[contentEnd - 1] === 10) {
      contentEnd -= 2;
    }
    const isAudioField = /name="audio"/i.test(headers) || /filename=/i.test(headers);
    if (isAudioField) {
      const audio = buffer.slice(contentStart, contentEnd);
      if (!audio.length) {
        return { error: "empty_audio" };
      }
      return {
        audio,
        filename: (headers.match(/filename="([^"]+)"/i) || [])[1] || "answer-audio",
        contentType: (headers.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "application/octet-stream"
      };
    }
    offset = nextBoundary + boundary.length;
  }
  return { error: "missing_audio" };
}

module.exports = {
  DEFAULT_MAX_BODY_BYTES,
  maxTranscribeBytes,
  parseMultipartAudio,
  readBody,
  readRawBody,
  securityHeaders,
  sendBadJson,
  sendJson,
  sendRedirect
};

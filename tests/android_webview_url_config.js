function envValue(env, name) {
  const value = env[name];
  return value && String(value).trim() ? String(value).trim() : null;
}

function normalizeWebViewUrl(value, remoteMode, defaultUrl) {
  if (!value) return defaultUrl;
  const url = new URL(value.trim());
  url.hash = "";
  url.search = "";
  if (/^https?:$/i.test(url.protocol) && (!url.pathname || url.pathname === "/")) {
    url.pathname = remoteMode ? "/job-sprint/react/index.html" : "/react/index.html";
  }
  return url.toString();
}

function resolveWebViewUrl(env, remoteMode, defaultUrl) {
  const configured = envValue(env, "JOB_SPRINT_ANDROID_WEBVIEW_URL")
    || envValue(env, "JOB_SPRINT_ANDROID_REMOTE_BASE_URL")
    || envValue(env, "JOB_SPRINT_REMOTE_BASE_URL")
    || envValue(env, "JOB_SPRINT_PUBLIC_BASE_URL")
    || envValue(env, "JOB_SPRINT_DELIVERY_BASE_URL");
  if (remoteMode && !configured) {
    return { ok: false, reason: "android_remote_inputs_missing", message: "USER_ACTION_REQUIRED: Android remote mode requires JOB_SPRINT_ANDROID_WEBVIEW_URL, JOB_SPRINT_ANDROID_REMOTE_BASE_URL, or JOB_SPRINT_REMOTE_BASE_URL." };
  }
  const webViewUrl = normalizeWebViewUrl(configured || defaultUrl, remoteMode, defaultUrl);
  if (remoteMode) {
    const parsed = new URL(webViewUrl);
    if (parsed.protocol !== "https:" || !parsed.pathname.includes("/job-sprint/")) {
      return {
        ok: false,
        reason: "android_remote_url_required",
        webViewUrl,
        requiredInputs: [
          "Set JOB_SPRINT_ANDROID_WEBVIEW_URL to an HTTPS URL under /job-sprint/.",
          "Android remote functional validation rejects HTTP and local fallback URLs."
        ]
      };
    }
  }
  return { ok: true, webViewUrl };
}

module.exports = { normalizeWebViewUrl, resolveWebViewUrl };

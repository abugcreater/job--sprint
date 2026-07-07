const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const remoteBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteSettingsBridge.java", "utf8");
const authBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidAuthSettingsBridge.java", "utf8");
const sessionBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSessionCookieBridge.java", "utf8");
const scheduleJs = fs.readFileSync("assets/schedule.js", "utf8");
const androidScheduleJs = fs.readFileSync("apps/android/app/src/main/assets/web/assets/schedule.js", "utf8");
const scheduleHtml = fs.readFileSync("schedule.html", "utf8");
const androidScheduleHtml = fs.readFileSync("apps/android/app/src/main/assets/web/schedule.html", "utf8");

assert.match(remoteBridge, /final class AndroidRemoteSettingsBridge/);
assert.match(remoteBridge, /private final Activity activity/);
assert.match(remoteBridge, /private final RemoteWebViewController remoteWebViewController/);
assert.match(remoteBridge, /@JavascriptInterface\s+public String getRemoteUrl\(\)/);
assert.match(remoteBridge, /@JavascriptInterface\s+public boolean setRemoteUrl\(String url\)/);
assert.match(remoteBridge, /@JavascriptInterface\s+public void reloadRemote\(\)/);
assert.match(remoteBridge, /@JavascriptInterface\s+public void loadFallback\(\)/);
assert.match(remoteBridge, /remoteWebViewController\.getConfiguredRemoteUrl\(\)/);
assert.match(remoteBridge, /remoteWebViewController\.saveRemoteUrl\(url\)/);
assert.match(remoteBridge, /remoteWebViewController\.loadRemoteOrFallback/);
assert.match(remoteBridge, /remoteWebViewController\.loadFallback/);
assert.doesNotMatch(remoteBridge, /AuthCredentialStore/);
assert.doesNotMatch(remoteBridge, /hasSavedBasicAuth/);
assert.doesNotMatch(remoteBridge, /clearBasicAuth/);

assert.match(authBridge, /final class AndroidAuthSettingsBridge/);
assert.match(authBridge, /private final Activity activity/);
assert.match(authBridge, /private final AuthCredentialStore credentialStore/);
assert.match(authBridge, /@JavascriptInterface\s+public boolean hasSavedBasicAuth\(\)/);
assert.match(authBridge, /@JavascriptInterface\s+public void clearBasicAuth\(\)/);
assert.match(authBridge, /credentialStore\.hasBasicAuth\(\)/);
assert.match(authBridge, /credentialStore\.clearBasicAuth\(\)/);
assert.doesNotMatch(authBridge, /RemoteWebViewController/);
assert.doesNotMatch(authBridge, /getRemoteUrl/);
assert.doesNotMatch(authBridge, /setRemoteUrl/);
assert.doesNotMatch(authBridge, /reloadRemote/);
assert.doesNotMatch(authBridge, /loadFallback/);
assert.doesNotMatch(authBridge, /CookieManager/);
assert.doesNotMatch(authBridge, /job_sprint_session/);

assert.match(sessionBridge, /final class AndroidSessionCookieBridge/);
assert.match(sessionBridge, /private static final String SESSION_COOKIE = "job_sprint_session"/);
assert.match(sessionBridge, /private final Activity activity/);
assert.match(sessionBridge, /private final RemoteWebViewController remoteWebViewController/);
assert.match(sessionBridge, /@JavascriptInterface\s+public boolean hasSessionCookie\(\)/);
assert.match(sessionBridge, /@JavascriptInterface\s+public void clearSessionCookie\(\)/);
assert.match(sessionBridge, /@JavascriptInterface\s+public void clearSessionAndOpenLogin\(\)/);
assert.match(sessionBridge, /RemoteUrlPolicy\.isUsableRemoteUrl\(remoteUrl\)/);
assert.match(sessionBridge, /CookieManager\.getInstance\(\)\.getCookie\(remoteUrl\)/);
assert.match(sessionBridge, /cookieHeader\.contains\(SESSION_COOKIE \+ "="\)/);
assert.match(sessionBridge, /cookieManager\.setCookie\(remoteUrl, SESSION_COOKIE \+ "=; Path=\/; Max-Age=0"\)/);
assert.match(sessionBridge, /cookieManager\.setCookie\(remoteUrl, SESSION_COOKIE \+ "=; Path=\/job-sprint; Max-Age=0"\)/);
assert.match(sessionBridge, /cookieManager\.flush\(\)/);
assert.match(sessionBridge, /远端 URL 不可用，未清除 session cookie/);
assert.match(sessionBridge, /远端 URL 不可用，无法打开登录页/);
assert.match(sessionBridge, /remoteWebViewController\.loadLoginOrFallback\(\)/);
assert.match(sessionBridge, /已清除 session cookie，正在打开登录页/);
assert.match(sessionBridge, /private void clearSessionCookieFor\(String remoteUrl\)/);
assert.doesNotMatch(sessionBridge, /AuthCredentialStore/);
assert.doesNotMatch(sessionBridge, /clearBasicAuth/);

assert.match(initializer, /new AndroidRemoteSettingsBridge\(activity, remoteWebViewController\)/);
assert.match(initializer, /new AndroidAuthSettingsBridge\(activity, credentialStore\)/);
assert.match(initializer, /new AndroidSessionCookieBridge\(activity, remoteWebViewController\)/);
assert.match(initializer, /addJavascriptInterface\([\s\S]*"AndroidRemoteSettings"/);
assert.match(initializer, /addJavascriptInterface\([\s\S]*"AndroidAuthSettings"/);
assert.match(initializer, /addJavascriptInterface\([\s\S]*"AndroidSessionCookies"/);
assert.doesNotMatch(initializer, /new AndroidSettingsBridge/);
assert.doesNotMatch(initializer, /"AndroidSettings"/);
assert.doesNotMatch(activity, /private class AndroidSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidRemoteSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidAuthSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidSessionCookieBridge/);
assert.doesNotMatch(activity, /addJavascriptInterface/);
assert.doesNotMatch(activity, /private void clearSavedBasicAuth/);
assert.doesNotMatch(activity, /job_sprint_session/);

assert.strictEqual(scheduleJs, androidScheduleJs, "root and Android fallback schedule.js should stay in sync");
assert.strictEqual(scheduleHtml, androidScheduleHtml, "root and Android fallback schedule.html should stay in sync");
assert.match(scheduleJs, /function androidSessionCookieBridge\(\)/);
assert.match(scheduleJs, /window\.AndroidSessionCookies/);
assert.match(scheduleJs, /sessionBridge\.hasSessionCookie\(\)/);
assert.match(scheduleJs, /Session：\$\{hasSessionCookie \? "已保存 cookie" : "未检测到 cookie"\}/);
assert.match(scheduleJs, /clearAndroidSessionBtn: document\.getElementById\("clearAndroidSessionBtn"\)/);
assert.match(scheduleJs, /reopenAndroidLoginBtn: document\.getElementById\("reopenAndroidLoginBtn"\)/);
assert.match(scheduleJs, /sessionBridge\.clearSessionCookie\(\)/);
assert.match(scheduleJs, /sessionBridge\.clearSessionAndOpenLogin\(\)/);
assert.match(scheduleHtml, /id="clearAndroidSessionBtn"/);
assert.match(scheduleHtml, /id="reopenAndroidLoginBtn"/);
assert.match(scheduleHtml, /清除 session cookie/);
assert.match(scheduleHtml, /重新登录/);
assert.match(scheduleHtml, /清除 Basic Auth/);

console.log("android settings bridge tests passed");

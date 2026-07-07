const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/RemoteWebViewController.java",
  "utf8",
);
const remoteWebViewClient = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteWebViewClient.java",
  "utf8",
);

assert.match(controller, /final class RemoteWebViewController/);
assert.match(controller, /LOCAL_REACT_ASSET_PATH = "react\/index\.html"/);
assert.match(controller, /LOCAL_FALLBACK_URL = "file:\/\/\/android_asset\/web\/schedule\.html"/);
assert.match(controller, /void loadRemoteOrFallback\(String fallbackReason\)/);
assert.match(controller, /String getConfiguredRemoteUrl\(\)/);
assert.match(controller, /boolean saveRemoteUrl\(String url\)/);
assert.match(controller, /boolean loadLoginOrFallback\(\)/);
assert.match(controller, /void loadLocalReactOrFallback\(\)/);
assert.match(controller, /void loadFallback\(String reason\)/);
assert.match(controller, /RemoteUrlPolicy\.normalizeRemoteUrl/);
assert.match(controller, /RemoteUrlPolicy\.isUsableRemoteUrl/);
assert.match(controller, /RemoteUrlPolicy\.loginUrlFor\(getConfiguredRemoteUrl\(\)\)/);
assert.match(controller, /webView\.loadUrl\(loginUrl\)/);
assert.match(controller, /lastLoadedUrl = loginUrl/);
assert.match(controller, /settings\.setAllowFileAccess\(false\)/);
assert.match(controller, /settings\.setAllowFileAccess\(true\)/);

assert.match(startup, /RemoteWebViewController remoteWebViewController = new RemoteWebViewController/);
assert.match(startup, /remoteWebViewController\.loadRemoteOrFallback/);
assert.match(startup, /remoteWebViewController\.loadLocalReactOrFallback/);
assert.match(remoteWebViewClient, /remoteWebViewController\.loadFallback/);
assert.doesNotMatch(activity, /RemoteWebViewController/);
assert.doesNotMatch(activity, /remoteWebViewController/);
assert.doesNotMatch(activity, /remoteWebViewController\.loadFallback/);
assert.doesNotMatch(activity, /LOCAL_REACT_ASSET_PATH/);
assert.doesNotMatch(activity, /LOCAL_FALLBACK_URL/);
assert.doesNotMatch(activity, /private boolean fallbackLoaded/);
assert.doesNotMatch(activity, /private void configureRemoteWebSettings/);

console.log("android remote webview controller tests passed");

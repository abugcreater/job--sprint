const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);

assert.match(initializer, /final class AndroidWebViewInitializer/);
assert.match(initializer, /private final Activity activity/);
assert.match(initializer, /private final WebView webView/);
assert.match(initializer, /private final RemoteWebViewController remoteWebViewController/);
assert.match(initializer, /private final AuthCredentialStore credentialStore/);
assert.match(initializer, /private final AndroidBasicAuthController basicAuthController/);
assert.match(initializer, /private final int audioPermissionRequest/);
assert.match(initializer, /AndroidActivityLifecycleController initialize\(\)/);
assert.match(initializer, /private void configureSettings\(\)/);
assert.match(initializer, /WebView\.setWebContentsDebuggingEnabled\(true\)/);
assert.match(initializer, /WebSettings settings = webView\.getSettings\(\)/);
assert.match(initializer, /settings\.setUserAgentString\("JobSprintAndroidWebView\/1\.0"\)/);
assert.match(initializer, /settings\.setJavaScriptEnabled\(true\)/);
assert.match(initializer, /settings\.setDomStorageEnabled\(true\)/);
assert.match(initializer, /settings\.setDatabaseEnabled\(true\)/);
assert.match(initializer, /settings\.setMediaPlaybackRequiresUserGesture\(false\)/);
assert.match(initializer, /remoteWebViewController\.configureRemoteWebSettings\(\)/);
assert.match(initializer, /new AndroidSpeechBridge\(activity, webView, audioPermissionRequest\)/);
assert.match(initializer, /new AndroidRecorderBridge\([\s\S]*remoteWebViewController,[\s\S]*audioPermissionRequest[\s\S]*\)/);
assert.match(initializer, /webView\.addJavascriptInterface\(speechBridge, "AndroidSpeech"\)/);
assert.match(initializer, /webView\.addJavascriptInterface\(recorderBridge, "AndroidRecorder"\)/);
assert.match(initializer, /new AndroidRemoteSettingsBridge\(activity, remoteWebViewController\)/);
assert.match(initializer, /new AndroidAuthSettingsBridge\(activity, credentialStore\)/);
assert.match(initializer, /new AndroidSessionCookieBridge\(activity, remoteWebViewController\)/);
assert.match(initializer, /webView\.addJavascriptInterface\([\s\S]*"AndroidRemoteSettings"/);
assert.match(initializer, /webView\.addJavascriptInterface\([\s\S]*"AndroidAuthSettings"/);
assert.match(initializer, /webView\.addJavascriptInterface\([\s\S]*"AndroidSessionCookies"/);
assert.match(initializer, /webView\.setWebChromeClient\(new AndroidWebChromePermissionController\(activity, audioPermissionRequest\)\)/);
assert.match(initializer, /webView\.setWebViewClient\(new AndroidRemoteWebViewClient\(basicAuthController, remoteWebViewController\)\)/);
assert.match(initializer, /return new AndroidActivityLifecycleController\(/);

assert.match(startup, /new AndroidWebViewInitializer\(/);
assert.match(startup, /\)\.initialize\(\)/);
assert.doesNotMatch(activity, /AndroidWebViewInitializer/);
assert.doesNotMatch(activity, /private void configureWebView/);
assert.doesNotMatch(activity, /WebSettings/);
assert.doesNotMatch(activity, /new AndroidSpeechBridge/);
assert.doesNotMatch(activity, /new AndroidRecorderBridge/);
assert.doesNotMatch(activity, /new AndroidSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidRemoteSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidAuthSettingsBridge/);
assert.doesNotMatch(activity, /new AndroidSessionCookieBridge/);
assert.doesNotMatch(activity, /addJavascriptInterface/);
assert.doesNotMatch(activity, /setWebChromeClient/);
assert.doesNotMatch(activity, /setWebViewClient/);

assert.doesNotMatch(initializer, /loadRemoteOrFallback/);
assert.doesNotMatch(initializer, /loadLocalReactOrFallback/);
assert.doesNotMatch(initializer, /setStatusBarColor/);
assert.doesNotMatch(initializer, /setContentView/);

console.log("android webview initializer tests passed");

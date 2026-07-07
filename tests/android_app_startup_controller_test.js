const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);

assert.match(startup, /final class AndroidAppStartupController/);
assert.match(startup, /private final Activity activity/);
assert.match(startup, /private final int audioPermissionRequest/);
assert.match(startup, /private final boolean loadRemoteByDefault/);
assert.match(startup, /AndroidActivityLifecycleController start\(\)/);
assert.match(startup, /AuthCredentialStore credentialStore = new AuthCredentialStore\(activity\)/);
assert.match(startup, /AndroidWindowLayoutController windowLayoutController = new AndroidWindowLayoutController\(activity\)/);
assert.match(startup, /windowLayoutController\.configureWindowChrome\(\)/);
assert.match(startup, /WebView webView = windowLayoutController\.createWebView\(\)/);
assert.match(startup, /windowLayoutController\.attachContentView\(webView\)/);
assert.match(startup, /RemoteWebViewController remoteWebViewController = new RemoteWebViewController\(/);
assert.match(startup, /activity\.getString\(R\.string\.remote_schedule_url\)/);
assert.match(startup, /AndroidBasicAuthController basicAuthController = new AndroidBasicAuthController\(/);
assert.match(startup, /new AndroidWebViewInitializer\(/);
assert.match(startup, /\)\.initialize\(\)/);
assert.match(startup, /if \(loadRemoteByDefault\)/);
assert.match(startup, /remoteWebViewController\.loadRemoteOrFallback\("未配置可用远端服务地址"\)/);
assert.match(startup, /remoteWebViewController\.loadLocalReactOrFallback\(\)/);
assert.match(startup, /return lifecycleController/);

assert.match(activity, /private static final boolean LOAD_REMOTE_BY_DEFAULT = true/);
assert.match(activity, /static final String EXTRA_FORCE_LOCAL_START = "com\.kai\.jobsprint\.FORCE_LOCAL_START"/);
assert.match(activity, /private AndroidActivityLifecycleController lifecycleController/);
assert.match(activity, /boolean loadRemoteByDefault = LOAD_REMOTE_BY_DEFAULT[\s\S]*getIntent\(\)\.getBooleanExtra\(EXTRA_FORCE_LOCAL_START, false\)/);
assert.match(activity, /lifecycleController = new AndroidAppStartupController\(/);
assert.match(activity, /AUDIO_PERMISSION_REQUEST,[\s\S]*loadRemoteByDefault[\s\S]*\)\.start\(\)/);
assert.doesNotMatch(activity, /AuthCredentialStore/);
assert.doesNotMatch(activity, /AndroidWindowLayoutController/);
assert.doesNotMatch(activity, /RemoteWebViewController/);
assert.doesNotMatch(activity, /AndroidBasicAuthController/);
assert.doesNotMatch(activity, /AndroidWebViewInitializer/);
assert.doesNotMatch(activity, /WebView/);
assert.doesNotMatch(activity, /loadRemoteOrFallback/);
assert.doesNotMatch(activity, /loadLocalReactOrFallback/);

assert.doesNotMatch(startup, /addJavascriptInterface/);
assert.doesNotMatch(startup, /setWebChromeClient/);
assert.doesNotMatch(startup, /setWebViewClient/);
assert.doesNotMatch(startup, /setStatusBarColor/);
assert.doesNotMatch(startup, /onRequestPermissionsResult/);

console.log("android app startup controller tests passed");

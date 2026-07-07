const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidActivityLifecycleController.java",
  "utf8"
);
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);

assert.match(controller, /final class AndroidActivityLifecycleController/);
assert.match(controller, /private final WebView webView/);
assert.match(controller, /private final AndroidSpeechBridge speechBridge/);
assert.match(controller, /private final AndroidRecorderBridge recorderBridge/);
assert.match(controller, /private final int audioPermissionRequest/);
assert.match(controller, /void onAudioPermissionResult\(int requestCode, int\[\] grantResults\)/);
assert.match(controller, /requestCode != audioPermissionRequest/);
assert.match(controller, /PackageManager\.PERMISSION_GRANTED/);
assert.match(controller, /speechBridge\.onAudioPermissionResult\(granted\)/);
assert.match(controller, /recorderBridge\.onAudioPermissionResult\(granted\)/);
assert.match(controller, /void onPause\(\)/);
assert.match(controller, /speechBridge\.cancelFromLifecycle\(\)/);
assert.match(controller, /recorderBridge\.cancelFromLifecycle\(\)/);
assert.match(controller, /void onDestroy\(\)/);
assert.match(controller, /speechBridge\.destroy\(\)/);
assert.match(controller, /recorderBridge\.destroy\(\)/);
assert.match(controller, /webView\.destroy\(\)/);
assert.match(controller, /boolean handleBackPressed\(\)/);
assert.match(controller, /webView\.canGoBack\(\)/);
assert.match(controller, /webView\.goBack\(\)/);
assert.match(controller, /return true/);
assert.match(controller, /return false/);

assert.match(activity, /private AndroidActivityLifecycleController lifecycleController/);
assert.match(activity, /lifecycleController = new AndroidAppStartupController\(/);
assert.match(startup, /AndroidActivityLifecycleController lifecycleController = new AndroidWebViewInitializer\(/);
assert.match(initializer, /return new AndroidActivityLifecycleController\(/);
assert.match(activity, /lifecycleController\.onAudioPermissionResult\(requestCode, grantResults\)/);
assert.match(activity, /lifecycleController\.onDestroy\(\)/);
assert.match(activity, /lifecycleController\.onPause\(\)/);
assert.match(activity, /lifecycleController\.handleBackPressed\(\)/);
assert.match(activity, /super\.onRequestPermissionsResult\(requestCode, permissions, grantResults\)/);
assert.match(activity, /super\.onDestroy\(\)/);
assert.match(activity, /super\.onPause\(\)/);
assert.match(activity, /super\.onBackPressed\(\)/);

assert.doesNotMatch(activity, /speechBridge\.onAudioPermissionResult/);
assert.doesNotMatch(activity, /recorderBridge\.onAudioPermissionResult/);
assert.doesNotMatch(activity, /speechBridge\.cancelFromLifecycle/);
assert.doesNotMatch(activity, /recorderBridge\.cancelFromLifecycle/);
assert.doesNotMatch(activity, /speechBridge\.destroy/);
assert.doesNotMatch(activity, /recorderBridge\.destroy/);
assert.doesNotMatch(activity, /webView\.destroy/);
assert.doesNotMatch(activity, /webView\.canGoBack/);
assert.doesNotMatch(activity, /webView\.goBack/);
assert.doesNotMatch(activity, /PackageManager\.PERMISSION_GRANTED/);

assert.doesNotMatch(controller, /setWebViewClient/);
assert.doesNotMatch(controller, /setWebChromeClient/);
assert.doesNotMatch(controller, /addJavascriptInterface/);
assert.doesNotMatch(controller, /RemoteUrlPolicy/);

console.log("android activity lifecycle controller tests passed");

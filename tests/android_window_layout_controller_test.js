const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const startup = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAppStartupController.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWindowLayoutController.java",
  "utf8"
);
const manifest = fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml", "utf8");

assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);

assert.match(controller, /final class AndroidWindowLayoutController/);
assert.match(controller, /private final Activity activity/);
assert.match(controller, /void configureWindowChrome\(\)/);
assert.match(controller, /setStatusBarColor\(Color\.rgb\(23, 33, 31\)\)/);
assert.match(controller, /setNavigationBarColor\(Color\.WHITE\)/);
assert.match(controller, /private void configureSystemBars\(\)/);
assert.doesNotMatch(controller, /View\.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR/);
assert.match(controller, /View\.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR/);
assert.match(controller, /setSystemUiVisibility\(flags\)/);
assert.match(controller, /WebView createWebView\(\)/);
assert.match(controller, /new WebView\(activity\)/);
assert.match(controller, /webView\.setBackgroundColor\(Color\.rgb\(242, 244, 241\)\)/);
assert.match(controller, /void attachContentView\(WebView webView\)/);
assert.match(controller, /new FrameLayout\(activity\)/);
assert.match(controller, /root\.setBackgroundColor\(Color\.rgb\(242, 244, 241\)\)/);
assert.doesNotMatch(controller, /root\.setPadding/);
assert.match(controller, /root\.addView\(webView, new FrameLayout\.LayoutParams/);
assert.match(controller, /ViewGroup\.LayoutParams\.MATCH_PARENT/);
assert.match(controller, /activity\.setContentView\(root\)/);
assert.doesNotMatch(controller, /requestApplyInsets/);
assert.doesNotMatch(controller, /applySystemBarInsets/);
assert.doesNotMatch(controller, /WindowInsets/);
assert.doesNotMatch(controller, /statusBarHeight/);

assert.match(startup, /AndroidWindowLayoutController windowLayoutController = new AndroidWindowLayoutController\(activity\)/);
assert.match(startup, /windowLayoutController\.configureWindowChrome\(\)/);
assert.match(startup, /WebView webView = windowLayoutController\.createWebView\(\)/);
assert.match(startup, /windowLayoutController\.attachContentView\(webView\)/);
assert.doesNotMatch(activity, /AndroidWindowLayoutController/);
assert.doesNotMatch(activity, /setStatusBarColor/);
assert.doesNotMatch(activity, /setNavigationBarColor/);
assert.doesNotMatch(activity, /configureSystemBars/);
assert.doesNotMatch(activity, /setSystemUiVisibility/);
assert.doesNotMatch(activity, /new WebView\(this\)/);
assert.doesNotMatch(activity, /new FrameLayout/);
assert.doesNotMatch(activity, /setContentView\(root\)/);
assert.doesNotMatch(activity, /requestApplyInsets/);
assert.doesNotMatch(activity, /statusBarHeight/);
assert.doesNotMatch(activity, /WindowInsets/);
assert.doesNotMatch(activity, /Insets/);
assert.doesNotMatch(activity, /ViewGroup/);

assert.doesNotMatch(controller, /addJavascriptInterface/);
assert.doesNotMatch(controller, /setWebViewClient/);
assert.doesNotMatch(controller, /setWebChromeClient/);
assert.doesNotMatch(controller, /RemoteUrlPolicy/);

console.log("android window layout controller tests passed");

const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebChromePermissionController.java",
  "utf8"
);

assert.match(controller, /final class AndroidWebChromePermissionController extends WebChromeClient/);
assert.match(controller, /private final Activity activity/);
assert.match(controller, /private final int audioPermissionRequest/);
assert.match(controller, /public void onPermissionRequest\(PermissionRequest request\)/);
assert.match(controller, /activity\.runOnUiThread\(\(\) -> handlePermissionRequest\(request\)\)/);
assert.match(controller, /private void handlePermissionRequest\(PermissionRequest request\)/);
assert.match(controller, /private boolean requestsAudioCapture\(PermissionRequest request\)/);
assert.match(controller, /PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
assert.match(controller, /activity\.checkSelfPermission\(Manifest\.permission\.RECORD_AUDIO\)/);
assert.match(controller, /PackageManager\.PERMISSION_GRANTED/);
assert.match(controller, /request\.grant\(new String\[\] \{ PermissionRequest\.RESOURCE_AUDIO_CAPTURE \}\)/);
assert.match(controller, /activity\.requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}, audioPermissionRequest\)/);
assert.match(controller, /request\.deny\(\)/);

assert.match(initializer, /webView\.setWebChromeClient\(new AndroidWebChromePermissionController\(activity, audioPermissionRequest\)\)/);
assert.doesNotMatch(activity, /setWebChromeClient/);
assert.doesNotMatch(activity, /new WebChromeClient\(\)/);
assert.doesNotMatch(activity, /onPermissionRequest\(PermissionRequest request\)/);
assert.doesNotMatch(activity, /PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
assert.doesNotMatch(activity, /Manifest\.permission\.RECORD_AUDIO/);
assert.doesNotMatch(activity, /requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}/);

assert.doesNotMatch(controller, /setWebViewClient/);
assert.doesNotMatch(controller, /addJavascriptInterface/);
assert.doesNotMatch(controller, /HttpAuthHandler/);

console.log("android web chrome permission controller tests passed");

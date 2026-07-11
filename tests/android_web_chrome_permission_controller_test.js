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
const fileChooserPath = "apps/android/app/src/main/java/com/kai/jobsprint/AndroidFileChooserController.java";
const fileChooser = fs.existsSync(fileChooserPath) ? fs.readFileSync(fileChooserPath, "utf8") : "";
const lifecycle = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidActivityLifecycleController.java",
  "utf8"
);

assert.match(controller, /final class AndroidWebChromePermissionController extends WebChromeClient/);
assert.match(controller, /private final Activity activity/);
assert.match(controller, /private final int audioPermissionRequest/);
assert.match(controller, /private final AndroidFileChooserController fileChooserController/);
assert.match(controller, /public boolean onShowFileChooser\(/);
assert.match(controller, /return fileChooserController\.showFileChooser\(filePathCallback, fileChooserParams\)/);
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

assert.match(fileChooser, /final class AndroidFileChooserController/);
assert.match(fileChooser, /private ValueCallback<Uri\[\]> pendingFileCallback/);
assert.match(fileChooser, /boolean showFileChooser\(ValueCallback<Uri\[\]> callback, WebChromeClient\.FileChooserParams params\)/);
assert.match(fileChooser, /activity\.startActivityForResult\(chooserIntent, FILE_CHOOSER_REQUEST\)/);
assert.match(fileChooser, /WebChromeClient\.FileChooserParams\.parseResult\(resultCode, data\)/);
assert.match(fileChooser, /boolean onActivityResult\(int requestCode, int resultCode, Intent data\)/);
assert.match(fileChooser, /void cancelPendingRequest\(\)/);
assert.match(initializer, /AndroidFileChooserController fileChooserController = new AndroidFileChooserController\(activity\)/);
assert.match(initializer, /new AndroidWebChromePermissionController\([\s\S]*activity,[\s\S]*audioPermissionRequest,[\s\S]*fileChooserController[\s\S]*\)/);
assert.match(initializer, /fileChooserController[\s\S]*audioPermissionRequest/);
assert.match(lifecycle, /private final AndroidFileChooserController fileChooserController/);
assert.match(lifecycle, /boolean onActivityResult\(int requestCode, int resultCode, Intent data\)/);
assert.match(lifecycle, /return fileChooserController != null && fileChooserController\.onActivityResult\(requestCode, resultCode, data\)/);
assert.match(lifecycle, /fileChooserController\.cancelPendingRequest\(\)/);
assert.match(activity, /protected void onActivityResult\(int requestCode, int resultCode, Intent data\)/);
assert.match(activity, /lifecycleController\.onActivityResult\(requestCode, resultCode, data\)/);
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

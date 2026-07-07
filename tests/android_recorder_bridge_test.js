const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const recorder = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderBridge.java", "utf8");
const recorderUploader = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderUploader.java",
  "utf8"
);
const endpointResolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidTranscribeEndpointResolver.java",
  "utf8"
);

assert.match(recorder, /final class AndroidRecorderBridge/);
assert.match(recorder, /private final Activity activity/);
assert.match(recorder, /private final WebView webView/);
assert.match(recorder, /private final RemoteWebViewController remoteWebViewController/);
assert.match(recorder, /private final int audioPermissionRequest/);
assert.match(recorder, /private final AndroidTranscribeEndpointResolver endpointResolver/);
assert.match(recorder, /private final AndroidRecorderUploader recorderUploader/);
assert.match(recorder, /@JavascriptInterface\s+public boolean isAvailable\(\)/);
assert.match(recorder, /@JavascriptInterface\s+public String getStatus\(\)/);
assert.match(recorder, /@JavascriptInterface\s+public void startRecording\(\)/);
assert.match(recorder, /@JavascriptInterface\s+public void stopAndTranscribe\(\)/);
assert.match(recorder, /void onAudioPermissionResult\(boolean granted\)/);
assert.match(recorder, /void cancelFromLifecycle\(\)/);
assert.match(recorder, /void destroy\(\)/);
assert.match(recorder, /MediaRecorder/);
assert.match(recorder, /activity\.requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}, audioPermissionRequest\)/);
assert.match(recorder, /endpointResolver\.resolve\(\)/);
assert.match(endpointResolver, /remoteWebViewController\.lastLoadedUrl\(\)/);
assert.match(endpointResolver, /remoteWebViewController\.getConfiguredRemoteUrl\(\)/);
assert.match(endpointResolver, /RemoteUrlPolicy\.isUsableRemoteUrl/);
assert.match(endpointResolver, /\/api\/transcribe/);
assert.match(recorder, /recorderUploader\.upload\(file, endpoint, new AndroidRecorderUploader\.Callback\(\) \{/);
assert.match(recorderUploader, /CookieManager\.getInstance\(\)\.getCookie\(endpoint\)/);
assert.match(recorder, /window\.onAndroidRecordingState/);
assert.match(recorder, /window\.onAndroidRecordingError/);
assert.match(recorder, /window\.onAndroidRecordingFinal/);

assert.match(initializer, /new AndroidRecorderBridge\([\s\S]*activity,[\s\S]*webView,[\s\S]*remoteWebViewController,[\s\S]*audioPermissionRequest[\s\S]*\)/);
assert.match(initializer, /addJavascriptInterface\(recorderBridge, "AndroidRecorder"\)/);
assert.doesNotMatch(activity, /private class AndroidRecorderBridge/);
assert.doesNotMatch(activity, /new AndroidRecorderBridge/);
assert.doesNotMatch(activity, /addJavascriptInterface/);
assert.doesNotMatch(activity, /new MediaRecorder\(\)/);
assert.doesNotMatch(activity, /\/api\/transcribe/);
assert.doesNotMatch(recorder, /Uri\.parse/);
assert.doesNotMatch(recorder, /endpointFromPageUrl/);
assert.doesNotMatch(recorder, /HttpURLConnection/);
assert.doesNotMatch(recorder, /writeMultipartAudio/);
assert.doesNotMatch(recorder, /readConnectionBody/);

console.log("android recorder bridge tests passed");

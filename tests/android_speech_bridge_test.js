const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("schedule.html", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const basicAuthController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidBasicAuthController.java",
  "utf8"
);
const remoteWebViewClient = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteWebViewClient.java",
  "utf8"
);
const lifecycleController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidActivityLifecycleController.java",
  "utf8"
);
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const speechBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const speechCallbackEmitter = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechCallbackEmitter.java",
  "utf8"
);
const speechStartCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechStartCoordinator.java",
  "utf8"
);
const speechRecognizerController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechRecognizerController.java",
  "utf8"
);
const speechSessionState = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechSessionState.java",
  "utf8"
);
const speechErrorCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java",
  "utf8"
);
const speechServiceResolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechServiceResolver.java",
  "utf8"
);
const speechErrorPolicy = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorPolicy.java",
  "utf8"
);
const remoteSettingsBridge = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidRemoteSettingsBridge.java",
  "utf8"
);
const authSettingsBridge = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidAuthSettingsBridge.java",
  "utf8"
);
const manifest = fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml", "utf8");

assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
assert.match(manifest, /android\.permission\.INTERNET/);
assert.match(manifest, /android\.permission\.ACCESS_NETWORK_STATE/);
assert.match(manifest, /android:usesCleartextTraffic="true"/);

assert.match(speechBridge, /final class AndroidSpeechBridge/);
assert.doesNotMatch(activity, /private class AndroidSpeechBridge/);
assert.match(initializer, /new AndroidSpeechBridge\(activity, webView, audioPermissionRequest\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public void startListening\(\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public void stopListening\(\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public void cancelListening\(\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public boolean isAvailable\(\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public String getStatus\(\)/);
assert.match(speechBridge, /@JavascriptInterface\s+public void setLanguage\(String nextLanguage\)/);
assert.match(initializer, /addJavascriptInterface\(speechBridge, "AndroidSpeech"\)/);
assert.match(speechBridge, /private final AndroidSpeechServiceResolver serviceResolver/);
assert.match(speechBridge, /serviceResolver\.selectedRecognitionService\(\)/);
assert.match(speechServiceResolver, /SpeechRecognizer\.isRecognitionAvailable\(activity\)/);
assert.match(speechServiceResolver, /RecognitionService\.SERVICE_INTERFACE/);
assert.match(speechServiceResolver, /queryIntentServices\(serviceIntent, flags\)/);
assert.match(speechBridge, /private final AndroidSpeechRecognizerController recognizerController/);
assert.match(speechBridge, /private final AndroidSpeechStartCoordinator startCoordinator/);
assert.match(speechBridge, /private final AndroidSpeechErrorCoordinator errorCoordinator/);
assert.match(speechBridge, /AndroidSpeechStartCoordinator\.Events/);
assert.match(speechBridge, /AndroidSpeechErrorCoordinator\.Events/);
assert.match(speechBridge, /AndroidSpeechRecognizerController\.Events/);
assert.match(speechBridge, /startCoordinator\.startListening\(\)/);
assert.match(speechBridge, /errorCoordinator\.startRecognizer\(recognizerController, language\)/);
assert.match(speechErrorCoordinator, /recognizerController\.start\(language\)/);
assert.match(speechRecognizerController, /SpeechRecognizer\.createSpeechRecognizer/);
assert.match(speechRecognizerController, /RecognizerIntent\.ACTION_RECOGNIZE_SPEECH/);
assert.match(speechRecognizerController, /RecognizerIntent\.EXTRA_PARTIAL_RESULTS/);
assert.match(speechRecognizerController, /RecognizerIntent\.EXTRA_MAX_RESULTS/);
assert.match(speechRecognizerController, /ensureRecognizer\(\)/);
assert.match(speechBridge, /private final AndroidSpeechCallbackEmitter callbackEmitter/);
assert.match(speechBridge, /callbackEmitter\.emitState\(/);
assert.match(speechCallbackEmitter, /window\.onAndroidSpeechState/);
assert.match(speechCallbackEmitter, /window\.onAndroidSpeechPartial/);
assert.match(speechCallbackEmitter, /window\.onAndroidSpeechFinal/);
assert.match(speechCallbackEmitter, /window\.onAndroidSpeechError/);
assert.match(speechBridge, /private final AndroidSpeechSessionState sessionState/);
assert.match(speechBridge, /sessionState\.cooldownRemainingMs\(\)/);
assert.match(speechStartCoordinator, /sessionState\.debounceRemainingMs\(\)/);
assert.match(speechStartCoordinator, /sessionState\.markStartAttempt\(\)/);
assert.match(speechSessionState, /cooldownUntilMs/);
assert.match(speechSessionState, /START_DEBOUNCE_MS/);
assert.match(speechErrorCoordinator, /private final AndroidSpeechErrorPolicy errorPolicy/);
assert.match(speechErrorCoordinator, /errorPolicy\.codeFor\(error\)/);
assert.match(speechErrorCoordinator, /errorPolicy\.cooldownFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(speechErrorCoordinator, /errorPolicy\.messageFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(speechErrorCoordinator, /errorPolicy\.isRetryable\(error\)/);
assert.match(speechBridge, /errorCoordinator\.handleSpeechError\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(speechErrorPolicy, /ERROR_RECOGNIZER_BUSY/);
assert.match(speechErrorPolicy, /ERROR_TOO_MANY_REQUESTS/);
assert.match(speechErrorPolicy, /TOO_MANY_REQUESTS_COOLDOWN_MS/);
assert.match(speechBridge, /onAudioPermissionResult\(boolean granted\)/);
assert.match(speechBridge, /startCoordinator\.onAudioPermissionResult\(granted\)/);
assert.match(speechStartCoordinator, /activity\.requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}, audioPermissionRequest\)/);
assert.doesNotMatch(speechBridge, /RecognitionService\.SERVICE_INTERFACE/);
assert.doesNotMatch(speechBridge, /queryIntentServices/);
assert.doesNotMatch(speechBridge, /defaultVoiceRecognitionService/);
assert.doesNotMatch(speechBridge, /Manifest\.permission\.RECORD_AUDIO/);
assert.doesNotMatch(speechBridge, /requestPermissions\(new String\[\]/);
assert.doesNotMatch(speechBridge, /private String speechErrorCode/);
assert.doesNotMatch(speechBridge, /private String speechErrorMessage/);
assert.doesNotMatch(speechBridge, /private long cooldownForError/);
assert.doesNotMatch(speechBridge, /private final AndroidSpeechErrorPolicy/);
assert.doesNotMatch(speechBridge, /errorPolicy\./);
assert.doesNotMatch(speechBridge, /ActivityNotFoundException/);
assert.doesNotMatch(speechBridge, /private boolean listening = false/);
assert.doesNotMatch(speechBridge, /private String speechPhase =/);
assert.doesNotMatch(speechBridge, /private long cooldownUntilMs =/);
assert.doesNotMatch(speechBridge, /webView\.evaluateJavascript/);
assert.doesNotMatch(speechBridge, /JSONObject payload/);
assert.doesNotMatch(speechBridge, /new RecognitionListener\(\)/);
assert.doesNotMatch(speechBridge, /RecognizerIntent\.ACTION_RECOGNIZE_SPEECH/);
assert.doesNotMatch(speechBridge, /SpeechRecognizer\.RESULTS_RECOGNITION/);
assert.match(lifecycleController, /speechBridge\.cancelFromLifecycle\(\)/);
assert.match(activity, /lifecycleController\.onPause\(\)/);
assert.doesNotMatch(activity, /speechBridge\.cancelFromLifecycle/);

assert.match(html, /正在进入 Job Sprint/);
assert.match(html, /React 今日页/);
assert.doesNotMatch(html, /id="androidSettingsPanel"/);
assert.doesNotMatch(html, /id="androidRemoteUrlInput"/);
assert.match(remoteSettingsBridge, /class AndroidRemoteSettingsBridge/);
assert.match(remoteSettingsBridge, /setRemoteUrl\(String url\)/);
assert.match(authSettingsBridge, /class AndroidAuthSettingsBridge/);
assert.match(authSettingsBridge, /clearBasicAuth\(\)/);
assert.match(initializer, /new AndroidRemoteSettingsBridge\(activity, remoteWebViewController\)/);
assert.match(initializer, /new AndroidAuthSettingsBridge\(activity, credentialStore\)/);
assert.doesNotMatch(initializer, /new AndroidSettingsBridge/);
assert.match(remoteWebViewClient, /onReceivedHttpAuthRequest/);
assert.match(remoteWebViewClient, /basicAuthController\.handleHttpAuthRequest\(handler, host, realm\)/);
assert.match(basicAuthController, /trySavedBasicAuth/);
assert.doesNotMatch(activity, /onReceivedHttpAuthRequest/);
assert.doesNotMatch(activity, /private boolean trySavedBasicAuth/);
assert.match(remoteWebViewClient, /onReceivedSslError[\s\S]*handler\.cancel\(\)/);
assert.doesNotMatch(activity, /onReceivedSslError\(WebView view, SslErrorHandler handler, SslError error\)/);
assert.ok(!/onReceivedSslError[\s\S]{0,160}handler\.proceed\(\)/.test(remoteWebViewClient), "SSL errors must not be bypassed");

assert.match(js, /reactTodayPath/);
assert.match(js, /window\.location\.replace/);
assert.doesNotMatch(js, /const nativeBridge = window\.AndroidSpeech/);
assert.doesNotMatch(js, /window\.onAndroidSpeechState/);
assert.doesNotMatch(js, /录音后转写/);
assert.doesNotMatch(js, /window\.AndroidRecorder/);

console.log("android speech bridge tests passed");

const assert = require("assert");
const fs = require("fs");

const activity = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java", "utf8");
const initializer = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidWebViewInitializer.java",
  "utf8"
);
const speechBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const speechCallbackEmitter = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechCallbackEmitter.java", "utf8");
const speechStartCoordinator = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechStartCoordinator.java", "utf8");
const speechRecognizerController = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechRecognizerController.java", "utf8");
const speechSessionState = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechSessionState.java", "utf8");
const speechErrorCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java",
  "utf8"
);
const speechServiceResolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechServiceResolver.java",
  "utf8"
);
const speechErrorPolicy = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorPolicy.java", "utf8");
const recorder = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderBridge.java", "utf8");
const recorderUploader = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderUploader.java", "utf8");
const endpointResolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidTranscribeEndpointResolver.java",
  "utf8"
);
const remoteWebViewController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/RemoteWebViewController.java",
  "utf8",
);
const remotePolicy = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/RemoteUrlPolicy.java", "utf8");
const js = fs.readFileSync("assets/schedule.js", "utf8");
const manifest = fs.readFileSync("apps/android/app/src/main/AndroidManifest.xml", "utf8");

assert.doesNotMatch(activity, /googlequicksearchbox|GoogleRecognitionService|knownGoogleRecognitionService/);
assert.doesNotMatch(speechBridge, /googlequicksearchbox|GoogleRecognitionService|knownGoogleRecognitionService/);
assert.match(speechServiceResolver, /SpeechRecognizer\.isRecognitionAvailable\(activity\)/);
assert.match(speechServiceResolver, /queryIntentServices\(serviceIntent, flags\)/);
assert.match(speechServiceResolver, /RecognitionService\.SERVICE_INTERFACE/);
assert.doesNotMatch(speechBridge, /queryIntentServices/);
assert.match(recorder, /class AndroidRecorderBridge/);
assert.match(initializer, /addJavascriptInterface\(recorderBridge, "AndroidRecorder"\)/);
assert.doesNotMatch(activity, /addJavascriptInterface/);
assert.match(recorder, /MediaRecorder/);
assert.match(recorder, /AndroidRecorderUploader/);
assert.match(recorderUploader, /CookieManager\.getInstance\(\)\.getCookie\(endpoint\)/);
assert.doesNotMatch(recorder, /HttpURLConnection/);
assert.match(endpointResolver, /\/api\/transcribe/);
assert.match(activity, /private static final boolean LOAD_REMOTE_BY_DEFAULT = true/);
assert.match(remotePolicy, /job-sprint\/react\/index\.html#\/today/);
assert.match(remoteWebViewController, /loadLocalReactOrFallback/);
assert.match(endpointResolver, /lastLoadedUrl/);
assert.doesNotMatch(activity, /webView\.getUrl\(\)/);
assert.match(remotePolicy, /your-domain\.example\.com/);
assert.match(manifest, /android\.speech\.RecognitionService/);

assert.match(speechSessionState, /private String phase = PHASE_IDLE/);
assert.match(speechSessionState, /PHASE_STARTING = "starting"/);
assert.match(speechSessionState, /readyForSpeech = true/);
assert.match(speechBridge, /onReadyForSpeech[\s\S]*sessionState\.markListening\(\)/);
assert.match(speechStartCoordinator, /activity\.requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}, audioPermissionRequest\)/);
assert.match(speechStartCoordinator, /sessionState\.markStartAttempt\(\)/);
assert.doesNotMatch(speechBridge, /Manifest\.permission\.RECORD_AUDIO/);
assert.match(speechRecognizerController, /new RecognitionListener\(\)/);
assert.match(speechRecognizerController, /new Intent\(RecognizerIntent\.ACTION_RECOGNIZE_SPEECH\)/);
assert.doesNotMatch(speechBridge, /new RecognitionListener\(\)/);
assert.match(speechBridge, /errorCoordinator\.handleSpeechError\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(speechErrorCoordinator, /errorPolicy\.cooldownFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(speechErrorCoordinator, /sessionState\.recordFailure\(\)/);
assert.match(speechBridge, /AndroidSpeechCallbackEmitter/);
assert.match(speechCallbackEmitter, /window\.onAndroidSpeechFinal/);
assert.doesNotMatch(speechBridge, /webView\.evaluateJavascript/);
assert.match(
  speechErrorPolicy,
  /if \(!wasReadyForSpeech && PHASE_STARTING\.equals\(phaseAtError\)\) \{\s*return 0L;\s*\}/
);

assert.match(js, /reactTodayPath/);
assert.match(js, /window\.location\.replace/);
assert.doesNotMatch(js, /const nativeBridge = window\.AndroidSpeech/);
assert.doesNotMatch(js, /const recorderBridge = window\.AndroidRecorder/);
assert.doesNotMatch(js, /setupRecordUploadProvider/);
assert.doesNotMatch(js, /const Recognition = window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);

console.log("speech provider tests passed");

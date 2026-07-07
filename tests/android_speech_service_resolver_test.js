const assert = require("assert");
const fs = require("fs");

const speechBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const callbackEmitter = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechCallbackEmitter.java",
  "utf8"
);
const recognizerController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechRecognizerController.java",
  "utf8"
);
const resolver = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechServiceResolver.java",
  "utf8"
);

assert.match(resolver, /final class AndroidSpeechServiceResolver/);
assert.match(resolver, /private final Activity activity/);
assert.match(resolver, /AndroidSpeechServiceResolver\(Activity activity\)/);
assert.match(resolver, /boolean isAvailable\(\)/);
assert.match(resolver, /SpeechRecognizer\.isRecognitionAvailable\(activity\)/);
assert.match(resolver, /int recognitionServiceCount\(\)/);
assert.match(resolver, /ComponentName selectedRecognitionService\(\)/);
assert.match(resolver, /String componentToShortString\(ComponentName component\)/);
assert.match(resolver, /Intent serviceIntent = new Intent\(RecognitionService\.SERVICE_INTERFACE\)/);
assert.match(resolver, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.M \? PackageManager\.MATCH_ALL : 0/);
assert.match(resolver, /queryIntentServices\(serviceIntent, flags\)/);
assert.match(resolver, /Settings\.Secure\.getString\(activity\.getContentResolver\(\), "voice_recognition_service"\)/);
assert.match(resolver, /ComponentName\.unflattenFromString\(serviceName\)/);
assert.match(resolver, /services\.contains\(defaultService\)/);
assert.match(resolver, /services\.get\(0\)/);

assert.match(speechBridge, /private final AndroidSpeechServiceResolver serviceResolver/);
assert.match(speechBridge, /this\.serviceResolver = new AndroidSpeechServiceResolver\(activity\)/);
assert.match(speechBridge, /return serviceResolver\.isAvailable\(\)/);
assert.match(speechBridge, /serviceResolver\.recognitionServiceCount\(\)/);
assert.match(speechBridge, /serviceResolver\.selectedRecognitionService\(\)/);
assert.match(recognizerController, /recognizerService = serviceResolver\.selectedRecognitionService\(\)/);
assert.match(speechBridge, /callbackEmitter\.emitState\(state, message, language, recognizerController\.recognizerService\(\), cooldownRemainingMs\(\)\)/);
assert.match(speechBridge, /callbackEmitter\.emitError\(code, message, retryable, cooldownMs, language, recognizerController\.recognizerService\(\)\)/);
assert.match(callbackEmitter, /serviceResolver\.componentToShortString\(recognizerService\)/);
assert.doesNotMatch(speechBridge, /private ComponentName recognizerService/);
assert.doesNotMatch(speechBridge, /RecognitionService\.SERVICE_INTERFACE/);
assert.doesNotMatch(speechBridge, /queryIntentServices/);
assert.doesNotMatch(speechBridge, /defaultVoiceRecognitionService/);
assert.doesNotMatch(speechBridge, /Settings\.Secure/);
assert.doesNotMatch(speechBridge, /Build\.VERSION/);

console.log("android speech service resolver tests passed");

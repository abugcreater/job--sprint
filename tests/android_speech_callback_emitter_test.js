const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const emitter = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechCallbackEmitter.java",
  "utf8"
);

assert.match(emitter, /final class AndroidSpeechCallbackEmitter/);
assert.match(emitter, /private final WebView webView/);
assert.match(emitter, /private final AndroidSpeechSessionState sessionState/);
assert.match(emitter, /private final AndroidSpeechServiceResolver serviceResolver/);
assert.match(emitter, /String status\(/);
assert.match(emitter, /void emitState\(String state, String message, String language, ComponentName recognizerService, long cooldownMs\)/);
assert.match(emitter, /void emitPartial\(String text, String language, ComponentName recognizerService\)/);
assert.match(emitter, /void emitFinal\(String text, String language, ComponentName recognizerService\)/);
assert.match(emitter, /void emitError\(/);
assert.match(emitter, /private JSONObject basePayload/);
assert.match(emitter, /put\(payload, "source", "android-native-speech"\)/);
assert.match(emitter, /put\(payload, "phase", sessionState\.phase\(\)\)/);
assert.match(emitter, /put\(payload, "readyForSpeech", sessionState\.isReadyForSpeech\(\)\)/);
assert.match(emitter, /serviceResolver\.componentToShortString\(recognizerService\)/);
assert.match(emitter, /evaluatePayload\("window\.onAndroidSpeechState", payload\)/);
assert.match(emitter, /evaluatePayload\("window\.onAndroidSpeechPartial", payload\)/);
assert.match(emitter, /evaluatePayload\("window\.onAndroidSpeechFinal", payload\)/);
assert.match(emitter, /evaluatePayload\("window\.onAndroidSpeechError", payload\)/);
assert.match(emitter, /webView\.evaluateJavascript\(script, null\)/);

assert.match(bridge, /private final AndroidSpeechCallbackEmitter callbackEmitter/);
assert.match(bridge, /new AndroidSpeechCallbackEmitter\(webView, sessionState, serviceResolver\)/);
assert.match(bridge, /callbackEmitter\.status\(/);
assert.match(bridge, /callbackEmitter\.emitState\(/);
assert.match(bridge, /callbackEmitter\.emitPartial\(/);
assert.match(bridge, /callbackEmitter\.emitFinal\(/);
assert.match(bridge, /callbackEmitter\.emitError\(/);
assert.doesNotMatch(bridge, /private final WebView webView/);
assert.doesNotMatch(bridge, /JSONObject payload/);
assert.doesNotMatch(bridge, /private JSONObject basePayload/);
assert.doesNotMatch(bridge, /private void put\(JSONObject/);
assert.doesNotMatch(bridge, /webView\.evaluateJavascript/);

console.log("android speech callback emitter tests passed");

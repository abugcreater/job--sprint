const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const coordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java",
  "utf8"
);

assert.match(coordinator, /final class AndroidSpeechErrorCoordinator/);
assert.match(coordinator, /interface Events/);
assert.match(coordinator, /void onRecognizerUnavailable\(\)/);
assert.match(coordinator, /void onRecognizerStartFailed\(\)/);
assert.match(coordinator, /void onResolvedSpeechError\(String code, String message, boolean retryable, long cooldownMs\)/);
assert.match(coordinator, /void onSpeechCooldownStarted\(\)/);
assert.match(coordinator, /private final AndroidSpeechSessionState sessionState/);
assert.match(coordinator, /private final AndroidSpeechErrorPolicy errorPolicy/);
assert.match(coordinator, /this\.errorPolicy = new AndroidSpeechErrorPolicy\(\)/);
assert.match(coordinator, /void startRecognizer\(AndroidSpeechRecognizerController recognizerController, String language\)/);
assert.match(coordinator, /recognizerController\.start\(language\)/);
assert.match(coordinator, /catch \(ActivityNotFoundException error\)[\s\S]*sessionState\.reset\(\)[\s\S]*events\.onRecognizerUnavailable\(\)/);
assert.match(coordinator, /catch \(RuntimeException error\)[\s\S]*Log\.w\(TAG, "SpeechRecognizer start failed: "/);
assert.match(coordinator, /events\.onRecognizerStartFailed\(\)/);
assert.match(coordinator, /void handleSpeechError\(int error, String phaseAtError, boolean wasReadyForSpeech\)/);
assert.match(coordinator, /sessionState\.reset\(\)/);
assert.match(coordinator, /int consecutiveFailures = sessionState\.recordFailure\(\)/);
assert.match(coordinator, /String code = errorPolicy\.codeFor\(error\)/);
assert.match(coordinator, /long cooldownMs = errorPolicy\.cooldownFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(coordinator, /sessionState\.startCooldown\(cooldownMs\)/);
assert.match(coordinator, /String message = errorPolicy\.messageFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(coordinator, /consecutiveFailures >= 3/);
assert.match(coordinator, /events\.onResolvedSpeechError\(code, message, errorPolicy\.isRetryable\(error\), cooldownMs\)/);
assert.match(coordinator, /events\.onSpeechCooldownStarted\(\)/);

assert.match(bridge, /AndroidSpeechErrorCoordinator\.Events/);
assert.match(bridge, /private final AndroidSpeechErrorCoordinator errorCoordinator/);
assert.match(bridge, /new AndroidSpeechErrorCoordinator\(sessionState, this\)/);
assert.match(bridge, /errorCoordinator\.startRecognizer\(recognizerController, language\)/);
assert.match(bridge, /errorCoordinator\.handleSpeechError\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(bridge, /void onRecognizerUnavailable\(\)/);
assert.match(bridge, /void onRecognizerStartFailed\(\)/);
assert.match(bridge, /void onResolvedSpeechError\(String code, String message, boolean retryable, long cooldownMs\)/);
assert.match(bridge, /void onSpeechCooldownStarted\(\)/);
assert.doesNotMatch(bridge, /ActivityNotFoundException/);
assert.doesNotMatch(bridge, /private final AndroidSpeechErrorPolicy/);
assert.doesNotMatch(bridge, /errorPolicy\.codeFor/);
assert.doesNotMatch(bridge, /errorPolicy\.cooldownFor/);
assert.doesNotMatch(bridge, /errorPolicy\.messageFor/);
assert.doesNotMatch(bridge, /sessionState\.recordFailure\(\)/);
assert.doesNotMatch(bridge, /sessionState\.startCooldown\(cooldownMs\)/);

console.log("android speech error coordinator tests passed");

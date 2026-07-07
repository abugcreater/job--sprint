const assert = require("assert");
const fs = require("fs");

const speechBridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const coordinator = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java", "utf8");
const policy = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorPolicy.java", "utf8");

assert.match(policy, /final class AndroidSpeechErrorPolicy/);
assert.match(policy, /private static final String PHASE_STARTING = "starting"/);
assert.match(policy, /private static final long BUSY_COOLDOWN_MS = 20_000L/);
assert.match(policy, /private static final long TOO_MANY_REQUESTS_COOLDOWN_MS = 90_000L/);
assert.match(policy, /private static final long SHORT_ERROR_COOLDOWN_MS = 5_000L/);
assert.match(policy, /String codeFor\(int error\)/);
assert.match(policy, /String messageFor\(int error, String phaseAtError, boolean wasReadyForSpeech\)/);
assert.match(policy, /long cooldownFor\(int error, String phaseAtError, boolean wasReadyForSpeech\)/);
assert.match(policy, /boolean isRetryable\(int error\)/);
assert.match(policy, /SpeechRecognizer\.ERROR_AUDIO[\s\S]*return "ERROR_AUDIO"/);
assert.match(policy, /SpeechRecognizer\.ERROR_RECOGNIZER_BUSY[\s\S]*return "ERROR_RECOGNIZER_BUSY"/);
assert.match(policy, /SpeechRecognizer\.ERROR_TOO_MANY_REQUESTS[\s\S]*return "ERROR_TOO_MANY_REQUESTS"/);
assert.match(policy, /SpeechRecognizer\.ERROR_LANGUAGE_NOT_SUPPORTED[\s\S]*return "ERROR_LANGUAGE_NOT_SUPPORTED"/);
assert.match(policy, /ERROR_UNKNOWN_"\s*\+ error/);
assert.match(policy, /!wasReadyForSpeech && PHASE_STARTING\.equals\(phaseAtError\)/);
assert.match(policy, /return BUSY_COOLDOWN_MS/);
assert.match(policy, /return TOO_MANY_REQUESTS_COOLDOWN_MS/);
assert.match(policy, /return SHORT_ERROR_COOLDOWN_MS/);
assert.match(policy, /error != SpeechRecognizer\.ERROR_INSUFFICIENT_PERMISSIONS/);
assert.match(policy, /error != SpeechRecognizer\.ERROR_LANGUAGE_NOT_SUPPORTED/);
assert.match(policy, /error != SpeechRecognizer\.ERROR_LANGUAGE_UNAVAILABLE/);

assert.match(coordinator, /private final AndroidSpeechErrorPolicy errorPolicy/);
assert.match(coordinator, /this\.errorPolicy = new AndroidSpeechErrorPolicy\(\)/);
assert.match(coordinator, /String code = errorPolicy\.codeFor\(error\)/);
assert.match(coordinator, /long cooldownMs = errorPolicy\.cooldownFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(coordinator, /String message = errorPolicy\.messageFor\(error, phaseAtError, wasReadyForSpeech\)/);
assert.match(coordinator, /events\.onResolvedSpeechError\(code, message, errorPolicy\.isRetryable\(error\), cooldownMs\)/);
assert.match(speechBridge, /private final AndroidSpeechErrorCoordinator errorCoordinator/);
assert.doesNotMatch(speechBridge, /private final AndroidSpeechErrorPolicy/);
assert.doesNotMatch(speechBridge, /errorPolicy\./);
assert.doesNotMatch(speechBridge, /private String speechErrorCode/);
assert.doesNotMatch(speechBridge, /private String speechErrorMessage/);
assert.doesNotMatch(speechBridge, /private long cooldownForError/);
assert.doesNotMatch(speechBridge, /private boolean isRetryableError/);
assert.doesNotMatch(speechBridge, /BUSY_COOLDOWN_MS/);
assert.doesNotMatch(speechBridge, /TOO_MANY_REQUESTS_COOLDOWN_MS/);
assert.doesNotMatch(speechBridge, /SHORT_ERROR_COOLDOWN_MS/);

console.log("android speech error policy tests passed");

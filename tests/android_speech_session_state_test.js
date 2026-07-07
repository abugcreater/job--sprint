const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const startCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechStartCoordinator.java",
  "utf8"
);
const recognizerController = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechRecognizerController.java",
  "utf8"
);
const errorCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java",
  "utf8"
);
const sessionState = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechSessionState.java",
  "utf8"
);

assert.match(sessionState, /final class AndroidSpeechSessionState/);
assert.match(sessionState, /static final String PHASE_IDLE = "idle"/);
assert.match(sessionState, /static final String PHASE_STARTING = "starting"/);
assert.match(sessionState, /static final String PHASE_LISTENING = "listening"/);
assert.match(sessionState, /static final String PHASE_PARTIAL = "partial"/);
assert.match(sessionState, /static final String PHASE_STOPPING = "stopping"/);
assert.match(sessionState, /private static final long START_DEBOUNCE_MS = 1200L/);
assert.match(sessionState, /private boolean listening = false/);
assert.match(sessionState, /private boolean readyForSpeech = false/);
assert.match(sessionState, /private String phase = PHASE_IDLE/);
assert.match(sessionState, /private long cooldownUntilMs = 0L/);
assert.match(sessionState, /private long lastStartMs = 0L/);
assert.match(sessionState, /private int consecutiveFailures = 0/);
assert.match(sessionState, /long cooldownRemainingMs\(\)/);
assert.match(sessionState, /long debounceRemainingMs\(\)/);
assert.match(sessionState, /void markStartAttempt\(\)/);
assert.match(sessionState, /void markStarting\(\)/);
assert.match(sessionState, /void markListening\(\)/);
assert.match(sessionState, /void markPartial\(\)/);
assert.match(sessionState, /void markStopping\(\)/);
assert.match(sessionState, /void reset\(\)/);
assert.match(sessionState, /boolean isRecognizerActive\(\)/);
assert.match(sessionState, /void startCooldown\(long cooldownMs\)/);
assert.match(sessionState, /int recordFailure\(\)/);
assert.match(sessionState, /void resetFailures\(\)/);

assert.match(bridge, /private final AndroidSpeechSessionState sessionState/);
assert.match(bridge, /this\.sessionState = new AndroidSpeechSessionState\(\)/);
assert.match(startCoordinator, /sessionState\.debounceRemainingMs\(\)/);
assert.match(startCoordinator, /sessionState\.markStartAttempt\(\)/);
assert.match(recognizerController, /sessionState\.markStarting\(\)/);
assert.match(bridge, /sessionState\.markListening\(\)/);
assert.match(bridge, /sessionState\.markPartial\(\)/);
assert.match(bridge, /sessionState\.markStopping\(\)/);
assert.match(bridge, /sessionState\.reset\(\)/);
assert.match(errorCoordinator, /sessionState\.recordFailure\(\)/);
assert.match(errorCoordinator, /sessionState\.startCooldown\(cooldownMs\)/);
assert.match(bridge, /sessionState\.resetFailures\(\)/);
assert.match(bridge, /sessionState\.cooldownRemainingMs\(\)/);
assert.doesNotMatch(bridge, /private boolean listening = false/);
assert.doesNotMatch(bridge, /private boolean readyForSpeech = false/);
assert.doesNotMatch(bridge, /private String speechPhase =/);
assert.doesNotMatch(bridge, /private long cooldownUntilMs =/);
assert.doesNotMatch(bridge, /private long lastStartMs =/);
assert.doesNotMatch(bridge, /private int consecutiveFailures =/);
assert.doesNotMatch(bridge, /private static final long START_DEBOUNCE_MS/);

console.log("android speech session state tests passed");

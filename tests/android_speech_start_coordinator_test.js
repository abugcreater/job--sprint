const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const startCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechStartCoordinator.java",
  "utf8"
);

assert.match(startCoordinator, /final class AndroidSpeechStartCoordinator/);
assert.match(startCoordinator, /interface Events/);
assert.match(startCoordinator, /void onStartCooldown\(long cooldownMs\)/);
assert.match(startCoordinator, /void onStartDebounced\(long debounceMs\)/);
assert.match(startCoordinator, /void onStartRequestingPermission\(\)/);
assert.match(startCoordinator, /void onStartAllowed\(\)/);
assert.match(startCoordinator, /private final Activity activity/);
assert.match(startCoordinator, /private final int audioPermissionRequest/);
assert.match(startCoordinator, /private final AndroidSpeechServiceResolver serviceResolver/);
assert.match(startCoordinator, /private final AndroidSpeechSessionState sessionState/);
assert.match(startCoordinator, /private boolean pendingStartAfterPermission = false/);
assert.match(startCoordinator, /long cooldown = sessionState\.cooldownRemainingMs\(\)/);
assert.match(startCoordinator, /events\.onStartCooldown\(cooldown\)/);
assert.match(startCoordinator, /long debounceMs = sessionState\.debounceRemainingMs\(\)/);
assert.match(startCoordinator, /sessionState\.startCooldown\(debounceMs\)/);
assert.match(startCoordinator, /events\.onStartDebounced\(debounceMs\)/);
assert.match(startCoordinator, /sessionState\.isListening\(\)/);
assert.match(startCoordinator, /events\.onStartAlreadyListening\(\)/);
assert.match(startCoordinator, /!serviceResolver\.isAvailable\(\)/);
assert.match(startCoordinator, /events\.onStartServiceUnavailable\(\)/);
assert.match(startCoordinator, /activity\.checkSelfPermission\(Manifest\.permission\.RECORD_AUDIO\)/);
assert.match(startCoordinator, /PackageManager\.PERMISSION_GRANTED/);
assert.match(startCoordinator, /pendingStartAfterPermission = true/);
assert.match(startCoordinator, /activity\.requestPermissions\(new String\[\] \{ Manifest\.permission\.RECORD_AUDIO \}, audioPermissionRequest\)/);
assert.match(startCoordinator, /sessionState\.markStartAttempt\(\)/);
assert.match(startCoordinator, /events\.onStartAllowed\(\)/);
assert.match(startCoordinator, /void onAudioPermissionResult\(boolean granted\)/);
assert.match(startCoordinator, /events\.onStartPermissionDenied\(\)/);
assert.match(startCoordinator, /events\.onStartPermissionGranted\(\)/);

assert.match(bridge, /implements AndroidSpeechStartCoordinator\.Events/);
assert.match(bridge, /private final AndroidSpeechStartCoordinator startCoordinator/);
assert.match(bridge, /new AndroidSpeechStartCoordinator\(/);
assert.match(bridge, /activity\.runOnUiThread\(\(\) -> startCoordinator\.startListening\(\)\)/);
assert.match(bridge, /startCoordinator\.onAudioPermissionResult\(granted\)/);
assert.match(bridge, /void onStartCooldown\(long cooldownMs\)/);
assert.match(bridge, /void onStartDebounced\(long debounceMs\)/);
assert.match(bridge, /void onStartPermissionDenied\(\)/);
assert.match(bridge, /void onStartAllowed\(\)[\s\S]*startNativeRecognizer\(\)/);
assert.doesNotMatch(bridge, /Manifest\.permission\.RECORD_AUDIO/);
assert.doesNotMatch(bridge, /PackageManager\.PERMISSION_GRANTED/);
assert.doesNotMatch(bridge, /requestPermissions\(new String\[\]/);
assert.doesNotMatch(bridge, /pendingStartAfterPermission/);
assert.doesNotMatch(bridge, /sessionState\.debounceRemainingMs\(\)/);
assert.doesNotMatch(bridge, /sessionState\.markStartAttempt\(\)/);

console.log("android speech start coordinator tests passed");

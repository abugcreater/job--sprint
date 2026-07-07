const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechBridge.java", "utf8");
const controller = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechRecognizerController.java",
  "utf8"
);
const errorCoordinator = fs.readFileSync(
  "apps/android/app/src/main/java/com/kai/jobsprint/AndroidSpeechErrorCoordinator.java",
  "utf8"
);

assert.match(controller, /final class AndroidSpeechRecognizerController/);
assert.match(controller, /interface Events/);
assert.match(controller, /void onRecognizerStarting\(\)/);
assert.match(controller, /void onSpeechError\(int error, String phaseAtError, boolean wasReadyForSpeech\)/);
assert.match(controller, /private SpeechRecognizer recognizer/);
assert.match(controller, /private ComponentName recognizerService/);
assert.match(controller, /boolean start\(String language\)/);
assert.match(controller, /private boolean ensureRecognizer\(\)/);
assert.match(controller, /serviceResolver\.selectedRecognitionService\(\)/);
assert.match(controller, /SpeechRecognizer\.createSpeechRecognizer\(activity, recognizerService\)/);
assert.match(controller, /recognizer\.setRecognitionListener\(new RecognitionListener\(\)/);
assert.match(controller, /new Intent\(RecognizerIntent\.ACTION_RECOGNIZE_SPEECH\)/);
assert.match(controller, /RecognizerIntent\.EXTRA_LANGUAGE_MODEL/);
assert.match(controller, /RecognizerIntent\.EXTRA_LANGUAGE/);
assert.match(controller, /RecognizerIntent\.EXTRA_PARTIAL_RESULTS/);
assert.match(controller, /RecognizerIntent\.EXTRA_MAX_RESULTS/);
assert.match(controller, /RecognizerIntent\.EXTRA_CALLING_PACKAGE/);
assert.match(controller, /SpeechRecognizer\.RESULTS_RECOGNITION/);
assert.match(controller, /events\.onSpeechResults\(firstResult\(results\)\)/);
assert.match(controller, /events\.onPartialSpeechResults\(firstResult\(partialResults\)\)/);
assert.match(controller, /events\.onSpeechError\(error, sessionState\.phase\(\), sessionState\.isReadyForSpeech\(\)\)/);

assert.match(bridge, /AndroidSpeechRecognizerController\.Events/);
assert.match(bridge, /private final AndroidSpeechRecognizerController recognizerController/);
assert.match(bridge, /new AndroidSpeechRecognizerController\(activity, serviceResolver, sessionState, this\)/);
assert.match(bridge, /errorCoordinator\.startRecognizer\(recognizerController, language\)/);
assert.match(errorCoordinator, /recognizerController\.start\(language\)/);
assert.match(bridge, /recognizerController\.stop\(\)/);
assert.match(bridge, /recognizerController\.cancel\(\)/);
assert.match(bridge, /recognizerController\.destroy\(\)/);
assert.match(bridge, /recognizerController\.recognizerService\(\)/);
assert.doesNotMatch(bridge, /SpeechRecognizer\.createSpeechRecognizer/);
assert.doesNotMatch(bridge, /new RecognitionListener\(\)/);
assert.doesNotMatch(bridge, /RecognizerIntent\.ACTION_RECOGNIZE_SPEECH/);
assert.doesNotMatch(bridge, /SpeechRecognizer\.RESULTS_RECOGNITION/);
assert.doesNotMatch(bridge, /private ComponentName recognizerService/);

console.log("android speech recognizer controller tests passed");

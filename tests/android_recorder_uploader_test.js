const assert = require("assert");
const fs = require("fs");

const bridge = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderBridge.java", "utf8");
const uploader = fs.readFileSync("apps/android/app/src/main/java/com/kai/jobsprint/AndroidRecorderUploader.java", "utf8");

assert.match(uploader, /final class AndroidRecorderUploader/);
assert.match(uploader, /interface Callback/);
assert.match(uploader, /void onTranscription\(String text, String message\)/);
assert.match(uploader, /void onError\(String code, String message, boolean retryable\)/);
assert.match(uploader, /void upload\(File file, String endpoint, Callback callback\)/);
assert.match(uploader, /new Thread\(\(\) -> \{/);
assert.match(uploader, /"job-sprint-audio-upload"/);
assert.match(uploader, /CookieManager\.getInstance\(\)\.getCookie\(endpoint\)/);
assert.match(uploader, /HttpURLConnection/);
assert.match(uploader, /writeMultipartAudio\(connection, boundary, file\)/);
assert.match(uploader, /readConnectionBody\(connection, status\)/);
assert.match(uploader, /response\.optBoolean\("ok", false\)/);
assert.match(uploader, /callback\.onTranscription\(text, "录音转写完成。"\)/);
assert.match(uploader, /callback\.onError\("ERROR_TRANSCRIBE_UPLOAD", "录音上传或转写失败，可继续手动输入。", true\)/);
assert.match(uploader, /deleteQuietly\(file\)/);

assert.match(bridge, /private final AndroidRecorderUploader recorderUploader/);
assert.match(bridge, /this\.recorderUploader = new AndroidRecorderUploader\(\)/);
assert.match(bridge, /recorderUploader\.upload\(file, endpoint, new AndroidRecorderUploader\.Callback\(\) \{/);
assert.match(bridge, /recordingFile = null;\s*emitState\("uploading"/);
assert.doesNotMatch(bridge, /CookieManager\.getInstance/);
assert.doesNotMatch(bridge, /HttpURLConnection/);
assert.doesNotMatch(bridge, /writeMultipartAudio/);
assert.doesNotMatch(bridge, /readConnectionBody/);
assert.doesNotMatch(bridge, /new Thread\(\(\) ->/);

console.log("android recorder uploader tests passed");

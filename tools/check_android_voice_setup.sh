#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/apps/android/app/src/main/AndroidManifest.xml"
MAIN_ACTIVITY="$ROOT/apps/android/app/src/main/java/com/kai/jobsprint/MainActivity.java"
SCHEDULE_JS="$ROOT/assets/schedule.js"
APK="$ROOT/apps/android/app/build/outputs/apk/debug/app-debug.apk"
FALLBACK_DIR="$ROOT/apps/android/app/src/main/assets/web"

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

grep -q 'android.permission.RECORD_AUDIO' "$MANIFEST" || fail "AndroidManifest 缺少 RECORD_AUDIO"
grep -q 'android.permission.INTERNET' "$MANIFEST" || fail "AndroidManifest 缺少 INTERNET"
grep -q 'android.permission.ACCESS_NETWORK_STATE' "$MANIFEST" || fail "AndroidManifest 缺少 ACCESS_NETWORK_STATE"
grep -q 'requestPermissions(new String\[\] { Manifest.permission.RECORD_AUDIO }' "$MAIN_ACTIVITY" || fail "MainActivity 未请求麦克风运行时权限"
grep -q 'class AndroidSpeechBridge' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 AndroidSpeechBridge"
grep -q 'addJavascriptInterface(speechBridge, "AndroidSpeech")' "$MAIN_ACTIVITY" || fail "WebView 未暴露 AndroidSpeech JS 桥"
grep -q 'addJavascriptInterface(recorderBridge, "AndroidRecorder")' "$MAIN_ACTIVITY" || fail "WebView 未暴露 AndroidRecorder JS 桥"
grep -q 'SpeechRecognizer' "$MAIN_ACTIVITY" || fail "MainActivity 未使用 SpeechRecognizer"
grep -q 'SpeechRecognizer.isRecognitionAvailable' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 SpeechRecognizer 可用性预检"
grep -q 'queryIntentServices(serviceIntent, flags)' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 RecognitionService 查询"
grep -q 'RecognizerIntent.ACTION_RECOGNIZE_SPEECH' "$MAIN_ACTIVITY" || fail "MainActivity 未使用 RecognizerIntent.ACTION_RECOGNIZE_SPEECH"
grep -q 'RecognizerIntent.EXTRA_PARTIAL_RESULTS' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 partial result 配置"
grep -q 'onPartialResults' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 partial result 处理"
grep -q 'onResults' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 final result 处理"
grep -q 'PHASE_STARTING' "$MAIN_ACTIVITY" || fail "MainActivity 缺少启动阶段状态"
grep -q 'readyForSpeech = true' "$MAIN_ACTIVITY" || fail "MainActivity 未在 onReadyForSpeech 后标记 ready"
grep -q 'cooldownForError(int error, String phaseAtError, boolean wasReadyForSpeech)' "$MAIN_ACTIVITY" || fail "MainActivity cooldown 未按阶段判断"
grep -q 'if (!wasReadyForSpeech && PHASE_STARTING.equals(phaseAtError))' "$MAIN_ACTIVITY" || fail "MainActivity 启动阶段错误仍可能进入 cooldown"
grep -q 'ERROR_RECOGNIZER_BUSY' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 busy 错误映射"
grep -q 'ERROR_TOO_MANY_REQUESTS' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 too many requests 错误映射"
grep -q 'cooldownUntilMs' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 cooldown"
grep -q 'START_DEBOUNCE_MS' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 debounce"
grep -q 'cancelFromLifecycle' "$MAIN_ACTIVITY" || fail "MainActivity 缺少后台取消语音"
grep -q 'MediaRecorder' "$MAIN_ACTIVITY" || fail "MainActivity 缺少录音后转写 MediaRecorder"
grep -q '/api/transcribe' "$MAIN_ACTIVITY" || fail "MainActivity 缺少 /api/transcribe 上传路径"
grep -q 'window.onAndroidSpeechFinal' "$SCHEDULE_JS" || fail "前端缺少 Android speech final 回调"
grep -q 'window.onAndroidSpeechPartial' "$SCHEDULE_JS" || fail "前端缺少 Android speech partial 回调"
grep -q 'window.onAndroidSpeechError' "$SCHEDULE_JS" || fail "前端缺少 Android speech error 回调"
grep -q 'window.AndroidSpeech' "$SCHEDULE_JS" || fail "前端未优先检测 AndroidSpeech"
grep -q 'window.AndroidRecorder' "$SCHEDULE_JS" || fail "前端未检测 AndroidRecorder"
grep -q '录音后转写' "$SCHEDULE_JS" || fail "前端缺少录音后转写模式"
grep -q 'startCooldownCountdown' "$SCHEDULE_JS" || fail "前端缺少 cooldown 倒计时"
grep -q '当前浏览器没有语音能力；可手动输入' "$SCHEDULE_JS" || fail "前端缺少手动输入 fallback 文案"

if grep -RInE 'googlequicksearchbox|GoogleRecognitionService|knownGoogleRecognitionService' "$MAIN_ACTIVITY" "$SCHEDULE_JS" "$MANIFEST" >/tmp/job-sprint-voice-google-fallback.txt; then
  cat /tmp/job-sprint-voice-google-fallback.txt >&2
  fail "禁止硬编码 Google RecognitionService fallback"
fi

if grep -RInE 'Basic +[A-Za-z0-9+/=]{8,}|Authorization:|118\\.25\\.|secret|token|password *= *"[^\"]+"' "$MAIN_ACTIVITY" "$MANIFEST" "$ROOT/apps/android/app/src/main/res" >/tmp/job-sprint-voice-sensitive.txt; then
  cat /tmp/job-sprint-voice-sensitive.txt >&2
  fail "Android 源码或资源疑似包含硬编码凭证/公网地址"
fi

if [[ -d "$FALLBACK_DIR" ]] && grep -RIn '/path/to/local-user' "$FALLBACK_DIR" >/tmp/job-sprint-fallback-paths.txt; then
  cat /tmp/job-sprint-fallback-paths.txt >&2
  fail "Android fallback assets 泄露本地绝对路径"
fi

if [[ -f "$APK" ]]; then
  printf 'OK APK exists: %s\n' "apps/android/app/build/outputs/apk/debug/app-debug.apk"
else
  printf 'WARN APK not found, run: cd apps/android && gradle :app:assembleDebug\n'
fi

printf 'android voice setup check passed\n'

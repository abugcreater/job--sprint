package com.kai.jobsprint;

import android.app.Activity;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

final class AndroidSpeechBridge implements AndroidSpeechStartCoordinator.Events, AndroidSpeechErrorCoordinator.Events, AndroidSpeechRecognizerController.Events {
    private static final String TAG = "JobSprintSpeech";

    private final Activity activity;
    private final AndroidSpeechServiceResolver serviceResolver;
    private final AndroidSpeechSessionState sessionState;
    private final AndroidSpeechCallbackEmitter callbackEmitter;
    private final AndroidSpeechStartCoordinator startCoordinator;
    private final AndroidSpeechErrorCoordinator errorCoordinator;
    private final AndroidSpeechRecognizerController recognizerController;

    AndroidSpeechBridge(Activity activity, WebView webView, int audioPermissionRequest) {
        this.activity = activity;
        this.serviceResolver = new AndroidSpeechServiceResolver(activity);
        this.sessionState = new AndroidSpeechSessionState();
        this.callbackEmitter = new AndroidSpeechCallbackEmitter(webView, sessionState, serviceResolver);
        this.startCoordinator = new AndroidSpeechStartCoordinator(
            activity,
            audioPermissionRequest,
            serviceResolver,
            sessionState,
            this
        );
        this.errorCoordinator = new AndroidSpeechErrorCoordinator(sessionState, this);
        this.recognizerController = new AndroidSpeechRecognizerController(activity, serviceResolver, sessionState, this);
    }

    private String language = "zh-CN";

    @JavascriptInterface
    public boolean isAvailable() {
        return serviceResolver.isAvailable();
    }

    @JavascriptInterface
    public String getStatus() {
        return callbackEmitter.status(
            isAvailable(),
            language,
            cooldownRemainingMs(),
            serviceResolver.recognitionServiceCount(),
            serviceResolver.componentToShortString(serviceResolver.selectedRecognitionService())
        );
    }

    @JavascriptInterface
    public void setLanguage(String nextLanguage) {
        activity.runOnUiThread(() -> {
            String value = nextLanguage == null ? "" : nextLanguage.trim();
            language = value.isEmpty() ? "zh-CN" : value;
            emitState("idle", "语音语言已设置为 " + language);
        });
    }

    @JavascriptInterface
    public void startListening() {
        activity.runOnUiThread(() -> startCoordinator.startListening());
    }

    @JavascriptInterface
    public void stopListening() {
        activity.runOnUiThread(() -> {
            if (recognizerController.hasRecognizer() && isRecognizerActive()) {
                sessionState.markStopping();
                if (sessionState.isListening()) {
                    emitState("stopping", "正在停止语音识别。");
                    recognizerController.stop();
                } else {
                    emitState("stopping", "系统语音服务仍在启动，已取消本次识别。");
                    recognizerController.cancel();
                    resetSpeechSession();
                }
            } else {
                emitState("idle", "语音未在录制中。");
            }
        });
    }

    @JavascriptInterface
    public void cancelListening() {
        activity.runOnUiThread(() -> cancelListeningInternal("已取消语音识别。"));
    }

    void onAudioPermissionResult(boolean granted) {
        startCoordinator.onAudioPermissionResult(granted);
    }

    void cancelFromLifecycle() {
        cancelListeningInternal("App 已进入后台，语音识别已取消。");
    }

    void destroy() {
        recognizerController.destroy();
    }

    private void cancelListeningInternal(String message) {
        if (recognizerController.hasRecognizer() && sessionState.isListening()) {
            recognizerController.cancel();
        }
        resetSpeechSession();
        emitState("idle", message);
    }

    private void startNativeRecognizer() {
        errorCoordinator.startRecognizer(recognizerController, language);
    }

    private boolean isRecognizerActive() {
        return sessionState.isRecognizerActive();
    }

    private void resetSpeechSession() {
        sessionState.reset();
    }

    private long cooldownRemainingMs() {
        return sessionState.cooldownRemainingMs();
    }

    @Override
    public void onStartCooldown(long cooldownMs) {
        emitError("ERROR_COOLDOWN", "系统语音服务冷却中，请稍后手动重试。", true, cooldownMs);
        emitState("cooldown", "请等待冷却结束后重试");
    }

    @Override
    public void onStartDebounced(long debounceMs) {
        emitError("ERROR_DEBOUNCE", "点击过快，请稍后再试。", true, debounceMs);
        emitState("cooldown", "点击过快，已进入短暂冷却");
    }

    @Override
    public void onStartAlreadyListening() {
        emitState("listening", "正在识别中，请先停止或等待结果。");
    }

    @Override
    public void onStartServiceUnavailable() {
        emitError("ERROR_SERVICE_UNAVAILABLE", "系统语音服务不可用，请检查系统语音输入服务。", false, 0L);
    }

    @Override
    public void onStartRequestingPermission() {
        emitState("requesting_permission", "正在请求麦克风权限。");
    }

    @Override
    public void onStartPermissionDenied() {
        emitError("ERROR_INSUFFICIENT_PERMISSIONS", "未授予麦克风权限。请到系统设置中允许 job-sprint 使用麦克风。", false, 0L);
    }

    @Override
    public void onStartPermissionGranted() {
        emitState("ready", "麦克风权限已授权。");
    }

    @Override
    public void onStartAllowed() {
        startNativeRecognizer();
    }

    @Override
    public void onRecognizerUnavailable() {
        emitError("ERROR_SERVICE_UNAVAILABLE", "系统语音服务不可用，请检查系统语音输入服务。", false, 0L);
    }

    @Override
    public void onRecognizerStartFailed() {
        emitError("ERROR_CLIENT", "语音识别启动失败，请检查系统语音服务和麦克风权限。", true, 0L);
    }

    @Override
    public void onResolvedSpeechError(String code, String message, boolean retryable, long cooldownMs) {
        emitError(code, message, retryable, cooldownMs);
    }

    @Override
    public void onSpeechCooldownStarted() {
        emitState("cooldown", "语音服务冷却中，请稍后重试。");
    }

    @Override
    public void onRecognizerStarting() {
        emitState("starting", "正在启动系统语音服务。");
    }

    @Override
    public void onReadyForSpeech() {
        sessionState.markListening();
        emitState("listening", "正在听你回答。");
    }

    @Override
    public void onBeginningOfSpeech() {
        sessionState.markPartial();
        emitState("partial", "检测到说话，正在识别。");
    }

    @Override
    public void onEndOfSpeech() {
        sessionState.markStopping();
        emitState("stopping", "正在转写。");
    }

    @Override
    public void onSpeechError(int error, String phaseAtError, boolean wasReadyForSpeech) {
        errorCoordinator.handleSpeechError(error, phaseAtError, wasReadyForSpeech);
    }

    @Override
    public void onSpeechResults(String text) {
        resetSpeechSession();
        sessionState.resetFailures();
        emitFinal(text);
        emitState("final", text == null || text.isEmpty() ? "识别结束，但没有返回文本。" : "识别完成。");
    }

    @Override
    public void onPartialSpeechResults(String text) {
        emitPartial(text);
    }

    private void emitState(String state, String message) {
        callbackEmitter.emitState(state, message, language, recognizerController.recognizerService(), cooldownRemainingMs());
    }

    private void emitPartial(String text) {
        callbackEmitter.emitPartial(text, language, recognizerController.recognizerService());
    }

    private void emitFinal(String text) {
        callbackEmitter.emitFinal(text, language, recognizerController.recognizerService());
    }

    private void emitError(String code, String message, boolean retryable, long cooldownMs) {
        Log.i(TAG, "speech error: " + code);
        callbackEmitter.emitError(code, message, retryable, cooldownMs, language, recognizerController.recognizerService());
    }
}

package com.kai.jobsprint;

import android.content.ComponentName;
import android.webkit.WebView;

import org.json.JSONObject;

final class AndroidSpeechCallbackEmitter {
    private final WebView webView;
    private final AndroidSpeechSessionState sessionState;
    private final AndroidSpeechServiceResolver serviceResolver;

    AndroidSpeechCallbackEmitter(
        WebView webView,
        AndroidSpeechSessionState sessionState,
        AndroidSpeechServiceResolver serviceResolver
    ) {
        this.webView = webView;
        this.sessionState = sessionState;
        this.serviceResolver = serviceResolver;
    }

    String status(
        boolean available,
        String language,
        long cooldownMs,
        int recognitionServices,
        String selectedRecognitionService
    ) {
        JSONObject payload = basePayload(sessionState.phase(), sessionState.isListening() ? "正在识别" : "空闲", language, null);
        put(payload, "available", available);
        put(payload, "listening", sessionState.isListening());
        put(payload, "language", language);
        put(payload, "cooldownMs", cooldownMs);
        put(payload, "recognitionServices", recognitionServices);
        put(payload, "selectedRecognitionService", selectedRecognitionService);
        return payload.toString();
    }

    void emitState(String state, String message, String language, ComponentName recognizerService, long cooldownMs) {
        JSONObject payload = basePayload(state, message, language, recognizerService);
        put(payload, "cooldownMs", cooldownMs);
        put(payload, "listening", sessionState.isListening());
        evaluatePayload("window.onAndroidSpeechState", payload);
    }

    void emitPartial(String text, String language, ComponentName recognizerService) {
        JSONObject payload = basePayload("partial", "正在识别", language, recognizerService);
        put(payload, "text", text == null ? "" : text);
        evaluatePayload("window.onAndroidSpeechPartial", payload);
    }

    void emitFinal(String text, String language, ComponentName recognizerService) {
        JSONObject payload = basePayload("final", "识别完成", language, recognizerService);
        put(payload, "text", text == null ? "" : text);
        evaluatePayload("window.onAndroidSpeechFinal", payload);
    }

    void emitError(
        String code,
        String message,
        boolean retryable,
        long cooldownMs,
        String language,
        ComponentName recognizerService
    ) {
        JSONObject payload = basePayload("error", message, language, recognizerService);
        put(payload, "code", code);
        put(payload, "retryable", retryable);
        put(payload, "cooldownMs", Math.max(cooldownMs, sessionState.cooldownRemainingMs()));
        evaluatePayload("window.onAndroidSpeechError", payload);
    }

    private JSONObject basePayload(String state, String message, String language, ComponentName recognizerService) {
        JSONObject payload = new JSONObject();
        put(payload, "state", state);
        put(payload, "source", "android-native-speech");
        put(payload, "message", message == null ? "" : message);
        put(payload, "language", language);
        put(payload, "phase", sessionState.phase());
        put(payload, "readyForSpeech", sessionState.isReadyForSpeech());
        put(payload, "selectedRecognitionService", serviceResolver.componentToShortString(recognizerService));
        return payload;
    }

    private void put(JSONObject payload, String key, Object value) {
        try {
            payload.put(key, value);
        } catch (Exception ignored) {
            // Do not let diagnostic payload formatting break speech callbacks.
        }
    }

    private void evaluatePayload(String method, JSONObject payload) {
        if (webView == null) {
            return;
        }
        String script = method + " && " + method + "(" + payload.toString() + ");";
        webView.evaluateJavascript(script, null);
    }
}

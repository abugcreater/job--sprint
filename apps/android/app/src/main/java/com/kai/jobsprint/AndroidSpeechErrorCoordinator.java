package com.kai.jobsprint;

import android.content.ActivityNotFoundException;
import android.util.Log;

final class AndroidSpeechErrorCoordinator {
    private static final String TAG = "JobSprintSpeech";

    interface Events {
        void onRecognizerUnavailable();
        void onRecognizerStartFailed();
        void onResolvedSpeechError(String code, String message, boolean retryable, long cooldownMs);
        void onSpeechCooldownStarted();
    }

    private final AndroidSpeechSessionState sessionState;
    private final AndroidSpeechErrorPolicy errorPolicy;
    private final Events events;

    AndroidSpeechErrorCoordinator(AndroidSpeechSessionState sessionState, Events events) {
        this.sessionState = sessionState;
        this.errorPolicy = new AndroidSpeechErrorPolicy();
        this.events = events;
    }

    void startRecognizer(AndroidSpeechRecognizerController recognizerController, String language) {
        try {
            if (!recognizerController.start(language)) {
                events.onRecognizerUnavailable();
            }
        } catch (ActivityNotFoundException error) {
            sessionState.reset();
            events.onRecognizerUnavailable();
        } catch (RuntimeException error) {
            sessionState.reset();
            Log.w(TAG, "SpeechRecognizer start failed: " + error.getClass().getSimpleName());
            events.onRecognizerStartFailed();
        }
    }

    void handleSpeechError(int error, String phaseAtError, boolean wasReadyForSpeech) {
        sessionState.reset();
        int consecutiveFailures = sessionState.recordFailure();
        String code = errorPolicy.codeFor(error);
        long cooldownMs = errorPolicy.cooldownFor(error, phaseAtError, wasReadyForSpeech);
        if (cooldownMs > 0) {
            sessionState.startCooldown(cooldownMs);
        }

        String message = errorPolicy.messageFor(error, phaseAtError, wasReadyForSpeech);
        if (consecutiveFailures >= 3) {
            message += " 已连续失败 3 次，请检查系统语音服务、网络和麦克风权限，稍后手动重试。";
        }

        events.onResolvedSpeechError(code, message, errorPolicy.isRetryable(error), cooldownMs);
        if (cooldownMs > 0) {
            events.onSpeechCooldownStarted();
        }
    }
}

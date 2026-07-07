package com.kai.jobsprint;

import android.os.SystemClock;

final class AndroidSpeechSessionState {
    static final String PHASE_IDLE = "idle";
    static final String PHASE_STARTING = "starting";
    static final String PHASE_LISTENING = "listening";
    static final String PHASE_PARTIAL = "partial";
    static final String PHASE_STOPPING = "stopping";

    private static final long START_DEBOUNCE_MS = 1200L;

    private boolean listening = false;
    private boolean readyForSpeech = false;
    private String phase = PHASE_IDLE;
    private long cooldownUntilMs = 0L;
    private long lastStartMs = 0L;
    private int consecutiveFailures = 0;

    String phase() {
        return phase;
    }

    boolean isListening() {
        return listening;
    }

    boolean isReadyForSpeech() {
        return readyForSpeech;
    }

    long cooldownRemainingMs() {
        return Math.max(0L, cooldownUntilMs - SystemClock.elapsedRealtime());
    }

    long debounceRemainingMs() {
        long elapsed = SystemClock.elapsedRealtime() - lastStartMs;
        return elapsed < START_DEBOUNCE_MS ? START_DEBOUNCE_MS - elapsed : 0L;
    }

    void markStartAttempt() {
        lastStartMs = SystemClock.elapsedRealtime();
    }

    void markStarting() {
        phase = PHASE_STARTING;
        readyForSpeech = false;
    }

    void markListening() {
        listening = true;
        readyForSpeech = true;
        phase = PHASE_LISTENING;
    }

    void markPartial() {
        phase = PHASE_PARTIAL;
    }

    void markStopping() {
        phase = PHASE_STOPPING;
    }

    void reset() {
        listening = false;
        readyForSpeech = false;
        phase = PHASE_IDLE;
    }

    boolean isRecognizerActive() {
        return PHASE_STARTING.equals(phase)
            || PHASE_LISTENING.equals(phase)
            || PHASE_PARTIAL.equals(phase)
            || PHASE_STOPPING.equals(phase);
    }

    void startCooldown(long cooldownMs) {
        cooldownUntilMs = Math.max(cooldownUntilMs, SystemClock.elapsedRealtime() + Math.max(0L, cooldownMs));
    }

    int recordFailure() {
        consecutiveFailures += 1;
        return consecutiveFailures;
    }

    void resetFailures() {
        consecutiveFailures = 0;
    }
}

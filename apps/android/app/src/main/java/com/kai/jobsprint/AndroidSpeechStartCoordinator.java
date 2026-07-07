package com.kai.jobsprint;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;

final class AndroidSpeechStartCoordinator {
    interface Events {
        void onStartCooldown(long cooldownMs);
        void onStartDebounced(long debounceMs);
        void onStartAlreadyListening();
        void onStartServiceUnavailable();
        void onStartRequestingPermission();
        void onStartPermissionDenied();
        void onStartPermissionGranted();
        void onStartAllowed();
    }

    private final Activity activity;
    private final int audioPermissionRequest;
    private final AndroidSpeechServiceResolver serviceResolver;
    private final AndroidSpeechSessionState sessionState;
    private final Events events;

    private boolean pendingStartAfterPermission = false;

    AndroidSpeechStartCoordinator(
        Activity activity,
        int audioPermissionRequest,
        AndroidSpeechServiceResolver serviceResolver,
        AndroidSpeechSessionState sessionState,
        Events events
    ) {
        this.activity = activity;
        this.audioPermissionRequest = audioPermissionRequest;
        this.serviceResolver = serviceResolver;
        this.sessionState = sessionState;
        this.events = events;
    }

    void startListening() {
        long cooldown = sessionState.cooldownRemainingMs();
        if (cooldown > 0) {
            events.onStartCooldown(cooldown);
            return;
        }

        long debounceMs = sessionState.debounceRemainingMs();
        if (debounceMs > 0) {
            sessionState.startCooldown(debounceMs);
            events.onStartDebounced(debounceMs);
            return;
        }

        if (sessionState.isListening()) {
            events.onStartAlreadyListening();
            return;
        }

        if (!serviceResolver.isAvailable()) {
            events.onStartServiceUnavailable();
            return;
        }

        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingStartAfterPermission = true;
            events.onStartRequestingPermission();
            activity.requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, audioPermissionRequest);
            return;
        }

        sessionState.markStartAttempt();
        events.onStartAllowed();
    }

    void onAudioPermissionResult(boolean granted) {
        if (!granted) {
            pendingStartAfterPermission = false;
            events.onStartPermissionDenied();
            return;
        }

        events.onStartPermissionGranted();
        if (pendingStartAfterPermission) {
            pendingStartAfterPermission = false;
            events.onStartAllowed();
        }
    }
}
